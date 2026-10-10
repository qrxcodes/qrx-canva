import { problemName, QrxApiError, QrxClient } from "src/api/qrx_client";
import { resolveImageUrl } from "src/api/resolve_image_url";
import type { TokenSource } from "src/api/qrx_client";
import {
  fakeFetch,
  jsonResponse,
  makeCode,
  problem,
  route,
  STYLES,
} from "src/utils/fake_qrx";

const tokens = (overrides: Partial<TokenSource> = {}): TokenSource => ({
  getQrxToken: jest.fn(async () => "qrx-token"),
  getCanvaUserToken: jest.fn(async () => "canva-jwt"),
  ...overrides,
});

const canvaConfig = {
  apiBase: "https://dev.qrx.codes",
  apiMode: "canva" as const,
  tokenHeader: "X-QRX-Authorization",
};

const noSleep = async () => undefined;

describe("QrxClient", () => {
  it("sends the Canva user token and the QRX token to /canva/v1 in canva mode", async () => {
    const api = fakeFetch(
      route("GET", "/canva/v1/styles", () =>
        jsonResponse(200, { object: "list", data: STYLES }),
      ),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
    });

    await expect(client.listStyles()).resolves.toEqual(STYLES);

    const [call] = api.calls;
    expect(call?.url.origin).toBe("https://dev.qrx.codes");
    expect(call?.headers.Authorization).toBe("Bearer canva-jwt");
    expect(call?.headers["X-QRX-Authorization"]).toBe("Bearer qrx-token");
  });

  it("sends only the QRX token to /v1 in direct mode", async () => {
    const api = fakeFetch(
      route("GET", "/v1/codes", () =>
        jsonResponse(200, { object: "list", data: [makeCode()] }),
      ),
    );
    const source = tokens();
    const client = new QrxClient({
      config: { ...canvaConfig, apiMode: "direct" },
      tokens: source,
      fetch: api.fetch,
    });

    await client.listCodes(12);

    const [call] = api.calls;
    expect(call?.url.searchParams.get("limit")).toBe("12");
    expect(call?.headers.Authorization).toBe("Bearer qrx-token");
    expect(call?.headers["X-QRX-Authorization"]).toBeUndefined();
    expect(source.getCanvaUserToken).not.toHaveBeenCalled();
  });

  it("posts a create with its idempotency key and JSON body", async () => {
    const api = fakeFetch(
      route("POST", "/canva/v1/codes", () =>
        jsonResponse(202, makeCode({ status: "processing", imageUrl: null })),
      ),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
    });

    const code = await client.createCode(
      { prompt: "A fox", destination: "https://example.com", style: "a64c5" },
      "key-1",
    );

    expect(code.status).toBe("processing");
    const [call] = api.calls;
    expect(call?.headers["Idempotency-Key"]).toBe("key-1");
    expect(call?.headers["Content-Type"]).toBe("application/json");
    expect(call?.body).toEqual({
      prompt: "A fox",
      destination: "https://example.com",
      style: "a64c5",
    });
  });

  it("asks the server to wait when getting a code", async () => {
    const api = fakeFetch(
      route("GET", "/canva/v1/codes/k7m2qz", () =>
        jsonResponse(200, makeCode()),
      ),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
    });

    await client.getCode("k7m2qz", 25);

    expect(api.calls[0]?.url.searchParams.get("wait")).toBe("25");
  });

  it("refreshes the QRX token once after a 401", async () => {
    let first = true;
    const api = fakeFetch(
      route("GET", "/canva/v1/styles", () => {
        if (first) {
          first = false;
          return problem(401, "unauthorized");
        }
        return jsonResponse(200, { object: "list", data: [] });
      }),
    );
    const source = tokens();
    const client = new QrxClient({
      config: canvaConfig,
      tokens: source,
      fetch: api.fetch,
    });

    await client.listStyles();

    expect(api.calls).toHaveLength(2);
    expect(source.getQrxToken).toHaveBeenLastCalledWith({ forceRefresh: true });
  });

  it("fails as unauthorized without calling the API when no account is connected", async () => {
    const api = fakeFetch();
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens({ getQrxToken: async () => null }),
      fetch: api.fetch,
    });

    await expect(client.listStyles()).rejects.toMatchObject({
      kind: "unauthorized",
    });
    expect(api.calls).toHaveLength(0);
  });

  it.each([
    [429, "daily-limit", "daily-limit"],
    [429, "rate-limited", "rate-limited"],
    [403, "plan-required", "forbidden"],
    [400, "invalid-request", "invalid-request"],
    [422, "unprocessable", "invalid-request"],
    [500, "internal", "server"],
    [503, "unavailable", "unavailable"],
  ])("maps HTTP %i %s to %s", async (status, name, kind) => {
    const api = fakeFetch(
      route("GET", "/canva/v1/styles", () => problem(status, name, "detail")),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
    });

    const error = await client.listStyles().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(QrxApiError);
    expect(error).toMatchObject({ kind, status });
  });

  it("falls back to the HTTP status when the body isn't a problem", async () => {
    const api = fakeFetch(
      route("GET", "/canva/v1/styles", () => ({
        ...jsonResponse(502, null),
        json: async () => {
          throw new Error("not json");
        },
      })),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
    });

    await expect(client.listStyles()).rejects.toMatchObject({ kind: "server" });
  });

  it("retries a create once with the same key after a network failure", async () => {
    let attempts = 0;
    const api = fakeFetch(
      route("POST", "/canva/v1/codes", () => {
        attempts++;
        if (attempts === 1) throw new TypeError("Failed to fetch");
        return jsonResponse(202, makeCode({ status: "processing" }));
      }),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
      sleep: noSleep,
    });

    await client.createCode({ prompt: "p", destination: "https://a.b" }, "k");

    expect(api.calls).toHaveLength(2);
    expect(api.calls.map((c) => c.headers["Idempotency-Key"])).toEqual([
      "k",
      "k",
    ]);
  });

  it("waits out an idempotency conflict, then gets the code", async () => {
    let attempts = 0;
    const sleep = jest.fn(noSleep);
    const api = fakeFetch(
      route("POST", "/canva/v1/codes", () => {
        attempts++;
        if (attempts === 1) {
          return {
            ...problem(409, "idempotency-in-progress"),
            headers: { get: () => "2" },
          };
        }
        return jsonResponse(202, makeCode({ status: "processing" }));
      }),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
      sleep,
    });

    await client.createCode({ prompt: "p", destination: "https://a.b" }, "k");

    expect(sleep).toHaveBeenCalledWith(2000);
    expect(api.calls).toHaveLength(2);
  });

  it("doesn't retry a daily-limit refusal", async () => {
    const api = fakeFetch(
      route("POST", "/canva/v1/codes", () => problem(429, "daily-limit")),
    );
    const client = new QrxClient({
      config: canvaConfig,
      tokens: tokens(),
      fetch: api.fetch,
      sleep: noSleep,
    });

    await expect(
      client.createCode({ prompt: "p", destination: "https://a.b" }, "k"),
    ).rejects.toMatchObject({ kind: "daily-limit" });
    expect(api.calls).toHaveLength(1);
  });
});

