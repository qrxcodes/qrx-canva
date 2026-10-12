import { EXAMPLE_DESCRIPTIONS } from "./example_descriptions";

/** The page a blank link opens: the QRX site's own example page. */
export const exampleUrlFor = (siteUrl: string) =>
  `${siteUrl.replace(/\/+$/, "")}/example`;

/**
 * Picks an example description at random, never the one used last (unless
 * it is the only one).
 */
export function pickExample(
  last?: string | null,
  random: () => number = Math.random,
  list: readonly string[] = EXAMPLE_DESCRIPTIONS,
): string {
  const pool = list.length > 1 ? list.filter((d) => d !== last) : list;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index] ?? "";
}

export type Prefill = { prompt?: string; link?: string };

/**
 * Which empty fields to fill, as the QRX web app does: a blank description
 * gets the example shown as its placeholder, and a blank link gets the
 * example page. Wi-Fi details are never invented.
 */
export function planPrefill(
  values: { prompt: string; link: string; kind: "link" | "wifi" },
  examples: { description: string; url: string },
): Prefill {
  const plan: Prefill = {};
  if (!values.prompt.trim()) plan.prompt = examples.description;
  if (values.kind === "link" && !values.link.trim()) plan.link = examples.url;
  return plan;
}
