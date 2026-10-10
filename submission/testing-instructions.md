# Testing instructions for Canva's reviewers

For **Release > Testing instructions**. The login goes in **Login details**; the rest in the additional details box.
The password is entered in the Developer Portal only, never in this repo.

## Login details

| Field | Value |
|---|---|
| Username | `qrx-canva-review` |
| Password | (from the team password vault: "QRX Canva reviewer") |

The account signs in with username and password, with no emailed or texted codes. It has the paid plan turned on, so
the daily limit won't interrupt testing.

## Additional details (paste as is)

```
QRX makes art QR codes: a picture that is also a working QR code. The app connects to a QRX account, makes a code from a picture description and a link, and adds the finished image to the design.

To test:
1. Open the app in any design. Type a picture description, for example "A lighthouse on a cliff at sunset", and a link, for example example.com.
2. Select "Connect QRX and create". Canva opens the QRX sign-in in a new tab. Sign in with the test username and password above and allow access. (A new user could choose "Sign up" on the same page.)
3. Back in the panel, the code starts. A progress bar shows while QRX makes it; this usually takes about a minute. Before a code is returned, QRX decodes the finished image to check that it opens the link.
4. When the code is ready, select "Add to design". The image is uploaded to your uploads (marked as AI-generated) and placed on the page. Scan it with a phone camera: it opens a qrx.to short link that forwards to the link you entered.
5. Styles: after connecting, the panel shows 11 styles plus "No style". Select one before creating to change the look.
6. Recent codes: codes made earlier (including one that finished after the panel was closed) are listed under "Recent codes" and can be added to the design by selecting them.
7. Disconnect: "Disconnect QRX account" at the bottom of the panel signs out. Connecting again asks for the QRX login again.

Things to try:
- Leave the description or link empty, or type a link such as "mailto:someone@example.com": the panel explains what's needed and sends nothing.
- Use an offensive word in the description: the panel refuses it before sending, and QRX's API applies the same word filter.
- Select "Stop waiting" while a code is being made: the panel returns to the form, and the code appears under "Recent codes" when it's done.

How QRX works: QRX is a web app (qrx.codes) and API. Codes and their short links belong to the user's QRX account and also appear in their gallery on qrx.codes. On a paid plan, a code's destination can be changed later on qrx.codes; the app itself doesn't sell anything and shows no prices.

Content: the images are made with AI. Descriptions go through a word filter, and every finished image is decoded to make sure the code scans. The panel has a "Report it" link to Canva's report form under each finished code.

Support: https://qrx.codes/support
```

## Before submitting, check

- The app's API base is production (`https://qrx.codes`); CI's `canva-app-bundle` artifact is built that way.
- The test account signs in from a new browser without an emailed code (Device Trust off; see
  [owner-steps.md](owner-steps.md)).
- One code made end to end with the test account in the submitted version, scanned with a phone.
