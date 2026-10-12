import {
  Column,
  Columns,
  FormField,
  Rows,
  SegmentedControl,
  Select,
  Text,
  TextInput,
} from "@canva/app-ui-kit";
import { useIntl } from "react-intl";
import type { WifiSecurity } from "src/api/types";
import {
  MAX_SSID_LENGTH,
  MAX_WIFI_PASSWORD_LENGTH,
} from "src/logic/validation";
import { messages } from "src/messages";

export type ScanKind = "link" | "wifi";

export type ScanValues = {
  kind: ScanKind;
  link: string;
  ssid: string;
  password: string;
  security: WifiSecurity;
};

type Props = {
  values: ScanValues;
  set: <K extends keyof ScanValues>(key: K, value: ScanValues[K]) => void;
  /** The link a blank link field opens, shown as its placeholder. */
  linkPlaceholder: string;
  /** Whether the account can make Wi-Fi codes. */
  canUseWifi: boolean;
  /** Where payments are allowed, a locked Wi-Fi option says which plan has it. */
  canAcceptPayments: boolean;
  errors: { link?: string; ssid?: string; password?: string };
};

// the protocols' names, which aren't translated
/* eslint-disable formatjs/no-literal-string-in-object */
const SECURITY_OPTIONS: { value: WifiSecurity; label: string }[] = [
  { value: "wpa", label: "WPA" },
  { value: "wep", label: "WEP" },
];
/* eslint-enable formatjs/no-literal-string-in-object */

/** What the code does when scanned: open a link, or join a Wi-Fi network. */
export const ScanFields = ({
  values,
  set,
  linkPlaceholder,
  canUseWifi,
  canAcceptPayments,
  errors,
}: Props) => {
  const intl = useIntl();
  const kind: ScanKind = canUseWifi ? values.kind : "link";

  return (
    <Rows spacing="2u">
      <FormField
        label={intl.formatMessage(messages.whenScannedLabel)}
        description={
          !canUseWifi && canAcceptPayments
            ? intl.formatMessage(messages.wifiNeedsStarter)
            : undefined
        }
        value={kind}
        control={({ id }) => (
          <SegmentedControl<ScanKind>
            id={id}
            value={kind}
            onChange={(value) => set("kind", value)}
            options={[
              { value: "link", label: intl.formatMessage(messages.scanLink) },
              {
                value: "wifi",
                label: intl.formatMessage(messages.scanWifi),
                disabled: !canUseWifi,
              },
            ]}
          />
        )}
      />

      {kind === "link" ? (
        <FormField
          label={intl.formatMessage(messages.linkLabel)}
          description={intl.formatMessage(messages.linkDescription)}
          value={values.link}
          error={errors.link}
          control={(props) => (
            <TextInput
              {...props}
              type="url"
              placeholder={linkPlaceholder}
              onChange={(value) => set("link", value)}
            />
          )}
        />
      ) : (
        <Rows spacing="2u">
          <Columns spacing="1u">
            <Column>
              <FormField
                label={intl.formatMessage(messages.ssidLabel)}
                value={values.ssid}
                error={errors.ssid}
                control={(props) => (
                  <TextInput
                    {...props}
                    placeholder={intl.formatMessage(messages.ssidPlaceholder)}
                    maxLength={MAX_SSID_LENGTH}
                    onChange={(value) => set("ssid", value)}
                  />
                )}
              />
            </Column>
            <Column width="1/3">
              <FormField
                label={intl.formatMessage(messages.securityLabel)}
                value={values.security}
                control={(props) => (
                  <Select<WifiSecurity>
                    {...props}
                    options={SECURITY_OPTIONS}
                    onChange={(value) => set("security", value)}
                    stretch
                  />
                )}
              />
            </Column>
          </Columns>
          <FormField
            label={intl.formatMessage(messages.passwordLabel)}
            value={values.password}
            error={errors.password}
            control={(props) => (
              <TextInput
                {...props}
                placeholder={intl.formatMessage(messages.passwordPlaceholder)}
                maxLength={MAX_WIFI_PASSWORD_LENGTH}
                onChange={(value) => set("password", value)}
              />
            )}
          />
          <Text size="small" tone="tertiary">
            {intl.formatMessage(messages.wifiNote)}
          </Text>
        </Rows>
      )}
    </Rows>
  );
};
