# Testing instructions for Canva's reviewers

For **Release > Testing instructions**. The login goes in **Login details**; the overview and steps in their own boxes.
The password is entered in the Developer Portal only, never in this repo.

## Login details

| Field | Value |
|---|---|
| Username | `qrx-canva-review` |
| Password | (from the team password vault: "QRX Canva reviewer") |

The account signs in with username and password, with no emailed or texted codes. It has the paid plan turned on, so
the daily limit won't interrupt testing.

## About your app or platform (limit 400)

```
QRX makes art QR codes: a picture that is also a working QR code. The app connects to the user's QRX account (qrx.codes), makes a code from a picture description and a link, checks that the finished image scans, and adds it to the design. Codes and their short links belong to the QRX account and also appear on qrx.codes. The app sells nothing and shows no prices.
```

## Testing steps (limit 1,000)

```
1. Open the app in any design. Enter a picture description (e.g. "A lighthouse on a cliff at sunset") and a link (e.g. example.com).
2. Select "Connect QRX and create", then Connect. Sign in with the test account from Login details and allow access.
3. A progress bar shows while the code is made, usually about a minute. QRX decodes the image to check it scans before returning it.
4. Select "Add to design". Scan the code with a phone: it opens a qrx.to short link that forwards to the link you entered.
5. Select one of the 11 styles before creating to change the look.
6. "Recent codes" lists earlier codes; select one to add it to the design.
7. "Disconnect QRX account" signs out; connecting again asks for the login.
Edge cases: an empty field or a non-web link is refused before anything is sent; offensive words are refused; "Stop waiting" returns to the form and the code appears under "Recent codes" when done.
```

The walkthrough video link goes in **App walkthrough video link**; it is recorded with `tools/demo-video` in the qrxcodes repo (`npm run record -- canva-qrx`).

## Before submitting, check

- The app's API base is production (`https://qrx.codes`); CI's `canva-app-bundle` artifact is built that way.
- The test account signs in from a new browser without an emailed code (Device Trust off; see
  [owner-steps.md](owner-steps.md)).
- One code made end to end with the test account in the submitted version, scanned with a phone.
