"""Captures the app panel from the screenshot harness.

Build the harness first (npx tsx submission/tools/harness/build.ts), then run
    python submission/tools/capture.py
Needs Python Playwright with Chromium (pip install playwright; playwright install chromium).
Writes PNGs to submission/screenshots/panel/.
"""

import functools
import http.server
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "harness" / "dist"
OUT = ROOT.parent / "screenshots" / "panel"
PANEL = {"width": 360, "height": 1000}

PROMPT = "A viking longship in a misty fjord"
LINK = "example.com/menu"


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def shot(page, name):
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=False)
    print("saved", name)


def fill_form(page, style="Water color"):
    page.get_by_role("textbox", name="Picture").fill(PROMPT)
    page.get_by_role("textbox", name="Link").fill(LINK)
    if style:
        page.get_by_role("button", name=style).click()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = serve()
    base = f"http://127.0.0.1:{server.server_address[1]}/index.html"
    with sync_playwright() as p:
        browser = p.chromium.launch()

        def open_page(query):
            context = browser.new_context(viewport=PANEL, device_scale_factor=2)
            page = context.new_page()
            page.goto(f"{base}?{query}")
            page.wait_for_load_state("networkidle")
            return page

        for theme in ("light", "dark"):
            page = open_page(f"theme={theme}&signedIn=0")
            page.get_by_role("textbox", name="Picture").fill(PROMPT)
            page.get_by_role("textbox", name="Link").fill(LINK)
            shot(page, f"01-connect-{theme}")
            page.context.close()

            page = open_page(f"theme={theme}&payments=1")
            page.get_by_text("Style:").wait_for()
            fill_form(page)
            shot(page, f"02-form-{theme}")

            page.get_by_role("button", name="Create QR code").click()
            page.get_by_role("progressbar").wait_for()
            page.wait_for_timeout(22_000)
            shot(page, f"03-progress-{theme}")

            page.evaluate("window.harnessRelease()")
            page.get_by_text("Your QR code is ready").wait_for()
            page.wait_for_load_state("networkidle")
            shot(page, f"04-result-{theme}")
            page.context.close()

        browser.close()
    server.shutdown()


if __name__ == "__main__":
    main()
