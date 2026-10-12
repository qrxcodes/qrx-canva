// Renders the app panel outside Canva, with the SDK stubbed and the QRX API
// faked, so the listing screenshots show the real UI. Not part of the app.
import "@canva/app-ui-kit/styles.css";
import { TestAppI18nProvider } from "@canva/app-i18n-kit";
import { TestAppUiProvider } from "@canva/app-ui-kit";
import type { Oauth } from "@canva/user";
import { createRoot } from "react-dom/client";
import type { Code, Style } from "src/api/types";
import { App } from "src/intents/design_editor/app";
import { DEFAULT_QRX_CONFIG } from "utils/qrx_config";

declare global {
  interface Window {
    harnessPayments?: boolean;
    harnessRelease?: () => void;
  }
}

const params = new URLSearchParams(window.location.search);
const theme = params.get("theme") === "dark" ? "dark" : "light";
const signedIn = params.get("signedIn") !== "0";
const wifiCodes = params.get("wifi") === "1";
window.harnessPayments = params.get("payments") === "1";

const asset = (path: string) => new URL(path, window.location.href).toString();

const STYLE_NAMES: [string, string, string][] = [
  ["Noop", "No Style", "nostyle"],
  ["a64c5", "Anime", "anime"],
  ["06184", "Cartoon", "cartoon"],
  ["994ff", "Charcoal", "charcoal"],
  ["ea58c", "Cyber punk", "cyberpunk"],
  ["30e33", "Digital art", "digitalart"],
  ["09562", "Fantasy", "fantasy"],
  ["1cbd6", "Illustration", "illustration"],
  ["7eb2b", "Photographic", "photographic"],
  ["534d0", "Pixel art", "pixelart"],
  ["abe2f", "Pop art", "popart"],
  ["ae4c1", "Water color", "watercolor"],
];

const styles: Style[] = STYLE_NAMES.map(([id, name, file]) => ({
  id,
  object: "style",
  name,
  previewUrl: asset(`styles/${file}.webp`),
}));

const code = (id: string, prompt: string, image: string): Code => ({
  id,
  object: "code",
  status: "succeeded",
  type: "url",
  prompt,
  style: null,
  destination: "https://example.com/menu",
  shortUrl: `https://qrx.to/${id}`,
  imageUrl: asset(`codes/${image}.webp`),
  pageUrl: `https://qrx.codes/view/${id}`,
  error: null,
  createdAt: "2026-10-10T01:00:00.000Z",
});

const recent: Code[] = [
  code(
    "r4ilwy",
    "A vintage mountain railway poster",
    "26-mountain-railway-poster",
  ),
  code("k0ip0n", "A neon koi pond at night", "16-neon-koi-pond"),
  code("b4k3ry", "A tiny bakery diorama", "18-bakery-diorama"),
  code("b4ll00", "Hot air balloons over a valley", "33-balloon-festival"),
];

const made = code(
  "v1k1ng",
  "A viking longship in a misty fjord",
  "05-viking-fjord",
);

let release: () => void = () => undefined;
const released = new Promise<void>((resolve) => {
  release = resolve;
});
window.harnessRelease = release;

const json = (body: unknown, status = 200) =>
  ({
    ok: status < 300,
    status,
    url: "",
    headers: { get: () => null },
    json: async () => body,
  }) as unknown as Response;

const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  if (url.pathname.endsWith("/styles")) {
    return json({ object: "list", data: styles, hasMore: false });
  }
  if (url.pathname.endsWith("/account")) {
    return json({
      object: "account",
      features: { wifiCodes, changeDestination: wifiCodes },
    });
  }
  if (method === "POST" && url.pathname.endsWith("/logos")) {
    return json(
      {
        id: "3f2b8c1e-7d4a-4f6b-9c2e-5a1d8e7f3b20",
        object: "logo",
        createdAt: "2026-10-13T00:00:00.000Z",
      },
      201,
    );
  }
  if (method === "POST") {
    const body = JSON.parse(String(init?.body)) as { prompt: string };
    made.prompt = body.prompt;
    return json({ ...made, status: "processing", imageUrl: null }, 202);
  }
  if (url.pathname.endsWith(`/codes/${made.id}`)) {
    await released;
    return json(made);
  }
  if (url.pathname.endsWith("/codes")) {
    return json({ object: "list", data: recent, hasMore: false });
  }
  return json({}, 404);
}) as typeof fetch;

let token: string | null = signedIn ? "harness" : null;
const oauth = {
  getAccessToken: async () => (token ? { token, scope: new Set() } : null),
  requestAuthorization: async () => {
    token = "harness";
    return { status: "completed", scope: new Set() };
  },
  deauthorize: async () => {
    token = null;
  },
} as unknown as Oauth;

document.body.dataset.theme = theme;
createRoot(document.getElementById("root") as Element).render(
  <TestAppI18nProvider>
    <TestAppUiProvider theme={theme}>
      <App
        oauth={oauth}
        config={{ ...DEFAULT_QRX_CONFIG, apiBase: "https://qrx.codes" }}
        fetchImpl={fakeFetch}
      />
    </TestAppUiProvider>
  </TestAppI18nProvider>,
);
