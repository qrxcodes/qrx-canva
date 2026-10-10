import type { Oauth } from "@canva/user";
import { auth } from "@canva/user";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TokenSource } from "src/api/qrx_client";
import type { QrxConfig } from "src/config";

export type AuthStatus = "checking" | "signed-out" | "signed-in";

/** The OAuth client for the configured provider. */
export function initQrxOauth(config: Pick<QrxConfig, "oauthProvider">): Oauth {
  return config.oauthProvider
    ? auth.initOauth({ provider: config.oauthProvider, type: "single_account" })
    : auth.initOauth();
}

export type QrxAuth = {
  status: AuthStatus;
  /** Opens Canva's Connect screen. Resolves true once an account is connected. */
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  /** Call when the API refuses the token even after a refresh. */
  markSignedOut: () => void;
  tokens: TokenSource;
};

/**
 * Connects a QRX account through Canva's OAuth support. Canva keeps and
 * refreshes the tokens, so nothing is stored here.
 */
export function useQrxAuth(
  oauth: Oauth,
  config: Pick<QrxConfig, "oauthScopes" | "oauthResource">,
): QrxAuth {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const scope = useMemo(() => new Set(config.oauthScopes), [config]);

  const readToken = useCallback(
    async (forceRefresh = false) => {
      const response = await oauth.getAccessToken({ forceRefresh });
      return response?.token ?? null;
    },
    [oauth],
  );

  useEffect(() => {
    let cancelled = false;
    readToken()
      .then((token) => {
        if (!cancelled) setStatus(token ? "signed-in" : "signed-out");
      })
      .catch(() => {
        if (!cancelled) setStatus("signed-out");
      });
    return () => {
      cancelled = true;
    };
  }, [readToken]);

  const connect = useCallback(async () => {
    const result = await oauth.requestAuthorization({
      scope,
      ...(config.oauthResource
        ? { queryParams: { resource: config.oauthResource } }
        : {}),
    });
    if (result.status !== "completed") {
      return false;
    }
    const token = await readToken();
    setStatus(token ? "signed-in" : "signed-out");
    return Boolean(token);
  }, [oauth, scope, config.oauthResource, readToken]);

  const disconnect = useCallback(async () => {
    await oauth.deauthorize();
    setStatus("signed-out");
  }, [oauth]);

  const markSignedOut = useCallback(() => setStatus("signed-out"), []);

  const tokens = useMemo<TokenSource>(
    () => ({
      getQrxToken: ({ forceRefresh } = {}) => readToken(forceRefresh),
      getCanvaUserToken: () => auth.getCanvaUserToken(),
    }),
    [readToken],
  );

  return { status, connect, disconnect, markSignedOut, tokens };
}
