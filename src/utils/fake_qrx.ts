// Test helpers: a fake QRX API behind a fetch function, and a fake Canva
// OAuth client. Only imported by tests.
import type { Oauth } from "@canva/user";
import type { Code, Style } from "src/api/types";

export type FakeResponse = {
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  json: () => Promise<unknown>;
};

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): FakeResponse {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

export function problem(status: number, name: string, detail = name) {
  return jsonResponse(status, {
    type: `https://qrx.codes/developers/docs/errors#${name}`,
    title: name,
    status,
    detail,
  });
}

export function makeCode(overrides: Partial<Code> = {}): Code {
  return {
    id: "k7m2qz",
    object: "code",
    status: "succeeded",
    type: "url",
    prompt: "A lighthouse on a cliff at sunset",
    style: null,
    destination: "https://example.com/menu",
    shortUrl: "https://qrx.to/k7m2qz",
    imageUrl: "https://qrx.codes/media/premium/k7m2qz.png",
    pageUrl: "https://qrx.codes/view/k7m2qz",
    error: null,
    createdAt: "2026-10-08T01:23:45.000Z",
    ...overrides,
  };
}

export const STYLES: Style[] = [
  {
    id: "a64c5",
    object: "style",
    name: "Anime",
    previewUrl: "https://qrx.codes/images/styles/anime.png",
  },
  {
    id: "06184",
    object: "style",
    name: "Cartoon",
    previewUrl: "https://qrx.codes/images/styles/cartoon.png",
  },
];

export type Call = {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: unknown;
};

type Route = (
  call: Call,
) => FakeResponse | undefined | Promise<FakeResponse | undefined>;

/**
 * A fetch that answers from `routes` (first match wins) and records every
 * call. Unmatched requests answer 404.
 */
export function fakeFetch(...routes: Route[]) {
  const calls: Call[] = [];
  const fn = jest.fn(async (input: unknown, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? "GET",
      url: new URL(String(input)),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    for (const route of routes) {
      const response = await route(call);
      if (response) return response;
    }
    return problem(404, "not-found");
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

export const route =
  (
    method: string,
    path: string | RegExp,
    respond: (call: Call) => FakeResponse,
  ) =>
  (call: Call) => {
    const matches =
      typeof path === "string"
        ? call.url.pathname === path
        : path.test(call.url.pathname);
    return call.method === method && matches ? respond(call) : undefined;
  };

export function fakeOauth(token: string | null = "qrx-token") {
  let current = token;
  const oauth = {
    getAccessToken: jest.fn(async () =>
      current ? { token: current, scope: new Set<string>() } : null,
    ),
    requestAuthorization: jest.fn(async () => {
      current = "qrx-token";
      return { status: "completed" as const, scope: new Set<string>() };
    }),
    deauthorize: jest.fn(async () => {
      current = null;
    }),
  };
  return oauth as typeof oauth & Oauth;
}
