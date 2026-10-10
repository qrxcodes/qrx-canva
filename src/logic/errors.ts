import type { MessageDescriptor } from "react-intl";
import { QrxApiError } from "src/api/qrx_client";
import { messages } from "src/messages";
import { GenerationTimeoutError } from "./generation";

export type ErrorAction = "reconnect" | "daily-limit" | "retry" | "none";

export type ErrorView = {
  message: MessageDescriptor;
  values?: Record<string, string>;
  action: ErrorAction;
  /** "info" for things that aren't really failures, such as a slow code. */
  tone: "critical" | "warn" | "info";
};

export class CodeFailedError extends Error {
  constructor(message?: string) {
    super(message || "The code failed");
    this.name = "CodeFailedError";
  }
}

export class UploadError extends Error {
  readonly original: unknown;

  constructor(original?: unknown) {
    super("Upload failed");
    this.name = "UploadError";
    this.original = original;
  }
}

/** Decides what the panel says (and offers) for an error. */
export function describeError(error: unknown): ErrorView {
  if (error instanceof GenerationTimeoutError) {
    return { message: messages.errorTimeout, action: "none", tone: "info" };
  }
  if (error instanceof CodeFailedError) {
    return { message: messages.errorFailed, action: "retry", tone: "critical" };
  }
  if (error instanceof UploadError) {
    return { message: messages.errorUpload, action: "none", tone: "critical" };
  }
  if (!(error instanceof QrxApiError)) {
    return {
      message: messages.errorGeneric,
      action: "retry",
      tone: "critical",
    };
  }

  switch (error.kind) {
    case "daily-limit":
      return {
        message: messages.errorDailyLimit,
        action: "daily-limit",
        tone: "warn",
      };
    case "rate-limited":
    case "conflict":
      return {
        message: messages.errorRateLimited,
        action: "retry",
        tone: "warn",
      };
    case "unauthorized":
      return {
        message: messages.errorUnauthorized,
        action: "reconnect",
        tone: "warn",
      };
    case "forbidden":
      return {
        message: messages.errorForbidden,
        action: "reconnect",
        tone: "critical",
      };
    case "invalid-request":
    case "not-found":
      return {
        message: messages.errorInvalid,
        values: { detail: error.problem?.detail ?? error.message },
        action: "none",
        tone: "critical",
      };
    case "network":
      return {
        message: messages.errorNetwork,
        action: "retry",
        tone: "critical",
      };
    case "server":
    case "unavailable":
      return {
        message: messages.errorServer,
        action: "retry",
        tone: "critical",
      };
    default:
      return {
        message: messages.errorGeneric,
        action: "retry",
        tone: "critical",
      };
  }
}
