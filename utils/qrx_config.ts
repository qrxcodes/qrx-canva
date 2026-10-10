/**
 * How the app sends its requests to the QRX API.
 *
 * - `canva`: to the Canva routes (`/canva/v1`), with the Canva user token in
 *   `Authorization` and the QRX access token in a second header, so the API
 *   can check that each request comes from this app.
 * - `direct`: to the public REST API (`/v1`), with the QRX access token in
 *   `Authorization` and nothing else.
 */
export type QrxApiMode = "canva" | "direct";

export type QrxConfig = {
  /** Origin of the QRX API, such as `https://qrx.codes`. */
  apiBase: string;
  apiMode: QrxApiMode;
  /** Header that carries the QRX access token in `canva` mode. */
  tokenHeader: string;
  /** Scopes requested when connecting a QRX account. */
  oauthScopes: string[];
  /** RFC 8707 `resource` sent on the authorisation request, if any. */
  oauthResource: string;
  /** Auth provider name from the Developer Portal; empty for the default. */
  oauthProvider: string;
  /** The QRX site, for links that open in the browser. */
  siteUrl: string;
};

export const DEFAULT_QRX_CONFIG: QrxConfig = {
  apiBase: "https://qrx.codes",
  apiMode: "canva",
  tokenHeader: "X-QRX-Authorization",
  oauthScopes: ["qrx:read", "qrx:generate", "offline_access"],
  oauthResource: "",
  oauthProvider: "",
  siteUrl: "https://qrx.codes",
};

type Env = Record<string, string | undefined>;

const HEADER_NAME = /^[A-Za-z0-9-]+$/;

function originOf(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL, got "${value}"`);
  }
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error(`${name} must use https, got "${value}"`);
  }
  return url.origin;
}

/**
 * Reads the QRX settings from the environment (and `.env`), checks them, and
 * fills in defaults. Used by `canva-app.config.ts` at build time.
 */
export function readQrxConfig(
  env: Env,
  options: { production?: boolean } = {},
): QrxConfig {
  const get = (key: string) => env[key]?.trim() || undefined;

  const apiBase = originOf(
    get("QRX_API_BASE") ?? DEFAULT_QRX_CONFIG.apiBase,
    "QRX_API_BASE",
  );

  const mode = get("QRX_API_MODE") ?? DEFAULT_QRX_CONFIG.apiMode;
  if (mode !== "canva" && mode !== "direct") {
    throw new Error(`QRX_API_MODE must be "canva" or "direct", got "${mode}"`);
  }

  const tokenHeader = get("QRX_TOKEN_HEADER") ?? DEFAULT_QRX_CONFIG.tokenHeader;
  if (
    !HEADER_NAME.test(tokenHeader) ||
    tokenHeader.toLowerCase() === "authorization"
  ) {
    throw new Error(
      `QRX_TOKEN_HEADER must be a header name other than Authorization, got "${tokenHeader}"`,
    );
  }

  const scopes = get("QRX_OAUTH_SCOPES");
  const oauthScopes = scopes
    ? scopes.split(/[\s,]+/).filter(Boolean)
    : DEFAULT_QRX_CONFIG.oauthScopes;

  const resource = get("QRX_OAUTH_RESOURCE") ?? "";
  if (resource) {
    originOf(resource, "QRX_OAUTH_RESOURCE");
  }

  const siteUrl = originOf(get("QRX_SITE_URL") ?? apiBase, "QRX_SITE_URL");

  const config: QrxConfig = {
    apiBase,
    apiMode: mode,
    tokenHeader,
    oauthScopes,
    oauthResource: resource,
    oauthProvider: get("QRX_OAUTH_PROVIDER") ?? "",
    siteUrl,
  };

  if (options.production && new URL(config.apiBase).protocol !== "https:") {
    throw new Error("A production build needs an https QRX_API_BASE");
  }

  return config;
}
