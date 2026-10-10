import {
  Button,
  FormField,
  MultilineInput,
  Rows,
  Text,
  TextInput,
} from "@canva/app-ui-kit";
import { getPlatformInfo, requestOpenExternalUrl } from "@canva/platform";
import type { Oauth } from "@canva/user";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { QrxApiError, QrxClient } from "src/api/qrx_client";
import type { Code, Style } from "src/api/types";
import { useQrxAuth } from "src/auth/use_qrx_auth";
import { CodeResult } from "src/components/code_result";
import { ErrorAlert } from "src/components/error_alert";
import { GenerationProgress } from "src/components/generation_progress";
import { RecentCodes } from "src/components/recent_codes";
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
import { generateCode, newIdempotencyKey } from "src/logic/generation";
import type { LinkProblem, PromptProblem } from "src/logic/validation";
import { checkLink, checkPrompt, normaliseLink } from "src/logic/validation";
import { messages } from "src/messages";
import * as styles from "styles/components.css";

type Phase =
  | { kind: "form" }
  | { kind: "generating"; startedAt: number; prompt: string }
  | { kind: "result"; code: Code };

const PROMPT_ERRORS = {
  missing: messages.promptMissing,
  "too-long": messages.promptTooLong,
  "blocked-words": messages.promptBlocked,
} satisfies Record<PromptProblem, unknown>;

const LINK_ERRORS = {
  missing: messages.linkMissing,
  invalid: messages.linkInvalid,
  "too-long": messages.linkTooLong,
} satisfies Record<LinkProblem, unknown>;

const isAbort = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

export type AppProps = {
  oauth: Oauth;
  config?: QrxConfig;
  /** For tests: replaces fetch in the QRX client. */
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export const App = ({
  oauth,
  config = defaultConfig,
  fetchImpl,
  now = Date.now,
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
  const [link, setLink] = useState("");
  const [styleId, setStyleId] = useState("");
  const [promptProblem, setPromptProblem] = useState<PromptProblem>();
  const [linkProblem, setLinkProblem] = useState<LinkProblem>();
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<ErrorView | null>(null);
  const [styleList, setStyleList] = useState<Style[]>([]);
  const [stylesFailed, setStylesFailed] = useState(false);
  const [recent, setRecent] = useState<Code[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      setRecent(await client.listCodes(RECENT_CODES_LIMIT));
    } catch (caught) {
      if (caught instanceof QrxApiError && caught.kind === "unauthorized") {
        markSignedOut();
      }
    } finally {
      setRecentLoading(false);
    }
  }, [client, markSignedOut]);

  useEffect(() => {
    if (status !== "signed-in") {
      setStyleList([]);
      setRecent([]);
      return;
    }
    let cancelled = false;
    client
      .listStyles()
      .then((list) => {
        if (!cancelled) {
          setStyleList(list);
          setStylesFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setStylesFailed(true);
      });
    loadRecent();
    return () => {
      cancelled = true;
    };
  }, [status, client, loadRecent]);

  const validate = () => {
    const promptIssue = checkPrompt(prompt);
    const linkIssue = checkLink(link);
    setPromptProblem(promptIssue);
    setLinkProblem(linkIssue);
    return !promptIssue && !linkIssue;
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

  const create = async () => {
    setError(null);
    if (!validate()) {
      return;
    }
    if (status !== "signed-in" && !(await startConnect())) {
      return;
    }

    const request = {
      prompt: prompt.trim(),
      destination: normaliseLink(link),
      ...(styleId ? { style: styleId } : {}),
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
              value={prompt}
              error={
                promptProblem &&
                intl.formatMessage(PROMPT_ERRORS[promptProblem])
              }
              control={(props) => (
                <MultilineInput
                  {...props}
                  placeholder={intl.formatMessage(messages.promptPlaceholder)}
                  minRows={3}
                  autoGrow
                  maxLength={MAX_PROMPT_LENGTH}
                  onChange={(value) => {
                    setPrompt(value);
                    setPromptProblem(undefined);
                  }}
                />
              )}
            />
            <FormField
              label={intl.formatMessage(messages.linkLabel)}
              description={intl.formatMessage(messages.linkDescription)}
              value={link}
              error={
                linkProblem && intl.formatMessage(LINK_ERRORS[linkProblem])
              }
              control={(props) => (
                <TextInput
                  {...props}
                  type="url"
                  placeholder={intl.formatMessage(messages.linkPlaceholder)}
                  onChange={(value) => {
                    setLink(value);
                    setLinkProblem(undefined);
                  }}
                />
              )}
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
              loading={status === "checking"}
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
            onRefresh={loadRecent}
            loading={recentLoading}
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
