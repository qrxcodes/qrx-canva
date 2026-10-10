import { fireEvent, screen } from "@testing-library/react";
import type { Style } from "src/api/types";
import { recentCodesToShow } from "src/components/recent_codes";
import { isNoStyle, StylePicker } from "src/components/style_picker";
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
  it("treats the API's No Style entry as no style", () => {
    const onChange = jest.fn();
    renderInTestProvider(
      <StylePicker
        styleList={[...STYLES, NO_STYLE]}
        value="a64c5"
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Style: Anime")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "No style" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("clears the style when the chosen one is selected again", () => {
    const onChange = jest.fn();
    renderInTestProvider(
      <StylePicker styleList={STYLES} value="a64c5" onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anime" }));
    expect(onChange).toHaveBeenCalledWith("");
    fireEvent.click(screen.getByRole("button", { name: "Cartoon" }));
    expect(onChange).toHaveBeenLastCalledWith("06184");
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
  it("keeps finished link codes with an image", () => {
    const codes = [
      makeCode({ id: "a" }),
      makeCode({ id: "b", status: "processing", imageUrl: null }),
      makeCode({ id: "c", status: "failed", imageUrl: null }),
      makeCode({ id: "d", type: "wifi", shortUrl: null }),
    ];
    expect(recentCodesToShow(codes).map((code) => code.id)).toEqual(["a"]);
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
