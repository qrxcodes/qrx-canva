import {
  Button,
  Columns,
  Column,
  Grid,
  ImageCard,
  Rows,
  Text,
} from "@canva/app-ui-kit";
import { useIntl } from "react-intl";
import type { Code } from "src/api/types";
import { messages } from "src/messages";

type Props = {
  codes: Code[];
  canAdd: boolean;
  onAdd: (code: Code) => void;
  onRefresh: () => void;
  loading: boolean;
};

/** Finished link codes, newest first. Selecting one adds it to the design. */
export function recentCodesToShow(codes: Code[]): Code[] {
  return codes.filter(
    (code) =>
      code.status === "succeeded" && code.type === "url" && code.imageUrl,
  );
}

export const RecentCodes = ({
  codes,
  canAdd,
  onAdd,
  onRefresh,
  loading,
}: Props) => {
  const intl = useIntl();
  const shown = recentCodesToShow(codes);

  return (
    <Rows spacing="1u">
      <Columns spacing="1u" alignY="center">
        <Column>
          <Text variant="bold">{intl.formatMessage(messages.recentTitle)}</Text>
        </Column>
        <Column width="content">
          <Button
            variant="tertiary"
            size="small"
            loading={loading}
            onClick={onRefresh}
          >
            {intl.formatMessage(messages.refresh)}
          </Button>
        </Column>
      </Columns>
      {shown.length === 0 ? (
        <Text size="small" tone="tertiary">
          {intl.formatMessage(messages.recentEmpty)}
        </Text>
      ) : (
        <>
          <Text size="small" tone="tertiary">
            {intl.formatMessage(messages.recentHint)}
          </Text>
          <Grid columns={2} spacing="1u">
            {shown.map((code) => (
              <ImageCard
                key={code.id}
                thumbnailUrl={code.imageUrl ?? ""}
                alt={intl.formatMessage(messages.imageAlt, {
                  prompt: code.prompt,
                })}
                ariaLabel={intl.formatMessage(messages.addToDesignAria)}
                borderRadius="standard"
                thumbnailAspectRatio={1}
                disabled={!canAdd}
                onClick={() => onAdd(code)}
              />
            ))}
          </Grid>
        </>
      )}
    </Rows>
  );
};
