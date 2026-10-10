#!/usr/bin/env node
/* eslint-disable no-console */
// Prints the values to enter in the Canva Developer Portal (Inside Canva >
// Auth providers) and the CORS origin the QRX API must allow, from `.env`.
import path from "node:path";
import { readQrxConfig } from "../utils/qrx_config";
import { loadDotEnv } from "./env";

type ServerMetadata = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint?: string;
  scopes_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
};

export function canvaAppOrigin(appId: string): string {
  return `https://app-${appId.toLowerCase()}.canva-apps.com`;
}

async function main() {
  loadDotEnv(path.resolve(__dirname, ".."));
  const qrx = readQrxConfig(process.env);
  const issuer = process.env.QRX_OAUTH_ISSUER?.trim();
  const clientId = process.env.QRX_OAUTH_CLIENT_ID?.trim();
  const appId = process.env.CANVA_APP_ID?.trim();

  if (!issuer) {
    throw new Error("Set QRX_OAUTH_ISSUER in .env");
  }

  const res = await fetch(
    new URL("/.well-known/oauth-authorization-server", issuer),
  );
  if (!res.ok) {
    throw new Error(`Could not read ${issuer} metadata: HTTP ${res.status}`);
  }
  const meta = (await res.json()) as ServerMetadata;

  const missing = qrx.oauthScopes.filter(
    (scope) => !(meta.scopes_supported ?? []).includes(scope),
  );

  const rows: [string, string][] = [
    ["Provider", qrx.oauthProvider || "(default)"],
    ["Client ID", clientId || "(set QRX_OAUTH_CLIENT_ID)"],
    ["Client secret", "(from the Clerk OAuth application; never committed)"],
    [
      "Credential transfer mode",
      meta.token_endpoint_auth_methods_supported?.includes(
        "client_secret_basic",
      )
        ? "Headers"
        : "Body",
    ],
    ["Authorization server URL", meta.authorization_endpoint],
    ["Token exchange URL", meta.token_endpoint],
    ["Revocation exchange URL", meta.revocation_endpoint ?? "(none)"],
    ["PKCE", "On"],
    ["Scopes the app requests", qrx.oauthScopes.join(" ")],
    ["Resource parameter", qrx.oauthResource || "(none)"],
  ];

  console.log("Canva Developer Portal > Inside Canva > Auth providers\n");
  for (const [key, value] of rows) {
    console.log(`  ${key.padEnd(26)} ${value}`);
  }
  console.log(
    "\n  Copy the read-only Redirect URL from that dialog into the Clerk OAuth application.",
  );
  if (missing.length > 0) {
    console.log(`\n  Warning: ${issuer} does not list ${missing.join(", ")}`);
  }

  console.log("\nQRX API");
  console.log(`  API base                   ${qrx.apiBase}`);
  console.log(`  Mode                       ${qrx.apiMode}`);
  console.log(
    `  CORS origin to allow       ${appId ? canvaAppOrigin(appId) : "(set CANVA_APP_ID)"}`,
  );
  if (qrx.apiMode === "canva") {
    console.log(
      `  Extra request header       ${qrx.tokenHeader} (allow it in CORS preflight)`,
    );
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
