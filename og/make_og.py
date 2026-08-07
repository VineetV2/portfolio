#!/usr/bin/env python3
"""
Builds link cards in the site's v3 "dossier" language — warm paper, one
vermillion accent, Bricolage Grotesque display, DM Mono annotations.

    python3 make_og.py

Outputs:
    ../og-card.png                        site Open Graph image (referenced by index.html)
    ../../linkedin/thumbnails/ieee.png    custom thumbnail to upload for the IEEE link,
                                          because ieeexplore.ieee.org serves no og:image

Fonts are pulled from the Google Fonts repo into /tmp/ogfonts on first run.
"""

import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = (250, 248, 243)
INK = (22, 21, 15)
INK_2 = (75, 71, 61)
INK_3 = (110, 104, 88)
ACCENT = (188, 53, 23)
RULE = (216, 211, 198)
M = 76  # margin

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


def display(size, weight=800):
    f = ImageFont.truetype(os.path.join(FONT_DIR, "Bricolage.ttf"), size)
    f.set_variation_by_axes([min(96, max(12, size)), weight, 100])
    return f


def mono(size):
    return ImageFont.truetype(os.path.join(FONT_DIR, "DMMono.ttf"), size)


def spaced(text):
    return "  ".join(text.upper())


def fit_display(draw, lines, start_size, max_w, weight=800):
    """Largest display size at which every line fits the column."""
    size = start_size
    while size > 40:
        f = display(size, weight)
        if all(draw.textbbox((0, 0), ln, font=f)[2] <= max_w for ln in lines):
            return f, size
        size -= 2
    return display(40, weight), 40


def card(kicker, lines, accent_index, footer_left, footer_right, sub=None):
    ensure_fonts()
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    col = W - 2 * M

    d.rectangle([0, 0, W, 9], fill=INK)

    # Letter-spaced kicker gets wide fast — shrink until it clears the margin.
    ktext = spaced(kicker)
    for ks in (21, 20, 19, 18, 17, 16, 15, 14):
        kfont = mono(ks)
        if d.textbbox((0, 0), ktext, font=kfont)[2] <= col:
            break
    d.text((M, 74), ktext, font=kfont, fill=INK_3)
    d.rectangle([M, 118, W - M, 119], fill=RULE)

    big, size = fit_display(d, lines, 96, col)
    lh = int(size * 1.04)
    top = 152 if not sub else 146
    for i, ln in enumerate(lines):
        d.text((M, top + lh * i), ln, font=big, fill=ACCENT if i == accent_index else INK)

    if sub:
        d.text((M, top + lh * len(lines) + 14), sub, font=mono(21), fill=INK_2)

    d.rectangle([M, H - 118, W - M, H - 117], fill=RULE)

    lf = display(34, 600)
    d.text((M, H - 92), footer_left, font=lf, fill=INK)
    left_w = d.textbbox((M, H - 92), footer_left, font=lf)[2]

    for s in (20, 19, 18, 17, 16, 15):
        rf = mono(s)
        rw = d.textbbox((0, 0), footer_right, font=rf)[2]
        if (W - M - rw) - left_w >= 48:
            break
    d.text((W - M - rw, H - 84), footer_right, font=rf, fill=INK_3)

    return img


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.normpath(os.path.join(here, "..", ".."))

    site = card(
        kicker="Portfolio · Newark, NJ · MMXXVI",
        lines=["Software engineer,", "AI systems", "end to end"],
        accent_index=1,
        footer_left="vineetvora.dev",
        footer_right="Open to Forward Deployed Engineer roles",
    )
    p1 = os.path.join(here, "..", "og-card.png")
    site.save(p1, "PNG", optimize=True)
    print("wrote", os.path.normpath(p1), os.path.getsize(p1), "bytes")

    ieee = card(
        kicker="Publication · IEEE · NJFET 2025",
        lines=["Catching faults", "before they", "become fires"],
        accent_index=2,
        sub="Automatic power line defect detection from UAV imagery",
        footer_left="IEEE Xplore",
        footer_right="DOI 10.1109/NJFET67489.2025.11380637",
    )
    out_dir = os.path.join(root, "linkedin", "thumbnails")
    os.makedirs(out_dir, exist_ok=True)
    p2 = os.path.join(out_dir, "ieee.png")
    ieee.save(p2, "PNG", optimize=True)
    print("wrote", os.path.normpath(p2), os.path.getsize(p2), "bytes")


if __name__ == "__main__":
    main()
