import { Link, Text } from "@canva/app-ui-kit";
import { FormattedMessage, useIntl } from "react-intl";
import { REPORT_CONTENT_URL } from "src/config";
import { messages } from "src/messages";

/** Lets people report a generated image through Canva's report form. */
export const ReportContent = ({
  onOpenUrl,
}: {
  onOpenUrl: (url: string) => void;
}) => {
  const intl = useIntl();
  return (
    <Text size="xsmall" tone="tertiary">
      <FormattedMessage
        {...messages.reportContent}
        values={{
          link: (chunks) => (
            <Link
              key="report"
              href={REPORT_CONTENT_URL}
              requestOpenExternalUrl={() => onOpenUrl(REPORT_CONTENT_URL)}
              ariaLabel={intl.formatMessage(messages.reportLinkTooltip)}
            >
              {chunks}
            </Link>
          ),
        }}
      />
    </Text>
  );
};
