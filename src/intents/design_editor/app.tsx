import {
  Button,
  FormField,
  MultilineInput,
  Rows,
  Text,
} from "@canva/app-ui-kit";
import { getPlatformInfo, requestOpenExternalUrl } from "@canva/platform";
import type { Oauth } from "@canva/user";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { QrxApiError, QrxClient } from "src/api/qrx_client";
import type { Code, CreateCodeRequest, Style } from "src/api/types";
import { useQrxAuth } from "src/auth/use_qrx_auth";
import { CodeResult } from "src/components/code_result";
import { ErrorAlert } from "src/components/error_alert";
import { GenerationProgress } from "src/components/generation_progress";
import { LogoField } from "src/components/logo_field";
import { RecentCodes } from "src/components/recent_codes";
import type { ScanValues } from "src/components/scan_fields";
import { ScanFields } from "src/components/scan_fields";
import { StylePicker } from "src/components/style_picker";
import type { QrxConfig } from "src/config";
import {
  config as defaultConfig,
  MAX_GENERATION_MS,
  MAX_PROMPT_LENGTH,
  POLL_WAIT_SECONDS,
  RECENT_CODES_LIMIT,
} from "src/config";
import { useAddToDesign } from "src/hooks/use_add_to_design";
import type { ErrorView } from "src/logic/errors";
import { CodeFailedError, describeError } from "src/logic/errors";
import { exampleUrlFor, pickExample, planPrefill } from "src/logic/examples";
import { generateCode, newIdempotencyKey } from "src/logic/generation";
import type { PreparedLogo } from "src/logic/logo";
import { prepareLogo as defaultPrepareLogo } from "src/logic/logo";
import type {
  LinkProblem,
  PromptProblem,
  WifiProblems,
} from "src/logic/validation";
import {
  checkLink,
  checkPrompt,
  checkWifi,
  normaliseLink,
} from "src/logic/validation";
import { messages } from "src/messages";
import * as styles from "styles/components.css";

type Phase =
  | { kind: "form" }
  | { kind: "generating"; startedAt: number; prompt: string }
  | { kind: "result"; code: Code };

const PROMPT_ERRORS = {
  missing: messages.required,
  "too-long": messages.promptTooLong,
  "blocked-words": messages.promptBlocked,
} satisfies Record<PromptProblem, unknown>;

const LINK_ERRORS = {
  missing: messages.required,
  invalid: messages.linkInvalid,
  "too-long": messages.linkTooLong,
} satisfies Record<LinkProblem, unknown>;

type FormProblems = {
  prompt?: PromptProblem;
  link?: LinkProblem;
} & WifiProblems;

const EMPTY_SCAN: ScanValues = {
  kind: "link",
  link: "",
  ssid: "",
  password: "",
  security: "wpa",
};

const isAbort = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const isUnauthorized = (error: unknown) =>
  error instanceof QrxApiError && error.kind === "unauthorized";

/** Pauses before each retry of the panel's first loads. */
const LIST_RETRY_DELAYS_MS = [1000, 3000];

/**
 * Runs `load`, retrying after each delay when it fails for any reason but a
 * refused token: just after an account connects, the first calls can fail
 * while QRX or Canva is still catching up.
 */
async function withRetries<T>(
  load: () => Promise<T>,
  delaysMs: readonly number[],
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load();
    } catch (caught) {
      if (isUnauthorized(caught) || attempt >= delaysMs.length) throw caught;
      await new Promise((resolve) => setTimeout(resolve, delaysMs[attempt]));
    }
  }
}

export type AppProps = {
  oauth: Oauth;
  config?: QrxConfig;
  /** For tests: replaces fetch in the QRX client. */
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** For tests: the pauses between retries of the first loads. */
  listRetryDelaysMs?: readonly number[];
  /** For tests: reads a chosen logo file (with the browser's canvas otherwise). */
  prepareLogo?: (file: File) => Promise<PreparedLogo>;
  /** For tests: picks the example descriptions. */
  random?: () => number;
};

