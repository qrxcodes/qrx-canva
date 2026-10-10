import { QrxApiError } from "src/api/qrx_client";
import type { Code } from "src/api/types";
import { CodeFailedError, describeError, UploadError } from "src/logic/errors";
import { GenerationTimeoutError, generateCode } from "src/logic/generation";
import { estimateProgress, isSlow } from "src/logic/progress";
import {
  checkLink,
  checkPrompt,
  hasBlockedWords,
  normaliseLink,
} from "src/logic/validation";
import { messages } from "src/messages";
import { makeCode } from "src/utils/fake_qrx";

describe("checkPrompt", () => {
  it("accepts an ordinary description", () => {
    expect(checkPrompt("A lighthouse on a cliff at sunset")).toBeUndefined();
  });

  it("refuses an empty or blank description", () => {
    expect(checkPrompt("")).toBe("missing");
    expect(checkPrompt("   ")).toBe("missing");
  });

  it("refuses a description over 1,000 characters", () => {
    expect(checkPrompt("a".repeat(1001))).toBe("too-long");
    expect(checkPrompt("a".repeat(1000))).toBeUndefined();
  });

  it("refuses blocked words, as the API's filter does", () => {
    expect(hasBlockedWords("a fucking lighthouse")).toBe(true);
    expect(checkPrompt("a fucking lighthouse")).toBe("blocked-words");
    expect(hasBlockedWords("Scunthorpe harbour at dawn")).toBe(false);
  });
});

describe("links", () => {
  it("adds https:// when no scheme was typed", () => {
    expect(normaliseLink(" example.com/menu ")).toBe(
      "https://example.com/menu",
    );
    expect(normaliseLink("http://example.com")).toBe("http://example.com");
    expect(normaliseLink("")).toBe("");
  });

  it("accepts web addresses", () => {
    expect(checkLink("example.com/menu")).toBeUndefined();
    expect(checkLink("https://example.com/a?b=c#d")).toBeUndefined();
  });

  it("refuses empty, non-web and malformed links", () => {
    expect(checkLink("")).toBe("missing");
    expect(checkLink("mailto:hi@example.com")).toBe("invalid");
    expect(checkLink("ftp://example.com")).toBe("invalid");
    expect(checkLink("not a link")).toBe("invalid");
    expect(checkLink("https://nodot")).toBe("invalid");
  });

  it("refuses links over 2,048 characters", () => {
    expect(checkLink(`https://example.com/${"a".repeat(2048)}`)).toBe(
      "too-long",
    );
  });
});

describe("estimateProgress", () => {
  const minute = 60_000;

  it("moves linearly to 90% at the expected time", () => {
    expect(estimateProgress(0, minute)).toBe(0);
    expect(estimateProgress(30_000, minute)).toBeCloseTo(45);
    expect(estimateProgress(minute, minute)).toBeCloseTo(90);
  });

  it("keeps creeping but never reaches 100% on its own", () => {
    const later = estimateProgress(2 * minute, minute);
    const muchLater = estimateProgress(20 * minute, minute);
    expect(later).toBeGreaterThan(90);
    expect(muchLater).toBeGreaterThan(later);
    expect(muchLater).toBeLessThanOrEqual(98);
  });

  it("calls a wait slow after one and a half times the usual", () => {
    expect(isSlow(80_000, minute)).toBe(false);
    expect(isSlow(95_000, minute)).toBe(true);
  });
});

describe("generateCode", () => {
  const request = { prompt: "p", destination: "https://example.com" };

  const client = (codes: Code[]) => {
    const queue = [...codes];
    return {
      createCode: jest.fn(async () => queue.shift() as Code),
      getCode: jest.fn(async () => queue.shift() as Code),
    };
  };

  it("long-polls until the code succeeds", async () => {
    const fake = client([
      makeCode({ status: "processing" }),
      makeCode({ status: "processing" }),
      makeCode({ status: "succeeded" }),
    ]);
    const onStarted = jest.fn();

    const code = await generateCode({
      client: fake,
      request,
      idempotencyKey: "k",
      waitSeconds: 25,
      maxMs: 60_000,
      onStarted,
    });

    expect(code.status).toBe("succeeded");
    expect(fake.createCode).toHaveBeenCalledWith(request, "k", undefined);
    expect(fake.getCode).toHaveBeenCalledTimes(2);
    expect(fake.getCode).toHaveBeenCalledWith("k7m2qz", 25, undefined);
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("returns a failed code rather than polling forever", async () => {
    const fake = client([
      makeCode({ status: "processing" }),
      makeCode({ status: "failed", error: { message: "nope" } }),
    ]);

    const code = await generateCode({
      client: fake,
      request,
      idempotencyKey: "k",
      waitSeconds: 25,
      maxMs: 60_000,
    });

    expect(code.status).toBe("failed");
  });

  it("treats unknown statuses as still in progress", async () => {
    const fake = client([
      makeCode({ status: "queued" }),
      makeCode({ status: "painting" }),
      makeCode({ status: "succeeded" }),
    ]);

    const code = await generateCode({
      client: fake,
      request,
      idempotencyKey: "k",
      waitSeconds: 25,
      maxMs: 60_000,
    });

    expect(code.status).toBe("succeeded");
    expect(fake.getCode).toHaveBeenCalledTimes(2);
  });

  it("gives up after maxMs with the code so far", async () => {
    let time = 0;
    const fake = {
      createCode: jest.fn(async () => makeCode({ status: "processing" })),
      getCode: jest.fn(async () => {
        time += 30_000;
        return makeCode({ status: "processing" });
      }),
    };

    const error = await generateCode({
      client: fake,
      request,
      idempotencyKey: "k",
      waitSeconds: 25,
      maxMs: 60_000,
      now: () => time,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GenerationTimeoutError);
    expect(fake.getCode).toHaveBeenCalledTimes(2);
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    const fake = {
      createCode: jest.fn(async () => {
        controller.abort();
        return makeCode({ status: "processing" });
      }),
      getCode: jest.fn(),
    };

    await expect(
      generateCode({
        client: fake,
        request,
        idempotencyKey: "k",
        waitSeconds: 25,
        maxMs: 60_000,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fake.getCode).not.toHaveBeenCalled();
  });
});

describe("describeError", () => {
  it("offers plans or the browser for the daily limit", () => {
    expect(
      describeError(new QrxApiError("daily-limit", "x", { status: 429 })),
    ).toMatchObject({
      message: messages.errorDailyLimit,
      action: "daily-limit",
    });
  });

  it("asks to reconnect when the account is disconnected", () => {
    expect(describeError(new QrxApiError("unauthorized", "x"))).toMatchObject({
      action: "reconnect",
    });
  });

  it("passes on the API's explanation for a refused request", () => {
    const error = new QrxApiError("invalid-request", "x", {
      status: 422,
      problem: {
        type: "t",
        title: "t",
        status: 422,
        detail: "The prompt isn't allowed.",
      },
    });
    expect(describeError(error)).toMatchObject({
      message: messages.errorInvalid,
      values: { detail: "The prompt isn't allowed." },
    });
  });

  it("covers failed codes, uploads, timeouts and the unknown", () => {
    expect(describeError(new CodeFailedError()).message).toBe(
      messages.errorFailed,
    );
    expect(describeError(new UploadError()).message).toBe(messages.errorUpload);
    expect(describeError(new GenerationTimeoutError(makeCode())).tone).toBe(
      "info",
    );
    expect(describeError(new Error("?")).message).toBe(messages.errorGeneric);
  });
});
