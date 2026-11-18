import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeLastCapturedError, describeError, runWithErrorCapture } from "../lib/error-capture";
import { renderErrorPage } from "../lib/error-page";
import { isH3SwallowedErrorBody, normalizeCatastrophicSsrResponse } from "../server";
import { errorMiddleware } from "../start";

describe("error-capture", () => {
  afterEach(() => {
    vi.useRealTimers();
    consumeLastCapturedError();
  });

  it("isolates captured errors per concurrent request via runWithErrorCapture", async () => {
    const errA = new Error("request A failed");
    const errB = new Error("request B failed");

    const results = await Promise.all([
      runWithErrorCapture(async () => {
        console.error(errA);
        await new Promise((resolve) => setTimeout(resolve, 10));
        return consumeLastCapturedError();
      }),
      runWithErrorCapture(async () => {
        console.error(errB);
        return consumeLastCapturedError();
      }),
    ]);

    expect(results[0]).toBe(errA);
    expect(results[1]).toBe(errB);
  });

  it("clears the captured error after consumption", () => {
    runWithErrorCapture(() => {
      const err = new Error("once");
      console.error(err);
      expect(consumeLastCapturedError()).toBe(err);
      expect(consumeLastCapturedError()).toBeUndefined();
    });
  });

  it("expires captured errors after the 5s TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    runWithErrorCapture(() => {
      console.error(new Error("stale"));
      vi.advanceTimersByTime(5_001);
      expect(consumeLastCapturedError()).toBeUndefined();
    });
  });

  it("does not capture non-Error values logged via console.error", () => {
    runWithErrorCapture(() => {
      console.error("plain string", { detail: 123 });
      expect(consumeLastCapturedError()).toBeUndefined();
    });
  });

  describe("describeError", () => {
    it("formats an Error with status/statusCode and cause chain", () => {
      const rootCause = new Error("db timeout");
      const midError = Object.assign(new Error("query failed", { cause: rootCause }), {
        statusCode: 503,
      });
      const topError = Object.assign(new Error("request failed", { cause: midError }), {
        status: 500,
      });

      const description = describeError(topError);
      expect(description).toContain("request failed");
      expect(description).toContain("(status 500)");
      expect(description).toContain("caused by:");
      expect(description).toContain("query failed");
      expect(description).toContain("(status 503)");
      expect(description).toContain("db timeout");
    });

    it("falls back to name and message when stack is absent", () => {
      const err = new Error("no stack");
      delete err.stack;
      expect(describeError(err)).toBe("Error: no stack");
    });

    it("enforces the cause depth limit of 5", () => {
      let current = new Error("cause-6");
      for (let i = 5; i >= 0; i--) {
        current = new Error(`cause-${i}`, { cause: current });
      }

      const description = describeError(current);
      expect(description).toContain("cause-0");
      expect(description).toContain("cause-4");
      expect(description).not.toContain("cause-5");
      expect(description).not.toContain("cause-6");
    });

    it("handles non-Error values including strings, objects, circular refs, and null", () => {
      expect(describeError("raw failure")).toBe("raw failure");
      expect(describeError({ code: "ERR_BAD" })).toBe('{"code":"ERR_BAD"}');
      expect(describeError(null)).toBe("");
      expect(describeError(undefined)).toBe("");

      const circular: Record<string, unknown> = {};
      circular["self"] = circular;
      expect(describeError(circular)).toBe("[object Object]");
    });

    it("truncates descriptions to 8,000 characters", () => {
      const longError = new Error("x".repeat(10_000));
      expect(describeError(longError).length).toBe(8_000);
    });
  });
});

describe("error-page", () => {
  it("renders a standalone 500 fallback HTML page", () => {
    const html = renderErrorPage();
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>This page didn't load</title>");
    expect(html).toContain('href="/"');
    expect(html).toContain("Try again");
  });
});

describe("server catastrophic SSR normalization", () => {
  describe("isH3SwallowedErrorBody", () => {
    it("matches h3 unhandled HTTPError JSON payloads", () => {
      expect(isH3SwallowedErrorBody('{"unhandled":true,"message":"HTTPError"}')).toBe(true);
      expect(isH3SwallowedErrorBody('{"status":500,"unhandled":true,"message":"HTTPError"}')).toBe(
        true,
      );
    });

    it("rejects non-matching JSON and malformed bodies", () => {
      expect(isH3SwallowedErrorBody('{"unhandled":false,"message":"HTTPError"}')).toBe(false);
      expect(isH3SwallowedErrorBody('{"unhandled":true,"message":"OtherError"}')).toBe(false);
      expect(isH3SwallowedErrorBody("null")).toBe(false);
      expect(isH3SwallowedErrorBody("not json")).toBe(false);
    });
  });

  describe("normalizeCatastrophicSsrResponse", () => {
    it("passes through responses with status < 500", async () => {
      const res = new Response('{"unhandled":true,"message":"HTTPError"}', {
        status: 404,
        headers: { "content-type": "application/json" },
      });
      expect(await normalizeCatastrophicSsrResponse(res)).toBe(res);
    });

    it("passes through 500 responses without application/json content-type", async () => {
      const res = new Response('{"unhandled":true,"message":"HTTPError"}', {
        status: 500,
        headers: { "content-type": "text/html" },
      });
      expect(await normalizeCatastrophicSsrResponse(res)).toBe(res);
    });

    it("passes through 500 JSON responses that are not h3 swallowed errors", async () => {
      const res = new Response('{"error":"validation"}', {
        status: 500,
        headers: { "content-type": "application/json" },
      });
      expect(await normalizeCatastrophicSsrResponse(res)).toBe(res);
    });

    it("normalizes h3 swallowed 500 JSON responses to HTML and consumes the captured error", async () => {
      await runWithErrorCapture(async () => {
        const boom = new Error("SSR exploded");
        console.error(boom);

        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        try {
          const h3Response = new Response('{"unhandled":true,"message":"HTTPError"}', {
            status: 500,
            headers: { "content-type": "application/json; charset=utf-8" },
          });

          const normalized = await normalizeCatastrophicSsrResponse(h3Response);
          expect(normalized.status).toBe(500);
          expect(normalized.headers.get("content-type")).toBe("text/html; charset=utf-8");
          expect(await normalized.text()).toBe(renderErrorPage());
          expect(spy).toHaveBeenCalledWith(boom);
          expect(consumeLastCapturedError()).toBeUndefined();
        } finally {
          spy.mockRestore();
        }
      });
    });
  });
});

describe("start errorMiddleware", () => {
  type ServerHandler = NonNullable<typeof errorMiddleware.options.server>;
  type ServerArgs = Parameters<ServerHandler>[0];

  const runMiddleware = (next: () => Promise<unknown>) =>
    errorMiddleware.options.server!({ next } as ServerArgs);

  it("returns the downstream result when next() succeeds", async () => {
    const ok = new Response("ok", { status: 200 });
    const result = await runMiddleware(async () => ok);
    expect(result).toBe(ok);
  });

  it("rethrows errors that carry a statusCode", async () => {
    const notFound = Object.assign(new Error("Not found"), { statusCode: 404 });
    await expect(
      runMiddleware(async () => {
        throw notFound;
      }),
    ).rejects.toBe(notFound);
  });

  it("returns a 500 HTML error page for unexpected errors without statusCode", async () => {
    const result = (await runMiddleware(async () => {
      throw new Error("unexpected failure");
    })) as unknown as Response;

    expect(result).toBeInstanceOf(Response);
    expect(result.status).toBe(500);
    expect(result.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await result.text()).toBe(renderErrorPage());
  });
});
