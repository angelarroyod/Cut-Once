"""Regenerates every Cut Once logo file from one parametric drawing.

Usage: python build_kit.py
Needs Python 3 and Pillow, the logo-design skill's render_png.py (PNG output) and the Atkinson font from mobile/.
"""
import json
import os
import re
import sys

from PIL import Image

from wordmark import Font, word_path

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(KIT))
SKILL = os.path.expanduser('~/.claude/plugins/cache/logo-design-skill/logo-design/1.4.5/skills/logo-design/scripts')
sys.path.insert(0, SKILL)
import render_png  # noqa: E402

FONT = Font(os.path.join(
    REPO, 'mobile/node_modules/@expo-google-fonts/atkinson-hyperlegible-next/800ExtraBold',
    'AtkinsonHyperlegibleNext_800ExtraBold.ttf',
))

BLUE, HI, INK, WHITE, BLACK = '#2340c8', '#ffe14d', '#141a2b', '#ffffff', '#000000'
NAME = 'Cut Once'

KERF = 28  # the numeral's stem, on the 256 canvas
KERF_REVERSED = 31  # light shapes spread on dark grounds, so the kerf opens to keep the same apparent width
TILE_SCALE = 0.8
MASK_SCALE = 0.68  # the board's corners stay inside the maskable icon's 80 % safe circle


def pieces(k=KERF):
    """One board and one kerf; the kerf is a numeral 1 whose flag falls at exactly 45 degrees."""
    left_edge, right_edge = 136 - k / 2, 136 + k / 2
    d = k / 1.4  # per-axis flag thickness: 20 at the master's 28, so the flag and the stem read as one weight
    return (
        f'M48 24H{left_edge:g}L{left_edge - 48:g} 72L{left_edge - 48 + d:.1f} {72 + d:.1f}L{left_edge:g} {24 + 2 * d:.1f}'
        'V232H48A24 24 0 0 1 24 208V48A24 24 0 0 1 48 24Z',
        f'M{right_edge:g} 24H208A24 24 0 0 1 232 48V208A24 24 0 0 1 208 232H{right_edge:g}Z',
    )


# The small cut is drawn on the 16 px grid itself: a 2 px kerf on whole pixels, the flag's corners on pixel
# corners and the flag heavier than the stem, because antialiasing eats a diagonal first.
SMALL = (
    'M3.5 2H8L4 6L6 8L8 6V14H3.5A1.5 1.5 0 0 1 2 12.5V3.5A1.5 1.5 0 0 1 3.5 2Z',
    'M10 2H12.5A1.5 1.5 0 0 1 14 3.5V12.5A1.5 1.5 0 0 1 12.5 14H10Z',
)


def svg(w, h, body, label):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}" '
        f'role="img"><title>{label}</title>{body}</svg>\n'
    )


def symbol_body(left, right, k):
    a, b = pieces(k)
    return f'<path fill="{left}" d="{a}"/><path fill="{right}" d="{b}"/>'


def tile_body(scale, radius, k=KERF_REVERSED):
    # White piece, highlighter piece: the only drawing that may carry both colours, because blue holds them.
    return (
        f'<rect width="256" height="256" rx="{radius}" fill="{BLUE}"/>'
        f'<g transform="translate(128 128) scale({scale}) translate(-128 -128)">{symbol_body(WHITE, HI, k)}</g>'
    )


def small_tile(radius=3.5):
    return (
        f'<rect width="16" height="16" rx="{radius}" fill="{BLUE}"/>'
        f'<path fill="{WHITE}" d="{SMALL[0]}"/><path fill="{HI}" d="{SMALL[1]}"/>'
    )


def horizontal(left, right, word, k):
    d, _, end = word_path(FONT, NAME, 112, 280, 128)
    w = round(end + 24)
    return svg(w, 256, f'<g>{symbol_body(left, right, k)}</g><path fill="{word}" d="{d}"/>', f'{NAME} logo')


def stacked(left, right, word, k):
    _, x0, x1 = word_path(FONT, NAME, 64, 0, 0)
    w = round(x1 - x0 + 48)
    d, _, _ = word_path(FONT, NAME, 64, 24 - x0, 232 + 40 + 32)
    h = 232 + 40 + 64 + 24
    return svg(
        w, h,
        f'<g transform="translate({(w - 256) / 2:g} 0)">{symbol_body(left, right, k)}</g><path fill="{word}" d="{d}"/>',
        f'{NAME} logo',
    )


