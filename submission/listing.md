# Developer Portal listing: QRX

Every field on **Release > App listing details** (Text, Media, Links), checked against Canva's
[written content](https://www.canva.dev/docs/apps/app-listing-guidelines/written-content/),
[icon](https://www.canva.dev/docs/apps/app-listing-guidelines/app-icon/),
[featured image](https://www.canva.dev/docs/apps/app-listing-guidelines/featured-image/) and
[links](https://www.canva.dev/docs/apps/app-listing-guidelines/app-urls/) guidelines. Australian English. No prices or
plan numbers. Changing a code's link always says "on a paid plan".

## Text

### App name

```
QRX
```

3 characters (limit: under 10). Doesn't start with "Magic"; no "Canva" or "Pro"; no emoji. Matches the brand everywhere
else (qrx.codes, the MCP server, the Chrome extension).

### Short description

```
Art QR codes that are checked to scan
```

37 characters (limit: 50). One sentence, so no closing punctuation; sentence case; no acronyms beyond "QR", which is
the product category itself.

Alternative, if the reviewer asks for a different angle: `Turn a picture idea into an art QR code that scans` (50).

### Description

```
Describe a picture and add a link. QRX paints a QR code into the picture, checks that it scans, and adds it to your design. On a paid plan, you can change where a code points after printing.
```

190 characters (limit: 200), plain text, no line breaks, every sentence ends with punctuation, "design" for what the user
makes, no marketing claims, no hyperlinks. The longer points (the hosted qrx.to link, the 11 styles, AI-generated
images, the free account) are in the panel itself and in the testing instructions.

### What leads, and why

Canva refuses copycat apps, has its own AI QR code generator, and lists at least six AI QR art apps. The description
opens with what those don't do, in this order:

1. **Every code is decoded before it's delivered** (the API's own check, in the pipeline before `succeeded`). This is
   the reason the app exists: art QR codes from general image models often don't scan.
2. **A hosted qrx.to short link per code.** The code encodes `https://qrx.to/<id>`, not the user's URL, so it stays
   short (a sparser, more scannable pattern) and can be redirected.
3. **Changing where it points, on a paid plan**, after printing.

Styles and "AI" come after. The panel repeats the first two points under the progress bar and under the finished code.

## Category and tags

The Developer Portal's lists weren't readable without signing in; pick the closest match from what it offers.

| Field | First choice | If not offered |
|---|---|---|
| Category | Marketing | Design / Images |
| Secondary category (if asked) | AI image generation | Productivity |
| Tags / keywords | QR code, art QR code, short link, poster, menu, packaging, print, marketing, event, branding | |

Don't use "free", "pro" or price words as tags.

## Media

| Asset | File | Size | Notes |
|---|---|---|---|
| App icon | `icons/icon-512.png` | 512 x 512, RGB, no transparency | The QRX logo, itself a scannable art QR code. Full bleed, square corners, no text. |
| App icon (alternative) | `icons/icon-512-mark.png` | 512 x 512, RGB | The vector QRX mark on paper white, for a simpler look at small sizes. |
| Featured image 1 (editorial) | `featured/featured-1-editorial.png` | 2400 x 1800 | Three QRX codes, each with a scan check mark, and a qrx.to pill. Light background, no copy. |
| Featured image 2 (contextual) | `featured/featured-2-contextual.png` | 2400 x 1800 | A poster design with a code placed on it, next to the real app panel. |

Use both featured images as a two-image carousel (editorial first). The sample codes are real QRX output from the
qrx.codes showcase; the panel is the app's own UI rendered outside Canva with sample data (see `tools/`).

## Links

| Field | Value |
|---|---|
| Company or your name | QRX |
| Terms and conditions URL | https://qrx.codes/terms |
| Privacy policy URL | https://qrx.codes/privacy |
| Support URL | https://qrx.codes/support |
| Company or website URL | https://qrx.codes |

All four open without signing in. Before submitting, confirm the privacy policy covers what this app sends: the prompt,
the link and the style the user enters, the Canva user ID in the request-verification token, and the finished image,
which QRX stores so it appears in the user's QRX gallery.
