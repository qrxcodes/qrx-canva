import { EXAMPLE_DESCRIPTIONS } from "src/logic/example_descriptions";
import { exampleUrlFor, pickExample, planPrefill } from "src/logic/examples";
import {
  checkLogoFile,
  fitLogo,
  inferSvgSize,
  MAX_LOGO_FILE_BYTES,
} from "src/logic/logo";
import { checkWifi, hasBlockedWords } from "src/logic/validation";

describe("examples", () => {
  it("are all descriptions QRX accepts", () => {
    expect(EXAMPLE_DESCRIPTIONS.length).toBeGreaterThan(1);
    for (const description of EXAMPLE_DESCRIPTIONS) {
      expect(hasBlockedWords(description)).toBe(false);
      expect(description.length).toBeLessThanOrEqual(1000);
    }
  });

  it("never picks the one used last", () => {
    const list = ["a", "b", "c"];
    for (const random of [0, 0.5, 0.99]) {
      expect(pickExample("a", () => random, list)).not.toBe("a");
    }
    expect(pickExample("only", () => 0.5, ["only"])).toBe("only");
  });

  it("points a blank link at the site's example page", () => {
    expect(exampleUrlFor("https://qrx.codes")).toBe(
      "https://qrx.codes/example",
    );
    expect(exampleUrlFor("https://dev.qrx.codes/")).toBe(
      "https://dev.qrx.codes/example",
    );
  });

  it("fills only blank fields, and never invents Wi-Fi details", () => {
    const examples = { description: "A fox", url: "https://qrx.codes/example" };
    expect(
      planPrefill({ prompt: " ", link: "", kind: "link" }, examples),
    ).toEqual({ prompt: "A fox", link: "https://qrx.codes/example" });
    expect(
      planPrefill({ prompt: "Mine", link: "a.com", kind: "link" }, examples),
    ).toEqual({});
    expect(
      planPrefill({ prompt: "", link: "", kind: "wifi" }, examples),
    ).toEqual({ prompt: "A fox" });
  });
});

describe("checkWifi", () => {
  it("needs both the network name and the password", () => {
    expect(checkWifi("", " ")).toEqual({
      ssid: "missing",
      password: "missing",
    });
    expect(checkWifi("Guest", "espresso42")).toEqual({});
  });
});

describe("logo files", () => {
  const file = (name: string, type: string, size = 1000) => ({
    name,
    type,
    size,
  });

  it("takes PNG, JPEG, WebP and SVG, by type or by extension", () => {
    expect(checkLogoFile(file("a.png", "image/png"))).toBeUndefined();
    expect(checkLogoFile(file("a.jpg", "image/jpeg"))).toBeUndefined();
    expect(checkLogoFile(file("a.webp", "image/webp"))).toBeUndefined();
    expect(checkLogoFile(file("a.svg", "image/svg+xml"))).toBeUndefined();
    expect(checkLogoFile(file("a.JPEG", ""))).toBeUndefined();
    expect(checkLogoFile(file("a.gif", "image/gif"))).toBe("type");
    expect(checkLogoFile(file("a.pdf", "application/pdf"))).toBe("type");
  });

  it("turns away a file over 10 MB", () => {
    expect(
      checkLogoFile(file("a.png", "image/png", MAX_LOGO_FILE_BYTES + 1)),
    ).toBe("too-large");
    expect(
      checkLogoFile(file("a.png", "image/png", MAX_LOGO_FILE_BYTES)),
    ).toBeUndefined();
  });

  it("shrinks pictures to 1024 px but never enlarges them, and scales vectors up", () => {
    expect(fitLogo(4096, 2048, false)).toEqual({ width: 1024, height: 512 });
    expect(fitLogo(200, 100, false)).toEqual({ width: 200, height: 100 });
    expect(fitLogo(200, 100, true)).toEqual({ width: 1024, height: 512 });
    expect(fitLogo(0, 0, true)).toEqual({ width: 1024, height: 1024 });
  });

  it("reads an SVG's proportions from its viewBox, else its width and height", () => {
    expect(
      inferSvgSize('<svg viewBox="0 0 300 100" width="10" height="10">'),
    ).toEqual({ width: 300, height: 100 });
    expect(inferSvgSize("<svg width='40px' height='20'>")).toEqual({
      width: 40,
      height: 20,
    });
    expect(inferSvgSize('<svg width="100%" height="50">')).toBeUndefined();
    expect(inferSvgSize("<html>")).toBeUndefined();
  });
});