def wordmark(word):
    _, x0, x1 = word_path(FONT, NAME, 112, 0, 0)
    d, _, _ = word_path(FONT, NAME, 112, 24 - x0, 80)
    return svg(round(x1 - x0 + 48), 160, f'<path fill="{word}" d="{d}"/>', f'{NAME} wordmark')


def write(rel, text):
    path = os.path.join(KIT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    return path


def png(src, rel, w):
    """Renders at width w, keeping the SVG's own proportions."""
    dst = os.path.join(KIT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    vw, vh = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', open(src, encoding='utf-8').read()).groups()
    if not render_png.render(src, dst, w, round(w * float(vh) / float(vw))):
        raise SystemExit(f'could not render {rel}')
    return dst


def flatten(path, colour):
    # App Store icons may not carry an alpha channel, even a fully opaque one.
    img = Image.open(path).convert('RGBA')
    bg = Image.new('RGB', img.size, colour)
    bg.paste(img, mask=img.getchannel('A'))
    bg.save(path)


def main():
    label = f'{NAME} symbol'
    ways = {
        # name: left piece, right piece, word, kerf
        'color': (BLUE, BLUE, INK, KERF),
        'on-dark': (WHITE, HI, WHITE, KERF_REVERSED),
        'blue': (BLUE, BLUE, BLUE, KERF),
        'black': (BLACK, BLACK, BLACK, KERF),
        'white': (WHITE, WHITE, WHITE, KERF_REVERSED),
    }
    for way, (left, right, word, k) in ways.items():
        if way != 'blue':
            write(f'logo/symbol/cut-once-symbol-{way}.svg', svg(256, 256, symbol_body(left, right, k), label))
        h = write(f'logo/horizontal/cut-once-horizontal-{way}.svg', horizontal(left, right, word, k))
        s = write(f'logo/stacked/cut-once-stacked-{way}.svg', stacked(left, right, word, k))
        png(h, f'logo/horizontal/png/cut-once-horizontal-{way}.png', 1600)
        png(s, f'logo/stacked/png/cut-once-stacked-{way}.png', 1200)
    for way, colour in {'ink': INK, 'white': WHITE, 'black': BLACK, 'blue': BLUE}.items():
        write(f'logo/wordmark/cut-once-wordmark-{way}.svg', wordmark(colour))

    tile = write('logo/symbol/cut-once-tile.svg', svg(256, 256, tile_body(TILE_SCALE, 56), f'{NAME} app icon'))
    small = write('logo/symbol/cut-once-tile-small.svg', svg(16, 16, small_tile(), f'{NAME} icon'))
    full = write('source/icon-full-bleed.svg', svg(256, 256, tile_body(TILE_SCALE, 0), f'{NAME} app icon'))
    mask = write('source/icon-maskable.svg', svg(256, 256, tile_body(MASK_SCALE, 0), f'{NAME} app icon'))
    png(tile, 'logo/symbol/png/cut-once-tile-1024.png', 1024)

    web = os.path.join(KIT, 'icons/web')
    os.makedirs(web, exist_ok=True)
    write('icons/web/favicon.svg', open(small, encoding='utf-8').read())
    fav = [png(small, 'icons/web/favicon-16.png', 16), png(tile, 'icons/web/favicon-32.png', 32),
           png(tile, 'icons/web/favicon-48.png', 48)]
    render_png.write_ico(fav, os.path.join(web, 'favicon.ico'))
    png(full, 'icons/web/apple-touch-icon.png', 180)
    png(tile, 'icons/web/icon-192.png', 192)
    png(tile, 'icons/web/icon-512.png', 512)
    png(mask, 'icons/web/maskable-512.png', 512)
    write('icons/web/site.webmanifest', json.dumps({
        'name': NAME, 'short_name': NAME,
        'icons': [
            {'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': '/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
        'theme_color': BLUE, 'background_color': BLUE, 'display': 'standalone',
    }, indent=2) + '\n')
    write('icons/web/head-snippet.html', (
        '<link rel="icon" href="/favicon.ico" sizes="48x48">\n'
        '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
        '<link rel="manifest" href="/site.webmanifest">\n'
        f'<meta name="theme-color" content="{BLUE}">\n'
    ))
    flatten(png(full, 'icons/ios/cut-once-ios-1024.png', 1024), BLUE)


if __name__ == '__main__':
    main()
