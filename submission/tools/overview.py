"""Joins three panel screenshots into screenshots/panel-overview.png for the README."""

from pathlib import Path

from PIL import Image

PANEL = Path(__file__).resolve().parent.parent / "screenshots" / "panel"
NAMES = ["02-form-light", "03-progress-light", "04-result-light"]
GAP = 40

ims = [Image.open(PANEL / f"{n}.png").convert("RGB") for n in NAMES]
ims = [i.resize((i.width // 2, i.height // 2)) for i in ims]
w = sum(i.width for i in ims) + GAP * (len(ims) + 1)
h = max(i.height for i in ims) + GAP * 2
sheet = Image.new("RGB", (w, h), "#e9ecf5")
x = GAP
for i in ims:
    sheet.paste(i, (x, GAP))
    x += i.width + GAP
sheet.save(PANEL.parent / "panel-overview.png")
print(sheet.size)
