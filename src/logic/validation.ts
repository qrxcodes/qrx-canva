import {
  englishDataset,
  englishRecommendedTransformers,
  RegExpMatcher,
} from "obscenity";
import { MAX_LINK_LENGTH, MAX_PROMPT_LENGTH } from "src/config";

export type PromptProblem = "missing" | "too-long" | "blocked-words";
export type LinkProblem = "missing" | "invalid" | "too-long";

let matcher: RegExpMatcher | undefined;

/**
 * The same word filter the QRX API applies, run here first so the person
 * hears about it before a request is sent.
 */
export function hasBlockedWords(text: string): boolean {
  matcher ??= new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });
  return matcher.hasMatch(text);
}

export function checkPrompt(prompt: string): PromptProblem | undefined {
  const text = prompt.trim();
  if (!text) return "missing";
  if (text.length > MAX_PROMPT_LENGTH) return "too-long";
  if (hasBlockedWords(text)) return "blocked-words";
  return undefined;
}

const LINK_PATTERN = /^https?:\/\/[^\s\\]+$/i;

/**
 * Turns what was typed into the link a code opens. Adds `https://` when no
 * scheme was given; only http and https links are accepted.
 */
export function normaliseLink(input: string): string {
  const text = input.trim();
  if (!text) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) {
    // Another scheme (mailto:, tel:, ftp:…): leave it for checkLink to refuse.
    return text;
  }
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

export function checkLink(input: string): LinkProblem | undefined {
  const link = normaliseLink(input);
  if (!link) return "missing";
  if (link.length > MAX_LINK_LENGTH) return "too-long";
  if (!LINK_PATTERN.test(link)) return "invalid";
  try {
    const url = new URL(link);
    if (!url.hostname.includes(".") && url.hostname !== "localhost") {
      return "invalid";
    }
  } catch {
    return "invalid";
  }
  return undefined;
}

/** The longest Wi-Fi network name and password QRX takes. */
export const MAX_SSID_LENGTH = 32;
export const MAX_WIFI_PASSWORD_LENGTH = 63;

export type WifiProblems = { ssid?: "missing"; password?: "missing" };

/** Wi-Fi details are never invented, so both must be filled in. */
export function checkWifi(ssid: string, password: string): WifiProblems {
  return {
    ...(ssid.trim() ? {} : { ssid: "missing" as const }),
    ...(password.trim() ? {} : { password: "missing" as const }),
  };
}
