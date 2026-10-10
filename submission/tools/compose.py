"""Makes the listing images: app icons (512x512) and featured images (2400x1800).

Run after capture.py:
    python submission/tools/compose.py
Uses the QRX brand assets in submission/tools/brand, sample QRX codes from the
harness, and the captured panel screenshots.
"""

from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SUB = ROOT.parent
BRAND = ROOT / "brand"
CODES = ROOT / "harness" / "public" / "codes"
PANEL = SUB / "screenshots" / "panel"
ICONS = SUB / "icons"
FEATURED = SUB / "featured"

INK = "#16171a"
BLUE = "#2453d6"
PAPER = "#f3f1ec"


def uri(path: Path) -> str:
    return path.resolve().as_uri()


def mark_svg(size: int) -> str:
    return (BRAND / "qrx-mark.svg").read_text(encoding="utf-8").replace(
        'width="512" height="512"', f'width="{size}" height="{size}"'
    )


CHECK = f"""<svg viewBox="0 0 24 24" width="100%" height="100%">
  <circle cx="12" cy="12" r="12" fill="#1f9d55"/>
  <path d="M6.5 12.5l3.5 3.5 7.5-8" fill="none" stroke="#fff" stroke-width="2.6"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""


def editorial_html() -> str:
    codes = ["26-mountain-railway-poster", "05-viking-fjord", "16-neon-koi-pond"]
    cards = "".join(
        f"""<div class="card c{i}">
              <img src="{uri(CODES / f'{name}.webp')}">
              <div class="check">{CHECK}</div>
            </div>"""
        for i, name in enumerate(codes)
    )
    return f"""<!doctype html><html><head><style>
      html, body {{ margin: 0; width: 2400px; height: 1800px; overflow: hidden; }}
      body {{ background: {PAPER}; position: relative; font-family: sans-serif; }}
      .card {{ position: absolute; width: 760px; height: 760px; border-radius: 36px;
               background: #fff; padding: 28px; box-sizing: border-box;
               box-shadow: 0 40px 90px rgba(22,23,26,.18); }}
      .card img {{ width: 100%; height: 100%; border-radius: 20px; display: block; }}
      .check {{ position: absolute; right: -34px; top: -34px; width: 112px; height: 112px;
                filter: drop-shadow(0 10px 18px rgba(0,0,0,.2)); }}
      .c0 {{ left: 190px; top: 560px; transform: rotate(-7deg); }}
      .c0 .check {{ right: auto; left: -34px; }}
      .c1 {{ left: 820px; top: 380px; width: 860px; height: 860px; z-index: 2; }}
      .c2 {{ left: 1460px; top: 560px; transform: rotate(7deg); }}
      .mark {{ position: absolute; left: 110px; top: 110px; }}
      .link {{ position: absolute; left: 50%; bottom: 150px; transform: translateX(-50%);
               display: flex; align-items: center; gap: 22px; padding: 22px 40px;
               background: #fff; border-radius: 999px; box-shadow: 0 16px 40px rgba(22,23,26,.12);
               font-size: 52px; color: {INK}; letter-spacing: .5px; }}
      .dot {{ width: 22px; height: 22px; border-radius: 50%; background: {BLUE}; }}
    </style></head><body>
      <div class="mark">{mark_svg(150)}</div>
      {cards}
      <div class="link"><span class="dot"></span>qrx.to</div>
    </body></html>"""


def contextual_html() -> str:
    panel = PANEL / "04-result-light.png"
    code = CODES / "05-viking-fjord.webp"
    return f"""<!doctype html><html><head><style>
      html, body {{ margin: 0; width: 2400px; height: 1800px; overflow: hidden; }}
      body {{ background: #e9ecf5; position: relative; font-family: Georgia, serif; }}
      .stage {{ position: absolute; left: 140px; top: 170px; width: 1300px; height: 1460px;
                background: #d9dde8; border-radius: 40px; }}
      .poster {{ position: absolute; left: 260px; top: 250px; width: 1060px; height: 1300px;
                 background: linear-gradient(170deg, #0e2a3f 0%, #183f5a 55%, #2b5f73 100%);
                 box-shadow: 0 50px 100px rgba(10,20,40,.35); color: #f6efe2;
                 display: flex; flex-direction: column; align-items: center; }}
      .poster h1 {{ margin: 120px 0 0; font-size: 118px; line-height: 1.02; text-align: center;
                    letter-spacing: 2px; font-weight: 700; }}
      .poster p {{ margin: 34px 0 0; font-size: 44px; letter-spacing: 8px; opacity: .85; }}
      .poster .qr {{ margin-top: 90px; width: 560px; height: 560px; padding: 22px;
                     background: #f6efe2; border-radius: 18px; }}
      .poster .qr img {{ width: 100%; height: 100%; display: block; border-radius: 8px; }}
      .sel {{ position: absolute; inset: -10px; border: 6px solid #8b3dff; border-radius: 26px; }}
      .panel {{ position: absolute; right: 150px; top: 150px; width: 720px; height: 1500px;
                border-radius: 40px; overflow: hidden; background: #fff;
                box-shadow: 0 50px 110px rgba(10,20,40,.28); }}
      .panel img {{ width: 720px; display: block; }}
    </style></head><body>
      <div class="stage"></div>
      <div class="poster">
        <h1>Harbour<br>Night Market</h1>
        <p>FRIDAYS FROM 6PM</p>
        <div class="qr" style="position:relative"><img src="{uri(code)}"><div class="sel"></div></div>
      </div>
      <div class="panel"><img src="{uri(panel)}"></div>
    </body></html>"""


def mark_icon_html() -> str:
    return f"""<!doctype html><html><head><style>
      html, body {{ margin: 0; width: 512px; height: 512px; }}
      body {{ background: {PAPER}; display: flex; align-items: center; justify-content: center; }}
    </style></head><body>{mark_svg(300)}</body></html>"""


def render(page, html: str, size, out: Path):
    page.set_viewport_size({"width": size[0], "height": size[1]})
    # Load from a file so the page may show local images.
    tmp = ROOT / "_compose.html"
    tmp.write_text(html, encoding="utf-8")
    page.goto(tmp.as_uri())
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(300)
    page.screenshot(path=str(out))
    tmp.unlink()
    Image.open(out).convert("RGB").save(out)
    print("saved", out.relative_to(SUB))


def main():
    ICONS.mkdir(exist_ok=True)
    FEATURED.mkdir(exist_ok=True)

    # Primary icon: the scannable QRX logo code, full bleed and opaque.
    Image.open(BRAND / "qrx-code-512.png").convert("RGB").save(ICONS / "icon-512.png")
    print("saved icons/icon-512.png")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=1)
        render(page, mark_icon_html(), (512, 512), ICONS / "icon-512-mark.png")
        render(page, editorial_html(), (2400, 1800), FEATURED / "featured-1-editorial.png")
        render(page, contextual_html(), (2400, 1800), FEATURED / "featured-2-contextual.png")
        browser.close()


if __name__ == "__main__":
    main()
