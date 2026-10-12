# Owner steps

What needs the owner's accounts, in order. Everything else (code, listing, images, answers) is in this repo.

## 1. Ask Canva first (5 minutes)

Send [question-to-canva.md](question-to-canva.md). The answer decides `QRX_API_MODE`: `canva` (the API verifies the
Canva user token on `/canva/v1`) or `direct` (OAuth alone, `/v1`). The app supports both; only the API work differs.

## 2. Canva developer account

1. Sign in to canva.com with a free Canva account. Use an `@qrx.codes` address if possible: Canva's checklist asks that
   the submitting email belongs to the platform the app connects to. Don't use an `@makerx.com.au` address for
   anything a reviewer touches.
2. Open https://www.canva.com/developers/apps and accept the developer terms. A free account has full access; public
   apps need no Enterprise team.

## 3. Two app records: development and the listed app

Canva wants separate identity-provider settings for development and production, so create two apps (**Create an app >
Public**):

| App name | Purpose | Auth provider | API base |
|---|---|---|---|
| `QRX dev` | Previewing with `npm start` | Dev Clerk (`summary-bobcat-19`), client `DbRxTAmnNNHtIU6Y` | `https://dev.qrx.codes` |
| `QRX` | The one submitted for review | Prod Clerk (`clerk.qrx.codes`), the new prod client | `https://qrx.codes` |

For each app:

1. **Intent:** enrol the design editor intent (it's in `canva-app.json`; the portal or `canva apps config push` sets it).
2. **Permissions:** turn on `canva:asset:private:write` and `canva:design:content:write`. Without them the app can't be
   approved.
3. **Security > Credentials > .env file:** copy `CANVA_APP_ID` and `CANVA_APP_ORIGIN`. For `QRX dev`, paste them into
   this repo's `.env`.
4. **Send both app IDs to the API side** for CORS: each origin is `https://app-<app id in lower case>.canva-apps.com`
   (`npm run portal-config` prints it). In `canva` mode, the `/canva/v1` routes also verify the Canva user token against
   these app IDs.
5. **Inside Canva > Auth providers > Add provider** (appears once the intent is set). Run `npm run portal-config` (dev
   values from `.env.template`; for prod, set `QRX_OAUTH_ISSUER=https://clerk.qrx.codes` and the prod
   `QRX_OAUTH_CLIENT_ID` first) and copy each value:
   - Client ID; Client secret (dev: from whoever created the dev Clerk app, via the password vault; prod: from step 5 below)
   - Credential transfer mode: **Headers**
   - Authorization server URL: `<issuer>/oauth/authorize`
   - Token exchange URL: `<issuer>/oauth/token`
   - Revocation exchange URL: `<issuer>/oauth/token/revoke`
   - PKCE: on
6. Copy the read-only **Redirect URL** from that dialog. Add it to the matching Clerk OAuth application's redirect URIs
   (dev: app `oa_3KUsK4ba1PcdkfiwzAunNY0FVDW`, which still has a placeholder redirect URI).

## 4. Test in the editor (dev app)

1. `npm install`, check `.env` (dev API base, the dev app's ID and origin), `npm start`.
2. In `QRX dev`: **App source > Development URL** = `http://localhost:8081` (or the port in `CANVA_FRONTEND_PORT`), then **Preview**.
3. Go through [testing-instructions.md](testing-instructions.md) with a dev QRX account, plus:
   - **Token audience.** Canva adds `resource=https://dev.qrx.codes/v1` to the authorise URL, but its token request
     follows RFC 6749 and won't carry `resource`. If the first API call answers `401 invalid_token`, Clerk didn't put
     the `/v1` audience on the token: tell the API side, which then needs to accept the Canva client's tokens on the
     routes the app calls.
   - **Image upload.** "Add to design" must place the image. If Canva reports an upload error, the image URL redirects
     or lacks CORS for the app origin (see "API prerequisites" in the README).
   - Light and dark themes (the Developer Toolkit in the editor switches them), and a fixed and a responsive design
     type.
   - Remove the app from your apps, reopen it: it must ask you to connect again.

## 5. Prod Clerk OAuth application

In the prod instance (`clerk.qrx.codes`) dashboard, **OAuth applications >
Add**:
- Name: `QRX for Canva`; confidential client; consent screen on.
- Scopes: `qrx:read qrx:generate offline_access`.
- Redirect URI: the Redirect URL from the `QRX` app's auth provider dialog.
- Put the client ID and secret into the `QRX` app's auth provider (step 3.5). Keep the secret in the password vault only.

## 6. Reviewer account (prod)

As in the ChatGPT reviewer runbook (`docs/distribution/chatgpt/SUBMISSION.md` in qrxcodes):
1. Confirm username and password sign-in are on, and Device Trust is off (otherwise a new browser gets an emailed code
   the reviewers can't receive).
2. Create user `qrx-canva-review`, email `canva-review@qrx.codes` (not a staff address), a generated 24+ character
   password saved as "QRX Canva reviewer". No MFA, phone or passkey.
3. Set public metadata `{ "isPaid": true }` so the daily limit doesn't block review.
4. Sign in once at qrx.codes from a private window to prove it works without a code.

## 7. Before submitting

- The API prerequisites in the README are live on prod: CORS for the `QRX` app origin (and the `X-QRX-Authorization`
  header in `canva` mode), the `/canva/v1` routes if Canva asked for verification, image URLs Canva can upload, and
  style previews that load.
- Decide on an image safety check (risk 7 in the scoping doc). If one is added, update the moderation answer in
  [review-questionnaire.md](review-questionnaire.md); if not, submit the answer as written.
- One code made end to end in the `QRX` app against prod, scanned with a phone.

## 8. Submit

1. Bundle: download the `canva-app-bundle` artifact from the latest green CI run on `main` (built against
   `https://qrx.codes`), or run `QRX_API_BASE=https://qrx.codes npm run build`.
2. **Inside Canva > Code upload:** App source **JavaScript bundle**, upload `dist/app.js`. If the portal asks for
   translations, upload `dist/messages_en.json`.
3. **Release > App listing details:** Text, Media and Links from [listing.md](listing.md), using `icons/icon-512.png`
   and both featured images.
4. **Release > Testing instructions:** from [testing-instructions.md](testing-instructions.md); login details from the
   vault.
5. **Release > App status:** agree to the terms and **Submit app for review**.
6. Canva opens a Jira Service Desk ticket. Answer its questionnaire from
   [review-questionnaire.md](review-questionnaire.md); all review communication stays on that ticket.

Canva gives no expected review time. If the app is rejected, the rejected version can't be edited: create a new version,
fix, and resubmit (up to 5 submissions a day).
