import { Button, ImageCard, Link, Rows, Text, Title } from "@canva/app-ui-kit";
import { useIntl } from "react-intl";
import type { Code } from "src/api/types";
import { messages } from "src/messages";
import { ReportContent } from "./report_content";

type Props = {
  code: Code;
  canAdd: boolean;
  adding: boolean;
  canAcceptPayments: boolean;
  onAdd: (code: Code) => void;
  onCreateAnother: () => void;
  onOpenUrl: (url: string) => void;
};

const withoutScheme = (url: string) => url.replace(/^https?:\/\//, "");

export const CodeResult = ({
  code,
  canAdd,
  adding,
  canAcceptPayments,
  onAdd,
  onCreateAnother,
  onOpenUrl,
}: Props) => {
  const intl = useIntl();
  const addLabel = intl.formatMessage(messages.addToDesign);

  return (
    <Rows spacing="2u">
      <Title size="small">{intl.formatMessage(messages.resultTitle)}</Title>
      {code.imageUrl && (
        <ImageCard
          thumbnailUrl={code.imageUrl}
          alt={intl.formatMessage(messages.imageAlt, { prompt: code.prompt })}
          ariaLabel={intl.formatMessage(messages.addToDesignAria)}
          borderRadius="standard"
          thumbnailAspectRatio={1}
          disabled={!canAdd || adding}
          onClick={() => onAdd(code)}
        />
      )}
      <Button
        variant="primary"
        stretch
        loading={adding}
        disabled={!canAdd}
        tooltipLabel={
          canAdd ? undefined : intl.formatMessage(messages.addNotSupported)
        }
        onClick={() => onAdd(code)}
      >
        {addLabel}
      </Button>
      {code.shortUrl && code.destination && (
        <Text size="small">
          {intl.formatMessage(messages.opensLink, {
            shortUrl: withoutScheme(code.shortUrl),
            destination: withoutScheme(code.destination),
          })}
        </Text>
      )}
      {canAcceptPayments && (
        <Text size="small">{intl.formatMessage(messages.changeLinkPaid)}</Text>
      )}
      <Text size="small" tone="tertiary">
        {intl.formatMessage(messages.testScan)}
      </Text>
      <Text size="small">
        <Link
          href={code.pageUrl}
          requestOpenExternalUrl={() => onOpenUrl(code.pageUrl)}
        >
          {intl.formatMessage(messages.openOnQrx)}
        </Link>
      </Text>
      <Button variant="secondary" stretch onClick={onCreateAnother}>
        {intl.formatMessage(messages.createAnother)}
      </Button>
      <ReportContent onOpenUrl={onOpenUrl} />
    </Rows>
  );
};
