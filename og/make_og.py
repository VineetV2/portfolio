#!/usr/bin/env python3
"""
Builds the Open Graph card for vineetvora.dev — the 1200x630 image LinkedIn,
Slack, Twitter and iMessage show when the link is shared.

Matches the site's v3 "dossier" design: warm paper, one vermillion accent,
Bricolage Grotesque display, DM Mono annotations.

Fonts are fetched from the Google Fonts repo into /tmp/ogfonts on first run.

    python3 make_og.py            # writes ../og-card.png
"""

import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = (250, 248, 243)
INK = (22, 21, 15)
INK_3 = (110, 104, 88)
ACCENT = (188, 53, 23)
RULE = (216, 211, 198)

FONT_DIR = "/tmp/ogfonts"
BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl"
FONTS = {
    "Bricolage.ttf": f"{BASE}/bricolagegrotesque/BricolageGrotesque%5Bopsz,wdth,wght%5D.ttf",
    "DMMono.ttf": f"{BASE}/dmmono/DMMono-Regular.ttf",
}


def ensure_fonts():
    os.makedirs(FONT_DIR, exist_ok=True)
    for name, url in FONTS.items():
        path = os.path.join(FONT_DIR, name)
        if not os.path.exists(path) or os.path.getsize(path) < 1000:
            subprocess.run(["curl", "-sL", "-o", path, url], check=True)
    return FONT_DIR


def display(size, weight=800):
    """Bricolage Grotesque at a given weight, via the variable-font axes."""
    f = ImageFont.truetype(os.path.join(FONT_DIR, "Bricolage.ttf"), size)
    # axes order: Optical size, Weight, Width
    f.set_variation_by_axes([min(96, max(12, size)), weight, 100])
    return f


def mono(size):
    return ImageFont.truetype(os.path.join(FONT_DIR, "DMMono.ttf"), size)


def build(out_path):
    ensure_fonts()
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    M = 76  # margin

    # ── masthead rule ────────────────────────────────────────────────
    d.rectangle([0, 0, W, 9], fill=INK)

    # ── kicker ───────────────────────────────────────────────────────
    kicker = mono(21)
    d.text((M, 74), "P O R T F O L I O    ·    N E W A R K ,  N J    ·    M M X X V I",
           font=kicker, fill=INK_3)
    d.rectangle([M, 118, W - M, 119], fill=RULE)

    # ── headline ─────────────────────────────────────────────────────
    big = display(96, 800)
    y = 152
    lh = 100
    d.text((M, y), "Software engineer,", font=big, fill=INK)
    d.text((M, y + lh), "AI systems", font=big, fill=ACCENT)
    d.text((M, y + lh * 2), "end to end", font=big, fill=INK)

    # ── footer ───────────────────────────────────────────────────────
    d.rectangle([M, H - 118, W - M, H - 117], fill=RULE)

    url_font = display(34, 600)
    url_text = "vineetvora.dev"
    d.text((M, H - 92), url_text, font=url_font, fill=INK)
    url_w = d.textbbox((M, H - 92), url_text, font=url_font)[2]

    # Right-aligned strapline. Shrink until it clears the URL with a real gap
    # rather than trusting that it happens to fit.
    line = "Open to Forward Deployed Engineer roles"
    for size in (20, 19, 18, 17, 16):
        meta = mono(size)
        w = d.textbbox((0, 0), line, font=meta)[2]
        if (W - M - w) - url_w >= 48:
            break
    d.text((W - M - w, H - 84), line, font=meta, fill=INK_3)

    img.save(out_path, "PNG", optimize=True)
    return out_path


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = build(os.path.join(here, "..", "og-card.png"))
    print("wrote", os.path.normpath(out), os.path.getsize(out), "bytes")
