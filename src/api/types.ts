// Shapes from the QRX REST API (https://qrx.codes/v1/openapi.json).

export type CodeStatus = "queued" | "processing" | "succeeded" | "failed";

export type Code = {
  id: string;
  object: "code";
  /** More values may be added; anything but succeeded or failed is in progress. */
  status: CodeStatus | (string & {});
  type: string;
  prompt: string;
  style: string | null;
  destination: string | null;
  /** The network a Wi-Fi code joins; the password is never returned. */
  wifi?: { ssid: string; security: string } | null;
  shortUrl: string | null;
  imageUrl: string | null;
  pageUrl: string;
  error: { message: string } | null;
  createdAt: string;
};

export type CodeList = {
  object: "list";
  data: Code[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type Style = {
  id: string;
  object: "style";
  name: string;
  previewUrl: string | null;
};

export type StyleList = {
  object: "list";
  data: Style[];
};

export type WifiSecurity = "wpa" | "wep";

export type CreateCodeRequest = {
  prompt: string;
  style?: string;
  /** A logo id from POST /logos, placed in the centre of the code. */
  logo?: string;
} & (
  | { destination: string }
  | { wifi: { ssid: string; password: string; security: WifiSecurity } }
);

export type Logo = {
  id: string;
  object: "logo";
  createdAt: string;
};

/** What the account can do; only the parts the app reads. */
export type Account = {
  object: "account";
  features: { wifiCodes: boolean; changeDestination: boolean };
};

/** RFC 9457 problem details, as the API returns them. */
export type Problem = {
  type: string;
  title: string;
  status: number;
  detail: string;
  requestId?: string;
  errors?: { field: string; message: string }[];
};

export const isFinished = (code: Code) =>
  code.status === "succeeded" || code.status === "failed";
