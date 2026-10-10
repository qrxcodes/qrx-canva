import { Alert, Button, Rows, Text } from "@canva/app-ui-kit";
import { useIntl } from "react-intl";
import type { ErrorView } from "src/logic/errors";
import { messages } from "src/messages";

type Props = {
  error: ErrorView;
  canAcceptPayments: boolean;
  onReconnect: () => void;
  onRetry: () => void;
  onSeePlans: () => void;
  onDismiss: () => void;
};

export const ErrorAlert = ({
  error,
  canAcceptPayments,
  onReconnect,
  onRetry,
  onSeePlans,
  onDismiss,
}: Props) => {
  const intl = useIntl();
  const tone = error.tone === "info" ? "info" : error.tone;

  return (
    <Rows spacing="1u">
      <Alert tone={tone} onDismiss={onDismiss}>
        <Rows spacing="0.5u">
          <Text size="small">
            {intl.formatMessage(error.message, error.values)}
          </Text>
          {error.action === "daily-limit" && !canAcceptPayments && (
            <Text size="small">
              {intl.formatMessage(messages.errorDailyLimitBrowser)}
            </Text>
          )}
        </Rows>
      </Alert>
      {error.action === "reconnect" && (
        <Button variant="secondary" stretch onClick={onReconnect}>
          {intl.formatMessage(messages.connect)}
        </Button>
      )}
      {error.action === "retry" && (
        <Button variant="secondary" stretch onClick={onRetry}>
          {intl.formatMessage(messages.tryAgain)}
        </Button>
      )}
      {error.action === "daily-limit" && canAcceptPayments && (
        <Button variant="secondary" stretch onClick={onSeePlans}>
          {intl.formatMessage(messages.seePlans)}
        </Button>
      )}
    </Rows>
  );
};
