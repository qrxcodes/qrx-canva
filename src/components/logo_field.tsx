import {
  Button,
  FileInput,
  FormField,
  HorizontalCard,
  TrashIcon,
} from "@canva/app-ui-kit";
import { useState } from "react";
import { useIntl } from "react-intl";
import type { PreparedLogo } from "src/logic/logo";
import { LOGO_ACCEPT, LogoError } from "src/logic/logo";
import { messages } from "src/messages";

type Props = {
  logo: PreparedLogo | null;
  onChange: (logo: PreparedLogo | null) => void;
  /** Why the logo can't be used, already worded for the person. */
  error?: string;
  onError: (error?: string) => void;
  prepare: (file: File) => Promise<PreparedLogo>;
  disabled?: boolean;
};

const LOGO_ERRORS = {
  type: messages.logoWrongType,
  "too-large": messages.logoTooLarge,
  unreadable: messages.logoUnreadable,
};

/** An optional logo for the centre of the code, as on the QRX web app. */
export const LogoField = ({
  logo,
  onChange,
  error,
  onError,
  prepare,
  disabled,
}: Props) => {
  const intl = useIntl();
  const [reading, setReading] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    onError(undefined);
    try {
      onChange(await prepare(file));
    } catch (caught) {
      onChange(null);
      const problem =
        caught instanceof LogoError ? caught.problem : "unreadable";
      onError(intl.formatMessage(LOGO_ERRORS[problem]));
    } finally {
      setReading(false);
    }
  };

  const remove = () => {
    onChange(null);
    onError(undefined);
  };
  const description = reading
    ? intl.formatMessage(messages.logoReading)
    : logo
      ? undefined
      : intl.formatMessage(messages.logoTypes);

  return (
    <FormField
      label={intl.formatMessage(messages.logoLabel)}
      labelMarker="optional"
      description={description}
      error={error}
      control={({ id }) =>
        logo ? (
          <HorizontalCard
            title={logo.name}
            description={intl.formatMessage(messages.logoPlaced)}
            thumbnail={{
              url: logo.dataUrl,
              alt: intl.formatMessage(messages.logoPreviewAlt),
            }}
            disabled={disabled}
            bottomEnd={
              <Button
                variant="tertiary"
                icon={TrashIcon}
                ariaLabel={intl.formatMessage(messages.removeLogo)}
                disabled={disabled}
                onClick={remove}
              />
            }
            bottomEndVisibility="always"
          />
        ) : (
          <FileInput
            id={id}
            accept={LOGO_ACCEPT}
            disabled={disabled || reading}
            stretchButton
            onDropAcceptedFiles={(files) => choose(files[0])}
            onDropRejectedFiles={() =>
              onError(intl.formatMessage(messages.logoWrongType))
            }
          />
        )
      }
    />
  );
};
