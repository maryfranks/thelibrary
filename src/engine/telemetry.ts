import {
  metrics,
  type Attributes,
  type Context,
  type Counter,
  type Meter,
  type MetricOptions,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
} from "@opentelemetry/sdk-metrics";
import type { DeathType, NodeId, StageId } from "./types";

export type { StageId };

export type RunOutcome = "win" | "loss";

export interface RunCompletedAttributes extends Attributes {
  outcome: RunOutcome;
  final_stage: StageId;
}

export interface DeathAttributes extends Attributes {
  stage: StageId;
  death_type: DeathType;
  node_id: string;
}

export const METER_NAME = "the-library-engine";
export const RUNS_COMPLETED_COUNTER_NAME = "game.runs.completed";
export const DEATHS_COUNTER_NAME = "game.deaths";
export const COLLECTOR_URL = "https://collector.littlefuzzydinos.com/v1/metrics";
export const EXPORT_INTERVAL_MILLIS = 5000;

export const metricExporter = new OTLPMetricExporter({
  url: COLLECTOR_URL,
});

export const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter as unknown as PushMetricExporter,
  exportIntervalMillis: EXPORT_INTERVAL_MILLIS,
});

export const meterProvider = new MeterProvider({
  readers: [metricReader],
});

metrics.setGlobalMeterProvider(meterProvider);

function createDelegatingCounter<T extends Attributes = Attributes>(
  name: string,
  options?: MetricOptions,
): Counter<T> {
  const sdkCounter = meterProvider.getMeter(METER_NAME).createCounter<T>(name, options);
  return {
    add(value: number, attributes?: T, context?: Context): void {
      try {
        sdkCounter.add(value, attributes, context);
        const globalProvider = metrics.getMeterProvider();
        if (globalProvider !== meterProvider) {
          const activeMeter = metrics.getMeter(METER_NAME);
          const counter = activeMeter.createCounter<T>(name, options);
          counter.add(value, attributes, context);
        }
      } catch {
        // Gracefully handle missing or failing collectors during tests or offline gameplay
      }
    },
  };
}

const baseMeter = meterProvider.getMeter(METER_NAME);

export const meter: Meter = {
  ...baseMeter,
  createGauge: baseMeter.createGauge.bind(baseMeter),
  createHistogram: baseMeter.createHistogram.bind(baseMeter),
  createUpDownCounter: baseMeter.createUpDownCounter.bind(baseMeter),
  createObservableGauge: baseMeter.createObservableGauge.bind(baseMeter),
  createObservableCounter: baseMeter.createObservableCounter.bind(baseMeter),
  createObservableUpDownCounter: baseMeter.createObservableUpDownCounter.bind(baseMeter),
  addBatchObservableCallback: baseMeter.addBatchObservableCallback.bind(baseMeter),
  removeBatchObservableCallback: baseMeter.removeBatchObservableCallback.bind(baseMeter),
  createCounter<T extends Attributes = Attributes>(
    name: string,
    options?: MetricOptions,
  ): Counter<T> {
    return createDelegatingCounter<T>(name, options);
  },
};

export const runsCompletedCounter: Counter<RunCompletedAttributes> =
  meter.createCounter<RunCompletedAttributes>(RUNS_COMPLETED_COUNTER_NAME, {
    description: "Monotonic counter tracking completed game runs by outcome and final stage.",
  });

export const deathsCounter: Counter<DeathAttributes> = meter.createCounter<DeathAttributes>(
  DEATHS_COUNTER_NAME,
  {
    description: "Monotonic counter tracking player deaths by stage, death type, and node ID.",
  },
);

export function getStageFromNodeId(nodeId: NodeId | string): StageId {
  if (nodeId.startsWith("stage1_")) {
    return "stage1";
  }
  if (nodeId.startsWith("stage2_")) {
    return "stage2";
  }
  if (nodeId.startsWith("stage3_")) {
    return "stage3";
  }
  if (nodeId.startsWith("stage4_")) {
    return "stage4";
  }
  return "stage5";
}

export async function flushTelemetry(): Promise<void> {
  try {
    await meterProvider.forceFlush();
  } catch {
    // Gracefully handle export failures, timeouts, or network drops without interrupting gameplay
  }
}

export function recordRunCompleted(attributes: RunCompletedAttributes): void {
  try {
    runsCompletedCounter.add(1, attributes);
    void flushTelemetry();
  } catch {
    // Gracefully handle missing or failing collectors during tests or offline gameplay
  }
}

export function recordDeath(attributes: DeathAttributes): void {
  try {
    deathsCounter.add(1, attributes);
    void flushTelemetry();
  } catch {
    // Gracefully handle missing or failing collectors during tests or offline gameplay
  }
}