describe("problemName", () => {
  it("reads the name after the hash", () => {
    expect(
      problemName("https://qrx.codes/developers/docs/errors#daily-limit"),
    ).toBe("daily-limit");
    expect(problemName("about:blank")).toBeUndefined();
    expect(problemName(undefined)).toBeUndefined();
  });
});

describe("resolveImageUrl", () => {
  const image = "https://qrx.codes/media/premium/k7m2qz.png";

  it("returns where a redirecting image URL ends up", async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      url: "https://images.example.net/premium/k7m2qz.png",
    })) as unknown as typeof fetch;

    await expect(resolveImageUrl(image, fetchImpl)).resolves.toBe(
      "https://images.example.net/premium/k7m2qz.png",
    );
    expect(fetchImpl).toHaveBeenCalledWith(image, { method: "HEAD" });
  });

  it("keeps the original URL when the lookup fails or isn't possible", async () => {
    const failing = jest.fn(async () => {
      throw new TypeError("CORS");
    }) as unknown as typeof fetch;
    const notFound = jest.fn(async () => ({
      ok: false,
      url: "",
    })) as unknown as typeof fetch;

    await expect(resolveImageUrl(image, failing)).resolves.toBe(image);
    await expect(resolveImageUrl(image, notFound)).resolves.toBe(image);
    await expect(resolveImageUrl(image, undefined)).resolves.toBe(image);
  });
});
