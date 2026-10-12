import { useFeatureSupport } from "@canva/app-hooks";
import { upload } from "@canva/asset";
import { addElementAtCursor, addElementAtPoint } from "@canva/design";
import { useCallback } from "react";
import { useIntl } from "react-intl";
import { resolveImageUrl } from "src/api/resolve_image_url";
import type { Code } from "src/api/types";
import { UploadError } from "src/logic/errors";
import { messages } from "src/messages";

/** The link a code's alt text names: the short link, else where it points. */
export function linkForAltText(code: Code): string {
  return (code.shortUrl ?? code.destination ?? "").replace(/^https?:\/\//, "");
}

/**
 * Uploads a finished code's PNG to the user's media and places it in the
 * design. The image is marked as AI-generated, as Canva requires.
 */
export function useAddToDesign() {
  const intl = useIntl();
  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) =>
    isSupported(fn),
  );

  const addToDesign = useCallback(
    async (code: Code) => {
      if (!addElement || !code.imageUrl) {
        return;
      }
      try {
        const url = await resolveImageUrl(code.imageUrl);
        const asset = await upload({
          type: "image",
          name: `QRX ${code.id}`,
          mimeType: "image/png",
          url,
          thumbnailUrl: url,
          aiDisclosure: "app_generated",
        });
        await addElement({
          type: "image",
          ref: asset.ref,
          altText: {
            text: code.wifi
              ? intl.formatMessage(messages.designAltTextWifi, {
                  ssid: code.wifi.ssid,
                })
              : intl.formatMessage(messages.designAltText, {
                  link: linkForAltText(code),
                }),
            decorative: false,
          },
        });
      } catch (error) {
        throw new UploadError(error);
      }
    },
    [addElement, intl],
  );

  return { addToDesign, canAdd: Boolean(addElement) };
}
