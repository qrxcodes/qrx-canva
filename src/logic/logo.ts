// A logo for the centre of the code, prepared as the QRX web app prepares
// one: SVGs rasterised, everything scaled to at most 1024 px and sent as a PNG
// so transparency is kept. QRX refuses logos over 10 MB.

/** The largest file that can be chosen. */
export const MAX_LOGO_FILE_BYTES = 10 * 1024 * 1024;

/** The largest prepared PNG QRX takes. */
export const MAX_LOGO_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAX_LOGO_SIZE = 1024;

/** What the file picker offers. */
export const LOGO_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
];

export type PreparedLogo = {
  name: string;
  /** The PNG as a data URL, which is what QRX is sent. */
  dataUrl: string;
  width: number;
  height: number;
};

export type LogoProblem = "type" | "too-large" | "unreadable";

export class LogoError extends Error {
  readonly problem: LogoProblem;

  constructor(problem: LogoProblem) {
    super(`The logo could not be used (${problem})`);
    this.name = "LogoError";
    this.problem = problem;
  }
}

type FileInfo = Pick<File, "name" | "type" | "size">;

const RASTER_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const isSvg = (file: Pick<File, "name" | "type">) =>
  file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

// some browsers leave the type empty, so fall back on the extension
const isRaster = (file: Pick<File, "name" | "type">) =>
  RASTER_TYPES.includes(file.type) ||
  (!file.type && /\.(png|jpe?g|webp)$/i.test(file.name));

/** Why the file can't be a logo, if it can't. */
export function checkLogoFile(file: FileInfo): LogoProblem | undefined {
  if (!isRaster(file) && !isSvg(file)) return "type";
  if (file.size > MAX_LOGO_FILE_BYTES) return "too-large";
  return undefined;
}

/**
 * Fits the image within `max` on its longer side. Vectors are scaled up to
 * `max` so they rasterise sharply; pictures are never enlarged.
 */
export function fitLogo(
  width: number,
  height: number,
  vector: boolean,
  max = MAX_LOGO_SIZE,
) {
  if (!width || !height) return { width: max, height: max };
  const scale = vector
    ? max / Math.max(width, height)
    : Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const positive = (value: string | undefined) => {
  const n = value === undefined ? NaN : parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * An SVG's own proportions, from its viewBox, else its absolute width and
 * height. Browsers report odd sizes for SVGs without them, and drawing into a
 * canvas of the wrong shape stretches the artwork.
 */
export function inferSvgSize(
  svg: string,
): { width: number; height: number } | undefined {
  const tag = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!tag) return undefined;
  const attr = (name: string) => {
    const match = new RegExp(
      `\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
      "i",
    ).exec(tag);
    return match ? (match[1] ?? match[2]) : undefined;
  };

  const viewBox = attr("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    viewBox?.length === 4 &&
    viewBox.every(Number.isFinite) &&
    (viewBox[2] ?? 0) > 0 &&
    (viewBox[3] ?? 0) > 0
  ) {
    return { width: viewBox[2] as number, height: viewBox[3] as number };
  }

  const absolute = (value?: string) =>
    value && !value.includes("%") ? positive(value) : undefined;
  const width = absolute(attr("width"));
  const height = absolute(attr("height"));
  return width && height ? { width, height } : undefined;
}

const readAs = (blob: Blob, kind: "dataUrl" | "text") =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new LogoError("unreadable"));
    if (kind === "text") reader.readAsText(blob);
    else reader.readAsDataURL(blob);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LogoError("unreadable"));
    image.src = src;
  });

type Drawable = { source: CanvasImageSource; width: number; height: number };

/** Decodes the file without a URL where the browser can, else from a data URL. */
async function decode(file: File): Promise<Drawable> {
  if (isSvg(file)) {
    const text = await readAs(file, "text");
    const image = await loadImage(
      await readAs(new Blob([text], { type: "image/svg+xml" }), "dataUrl"),
    );
    const size = inferSvgSize(text);
    const fitted = size
      ? fitLogo(size.width, size.height, true)
      : fitLogo(image.naturalWidth, image.naturalHeight, true);
    return { source: image, ...fitted };
  }
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        ...fitLogo(bitmap.width, bitmap.height, false),
      };
    } catch {
      // fall back on an image element below
    }
  }
  const image = await loadImage(await readAs(file, "dataUrl"));
  return {
    source: image,
    ...fitLogo(image.naturalWidth, image.naturalHeight, false),
  };
}

const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new LogoError("unreadable"))),
      "image/png",
    ),
  );

/** Checks, rasterises and scales a chosen file into the PNG QRX is sent. */
export async function prepareLogo(file: File): Promise<PreparedLogo> {
  const problem = checkLogoFile(file);
  if (problem) throw new LogoError(problem);

  try {
    const { source, width, height } = await decode(file);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new LogoError("unreadable");
    // the canvas starts transparent, and the PNG keeps it so
    context.drawImage(source, 0, 0, width, height);
    const png = await toPng(canvas);
    if (png.size > MAX_LOGO_UPLOAD_BYTES) throw new LogoError("too-large");
    return {
      name: file.name,
      dataUrl: await readAs(png, "dataUrl"),
      width,
      height,
    };
  } catch (error) {
    throw error instanceof LogoError ? error : new LogoError("unreadable");
  }
}
