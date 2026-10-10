import type { QrxClient } from "src/api/qrx_client";
import type { Code, CreateCodeRequest } from "src/api/types";
import { isFinished } from "src/api/types";

export class GenerationTimeoutError extends Error {
  readonly code: Code;

  constructor(code: Code) {
    super("The code is taking longer than usual");
    this.name = "GenerationTimeoutError";
    this.code = code;
  }
}

export type GenerationOptions = {
  client: Pick<QrxClient, "createCode" | "getCode">;
  request: CreateCodeRequest;
  idempotencyKey: string;
  /** Seconds each status request waits on the server. */
  waitSeconds: number;
  /** Give up waiting (the code keeps going on the server) after this long. */
  maxMs: number;
  signal?: AbortSignal;
  now?: () => number;
  onStarted?: (code: Code) => void;
};

/**
 * Starts a code and long-polls it until it succeeds or fails. Resolves with
 * the finished code (either status); rejects on API errors, on abort, and
 * with GenerationTimeoutError when maxMs passes first.
 */
export async function generateCode(options: GenerationOptions): Promise<Code> {
  const now = options.now ?? Date.now;
  const started = now();

  let code = await options.client.createCode(
    options.request,
    options.idempotencyKey,
    options.signal,
  );
  options.onStarted?.(code);

  while (!isFinished(code)) {
    if (options.signal?.aborted) {
      throw abortError();
    }
    if (now() - started >= options.maxMs) {
      throw new GenerationTimeoutError(code);
    }
    code = await options.client.getCode(
      code.id,
      options.waitSeconds,
      options.signal,
    );
  }
  return code;
}

function abortError(): Error {
  const error = new Error("Stopped waiting");
  error.name = "AbortError";
  return error;
}

/** A fresh key for each code the person asks for. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `canva-${crypto.randomUUID()}`;
  }
  return `canva-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
