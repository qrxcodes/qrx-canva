import { fireEvent, screen } from "@testing-library/react";
import type { Style } from "src/api/types";
import { recentCodesToShow } from "src/components/recent_codes";
import {
  isNoStyle,
  orderStyles,
  StylePicker,
} from "src/components/style_picker";
import { linkForAltText } from "src/hooks/use_add_to_design";
import { makeCode, STYLES } from "src/utils/fake_qrx";
import { renderInTestProvider } from "src/utils/test_render";

const [ANIME] = STYLES as [Style, ...Style[]];

const NO_STYLE: Style = {
  id: "Noop",
  object: "style",
  name: "No Style",
  previewUrl: "https://qrx.codes/img/styles/nostyle-192.webp",
};

describe("StylePicker", () => {
  it("lists the API's No Style entry first, as None, and sends no style for it", () => {
    const onChange = jest.fn();
    renderInTestProvider(
      <StylePicker
        styleList={[...STYLES, NO_STYLE]}
        value="a64c5"
        onChange={onChange}
      />,
    );

    // the chosen style is named beside the label, and under its tile
    expect(screen.getAllByText("Anime")).toHaveLength(2);
    const tiles = screen.getAllByRole("button");
    expect(tiles[0]?.getAttribute("aria-label")).toBe("None");
    fireEvent.click(screen.getByRole("button", { name: "None" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(
      screen.getByText(
        "With None, describe the look you want in the description.",
      ),
    ).toBeTruthy();
  });

  it("chooses styles like radio buttons", () => {
    const onChange = jest.fn();
    renderInTestProvider(
      <StylePicker styleList={STYLES} value="a64c5" onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anime" }));
    expect(onChange).toHaveBeenCalledWith("a64c5");
    fireEvent.click(screen.getByRole("button", { name: "Cartoon" }));
    expect(onChange).toHaveBeenLastCalledWith("06184");
  });

  it("orders None first and keeps the rest in the API's order", () => {
    expect(orderStyles([...STYLES, NO_STYLE]).map((s) => s.id)).toEqual([
      "Noop",
      "a64c5",
      "06184",
    ]);
  });

  it("falls back to a list when a style has no preview", () => {
    renderInTestProvider(
      <StylePicker
        styleList={[{ ...ANIME, previewUrl: null }, NO_STYLE]}
        value=""
        onChange={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Anime" })).toBeNull();
    expect(screen.getByText("Style")).toBeTruthy();
  });

  it("recognises the no-style entry by id or name", () => {
    expect(isNoStyle(NO_STYLE)).toBe(true);
    expect(isNoStyle({ ...NO_STYLE, id: "x", name: "no style" })).toBe(true);
    expect(isNoStyle(ANIME)).toBe(false);
  });
});

describe("recentCodesToShow", () => {
  it("keeps finished link and Wi-Fi codes with an image", () => {
    const codes = [
      makeCode({ id: "a" }),
      makeCode({ id: "b", status: "processing", imageUrl: null }),
      makeCode({ id: "c", status: "failed", imageUrl: null }),
      makeCode({ id: "d", type: "other", shortUrl: null }),
      makeCode({ id: "e", type: "wifi", shortUrl: null, destination: null }),
    ];
    expect(recentCodesToShow(codes).map((code) => code.id)).toEqual(["a", "e"]);
  });
});

describe("linkForAltText", () => {
  it("names the short link without its scheme", () => {
    expect(linkForAltText(makeCode())).toBe("qrx.to/k7m2qz");
    expect(linkForAltText(makeCode({ shortUrl: null }))).toBe(
      "example.com/menu",
    );
  });
});
