import {
  Column,
  Columns,
  FormField,
  Grid,
  ImageCard,
  Rows,
  Select,
  Text,
} from "@canva/app-ui-kit";
import { useState } from "react";
import { useIntl } from "react-intl";
import type { Style } from "src/api/types";
import { messages } from "src/messages";
import * as styles from "styles/components.css";

type Props = {
  styleList: Style[];
  /** The chosen style id; "" for no style. */
  value: string;
  onChange: (styleId: string) => void;
  disabled?: boolean;
};

/** The API lists "No Style" as a style of its own; it means no style. */
export function isNoStyle(style: Style): boolean {
  return style.id === "Noop" || /^no\s*style$/i.test(style.name.trim());
}

/** The id to send for a tile: "" for the no-style tile. */
export const styleValue = (style: Style) => (isNoStyle(style) ? "" : style.id);

/** None first, the rest in the API's order, as the QRX web app lists them. */
export const orderStyles = (list: readonly Style[]) => [
  ...list.filter(isNoStyle),
  ...list.filter((style) => !isNoStyle(style)),
];

/**
 * Style choice as a grid of previews, chosen like radio buttons and starting
 * with None, or as a plain list when previews can't be shown.
 */
export const StylePicker = ({
  styleList,
  value,
  onChange,
  disabled,
}: Props) => {
  const intl = useIntl();
  const [previewsFailed, setPreviewsFailed] = useState(false);
  const noStyleName = intl.formatMessage(messages.styleNone);
  const nameOf = (style: Style) =>
    isNoStyle(style) ? noStyleName : style.name;
  const ordered = orderStyles(styleList);
  const selected = ordered.find((style) => styleValue(style) === value);
  const hint = (
    <Text size="small" tone="tertiary">
      {intl.formatMessage(messages.styleHint)}
    </Text>
  );

  const showPreviews =
    !previewsFailed && styleList.every((style) => style.previewUrl);

  if (!showPreviews) {
    const options = [
      { value: "", label: noStyleName },
      ...styleList
        .filter((style) => !isNoStyle(style))
        .map((style) => ({ value: style.id, label: style.name })),
    ];
    return (
      <Rows spacing="1u">
        <FormField
          label={intl.formatMessage(messages.styleLabel)}
          value={value}
          control={(props) => (
            <Select
              {...props}
              options={options}
              onChange={onChange}
              disabled={disabled}
              stretch
            />
          )}
        />
        {hint}
      </Rows>
    );
  }

  return (
    <Rows spacing="1u">
      <Columns spacing="1u" alignY="center">
        <Column>
          <Text variant="bold" size="small">
            {intl.formatMessage(messages.styleLabel)}
          </Text>
        </Column>
        <Column width="content">
          <Text size="small" tone="tertiary">
            {selected ? nameOf(selected) : noStyleName}
          </Text>
        </Column>
      </Columns>
      <Grid columns={3} spacing="1u">
        {ordered.map((style) => {
          const tileValue = styleValue(style);
          const name = nameOf(style);
          return (
            <div key={style.id} className={styles.styleTile}>
              <ImageCard
                thumbnailUrl={style.previewUrl ?? ""}
                alt={intl.formatMessage(messages.stylePreviewAlt, { name })}
                ariaLabel={name}
                selectable
                selected={tileValue === value}
                disabled={disabled}
                borderRadius="standard"
                thumbnailAspectRatio={1}
                onImageLoad={(state) => {
                  if (state === "error") setPreviewsFailed(true);
                }}
                onClick={() => onChange(tileValue)}
              />
              <Text size="xsmall" alignment="center" lineClamp={1}>
                {name}
              </Text>
            </div>
          );
        })}
      </Grid>
      {hint}
    </Rows>
  );
};
