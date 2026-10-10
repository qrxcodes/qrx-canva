import { useFeatureSupport } from "@canva/app-hooks";
import { upload } from "@canva/asset";
import { addElementAtPoint } from "@canva/design";
import type { Feature } from "@canva/platform";
import { getPlatformInfo, requestOpenExternalUrl } from "@canva/platform";
import type { CanvaUserToken } from "@canva/user";
import { auth } from "@canva/user";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { Call } from "src/utils/fake_qrx";
import {
  fakeFetch,
  fakeOauth,
  jsonResponse,
  makeCode,
  problem,
  route,
  STYLES,
} from "src/utils/fake_qrx";
import { renderInTestProvider } from "src/utils/test_render";
import { DEFAULT_QRX_CONFIG } from "utils/qrx_config";
import { App } from "../app";

jest.mock("@canva/app-hooks");

const config = {
  ...DEFAULT_QRX_CONFIG,
  apiBase: "https://dev.qrx.codes",
  oauthResource: "",
};

const styles = route("GET", "/canva/v1/styles", () =>
  jsonResponse(200, { object: "list", data: STYLES, hasMore: false }),
);
const recent = (codes = [makeCode({ id: "old111", prompt: "Old code" })]) =>
  route("GET", "/canva/v1/codes", () =>
    jsonResponse(200, { object: "list", data: codes, hasMore: false }),
  );
const createProcessing = route("POST", "/canva/v1/codes", () =>
  jsonResponse(202, makeCode({ status: "processing", imageUrl: null })),
);
const finishes = (overrides = {}) =>
  route("GET", /^\/canva\/v1\/codes\/k7m2qz$/, () =>
    jsonResponse(200, makeCode(overrides)),
  );

const posts = (calls: Call[]) => calls.filter((c) => c.method === "POST");

function fillForm(prompt = "A lighthouse at dusk", link = "example.com/menu") {
  fireEvent.change(screen.getByRole("textbox", { name: "Picture" }), {
    target: { value: prompt },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /^Link/ }), {
    target: { value: link },
  });
}

