# Pre-build question to Canva developer support

Send from the Canva account that will own the app, through Canva's developer support or community channel. Plain
text, ready to paste.

**Subject:** Request verification for an app that calls a third-party API with OAuth

```
Hi,

We're building a public app inside Canva for QRX (qrx.codes), which makes art QR codes. The app has no backend of its own. It signs users in to QRX with Canva's OAuth support (auth.initOauth, Canva storing and refreshing the tokens) and calls the QRX REST API directly from the app with the user's QRX access token.

The "Verifying HTTP requests" page says a public app's backend must verify the Canva user token from auth.getCanvaUserToken. Our question: is OAuth alone acceptable for review when the app calls a third-party API with a Canva-managed OAuth token and has no backend of its own? Or should the QRX API also verify the Canva user token on every request from the app?

We can do either. If verification is needed, we'll send the Canva user token in Authorization and the QRX access token in a separate header to a dedicated set of routes.

Thanks,
Matt Davies
QRX
```

If Canva says OAuth alone is fine, build with `QRX_API_MODE=direct` (calls `/v1` with the QRX token in
`Authorization`), and the API's `/canva/v1` routes aren't needed.
