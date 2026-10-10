import type { QrxConfig } from "utils/qrx_config";
import { DEFAULT_QRX_CONFIG } from "utils/qrx_config";

export type { QrxConfig };

/** The build-time settings, with defaults when they weren't injected. */
export const config: QrxConfig =
  typeof QRX_CONFIG === "undefined" || !QRX_CONFIG
    ? DEFAULT_QRX_CONFIG
    : { ...DEFAULT_QRX_CONFIG, ...QRX_CONFIG };

/** How long a code usually takes; the progress bar is paced to this. */
export const EXPECTED_GENERATION_MS = 60_000;

/** Seconds each status request waits on the server (the API allows up to 50). */
export const POLL_WAIT_SECONDS = 25;

/** Stop waiting after this long; the code still shows up in Recent codes. */
export const MAX_GENERATION_MS = 5 * 60_000;

/** How many recent codes to list. */
export const RECENT_CODES_LIMIT = 12;

/** Prompt length the API accepts. */
export const MAX_PROMPT_LENGTH = 1000;

/** Link length the API accepts. */
export const MAX_LINK_LENGTH = 2048;

/** Canva's report form for generated content, named after this app. */
export const APP_NAME = "QRX";
export const REPORT_CONTENT_URL = `https://www.canva.com/help/report-content/?app=${APP_NAME}`;
