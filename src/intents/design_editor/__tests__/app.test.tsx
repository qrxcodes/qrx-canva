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
import { EXAMPLE_DESCRIPTIONS } from "src/logic/example_descriptions";
import { LogoError } from "src/logic/logo";
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
const codePosts = (calls: Call[]) =>
  posts(calls).filter((c) => c.url.pathname.endsWith("/codes"));
const account = (wifiCodes: boolean) =>
  route("GET", "/canva/v1/account", () =>
    jsonResponse(200, {
      object: "account",
      features: { wifiCodes, changeDestination: wifiCodes },
    }),
  );

const LOGO = {
  name: "logo.png",
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  width: 64,
  height: 64,
};

function chooseLogo(container: HTMLElement, name = "logo.png") {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("No file input");
  fireEvent.change(input, {
    target: { files: [new File(["png"], name, { type: "image/png" })] },
  });
}

function fillForm(prompt = "A lighthouse at dusk", link = "example.com/menu") {
  fireEvent.change(
    screen.getByRole("textbox", { name: "Describe the picture" }),
    {
      target: { value: prompt },
    },
  );
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

    await screen.findByRole("button", { name: "Cartoon" });
    fireEvent.click(screen.getByRole("button", { name: "Cartoon" }));
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

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

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    expect(await screen.findByRole("progressbar")).toBeTruthy();
    expect(
      screen.getByText(
        "Making your QR code. This usually takes about a minute.",
      ),
    ).toBeTruthy();

    finish();
    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
  });

  it("fills a blank description and link with examples, as the web app does", async () => {
    const api = fakeFetch(styles, recent([]), createProcessing, finishes());
    renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        random={() => 0}
      />,
    );

    const description = await screen.findByRole("textbox", {
      name: "Describe the picture",
    });
    const [first, second] = EXAMPLE_DESCRIPTIONS;
    expect(description.getAttribute("placeholder")).toBe(first);
    expect(
      screen
        .getByRole("textbox", { name: /^Link/ })
        .getAttribute("placeholder"),
    ).toBe("https://qrx.codes/example");
    expect(
      screen.getByText(/Leave blank and we’ll write one for you\./),
    ).toBeTruthy();

    await screen.findByRole("button", { name: "Cartoon" });
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
    expect(codePosts(api.calls)[0]?.body).toEqual({
      prompt: first,
      destination: "https://qrx.codes/example",
    });

    // back on the form, the description is blank again with the next example
    fireEvent.click(screen.getByRole("button", { name: "Create another" }));
    const again = screen.getByRole("textbox", { name: "Describe the picture" });
    expect((again as HTMLTextAreaElement).value).toBe("");
    expect(again.getAttribute("placeholder")).toBe(second);
  });

  it("checks the link before asking anyone to sign in", async () => {
    const oauth = fakeOauth(null);
    const api = fakeFetch();
    renderInTestProvider(
      <App oauth={oauth} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Connect QRX and generate" });
    fireEvent.change(screen.getByRole("textbox", { name: /^Link/ }), {
      target: { value: "mailto:a@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and generate" }),
    );

    expect(
      await screen.findByText("Enter a web address, such as example.com/menu."),
    ).toBeTruthy();
    // the blank description isn't filled in until the form can be sent
    expect(
      (
        screen.getByRole("textbox", {
          name: "Describe the picture",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("");
    expect(oauth.requestAuthorization).not.toHaveBeenCalled();
    expect(api.calls).toHaveLength(0);
  });

  it("uploads a chosen logo and sends its id with the code", async () => {
    const api = fakeFetch(
      styles,
      recent([]),
      route("POST", "/canva/v1/logos", () =>
        jsonResponse(201, {
          id: "3f2b8c1e-7d4a-4f6b-9c2e-5a1d8e7f3b20",
          object: "logo",
          createdAt: "2026-10-13T00:00:00.000Z",
        }),
      ),
      createProcessing,
      finishes(),
    );
    const prepareLogo = jest.fn(async () => LOGO);
    const { container } = renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        prepareLogo={prepareLogo}
      />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    expect(screen.getByText("PNG, JPEG, WebP or SVG")).toBeTruthy();
    chooseLogo(container);
    expect(
      await screen.findByText("Placed in the centre of the code"),
    ).toBeTruthy();
    expect(screen.getByText("logo.png")).toBeTruthy();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
    const [upload, create] = posts(api.calls);
    expect(upload?.url.pathname).toBe("/canva/v1/logos");
    expect(upload?.body).toEqual({ image: LOGO.dataUrl });
    expect(create?.body).toEqual({
      prompt: "A lighthouse at dusk",
      destination: "https://example.com/menu",
      logo: "3f2b8c1e-7d4a-4f6b-9c2e-5a1d8e7f3b20",
    });
  });

  it("removes a chosen logo", async () => {
    const api = fakeFetch(styles, recent([]), createProcessing, finishes());
    const { container } = renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        prepareLogo={async () => LOGO}
      />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    chooseLogo(container);
    fireEvent.click(await screen.findByRole("button", { name: "Remove logo" }));
    expect(screen.queryByText("logo.png")).toBeNull();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    await screen.findByText("Your QR code is ready");
    expect(posts(api.calls).map((c) => c.url.pathname)).toEqual([
      "/canva/v1/codes",
    ]);
  });

  it("turns away a logo that is too large, before or after it is sent", async () => {
    const api = fakeFetch(
      styles,
      recent([]),
      route("POST", "/canva/v1/logos", () =>
        problem(413, "payload-too-large", "The logo is larger than 10 MB."),
      ),
    );
    let tooLarge = true;
    const { container } = renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        prepareLogo={async () => {
          if (tooLarge) throw new LogoError("too-large");
          return LOGO;
        }}
      />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    chooseLogo(container);
    expect(
      await screen.findByText("This image is too large; choose a smaller one"),
    ).toBeTruthy();

    tooLarge = false;
    chooseLogo(container);
    await screen.findByText("logo.png");
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    expect(
      await screen.findByText("This image is too large; choose a smaller one"),
    ).toBeTruthy();
    expect(codePosts(api.calls)).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Generate code" })).toBeTruthy();
  });

  it("refuses a file that isn't an image", async () => {
    const api = fakeFetch(styles, recent([]));
    const { container } = renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        prepareLogo={async () => {
          throw new LogoError("type");
        }}
      />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    chooseLogo(container);
    expect(
      await screen.findByText("Choose a PNG, JPEG, WebP or SVG image"),
    ).toBeTruthy();
  });

  it("makes a Wi-Fi code on a plan that has them", async () => {
    const wifiCode = {
      type: "wifi",
      destination: null,
      shortUrl: null,
      wifi: { ssid: "Cafe Guest", security: "wpa" },
    };
    const api = fakeFetch(
      styles,
      recent([]),
      account(true),
      route("POST", "/canva/v1/codes", () =>
        jsonResponse(
          202,
          makeCode({ status: "processing", imageUrl: null, ...wifiCode }),
        ),
      ),
      finishes(wifiCode),
    );
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    const wifi = await screen.findByRole("radio", { name: "Wi-Fi" });
    await waitFor(() =>
      expect(wifi.getAttribute("aria-disabled")).not.toBe("true"),
    );
    fireEvent.click(wifi);

    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));
    expect(await screen.findAllByText("This is required.")).toHaveLength(2);
    expect(codePosts(api.calls)).toHaveLength(0);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Network name (SSID)" }),
      { target: { value: "Cafe Guest" } },
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Password" }), {
      target: { value: "espresso42" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Describe the picture" }),
      { target: { value: "A cosy café" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    expect(await screen.findByText("Your QR code is ready")).toBeTruthy();
    expect(codePosts(api.calls)[0]?.body).toEqual({
      prompt: "A cosy café",
      wifi: { ssid: "Cafe Guest", password: "espresso42", security: "wpa" },
    });
    expect(
      screen.getByText("Joins the Wi-Fi network Cafe Guest."),
    ).toBeTruthy();
  });

  it("offers Wi-Fi only on a plan that has it, naming the plan where payments are allowed", async () => {
    jest.mocked(getPlatformInfo).mockReturnValue({ canAcceptPayments: true });
    const api = fakeFetch(styles, recent([]), account(false));
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    expect(
      screen
        .getByRole("radio", { name: "Wi-Fi" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      await screen.findByText("Wi-Fi codes come with the Starter plan."),
    ).toBeTruthy();
  });

  it("connects a QRX account, then makes the code", async () => {
    const oauth = fakeOauth(null);
    const api = fakeFetch(styles, recent([]), createProcessing, finishes());
    renderInTestProvider(
      <App oauth={oauth} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Connect QRX and generate" });
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and generate" }),
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

    await screen.findByRole("button", { name: "Connect QRX and generate" });
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and generate" }),
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

    await screen.findByRole("button", { name: "Connect QRX and generate" });
    fillForm();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect QRX and generate" }),
    );

    await waitFor(() => expect(oauth.requestAuthorization).toHaveBeenCalled());
    expect(posts(api.calls)).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Connect QRX and generate" }),
    ).toBeTruthy();
  });

  it("retries the first loads of styles and recent codes when they fail", async () => {
    let styleCalls = 0;
    let recentCalls = 0;
    const flakyStyles = route("GET", "/canva/v1/styles", () =>
      ++styleCalls === 1
        ? problem(502, "server-error")
        : jsonResponse(200, { object: "list", data: STYLES, hasMore: false }),
    );
    const flakyRecent = route("GET", "/canva/v1/codes", () =>
      ++recentCalls === 1
        ? problem(502, "server-error")
        : jsonResponse(200, {
            object: "list",
            data: [makeCode({ id: "old111", prompt: "Old code" })],
            hasMore: false,
          }),
    );
    const api = fakeFetch(flakyStyles, flakyRecent);
    renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        listRetryDelaysMs={[0, 0]}
      />,
    );

    expect(await screen.findByRole("button", { name: "Cartoon" })).toBeTruthy();
    expect(
      await screen.findAllByRole("button", {
        name: "Add this QR code to the design",
      }),
    ).toHaveLength(1);
    expect(styleCalls).toBe(2);
    expect(recentCalls).toBe(2);
  });

  it("says when recent codes can't be loaded, and Refresh loads them and the styles", async () => {
    let failing = true;
    const styleRoute = route("GET", "/canva/v1/styles", () =>
      failing
        ? problem(500, "server-error")
        : jsonResponse(200, { object: "list", data: STYLES, hasMore: false }),
    );
    const recentRoute = route("GET", "/canva/v1/codes", () =>
      failing
        ? problem(500, "server-error")
        : jsonResponse(200, {
            object: "list",
            data: [makeCode({ id: "old111", prompt: "Old code" })],
            hasMore: false,
          }),
    );
    const api = fakeFetch(styleRoute, recentRoute);
    renderInTestProvider(
      <App
        oauth={fakeOauth()}
        config={config}
        fetchImpl={api.fetch}
        listRetryDelaysMs={[0, 0]}
      />,
    );

    expect(
      await screen.findByText(
        "Your recent codes couldn't be loaded. Select Refresh to try again.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Styles couldn't be loaded. You can still create a code.",
      ),
    ).toBeTruthy();

    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("button", { name: "Cartoon" })).toBeTruthy();
    expect(
      await screen.findAllByRole("button", {
        name: "Add this QR code to the design",
      }),
    ).toHaveLength(1);
    expect(
      screen.queryByText(
        "Your recent codes couldn't be loaded. Select Refresh to try again.",
      ),
    ).toBeNull();
  });

  it("refuses blocked words without calling QRX", async () => {
    const api = fakeFetch(styles, recent([]));
    renderInTestProvider(
      <App oauth={fakeOauth()} config={config} fetchImpl={api.fetch} />,
    );

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm("a shitty lighthouse");
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

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

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

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

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

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

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

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

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

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

    await screen.findByRole("button", { name: "Cartoon" });
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Generate code" }));

    expect(
      await screen.findByText(
        "Your QRX account was disconnected. Connect it again to continue.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Connect QRX and generate" }),
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
      await screen.findByRole("button", { name: "Connect QRX and generate" }),
    ).toBeTruthy();
  });
});
