import {
  metrics,
  type Attributes,
  type Counter,
  type Meter,
  type MeterProvider,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import {
  MeterProvider as SdkMeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COLLECTOR_URL,
  DEATHS_COUNTER_NAME,
  EXPORT_INTERVAL_MILLIS,
  METER_NAME,
  RUNS_COMPLETED_COUNTER_NAME,
  createInitialState,
  deathsCounter,
  flushTelemetry,
  getStageFromNodeId,
  meter,
  meterProvider,
  metricExporter,
  metricReader,
  recordDeath,
  recordRunCompleted,
  runsCompletedCounter,
  transition,
  type DeathAttributes,
  type GameState,
  type ItemId,
  type NodeId,
  type RunCompletedAttributes,
} from "../index";

function makeState(
  currentNode: NodeId,
  inventory: ItemId[] = [],
  overrides: Partial<GameState> = {},
): GameState {
  return {
    ...createInitialState(),
    currentNode,
    inventory: [...inventory],
    ...overrides,
  };
}

describe("OpenTelemetry Instrumentation (telemetry.ts & Engine Metrics)", () => {
  let deathSpy: ReturnType<typeof vi.spyOn>;
  let runCompletedSpy: ReturnType<typeof vi.spyOn>;
  let exportSpy: ReturnType<typeof vi.spyOn>;
  let exporterForceFlushSpy: ReturnType<typeof vi.spyOn>;
  let providerForceFlushSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exportSpy = vi
      .spyOn(metricExporter, "export")
      .mockImplementation((_metrics, resultCallback) => {
        resultCallback({ code: 0 });
      });
    exporterForceFlushSpy = vi.spyOn(metricExporter, "forceFlush").mockResolvedValue(undefined);
    vi.spyOn(metricExporter, "shutdown").mockResolvedValue(undefined);
    providerForceFlushSpy = vi.spyOn(meterProvider, "forceFlush");
    deathSpy = vi.spyOn(deathsCounter, "add");
    runCompletedSpy = vi.spyOn(runsCompletedCounter, "add");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    metrics.disable();
    metrics.setGlobalMeterProvider(meterProvider);
  });

  describe("Meter, Counters, OTLP Exporter, and Typed Helpers", () => {
    it("exports initialized Meter, distinct monotonic counters, flushTelemetry, and stage helper", () => {
      expect(meter).toBeDefined();
      expect(typeof meter.createCounter).toBe("function");
      expect(typeof recordDeath).toBe("function");
      expect(typeof recordRunCompleted).toBe("function");
      expect(typeof flushTelemetry).toBe("function");
      expect(runsCompletedCounter).toBeDefined();
      expect(deathsCounter).toBeDefined();
      expect(runsCompletedCounter).not.toBe(deathsCounter);

      expect(getStageFromNodeId("stage1_vestibule")).toBe("stage1");
      expect(getStageFromNodeId("stage2_foyer")).toBe("stage2");
      expect(getStageFromNodeId("stage3_hub")).toBe("stage3");
      expect(getStageFromNodeId("stage4_entry")).toBe("stage4");
      expect(getStageFromNodeId("stage5_occult_archive_hub")).toBe("stage5");
    });

    it("configures OTLPMetricExporter directly to production collector URL and PeriodicExportingMetricReader with 5000ms interval", () => {
      expect(COLLECTOR_URL).toBe("https://collector.littlefuzzydinos.com/v1/metrics");
      expect(EXPORT_INTERVAL_MILLIS).toBe(5000);
      expect(metricExporter).toBeInstanceOf(OTLPMetricExporter);
      expect(metricReader).toBeInstanceOf(PeriodicExportingMetricReader);
      expect(meterProvider).toBeInstanceOf(SdkMeterProvider);

      const readerInternal = metricReader as unknown as {
        _exportInterval: number;
        _exporter: unknown;
      };
      expect(readerInternal._exportInterval).toBe(5000);
      expect(readerInternal._exporter).toBe(metricExporter);
    });

    it("flushes buffered metrics immediately via flushTelemetry() and when recordRunCompleted() is called", async () => {
      recordRunCompleted({
        outcome: "win",
        final_stage: "stage5",
      });

      expect(providerForceFlushSpy).toHaveBeenCalledTimes(1);

      await flushTelemetry();

      expect(providerForceFlushSpy).toHaveBeenCalledTimes(2);
      expect(exportSpy).toHaveBeenCalled();
      expect(exporterForceFlushSpy).toHaveBeenCalled();
    });

    it("degrades silently on network drops, offline execution, and collector timeouts without throwing", async () => {
      // 1. Exporter callback reports failed export (e.g. HTTP 500 / connection refused)
      exportSpy.mockImplementation((_metrics, resultCallback) => {
        resultCallback({
          code: 1,
          error: new Error("Network drop: connect ECONNREFUSED"),
        });
      });

      recordDeath({
        stage: "stage1",
        death_type: "monster_attack",
        node_id: "stage1_vestibule",
      });
      await expect(flushTelemetry()).resolves.toBeUndefined();

      // 2. Exporter export() throws synchronously (e.g. offline socket error)
      exportSpy.mockImplementation(() => {
        throw new Error("Offline execution: network unreachable");
      });
      recordDeath({
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_foyer",
      });
      await expect(flushTelemetry()).resolves.toBeUndefined();

      // 3. Exporter forceFlush() rejects (e.g. collector timeout)
      exporterForceFlushSpy.mockRejectedValue(new Error("Collector request timed out"));
      await expect(flushTelemetry()).resolves.toBeUndefined();

      // 4. meterProvider.forceFlush() rejects or throws synchronously during recordRunCompleted()
      providerForceFlushSpy.mockRejectedValueOnce(new Error("ForceFlush network timeout"));
      expect(() =>
        recordRunCompleted({
          outcome: "loss",
          final_stage: "stage3",
        }),
      ).not.toThrow();
      await expect(flushTelemetry()).resolves.toBeUndefined();

      providerForceFlushSpy.mockImplementationOnce(() => {
        throw new Error("Synchronous forceFlush failure");
      });
      expect(() =>
        recordRunCompleted({
          outcome: "win",
          final_stage: "stage5",
        }),
      ).not.toThrow();
      await expect(flushTelemetry()).resolves.toBeUndefined();
    });

    it("records metrics via typed helper functions and dispatches to a registered GlobalMeterProvider", () => {
      const recordedMetrics: Array<{ name: string; value: number; attributes?: Attributes }> = [];

      const mockMeter: Meter = {
        createCounter: <T extends Attributes = Attributes>(name: string): Counter<T> => ({
          add: (value: number, attributes?: T) => {
            recordedMetrics.push({ name, value, attributes });
          },
        }),
        createGauge: vi.fn(),
        createHistogram: vi.fn(),
        createUpDownCounter: vi.fn(),
        createObservableGauge: vi.fn(),
        createObservableCounter: vi.fn(),
        createObservableUpDownCounter: vi.fn(),
        addBatchObservableCallback: vi.fn(),
        removeBatchObservableCallback: vi.fn(),
      };

      const getMeterMock = vi.fn().mockReturnValue(mockMeter);
      const mockProvider: MeterProvider = {
        getMeter: getMeterMock,
      };

      metrics.disable();
      metrics.setGlobalMeterProvider(mockProvider);

      const deathAttrs: DeathAttributes = {
        stage: "stage1",
        death_type: "monster_attack",
        node_id: "stage1_vestibule",
      };
      recordDeath(deathAttrs);

      const runAttrs: RunCompletedAttributes = {
        outcome: "win",
        final_stage: "stage5",
      };
      recordRunCompleted(runAttrs);

      expect(getMeterMock).toHaveBeenCalledWith(METER_NAME, undefined, undefined);
      expect(recordedMetrics).toEqual([
        {
          name: DEATHS_COUNTER_NAME,
          value: 1,
          attributes: deathAttrs,
        },
        {
          name: RUNS_COMPLETED_NAME_EXPECTED(),
          value: 1,
          attributes: runAttrs,
        },
      ]);
    });

    it("handles missing or throwing collectors gracefully without throwing runtime errors", () => {
      metrics.disable();
      expect(() =>
        recordDeath({
          stage: "stage1",
          death_type: "monster_attack",
          node_id: "stage1_vestibule",
        }),
      ).not.toThrow();
      expect(() =>
        recordRunCompleted({
          outcome: "loss",
          final_stage: "stage2",
        }),
      ).not.toThrow();

      // Simulate a collector / provider that throws on counter creation or add()
      const throwingProvider: MeterProvider = {
        getMeter: () => {
          throw new Error("OTEL Collector connection refused");
        },
      };
      metrics.setGlobalMeterProvider(throwingProvider);

      expect(() =>
        deathsCounter.add(1, {
          stage: "stage2",
          death_type: "monster_attack",
          node_id: "stage2_foyer",
        }),
      ).not.toThrow();

      expect(() =>
        runsCompletedCounter.add(1, {
          outcome: "win",
          final_stage: "stage5",
        }),
      ).not.toThrow();

      // Simulate counter.add itself throwing
      deathSpy.mockImplementation(() => {
        throw new Error("Counter add error");
      });
      runCompletedSpy.mockImplementation(() => {
        throw new Error("Counter add error");
      });

      expect(() => transition(createInitialState(), "try to leave")).not.toThrow();
      expect(() => transition(makeState("stage2_death_choice"), "give up")).not.toThrow();
    });
  });

  describe("Stage 1 Fatal Transitions (game.deaths)", () => {
    it("emits game.deaths on stage1_vestibule 'try to leave'", () => {
      transition(makeState("stage1_vestibule"), "try to leave");

      expect(deathSpy).toHaveBeenCalledTimes(1);
      expect(deathSpy).toHaveBeenCalledWith(1, {
        stage: "stage1",
        death_type: "monster_attack",
        node_id: "stage1_vestibule",
      });
      expect(runCompletedSpy).not.toHaveBeenCalled();
    });
  });

  describe("Stage 2 Fatal Transitions (game.deaths)", () => {
    it("emits game.deaths on all Stage 2 fatal transitions", () => {
      // 1. stage2_foyer any other movement/action
      transition(makeState("stage2_foyer", ["mop"]), "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_foyer",
      });

      // 2. stage2_periodicals_check [No Mop] (via 'explore periodicals' and direct)
      transition(makeState("stage2_foyer_searched", []), "explore periodicals");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_periodicals_check",
      });

      transition(makeState("stage2_periodicals_check", []), "1");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_periodicals_check",
      });

      // 3. stage2_reading_room_door 'rattle reading room door'
      transition(makeState("stage2_reading_room_door", ["mop"]), "rattle reading room door");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_reading_room_door",
      });

      // 4. stage2_stacks_door_locked_no_key 'defend yourself' & 'slowly walk backwards'
      transition(makeState("stage2_stacks_door_locked_no_key"), "defend yourself");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_stacks_door_locked_no_key",
      });

      transition(makeState("stage2_stacks_door_locked_no_key"), "slowly walk backwards");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage2",
        death_type: "monster_attack",
        node_id: "stage2_stacks_door_locked_no_key",
      });

      expect(deathSpy).toHaveBeenCalledTimes(6);
      expect(runCompletedSpy).not.toHaveBeenCalled();
    });
  });

  describe("Stage 3 Fatal Transitions (game.deaths)", () => {
    it("emits game.deaths on all Stage 3 fatal transitions with exact death_type and node_id", () => {
      // 1. stage3_arrival [With Mop] -> environmental_hazard
      transition(makeState("stage3_arrival", ["mop", "stacks key"]), "1");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "environmental_hazard",
        node_id: "stage3_arrival",
      });

      // 2. stage3_hub_unexplored 'go deeper' -> monster_attack
      transition(makeState("stage3_hub_unexplored", ["fireplace poker"]), "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "monster_attack",
        node_id: "stage3_hub_unexplored",
      });

      // 3. stage3_foyer_blocked 'go deeper' -> monster_attack
      transition(makeState("stage3_foyer_blocked", ["fireplace poker"]), "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "monster_attack",
        node_id: "stage3_foyer_blocked",
      });

      // 4. stage3_hub 'peer down row 5' -> stage3_row5_warning (no death), then 'peer' -> unknown_death
      const row5Warning = transition(
        makeState("stage3_hub", ["fireplace poker"]),
        "peer down row 5",
      );
      expect(row5Warning.currentNode).toBe("stage3_row5_warning");
      expect(deathSpy).toHaveBeenCalledTimes(3);
      transition(row5Warning, "peer");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "unknown_death",
        node_id: "stage3_row5_warning",
      });

      // 5. stage3_hub 'go down row 1..4' (Rows 1, 2, 4 unsafe; Row 3 unconditionally fatal) -> monster_attack
      for (const row of [1, 2, 3, 4]) {
        transition(makeState("stage3_hub", ["fireplace poker"]), `go down row ${row}`);
        expect(deathSpy).toHaveBeenLastCalledWith(1, {
          stage: "stage3",
          death_type: "monster_attack",
          node_id: "stage3_hub",
        });
      }

      // 6. stage3_hub 'go down row 5' -> unknown_death
      transition(makeState("stage3_hub", ["fireplace poker"]), "go down row 5");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "unknown_death",
        node_id: "stage3_hub",
      });

      // 7. stage3_row1_encounter 'enter the reading room' -> monster_attack
      transition(makeState("stage3_row1_encounter", ["fireplace poker"]), "enter the reading room");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "monster_attack",
        node_id: "stage3_row1_encounter",
      });

      // 8. stage3_row2_flashlight_check [No Flashlight] -> stage3_row2_dark_warning (no death), then 'go deeper' -> monster_attack
      const darkWarning = transition(
        makeState("stage3_row2_encounter", ["fireplace poker"]),
        "go deeper",
      );
      expect(darkWarning.currentNode).toBe("stage3_row2_dark_warning");
      expect(deathSpy).toHaveBeenCalledTimes(10);
      transition(darkWarning, "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "monster_attack",
        node_id: "stage3_row2_dark_warning",
      });

      // 9. stage3_row4_encounter & stage3_row4_looted 'go deeper' -> monster_attack
      transition(makeState("stage3_row4_encounter", ["fireplace poker"]), "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "monster_attack",
        node_id: "stage3_row4_encounter",
      });

      transition(makeState("stage3_row4_looted", ["fireplace poker"]), "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "monster_attack",
        node_id: "stage3_row4_looted",
      });

      expect(deathSpy).toHaveBeenCalledTimes(13);
      expect(runCompletedSpy).not.toHaveBeenCalled();
    });
  });

  describe("Stage 4 Fatal Transitions (game.deaths)", () => {
    it("emits game.deaths on all Stage 4 fatal transitions", () => {
      // 1. stage4_entry 'go deeper' -> environmental_hazard
      transition(makeState("stage4_entry", ["flashlight"]), "go deeper");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_entry",
      });

      // 2. stage4_junction_a 'go left' -> environmental_hazard
      transition(makeState("stage4_junction_a", ["flashlight"]), "go left");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_junction_a",
      });

      // 3. stage4_junction_b 'go straight' -> environmental_hazard
      transition(makeState("stage4_junction_b", ["flashlight"]), "go straight");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_junction_b",
      });

      // 4. stage4_junction_c 'go around' -> environmental_hazard
      transition(makeState("stage4_junction_c", ["flashlight"]), "go around");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_junction_c",
      });

      // 5. stage4_junction_c_check [No Pocketknife] -> environmental_hazard
      transition(makeState("stage4_junction_c", ["flashlight"]), "go forward");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_junction_c_check",
      });

      // 6. stage4_junction_e 'step down' -> environmental_hazard
      transition(makeState("stage4_junction_e", ["flashlight", "pocketknife"]), "step down");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_junction_e",
      });

      // 7. stage4_junction_f 'explore alcove' -> monster_attack
      transition(makeState("stage4_junction_f", ["flashlight", "pocketknife"]), "explore alcove");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "monster_attack",
        node_id: "stage4_junction_f",
      });

      // 8. stage4_junction_g 'climb aisle' -> environmental_hazard
      transition(makeState("stage4_junction_g", ["flashlight", "pocketknife"]), "climb aisle");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage4",
        death_type: "environmental_hazard",
        node_id: "stage4_junction_g",
      });

      expect(deathSpy).toHaveBeenCalledTimes(8);
      expect(runCompletedSpy).not.toHaveBeenCalled();
    });
  });

  describe("Stage 5 Fatal Transitions (game.deaths)", () => {
    it("emits game.deaths on all Stage 5 non-terminal fatal transitions", () => {
      // 1. stage5_mezzanine_arrival 'go forward' -> environmental_hazard
      transition(makeState("stage5_mezzanine_arrival"), "go forward");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "environmental_hazard",
        node_id: "stage5_mezzanine_arrival",
      });

      // 2. stage5_mezzanine_searched 'look over railing' -> monster_attack
      transition(makeState("stage5_mezzanine_searched"), "look over railing");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "monster_attack",
        node_id: "stage5_mezzanine_searched",
      });

      // 3. stage5_balcony_door 'go out on the balcony' -> environmental_hazard
      transition(makeState("stage5_balcony_door"), "go out on the balcony");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "environmental_hazard",
        node_id: "stage5_balcony_door",
      });

      // 4. stage5_balcony_inspected 'go out on the balcony' -> environmental_hazard
      transition(makeState("stage5_balcony_inspected"), "go out on the balcony");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "environmental_hazard",
        node_id: "stage5_balcony_inspected",
      });

      // 5. stage5_basement_arrival 'go down the stairs' -> environmental_hazard
      transition(makeState("stage5_basement_arrival"), "go down the stairs");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "environmental_hazard",
        node_id: "stage5_basement_arrival",
      });

      // 6. stage5_water_step_1 'jump in' -> monster_attack
      transition(makeState("stage5_water_step_1", ["umbrella"]), "jump in");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "monster_attack",
        node_id: "stage5_water_step_1",
      });

      // 7. stage5_water_step_2 'start running' -> monster_attack
      transition(makeState("stage5_water_step_2", ["umbrella"]), "start running");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "monster_attack",
        node_id: "stage5_water_step_2",
      });

      // 8. stage5_water_step_3 'rush out of the water' -> monster_attack
      transition(makeState("stage5_water_step_3", ["umbrella"]), "rush out of the water");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "monster_attack",
        node_id: "stage5_water_step_3",
      });

      // 9. stage5_occult_archive_entry 'go towards the light' -> environmental_hazard
      transition(makeState("stage5_occult_archive_entry", ["umbrella"]), "go towards the light");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "environmental_hazard",
        node_id: "stage5_occult_archive_entry",
      });

      expect(deathSpy).toHaveBeenCalledTimes(9);
      expect(runCompletedSpy).not.toHaveBeenCalled();
    });

    it("emits both game.deaths and game.runs.completed (loss) on Stage 5 umbrella checks that terminate directly at game_over", () => {
      // stage5_mezzanine_umbrella_check without umbrella
      transition(makeState("stage5_balcony_inspected", []), "go back");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "monster_attack",
        node_id: "stage5_mezzanine_umbrella_check",
      });
      expect(runCompletedSpy).toHaveBeenLastCalledWith(1, {
        outcome: "loss",
        final_stage: "stage5",
      });

      // stage5_mezzanine_umbrella_check with umbrella
      transition(makeState("stage5_balcony_inspected", ["umbrella"]), "go back");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "monster_attack",
        node_id: "stage5_mezzanine_umbrella_check",
      });
      expect(runCompletedSpy).toHaveBeenLastCalledWith(1, {
        outcome: "loss",
        final_stage: "stage5",
      });

      // stage5_basement_umbrella_check without umbrella
      transition(makeState("stage5_basement_searched", []), "go further");
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage5",
        death_type: "environmental_hazard",
        node_id: "stage5_basement_umbrella_check",
      });
      expect(runCompletedSpy).toHaveBeenLastCalledWith(1, {
        outcome: "loss",
        final_stage: "stage5",
      });

      expect(deathSpy).toHaveBeenCalledTimes(3);
      expect(runCompletedSpy).toHaveBeenCalledTimes(3);
      // each death and each run completion flushes once
      expect(providerForceFlushSpy).toHaveBeenCalledTimes(6);
    });
  });

  describe("Death flushing & exactly-once recording", () => {
    it("flushes telemetry on every recorded death", () => {
      transition(makeState("stage2_foyer", ["mop"]), "go deeper");
      expect(providerForceFlushSpy).toHaveBeenCalledTimes(1);
    });

    it("records exactly one death for Stage 2 foyer, periodicals, reading room door, stacks door and Stage 3 arrival", () => {
      transition(makeState("stage2_foyer", ["mop"]), "go deeper");
      expect(deathSpy).toHaveBeenCalledTimes(1);
      transition(makeState("stage2_foyer_searched", []), "explore periodicals");
      expect(deathSpy).toHaveBeenCalledTimes(2);
      transition(makeState("stage2_reading_room_door", ["mop"]), "rattle reading room door");
      expect(deathSpy).toHaveBeenCalledTimes(3);
      transition(makeState("stage2_stacks_door_locked_no_key", ["mop"]), "defend yourself");
      expect(deathSpy).toHaveBeenCalledTimes(4);
      transition(makeState("stage2_poker_acquired", ["mop", "stacks key"]), "go deeper");
      expect(deathSpy).toHaveBeenCalledTimes(5);
      expect(deathSpy).toHaveBeenLastCalledWith(1, {
        stage: "stage3",
        death_type: "environmental_hazard",
        node_id: "stage3_arrival",
      });
    });

    it("does not record an extra death on 'try again' respawn", () => {
      transition(makeState("stage2_death_choice", ["mop"]), "try again");
      transition(makeState("stage2_death_choice", []), "try again");
      transition(makeState("stage3_early_death_choice", ["mop"]), "try again");
      expect(deathSpy).not.toHaveBeenCalled();
    });
  });

  describe("Terminal Run Outcomes (game.runs.completed)", () => {
    it("emits game.runs.completed with outcome 'loss' and corresponding final_stage when choosing 'give up' on death screens", () => {
      const deathPromptCases: Array<{
        node: NodeId;
        stage: RunCompletedAttributes["final_stage"];
      }> = [
        { node: "stage2_death_choice", stage: "stage2" },
        { node: "stage2_rattle_death_choice", stage: "stage2" },
        { node: "stage2_no_key_death_choice", stage: "stage2" },
        { node: "stage3_early_death_choice", stage: "stage3" },
        { node: "stage3_death_choice", stage: "stage3" },
        { node: "stage4_death_choice", stage: "stage4" },
        { node: "stage5_mezzanine_death_choice", stage: "stage5" },
        { node: "stage5_basement_death_choice", stage: "stage5" },
      ];

      for (const { node, stage } of deathPromptCases) {
        const result = transition(makeState(node), "give up");
        expect(result.currentNode).toBe("game_over");
        expect(result.isGameOver).toBe(true);
        expect(runCompletedSpy).toHaveBeenLastCalledWith(1, {
          outcome: "loss",
          final_stage: stage,
        });
      }

      expect(runCompletedSpy).toHaveBeenCalledTimes(deathPromptCases.length);
      expect(providerForceFlushSpy).toHaveBeenCalledTimes(deathPromptCases.length);
      expect(deathSpy).not.toHaveBeenCalled();
    });

    it("emits game.runs.completed with outcome 'win' and final_stage 'stage5' when reaching game_win", () => {
      const winFromPartial = transition(
        makeState("stage5_cave_approach_partial", ["umbrella"]),
        "climb out to safety",
      );
      expect(winFromPartial.currentNode).toBe("game_win");
      expect(winFromPartial.isWin).toBe(true);
      expect(runCompletedSpy).toHaveBeenLastCalledWith(1, {
        outcome: "win",
        final_stage: "stage5",
      });

      const winFromFinal = transition(
        makeState("stage5_cave_approach_final", ["umbrella"]),
        "climb out to safety",
      );
      expect(winFromFinal.currentNode).toBe("game_win");
      expect(winFromFinal.isWin).toBe(true);
      expect(runCompletedSpy).toHaveBeenLastCalledWith(1, {
        outcome: "win",
        final_stage: "stage5",
      });

      expect(runCompletedSpy).toHaveBeenCalledTimes(2);
      expect(providerForceFlushSpy).toHaveBeenCalledTimes(2);
      expect(deathSpy).not.toHaveBeenCalled();

      // Verify no duplicate metrics after run is already completed
      transition(winFromFinal, "climb out to safety");
      expect(runCompletedSpy).toHaveBeenCalledTimes(2);
      expect(providerForceFlushSpy).toHaveBeenCalledTimes(2);
    });
  });
});

function RUNS_COMPLETED_NAME_EXPECTED(): string {
  return RUNS_COMPLETED_COUNTER_NAME;
}
