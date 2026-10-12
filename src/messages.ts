import { defineMessages } from "react-intl";

export const messages = defineMessages({
  intro: {
    defaultMessage:
      "QRX paints a QR code into a picture and checks that it scans before you add it to your design.",
    description: "Short explanation at the top of the app panel.",
  },
  promptLabel: {
    defaultMessage: "Describe the picture",
    description: "Label for the field where the user describes the picture.",
  },
  promptDescription: {
    defaultMessage:
      "Name a subject and a setting. The more specific the description, the better the code. Leave blank and we’ll write one for you.",
    description:
      "Help text under the picture description. A blank description is filled with the example shown in the field.",
  },
  whenScannedLabel: {
    defaultMessage: "When scanned",
    description:
      "Label for the choice of what the QR code does when scanned: open a link or join a Wi-Fi network.",
  },
  scanLink: {
    defaultMessage: "Open a link",
    description: "Option: the QR code opens a web page.",
  },
  scanWifi: {
    defaultMessage: "Wi-Fi",
    description: "Option: the QR code joins a Wi-Fi network.",
  },
  wifiNeedsStarter: {
    defaultMessage: "Wi-Fi codes come with the Starter plan.",
    description:
      "Shown when the account can't make Wi-Fi codes, only where payments are allowed. Starter is the name of the paid plan.",
  },
  linkLabel: {
    defaultMessage: "Link (URL)",
    description: "Label for the field with the web address the QR code opens.",
  },
  linkDescription: {
    defaultMessage: "People who scan the code go here.",
    description: "Help text under the link field.",
  },
  ssidLabel: {
    defaultMessage: "Network name (SSID)",
    description: "Label for the Wi-Fi network name field.",
  },
  ssidPlaceholder: {
    defaultMessage: "Network name",
    description: "Placeholder for the Wi-Fi network name field.",
  },
  securityLabel: {
    defaultMessage: "Security",
    description: "Label for the Wi-Fi security type (WPA or WEP).",
  },
  passwordLabel: {
    defaultMessage: "Password",
    description: "Label for the Wi-Fi password field.",
  },
  passwordPlaceholder: {
    defaultMessage: "Password",
    description: "Placeholder for the Wi-Fi password field.",
  },
  wifiNote: {
    defaultMessage:
      "The network name and password are printed into the code, so they cannot be changed after you generate it.",
    description: "Note under the Wi-Fi fields.",
  },
  required: {
    defaultMessage: "This is required.",
    description: "Error when a required field is empty.",
  },
  logoLabel: {
    defaultMessage: "Logo",
    description:
      "Label for the optional logo placed in the centre of the code. The field is marked optional.",
  },
  logoTypes: {
    defaultMessage: "PNG, JPEG, WebP or SVG",
    description: "The image types the logo can be.",
  },
  logoPlaced: {
    defaultMessage: "Placed in the centre of the code",
    description: "Shown under the chosen logo.",
  },
  logoReading: {
    defaultMessage: "Reading logo…",
    description: "Shown while a chosen logo is being read.",
  },
  removeLogo: {
    defaultMessage: "Remove logo",
    description:
      "Accessible label for the button that removes the chosen logo.",
  },
  logoPreviewAlt: {
    defaultMessage: "Selected logo",
    description: "Alt text for the preview of the chosen logo.",
  },
  logoWrongType: {
    defaultMessage: "Choose a PNG, JPEG, WebP or SVG image",
    description: "Error when the chosen logo isn't a supported image.",
  },
  logoTooLarge: {
    defaultMessage: "This image is too large; choose a smaller one",
    description: "Error when the chosen logo is too large.",
  },
  logoUnreadable: {
    defaultMessage: "The image could not be read",
    description: "Error when the chosen logo can't be read as an image.",
  },
  logoUploadFailed: {
    defaultMessage: "The logo could not be uploaded: {detail}",
    description:
      "Error when QRX refused the logo. {detail} is QRX's explanation in English.",
  },
  logoUploadFailedPlain: {
    defaultMessage: "The logo could not be uploaded",
    description: "Error when the logo couldn't be sent to QRX.",
  },
  styleLabel: {
    defaultMessage: "Style",
    description: "Label for the style picker.",
  },
  styleNone: {
    defaultMessage: "None",
    description:
      "Style option that leaves the look to the picture description.",
  },
  styleHint: {
    defaultMessage: "With None, describe the look you want in the description.",
    description: "Hint under the style picker.",
  },
  styleSignedOut: {
    defaultMessage: "Connect your QRX account to choose a style.",
    description: "Shown in place of the style picker before signing in.",
  },
  stylesFailed: {
    defaultMessage: "Styles couldn't be loaded. You can still create a code.",
    description: "Shown when the list of styles failed to load.",
  },
  stylePreviewAlt: {
    defaultMessage: "Example of the {name} style",
    description: "Alt text for a style preview image. {name} is the style.",
  },
  create: {
    defaultMessage: "Generate code",
    description: "Primary button that starts making a QR code.",
  },
  connectAndCreate: {
    defaultMessage: "Connect QRX and generate",
    description:
      "Primary button shown before sign-in. Connects a QRX account, then starts making the QR code.",
  },
  connect: {
    defaultMessage: "Connect QRX account",
    description: "Button that connects a QRX account.",
  },
  disconnect: {
    defaultMessage: "Disconnect QRX account",
    description: "Button that disconnects the QRX account from this app.",
  },
  connectedAs: {
    defaultMessage: "Your QRX account is connected.",
    description: "Shown at the bottom of the panel when signed in.",
  },
  signUpNote: {
    defaultMessage:
      "You'll sign in to QRX, or create a free account, in a new tab.",
    description: "Shown under the connect button before sign-in.",
  },
  promptTooLong: {
    defaultMessage: "Keep the description under 1,000 characters.",
    description: "Error when the picture description is too long.",
  },
  promptBlocked: {
    defaultMessage:
      "This description includes words QRX doesn't allow. Try different words.",
    description: "Error when the description contains blocked words.",
  },
  linkInvalid: {
    defaultMessage: "Enter a web address, such as example.com/menu.",
    description: "Error when the link isn't a valid web address.",
  },
  linkTooLong: {
    defaultMessage: "This link is too long for a QR code.",
    description: "Error when the link is longer than 2048 characters.",
  },
  generating: {
    defaultMessage: "Making your QR code. This usually takes about a minute.",
    description: "Shown with the progress bar while a code is being made.",
  },
  generatingSlow: {
    defaultMessage:
      "This one is taking a little longer than usual. It's still going.",
    description: "Shown when the code takes longer than expected.",
  },
  checkingScan: {
    defaultMessage:
      "Each code is checked to make sure it scans before it's ready.",
    description: "Second line under the progress bar.",
  },
  progressLabel: {
    defaultMessage: "QR code progress",
    description: "Accessible label for the progress bar.",
  },
  stopWaiting: {
    defaultMessage: "Stop waiting",
    description:
      "Button that stops waiting for the code. The code keeps being made and appears in Recent codes.",
  },
  resultTitle: {
    defaultMessage: "Your QR code is ready",
    description: "Heading above the finished code.",
  },
  addToDesign: {
    defaultMessage: "Add to design",
    description: "Button that adds the finished QR code image to the design.",
  },
  addToDesignAria: {
    defaultMessage: "Add this QR code to the design",
    description: "Accessible label for clicking a QR code image.",
  },
  addNotSupported: {
    defaultMessage: "Images can't be added to this page.",
    description: "Tooltip when the current design page doesn't allow images.",
  },
  createAnother: {
    defaultMessage: "Create another",
    description: "Button that goes back to the form.",
  },
  opensLink: {
    defaultMessage: "Opens {shortUrl}, which sends people to {destination}.",
    description:
      "Explains the code's short link. {shortUrl} is like qrx.to/abc123 and {destination} is the user's link.",
  },
  joinsWifi: {
    defaultMessage: "Joins the Wi-Fi network {ssid}.",
    description: "Explains a Wi-Fi code. {ssid} is the network's name.",
  },
  changeLinkPaid: {
    defaultMessage:
      "On a paid plan, you can change where this code points on qrx.codes, even after it's printed.",
    description:
      "Explains that the code's destination can be changed later on a paid QRX plan. Don't mention prices.",
  },
  testScan: {
    defaultMessage:
      "Test-scan the printed design before a large print run, and leave a clear margin around the code.",
    description: "Printing advice under the finished code.",
  },
  openOnQrx: {
    defaultMessage: "Open on qrx.codes",
    description: "Link to the code's page on the QRX website.",
  },
  imageAlt: {
    defaultMessage: "QR code artwork: {prompt}",
    description:
      "Alt text for a generated QR code image. {prompt} is the description.",
  },
  designAltText: {
    defaultMessage: "QR code that opens {link}",
    description: "Alt text for the QR code image added to the design.",
  },
  designAltTextWifi: {
    defaultMessage: "QR code that joins the Wi-Fi network {ssid}",
    description:
      "Alt text for a Wi-Fi QR code image added to the design. {ssid} is the network's name.",
  },
  recentTitle: {
    defaultMessage: "Recent codes",
    description: "Heading for the list of the user's recent QR codes.",
  },
  recentFailed: {
    defaultMessage:
      "Your recent codes couldn't be loaded. Select Refresh to try again.",
    description:
      "Shown when the list of the user's recent QR codes failed to load.",
  },
  recentEmpty: {
    defaultMessage: "Codes you make will appear here.",
    description: "Shown when the user has no codes yet.",
  },
  recentHint: {
    defaultMessage: "Select a code to add it to your design.",
    description: "Hint above the recent codes grid.",
  },
  refresh: {
    defaultMessage: "Refresh",
    description: "Button that reloads the recent codes.",
  },
  reportContent: {
    defaultMessage:
      "Something not right with an image? <link>Report it</link>.",
    description: "Invites the user to report a generated image.",
  },
  reportLinkTooltip: {
    defaultMessage: "Report content",
    description: "Accessible label for the report link.",
  },
  errorDailyLimit: {
    defaultMessage: "You've used all of today's codes.",
    description: "Error when the account's daily allowance is used up.",
  },
  errorDailyLimitBrowser: {
    defaultMessage: "Open qrx.codes in your browser to see your options.",
    description:
      "Follow-up when the daily allowance is used up and payments can't be shown here.",
  },
  seePlans: {
    defaultMessage: "See plans on qrx.codes",
    description:
      "Button that opens the QRX plans page. Only shown where payments are allowed.",
  },
  errorRateLimited: {
    defaultMessage:
      "That was a lot of requests at once. Try again in a minute.",
    description: "Error when the API rate limit was hit.",
  },
  errorUnauthorized: {
    defaultMessage:
      "Your QRX account was disconnected. Connect it again to continue.",
    description: "Error when the QRX sign-in has expired or was revoked.",
  },
  errorForbidden: {
    defaultMessage:
      "QRX didn't allow this request. Try connecting your account again.",
    description: "Error when the API refuses the request.",
  },
  errorInvalid: {
    defaultMessage: "QRX couldn't start this code: {detail}",
    description:
      "Error when the API rejects the request. {detail} is QRX's explanation in English.",
  },
  errorServer: {
    defaultMessage:
      "QRX is having trouble right now. We're on it, so please try again in a few minutes.",
    description: "Error for server problems.",
  },
  errorNetwork: {
    defaultMessage:
      "QRX couldn't be reached. Check your connection and try again.",
    description: "Error when the network request failed.",
  },
  errorFailed: {
    defaultMessage:
      "This code couldn't be made. Try again, or describe the picture differently.",
    description: "Error when making the code failed.",
  },
  errorTimeout: {
    defaultMessage:
      "This code is taking longer than usual. It will appear in Recent codes when it's ready.",
    description: "Shown when the app stops waiting for a slow code.",
  },
  errorUpload: {
    defaultMessage: "The image couldn't be added to your design. Try again.",
    description: "Error when uploading the image to Canva failed.",
  },
  errorConnect: {
    defaultMessage: "Connecting to QRX didn't finish. Try again.",
    description: "Error when the OAuth flow failed or was closed.",
  },
  errorGeneric: {
    defaultMessage: "Something went wrong. Try again.",
    description: "Catch-all error.",
  },
  tryAgain: {
    defaultMessage: "Try again",
    description: "Button that retries the last action.",
  },
});