describe("App", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest
      .mocked(useFeatureSupport)
      .mockReturnValue((fn: Feature) => fn === addElementAtPoint);
    jest.mocked(getPlatformInfo).mockReturnValue({ canAcceptPayments: false });
    jest.mocked(requestOpenExternalUrl).mockResolvedValue({
      status: "completed",
    });
    jest
      .mocked(auth.getCanvaUserToken)
      .mockResolvedValue("canva-jwt" as CanvaUserToken);
    jest.mocked(upload).mockResolvedValue({
      ref: "image-ref",
      whenUploaded: async () => undefined,
    } as unknown as Awaited<ReturnType<typeof upload>>);
    jest.mocked(addElementAtPoint).mockResolvedValue(undefined);
  });

  it("makes a code and adds it to the design, marked as AI-generated", async () => {
    const api = fakeFetch(styles, recent(), createProcessing, finishes());
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fireEvent.click(screen.getByRole("button", { name: "Cartoon" }));
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
    const [post] = posts(api.calls);
    expect(post?.body).toEqual({
      prompt: "A lighthouse at dusk",
      destination: "https://example.com/menu",
      style: "06184",
    });
    expect(post?.headers["Idempotency-Key"]).toMatch(/^canva-/);
    expect(post?.headers.Authorization).toBe("Bearer canva-jwt");
    expect(post?.headers["X-QRX-Authorization"]).toBe("Bearer qrx-token");
    expect(
      screen.getByText(
        "Opens qrx.to/k7m2qz, which sends people to example.com/menu.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Add to design" }));

    await waitFor(() => expect(addElementAtPoint).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "image",
        mimeType: "image/png",
        url: "https://qrx.codes/media/premium/k7m2qz.png",
        aiDisclosure: "app_generated",
      }),
    );
    expect(addElementAtPoint).toHaveBeenCalledWith({
      type: "image",
      ref: "image-ref",
      altText: { text: "QR code that opens qrx.to/k7m2qz", decorative: false },
    });
  });

  it("shows progress while the code is being made", async () => {
    let finish: () => void = () => undefined;
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const api = fakeFetch(
      styles,
      recent([]),
      createProcessing,
      async (call) => {
        if (call.method === "GET" && call.url.pathname.endsWith("/k7m2qz")) {
          await done;
          return jsonResponse(200, makeCode());
        }
        return undefined;
      },
    );
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(await screen.findByRole("progressbar")).toBeTruthy();
    expect(
      screen.getByText(
        "Making your QR code. This usually takes about a minute.",
      ),
    ).toBeTruthy();

    finish();
    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
  });

  it("checks the form before asking anyone to sign in", async () => {
    const oauth = fakeOauth(null);
    const api = fakeFetch();
    renderInTestProvider(
      <App oauth={oauth} config={config} fetchImpl={api.fetch} />,
    );

    const button = await screen.findByRole("button", {
      name: "Connect QRX and create",
    });
    fireEvent.click(button);

    expect(
      await screen.findByText("Describe the picture you want."),
    ).toBeTruthy();
    expect(screen.getByText("Add the link the code should open.")).toBeTruthy();
    expect(oauth.requestAuthorization).not.toHaveBeenCalled();
    expect(api.calls).toHaveLength(0);
  });

  it("connects a QRX account, then makes the code", async () => {
    const oauth = fakeOauth(null);
    const api = fakeFetch(styles, recent([]), createProcessing, finishes());
    renderInTestProvider(
      <App oauth={oauth} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Connect QRX and create" });
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and create" }),
    );

    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
    expect(oauth.requestAuthorization).toHaveBeenCalledWith({
      scope: new Set(["qrx:read", "qrx:generate", "offline_access"]),
    });
    expect(posts(api.calls)).toHaveLength(1);
  });

  it("sends the resource parameter when one is configured", async () => {
    const oauth = fakeOauth(null);
    const api = fakeFetch(styles, recent([]), createProcessing, finishes());
    renderInTestProvider(
      <App
        oauth={oauth}
        config={{ ...config, oauthResource: "https://dev.qrx.codes/v1" }}
        fetchImpl={api.fetch}
      />,
    );

    await screen.findByRole("button", { name: "Connect QRX and create" });
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and create" }),
    );

    await screen.findByText("Your QR code is ready");
    expect(oauth.requestAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: { resource: "https://dev.qrx.codes/v1" },
      }),
    );
  });

  it("makes nothing when the person closes the sign-in", async () => {
    const oauth = fakeOauth(null);
    oauth.requestAuthorization.mockResolvedValue({
      status: "aborted",
      scope: new Set(),
    } as never);
    const api = fakeFetch();
    renderInTestProvider(
      <App oauth={oauth} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Connect QRX and create" });
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and create" }),
    );

    await waitFor(() => expect(oauth.requestAuthorization).toHaveBeenCalled());
    expect(posts(api.calls)).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Connect QRX and create" }),
    ).toBeTruthy();
  });

  it("refuses blocked words without calling QRX", async () => {
    const api = fakeFetch(styles, recent([]));
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm("a shitty lighthouse");
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(
      await screen.findByText(
        "This description includes words QRX doesn't allow. Try different words.",
      ),
    ).toBeTruthy();
    expect(posts(api.calls)).toHaveLength(0);
  });

  it("explains the daily limit without a payment link where payments are off", async () => {
    const api = fakeFetch(
      styles,
      recent([]),
      route("POST", "/canva/v1/codes", () => problem(429, "daily-limit")),
    );
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(
      await screen.findByText("You've used all of today's codes."),
    ).toBeTruthy();
    expect(
      screen.getByText("Open qrx.codes in your browser to see your options."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /plans/ })).toBeNull();
  });

  it("offers the plans page for the daily limit where payments are allowed", async () => {
    jest.mocked(getPlatformInfo).mockReturnValue({ canAcceptPayments: true });
    const api = fakeFetch(
      styles,
      recent([]),
      route("POST", "/canva/v1/codes", () => problem(429, "daily-limit")),
    );
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    fireEvent.click(
      await screen.findByRole("button", { name: "See plans on qrx.codes" }),
    );
    expect(requestOpenExternalUrl).toHaveBeenCalledWith({
      url: "https://qrx.codes",
    });
  });

  it("mentions changing the link on a paid plan only where payments are allowed", async () => {
    jest.mocked(getPlatformInfo).mockReturnValue({ canAcceptPayments: true });
    const api = fakeFetch(styles, recent([]), createProcessing, finishes());
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(
      await screen.findByText(/On a paid plan, you can change where this code/),
    ).toBeTruthy();
  });

  it("says so when a code fails", async () => {
    const api = fakeFetch(
      styles,
      recent([]),
      createProcessing,
      finishes({ status: "failed", imageUrl: null, error: { message: "x" } }),
    );
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(
      await screen.findByText(
        "This code couldn't be made. Try again, or describe the picture differently.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("returns to the form when the account was disconnected elsewhere", async () => {
    const api = fakeFetch(
      styles,
      recent([]),
      route("POST", "/canva/v1/codes", () => problem(401, "unauthorized")),
    );
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByText("Style: No style");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create QR code" }));

    expect(
      await screen.findByText(
        "Your QRX account was disconnected. Connect it again to continue.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Connect QRX and create" }),
    ).toBeTruthy();
  });

  it("adds a recent code to the design", async () => {
    const api = fakeFetch(styles, recent());
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    const card = await screen.findByRole("button", {
      name: "Add this QR code to the design",
    });
    fireEvent.click(card);

    await waitFor(() => expect(addElementAtPoint).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({ aiDisclosure: "app_generated" }),
    );
  });

  it("disconnects the QRX account", async () => {
    const oauth = fakeOauth();
    const api = fakeFetch(styles, recent([]));
    renderInTestProvider(
      <App oauth={oauth} config={config} fetchImpl={api.fetch} />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Disconnect QRX account" }),
    );

    await waitFor(() => expect(oauth.deauthorize).toHaveBeenCalled());
    expect(
      await screen.findByRole("button", { name: "Connect QRX and create" }),
    ).toBeTruthy();
  });
});
