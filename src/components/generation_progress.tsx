import { Button, ProgressBar, Rows, Text } from "@canva/app-ui-kit";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { EXPECTED_GENERATION_MS } from "src/config";
import { estimateProgress, isSlow } from "src/logic/progress";
import { messages } from "src/messages";

type Props = {
  startedAt: number;
  prompt: string;
  onStop: () => void;
  now?: () => number;
  tickMs?: number;
};

/**
 * A progress bar paced to the usual minute, as Canva's guidelines ask for
 * waits over a few seconds.
 */
export const GenerationProgress = ({
  startedAt,
  prompt,
  onStop,
  now = Date.now,
  tickMs = 250,
}: Props) => {
  const intl = useIntl();
  const [elapsed, setElapsed] = useState(() => now() - startedAt);

  useEffect(() => {
    const id = setInterval(() => setElapsed(now() - startedAt), tickMs);
    return () => clearInterval(id);
  }, [now, startedAt, tickMs]);

  const slow = isSlow(elapsed, EXPECTED_GENERATION_MS);

  return (
    <Rows spacing="2u">
      <Text variant="bold">{prompt}</Text>
      <ProgressBar
        value={Math.round(estimateProgress(elapsed, EXPECTED_GENERATION_MS))}
        ariaLabel={intl.formatMessage(messages.progressLabel)}
      />
      <Text size="small">
        {intl.formatMessage(
          slow ? messages.generatingSlow : messages.generating,
        )}
      </Text>
      <Text size="small" tone="tertiary">
        {intl.formatMessage(messages.checkingScan)}
      </Text>
      <Button variant="secondary" onClick={onStop} stretch>
        {intl.formatMessage(messages.stopWaiting)}
      </Button>
    </Rows>
  );
};