export const App = ({
  oauth,
  config = defaultConfig,
  fetchImpl,
  now = Date.now,
  listRetryDelaysMs = LIST_RETRY_DELAYS_MS,
  prepareLogo = defaultPrepareLogo,
  random = Math.random,
}: AppProps) => {
  const intl = useIntl();
  const qrxAuth = useQrxAuth(oauth, config);
  const { status, tokens, connect, disconnect, markSignedOut } = qrxAuth;
  const client = useMemo(
    () => new QrxClient({ config, tokens, fetch: fetchImpl }),
    [config, tokens, fetchImpl],
  );
  const { addToDesign, canAdd } = useAddToDesign();
  const canAcceptPayments = getPlatformInfo().canAcceptPayments;

  const [prompt, setPrompt] = useState("");
  const [scan, setScan] = useState<ScanValues>(EMPTY_SCAN);
  const [styleId, setStyleId] = useState("");
  const [logo, setLogo] = useState<PreparedLogo | null>(null);
  const [logoError, setLogoError] = useState<string>();
  const [problems, setProblems] = useState<FormProblems>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [canUseWifi, setCanUseWifi] = useState(false);
  // the example a blank description is filled with, shown as its placeholder
  const [shownExample, setShownExample] = useState(() =>
    pickExample(null, random),
  );
  const filledExample = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<ErrorView | null>(null);
  const [styleList, setStyleList] = useState<Style[]>([]);
  const [stylesFailed, setStylesFailed] = useState(false);
  const [recent, setRecent] = useState<Code[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentFailed, setRecentFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const exampleUrl = exampleUrlFor(config.siteUrl);
  const kind = canUseWifi ? scan.kind : "link";

  useEffect(() => () => abortRef.current?.abort(), []);

  const openUrl = useCallback((url: string) => {
    requestOpenExternalUrl({ url }).catch(() => undefined);
  }, []);

  const handleApiError = useCallback(
    (caught: unknown) => {
      if (caught instanceof QrxApiError && caught.kind === "unauthorized") {
        markSignedOut();
      }
      setError(describeError(caught));
    },
    [markSignedOut],
  );

  const loadRecent = useCallback(
    async (retryDelaysMs: readonly number[] = []) => {
      setRecentLoading(true);
      try {
        setRecent(
          await withRetries(
            () => client.listCodes(RECENT_CODES_LIMIT),
            retryDelaysMs,
          ),
        );
        setRecentFailed(false);
      } catch (caught) {
        if (isUnauthorized(caught)) {
          markSignedOut();
        } else {
          setRecentFailed(true);
        }
      } finally {
        setRecentLoading(false);
      }
    },
    [client, markSignedOut],
  );

  const loadStyles = useCallback(
    async (retryDelaysMs: readonly number[] = []) => {
      try {
        setStyleList(
          await withRetries(() => client.listStyles(), retryDelaysMs),
        );
        setStylesFailed(false);
      } catch (caught) {
        if (isUnauthorized(caught)) {
          markSignedOut();
        } else {
          setStylesFailed(true);
        }
      }
    },
    [client, markSignedOut],
  );

  // Wi-Fi codes need a plan that has them; without an answer, links only.
  const loadAccount = useCallback(async () => {
    try {
      setCanUseWifi((await client.getAccount()).features?.wifiCodes === true);
    } catch {
      setCanUseWifi(false);
    }
  }, [client]);

  useEffect(() => {
    if (status !== "signed-in") {
      setStyleList([]);
      setRecent([]);
      setRecentFailed(false);
      setCanUseWifi(false);
      return;
    }
    loadStyles(listRetryDelaysMs);
    loadRecent(listRetryDelaysMs);
    loadAccount();
  }, [status, loadStyles, loadRecent, loadAccount, listRetryDelaysMs]);

  // Refresh also retries the styles when they didn't load.
  const refreshLists = () => {
    loadRecent();
    if (styleList.length === 0) loadStyles();
  };

  const setScanValue = <K extends keyof ScanValues>(
    key: K,
    value: ScanValues[K],
  ) => {
    setScan((current) => ({ ...current, [key]: value }));
    setProblems((current) => ({
      ...current,
      ...(key === "link" ? { link: undefined } : {}),
      ...(key === "ssid" ? { ssid: undefined } : {}),
      ...(key === "password" ? { password: undefined } : {}),
    }));
  };

  /**
   * Fills a blank description with the example shown in it, and a blank link
   * with the example page, as the QRX web app does; then checks the form.
   * Returns what to send, or undefined when something needs fixing, in which
   * case the blank fields stay blank, still showing their examples.
   */
  const fillAndCheck = () => {
    const plan = planPrefill(
      { prompt, link: scan.link, kind },
      { description: shownExample, url: exampleUrl },
    );
    const filledPrompt = plan.prompt ?? prompt;
    const filledLink = plan.link ?? scan.link;

    const found: FormProblems = {
      prompt: checkPrompt(filledPrompt),
      ...(kind === "link"
        ? { link: checkLink(filledLink) }
        : checkWifi(scan.ssid, scan.password)),
    };
    setProblems(found);
    if (Object.values(found).some(Boolean)) return undefined;

    if (plan.prompt) {
      filledExample.current = plan.prompt;
      setPrompt(plan.prompt);
    }
    if (plan.link) setScan((current) => ({ ...current, link: filledLink }));
    return { prompt: filledPrompt.trim(), link: filledLink };
  };

  /** Once a code has started, a filled-in example is cleared and another shown. */
  const rotateExample = () => {
    const filled = filledExample.current;
    filledExample.current = null;
    if (filled) setPrompt((current) => (current === filled ? "" : current));
    setShownExample((current) => pickExample(filled ?? current, random));
  };

  const startConnect = async () => {
    setError(null);
    try {
      return await connect();
    } catch {
      setError({
        message: messages.errorConnect,
        action: "none",
        tone: "critical",
      });
      return false;
    }
  };

  /**
   * Sends the chosen logo and returns its id for the code. Undefined when it
   * couldn't be sent: why is shown under the logo, or in the alert when it
   * isn't about the logo (a lost connection, the daily allowance).
   */
  const uploadLogo = async (
    chosen: PreparedLogo,
  ): Promise<string | undefined> => {
    setUploadingLogo(true);
    setLogoError(undefined);
    try {
      return (await client.uploadLogo(chosen.dataUrl)).id;
    } catch (caught) {
      if (caught instanceof QrxApiError && caught.status === 413) {
        setLogoError(intl.formatMessage(messages.logoTooLarge));
      } else if (
        caught instanceof QrxApiError &&
        (caught.kind === "invalid-request" || caught.kind === "not-found")
      ) {
        const detail = caught.problem?.detail;
        setLogoError(
          detail
            ? intl.formatMessage(messages.logoUploadFailed, { detail })
            : intl.formatMessage(messages.logoUploadFailedPlain),
        );
      } else {
        handleApiError(caught);
      }
      return undefined;
    } finally {
      setUploadingLogo(false);
    }
  };

  const create = async () => {
    setError(null);
    const filled = fillAndCheck();
    if (!filled) {
      return;
    }
    if (status !== "signed-in" && !(await startConnect())) {
      return;
    }

    let logoId: string | undefined;
    if (logo) {
      logoId = await uploadLogo(logo);
      if (!logoId) return;
    }

    const request: CreateCodeRequest = {
      prompt: filled.prompt,
      ...(kind === "link"
        ? { destination: normaliseLink(filled.link) }
        : {
            wifi: {
              ssid: scan.ssid.trim(),
              password: scan.password.trim(),
              security: scan.security,
            },
          }),
      ...(styleId ? { style: styleId } : {}),
      ...(logoId ? { logo: logoId } : {}),
    };
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ kind: "generating", startedAt: now(), prompt: request.prompt });

    try {
      const code = await generateCode({
        client,
        request,
        idempotencyKey: newIdempotencyKey(),
        waitSeconds: POLL_WAIT_SECONDS,
        maxMs: MAX_GENERATION_MS,
        signal: controller.signal,
        now,
        onStarted: rotateExample,
      });
      if (code.status !== "succeeded" || !code.imageUrl) {
        throw new CodeFailedError(code.error?.message);
      }
      setPhase({ kind: "result", code });
    } catch (caught) {
      setPhase({ kind: "form" });
      if (!isAbort(caught)) {
        handleApiError(caught);
      }
    } finally {
      abortRef.current = null;
      loadRecent();
    }
  };

  const stopWaiting = () => {
    abortRef.current?.abort();
    setError({
      message: messages.errorTimeout,
      action: "none",
      tone: "info",
    });
  };

  const add = async (code: Code) => {
    setError(null);
    setAdding(true);
    try {
      await addToDesign(code);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setAdding(false);
    }
  };

  const signOut = async () => {
    setError(null);
    await disconnect().catch(() => undefined);
  };

  const errorAlert = error && (
    <ErrorAlert
      error={error}
      canAcceptPayments={canAcceptPayments}
      onReconnect={startConnect}
      onRetry={create}
      onSeePlans={() => openUrl(config.siteUrl)}
      onDismiss={() => setError(null)}
    />
  );

  const signedIn = status === "signed-in";

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="3u">
        {phase.kind === "generating" && (
          <GenerationProgress
            startedAt={phase.startedAt}
            prompt={phase.prompt}
            onStop={stopWaiting}
            now={now}
          />
        )}

        {phase.kind === "result" && (
          <>
            {errorAlert}
            <CodeResult
              code={phase.code}
              canAdd={canAdd}
              adding={adding}
              canAcceptPayments={canAcceptPayments}
              onAdd={add}
              onCreateAnother={() => setPhase({ kind: "form" })}
              onOpenUrl={openUrl}
            />
          </>
        )}

        {phase.kind === "form" && (
          <Rows spacing="2u">
            <Text size="small">{intl.formatMessage(messages.intro)}</Text>
            <FormField
              label={intl.formatMessage(messages.promptLabel)}
              description={intl.formatMessage(messages.promptDescription)}
              value={prompt}
              error={
                problems.prompt &&
                intl.formatMessage(PROMPT_ERRORS[problems.prompt])
              }
              control={(props) => (
                <MultilineInput
                  {...props}
                  placeholder={shownExample}
                  minRows={3}
                  autoGrow
                  maxLength={MAX_PROMPT_LENGTH}
                  onChange={(value) => {
                    setPrompt(value);
                    setProblems((current) => ({
                      ...current,
                      prompt: undefined,
                    }));
                  }}
                />
              )}
            />
            <ScanFields
              values={scan}
              set={setScanValue}
              linkPlaceholder={exampleUrl}
              canUseWifi={canUseWifi}
              canAcceptPayments={canAcceptPayments}
              errors={{
                link:
                  problems.link &&
                  intl.formatMessage(LINK_ERRORS[problems.link]),
                ssid: problems.ssid && intl.formatMessage(messages.required),
                password:
                  problems.password && intl.formatMessage(messages.required),
              }}
            />
            <LogoField
              logo={logo}
              onChange={setLogo}
              error={logoError}
              onError={setLogoError}
              prepare={prepareLogo}
              disabled={uploadingLogo}
            />
            {signedIn && styleList.length > 0 && (
              <StylePicker
                styleList={styleList}
                value={styleId}
                onChange={setStyleId}
              />
            )}
            {signedIn && stylesFailed && (
              <Text size="small" tone="tertiary">
                {intl.formatMessage(messages.stylesFailed)}
              </Text>
            )}
            {!signedIn && (
              <Text size="small" tone="tertiary">
                {intl.formatMessage(messages.styleSignedOut)}
              </Text>
            )}
            {errorAlert}
            <Button
              variant="primary"
              stretch
              loading={status === "checking" || uploadingLogo}
              onClick={create}
            >
              {intl.formatMessage(
                signedIn ? messages.create : messages.connectAndCreate,
              )}
            </Button>
            {!signedIn && (
              <Text size="small" tone="tertiary" alignment="center">
                {intl.formatMessage(messages.signUpNote)}
              </Text>
            )}
          </Rows>
        )}

        {signedIn && phase.kind !== "generating" && (
          <RecentCodes
            codes={recent}
            canAdd={canAdd && !adding}
            onAdd={add}
            onRefresh={refreshLists}
            loading={recentLoading}
            failed={recentFailed}
          />
        )}

        {signedIn && phase.kind !== "generating" && (
          <Rows spacing="1u">
            <Text size="small" tone="tertiary">
              {intl.formatMessage(messages.connectedAs)}
            </Text>
            <Button variant="tertiary" onClick={signOut}>
              {intl.formatMessage(messages.disconnect)}
            </Button>
          </Rows>
        )}
      </Rows>
    </div>
  );
};
