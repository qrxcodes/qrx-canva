import type { QrxConfig } from "src/config";
import type {
  Code,
  CodeList,
  CreateCodeRequest,
  Problem,
  Style,
  StyleList,
} from "./types";

export type ErrorKind =
  | "unauthorized"
  | "forbidden"
  | "daily-limit"
  | "rate-limited"
  | "invalid-request"
  | "not-found"
  | "conflict"
  | "unavailable"
  | "server"
  | "network";

/** A failed QRX API call, with the problem type reduced to a kind. */
export class QrxApiError extends Error {
  readonly kind: ErrorKind;
  readonly status: number;
  readonly problem?: Problem;
  readonly retryAfterSeconds?: number;

  constructor(
    kind: ErrorKind,
    message: string,
    options: {
      status?: number;
      problem?: Problem;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super(message);
    this.name = "QrxApiError";
    this.kind = kind;
    this.status = options.status ?? 0;
    this.problem = options.problem;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/** Where the client gets its credentials. Canva stores and refreshes both. */
export type TokenSource = {
  /** The QRX OAuth access token, or null when no account is connected. */
  getQrxToken(options?: { forceRefresh?: boolean }): Promise<string | null>;
  /** The Canva user token (JWT) that lets the API check the request's origin. */
  getCanvaUserToken(): Promise<string>;
};

type ClientConfig = Pick<QrxConfig, "apiBase" | "apiMode" | "tokenHeader">;

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

const PROBLEM_KINDS: Record<string, ErrorKind> = {
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  "plan-required": "forbidden",
  "not-found": "not-found",
  "invalid-request": "invalid-request",
  "payload-too-large": "invalid-request",
  unprocessable: "invalid-request",
  "idempotency-mismatch": "invalid-request",
  "idempotency-in-progress": "conflict",
  "daily-limit": "daily-limit",
  "rate-limited": "rate-limited",
  internal: "server",
  unavailable: "unavailable",
};

function kindFromStatus(status: number): ErrorKind {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  if (status === 503) return "unavailable";
  if (status >= 500) return "server";
  return "invalid-request";
}

/** Reads the problem name from a type URI such as `…/errors#daily-limit`. */
export function problemName(type: string | undefined): string | undefined {
  if (!type) return undefined;
  const hash = type.lastIndexOf("#");
  return hash >= 0 ? type.slice(hash + 1) : undefined;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class QrxClient {
  private readonly config: ClientConfig;
  private readonly tokens: TokenSource;
  private readonly fetchImpl: typeof fetch;
  private readonly wait: (ms: number) => Promise<void>;

  constructor(options: {
    config: ClientConfig;
    tokens: TokenSource;
    fetch?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
  }) {
    this.config = options.config;
    this.tokens = options.tokens;
    this.fetchImpl = options.fetch ?? ((...args) => fetch(...args));
    this.wait = options.sleep ?? sleep;
  }

  /** The path prefix for the configured mode. */
  get basePath(): string {
    return this.config.apiMode === "canva" ? "/canva/v1" : "/v1";
  }

  async listStyles(): Promise<Style[]> {
    const list = await this.request<StyleList>("/styles");
    return list.data;
  }

  async listCodes(limit: number): Promise<Code[]> {
    const list = await this.request<CodeList>("/codes", { query: { limit } });
    return list.data;
  }

  async getCode(
    id: string,
    waitSeconds = 0,
    signal?: AbortSignal,
  ): Promise<Code> {
    return this.request<Code>(`/codes/${encodeURIComponent(id)}`, {
      query: { wait: waitSeconds || undefined },
      signal,
    });
  }

  /**
   * Starts a code. The idempotency key makes a retry after a lost response
   * return the same code instead of making (and counting) a second one.
   */
  async createCode(
    body: CreateCodeRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<Code> {
    const send = () =>
      this.request<Code>("/codes", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": idempotencyKey },
        signal,
      });

    let networkRetries = 1;
    let conflictRetries = 3;
    for (;;) {
      try {
        return await send();
      } catch (error) {
        if (!(error instanceof QrxApiError)) throw error;
        if (error.kind === "network" && networkRetries > 0) {
          networkRetries--;
          await this.wait(1000);
          continue;
        }
        if (error.kind === "conflict" && conflictRetries > 0) {
          conflictRetries--;
          await this.wait(Math.min(error.retryAfterSeconds ?? 1, 5) * 1000);
          continue;
        }
        throw error;
      }
    }
  }

  private async headers(
    forceRefresh: boolean,
  ): Promise<Record<string, string>> {
    const qrxToken = await this.tokens.getQrxToken({ forceRefresh });
    if (!qrxToken) {
      throw new QrxApiError("unauthorized", "No QRX account is connected", {
        status: 401,
      });
    }

    if (this.config.apiMode === "canva") {
      const canvaToken = await this.tokens.getCanvaUserToken();
      return {
        Accept: "application/json",
        Authorization: `Bearer ${canvaToken}`,
        [this.config.tokenHeader]: `Bearer ${qrxToken}`,
      };
    }
    return {
      Accept: "application/json",
      Authorization: `Bearer ${qrxToken}`,
    };
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.basePath}${path}`, this.config.apiBase);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const attempt = async (forceRefresh: boolean) => {
      const headers = {
        ...(await this.headers(forceRefresh)),
        ...options.headers,
      };
      let body: string | undefined;
      if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(options.body);
      }
      try {
        return await this.fetchImpl(url.toString(), {
          method: options.method ?? "GET",
          headers,
          body,
          signal: options.signal,
        });
      } catch (error) {
        if (isAbort(error)) throw error;
        throw new QrxApiError("network", "Could not reach QRX");
      }
    };

    let response = await attempt(false);
    if (response.status === 401) {
      // The access token may have been revoked or expired early: refresh once.
      response = await attempt(true);
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    let problem: Problem | undefined;
    try {
      problem = (await response.json()) as Problem;
    } catch {
      problem = undefined;
    }
    const name = problemName(problem?.type);
    const kind =
      (name && PROBLEM_KINDS[name]) || kindFromStatus(response.status);
    throw new QrxApiError(
      kind,
      problem?.detail || `QRX answered ${response.status}`,
      {
        status: response.status,
        problem,
        retryAfterSeconds: parseRetryAfter(response.headers.get("Retry-After")),
      },
    );
  }
}
