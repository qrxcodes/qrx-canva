import { canvaAppOrigin } from "../../scripts/portal_config";
import { DEFAULT_QRX_CONFIG, readQrxConfig } from "../qrx_config";

describe("readQrxConfig", () => {
  it("uses production defaults when nothing is set", () => {
    expect(readQrxConfig({})).toEqual(DEFAULT_QRX_CONFIG);
  });

  it("reads every setting from the environment", () => {
    expect(
      readQrxConfig({
        QRX_API_BASE: "https://dev.qrx.codes/",
        QRX_API_MODE: "direct",
        QRX_TOKEN_HEADER: "X-QRX-Token",
        QRX_OAUTH_SCOPES: "qrx:read, qrx:generate",
        QRX_OAUTH_RESOURCE: "https://dev.qrx.codes/v1",
        QRX_OAUTH_PROVIDER: "qrx",
      }),
    ).toEqual({
      apiBase: "https://dev.qrx.codes",
      apiMode: "direct",
      tokenHeader: "X-QRX-Token",
      oauthScopes: ["qrx:read", "qrx:generate"],
      oauthResource: "https://dev.qrx.codes/v1",
      oauthProvider: "qrx",
      siteUrl: "https://dev.qrx.codes",
    });
  });

  it("asks for the REST API's audience on the chosen host by default", () => {
    expect(
      readQrxConfig({ QRX_API_BASE: "https://dev.qrx.codes" }).oauthResource,
    ).toBe("https://dev.qrx.codes/v1");
    expect(readQrxConfig({ QRX_OAUTH_RESOURCE: "none" }).oauthResource).toBe(
      "",
    );
  });

  it("treats blank values as unset", () => {
    expect(
      readQrxConfig({ QRX_API_BASE: " ", QRX_OAUTH_RESOURCE: "" }),
    ).toEqual(DEFAULT_QRX_CONFIG);
  });

  it("refuses plain http except on localhost", () => {
    expect(() => readQrxConfig({ QRX_API_BASE: "http://qrx.codes" })).toThrow(
      /https/,
    );
    expect(
      readQrxConfig({ QRX_API_BASE: "http://localhost:4001" }).apiBase,
    ).toBe("http://localhost:4001");
    expect(() =>
      readQrxConfig(
        { QRX_API_BASE: "http://localhost:4001" },
        { production: true },
      ),
    ).toThrow(/production/);
  });

  it("refuses an unknown mode or a bad header name", () => {
    expect(() => readQrxConfig({ QRX_API_MODE: "proxy" })).toThrow(/MODE/);
    expect(() => readQrxConfig({ QRX_TOKEN_HEADER: "Authorization" })).toThrow(
      /HEADER/,
    );
    expect(() => readQrxConfig({ QRX_TOKEN_HEADER: "X QRX" })).toThrow(
      /HEADER/,
    );
  });
});

describe("canvaAppOrigin", () => {
  it("lower-cases the app ID, as Canva serves the app", () => {
    expect(canvaAppOrigin("AABBccddeeff")).toBe(
      "https://app-aabbccddeeff.canva-apps.com",
    );
  });
});
