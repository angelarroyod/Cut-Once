"""Builds the one-page usage guide from the logo files: usage-guide.pdf, printed by headless Chrome."""
import os
import re
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(KIT))
sys.path.insert(0, os.path.expanduser('~/.claude/plugins/cache/logo-design-skill/logo-design/1.4.5/skills/logo-design/scripts'))
import render_png  # noqa: E402

BLUE, HI, INK, NIGHT, PAPER, CUT = '#2340c8', '#ffe14d', '#141a2b', '#0c1226', '#f4f7fb', '#d93a2f'
FONTS = 'mobile/node_modules/@expo-google-fonts'


def raw(rel):
    return open(os.path.join(KIT, 'logo', rel), encoding='utf-8').read()


def inner(rel):
    return re.search(r'</title>(.*)</svg>', raw(rel), re.S).group(1)


def view(rel):
    return re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', raw(rel)).groups()


def art(rel, width):
    w, h = view(rel)
    return f'<svg viewBox="0 0 {w} {h}" width="{width}" style="display:block">{inner(rel)}</svg>'


def clear_space():
    # X is the distance from the board to the word, so nobody has to measure anything but the logo itself.
    rel = 'horizontal/cut-once-horizontal-color.svg'
    w = float(view(rel)[0])
    x0, x1, y0, y1 = 24, w - 24, 24, 232
    X = 48
    squares = ''.join(
        f'<rect x="{a}" y="{b}" width="{X}" height="{X}" fill="{HI}"/>'
        for a, b in [(x0 - X, y0 - X), (x1, y0 - X), (x0 - X, y1), (x1, y1), (232, 104)]
    )
    labels = ''.join(
        f'<text x="{a + X / 2}" y="{b + X / 2 + 11}" text-anchor="middle" font-size="30" fill="{INK}" font-family="Mono">X</text>'
        for a, b in [(x0 - X, y0 - X), (x1, y0 - X), (x0 - X, y1), (x1, y1), (232, 104)]
    )
    box = (
        f'<rect x="{x0 - X}" y="{y0 - X}" width="{x1 - x0 + 2 * X}" height="{y1 - y0 + 2 * X}" fill="none" '
        f'stroke="{BLUE}" stroke-width="3" stroke-dasharray="12 10"/>'
    )
    return (
        f'<svg viewBox="{x0 - X - 4} {y0 - X - 4} {x1 - x0 + 2 * X + 8} {y1 - y0 + 2 * X + 8}" width="100%" style="display:block">'
        f'{squares}{inner(rel)}{labels}{box}</svg>'
    )


def chip(bg, rel, caption, width=112, border=False):
    edge = 'border:1px solid #d5dbe6;' if border else ''
    return f'<figure><div class="chip" style="background:{bg};{edge}">{art(rel, width)}</div><figcaption>{caption}</figcaption></figure>'


def wrong(bg, body, caption, border=False):
    edge = 'border:1px solid #d5dbe6;' if border else ''
    return (
        f'<figure><div class="chip wrong" style="background:{bg};{edge}"><svg viewBox="0 0 256 256" width="48" style="display:block">{body}</svg>'
        f'<svg class="cross" viewBox="0 0 12 12" width="12"><path d="M1 1 11 11M11 1 1 11" stroke="{CUT}" stroke-width="2.4"/></svg></div>'
        f'<figcaption>{caption}</figcaption></figure>'
    )


def swatch(colour, name, hex_, rgb, cmyk, ink='#fff', border=False):
    edge = 'border:1px solid #d5dbe6;' if border else ''
    return (
        f'<tr><td><span class="sw" style="background:{colour};{edge}"></span></td><td><b>{name}</b></td>'
        f'<td class="m">{hex_}</td><td class="m">{rgb}</td><td class="m">{cmyk}</td></tr>'
    )


def page():
    blue = inner('symbol/cut-once-symbol-color.svg')
    two = inner('symbol/cut-once-symbol-on-dark.svg')
    a, b = re.findall(r' d="([^"]+)"', blue)
    filled = f'<path fill="{BLUE}" d="M48 24H208A24 24 0 0 1 232 48V208A24 24 0 0 1 208 232H48A24 24 0 0 1 24 208V48A24 24 0 0 1 48 24Z"/>'
    swapped = f'<path fill="{HI}" d="{a}"/><path fill="#fff" d="{b}"/>'
    effect = f'<path fill="{BLUE}" d="{a}" stroke="{CUT}" stroke-width="10"/><path fill="{BLUE}" d="{b}" stroke="{CUT}" stroke-width="10"/>'

    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Cut Once logo guide</title><style>
@font-face{{font-family:Next;font-weight:400;src:url("file:///{REPO}/{FONTS}/atkinson-hyperlegible-next/400Regular/AtkinsonHyperlegibleNext_400Regular.ttf")}}
@font-face{{font-family:Next;font-weight:800;src:url("file:///{REPO}/{FONTS}/atkinson-hyperlegible-next/800ExtraBold/AtkinsonHyperlegibleNext_800ExtraBold.ttf")}}
@font-face{{font-family:Mono;src:url("file:///{REPO}/{FONTS}/atkinson-hyperlegible-mono/400Regular/AtkinsonHyperlegibleMono_400Regular.ttf")}}
@page{{size:letter;margin:0}}
*{{box-sizing:border-box}}
html,body{{margin:0;background:#fff;color:{INK};font:400 9.5pt/1.35 Next,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
main{{width:8.5in;padding:.42in .5in;display:flex;flex-direction:column;gap:.15in}}
header{{display:flex;justify-content:space-between;align-items:center;gap:.3in}}
h1{{font:800 21pt/1.05 Next;margin:0}}
header p{{margin:3pt 0 0;font-size:11pt}}
h2{{font:800 10.5pt/1.2 Next;margin:0 0 6pt;display:flex;align-items:center;gap:7pt}}
h2:after{{content:"";flex:1;height:1px;background:#c9d1de}}
p{{margin:0}}
.m{{font-family:Mono;font-size:8.5pt;font-variant-numeric:tabular-nums}}
.row{{display:grid;gap:.26in}}
.c4{{display:grid;grid-template-columns:2.3fr 1.1fr .9fr .9fr;gap:.14in}}
.c6{{display:grid;grid-template-columns:repeat(6,1fr);gap:.09in}}
figure{{margin:0;min-width:0}}
figcaption{{font-size:8.5pt;line-height:1.25;margin-top:3pt}}
.chip{{height:.62in;border-radius:5px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}}
.tall .chip{{height:.92in}}
.wrong .cross{{position:absolute;top:5px;right:5px}}
table{{border-collapse:collapse;width:100%}}
td,th{{padding:2.5pt 6pt 2.5pt 0;text-align:left;font-size:9pt;border-bottom:1px solid #e3e8f0;white-space:nowrap}}
th{{font-weight:800;font-size:8.5pt}}
.sw{{display:block;width:.26in;height:.17in;border-radius:3px}}
.note{{font-size:8.5pt;line-height:1.3;margin-top:4pt}}
.col{{display:flex;flex-direction:column;gap:.15in;min-width:0}}
.sizes{{display:flex;align-items:flex-end;gap:.16in;margin-top:7pt}}
</style></head><body><main>

<header><div><h1>Cut Once logo guide</h1><p>One board, one saw cut, and the cut is the numeral 1.</p></div>{art('horizontal/cut-once-horizontal-color.svg', 190)}</header>

<section class="tall"><h2>Versions</h2><div class="c4">
{chip('#fff', 'horizontal/cut-once-horizontal-color.svg', '<b>Horizontal.</b> The default, wherever there is width.', 220, True)}
{chip('#fff', 'stacked/cut-once-stacked-color.svg', '<b>Stacked.</b> Square spaces, signs.', 84, True)}
{chip('#fff', 'symbol/cut-once-symbol-color.svg', '<b>Symbol.</b> When the name is already nearby.', 70, True)}
{chip('#fff', 'symbol/cut-once-tile.svg', '<b>Tile.</b> App icon, favicon, avatar.', 62, True)}
</div></section>

<section class="row" style="grid-template-columns:1.12fr 1fr">
<div class="col"><div><h2>Clear space</h2>{clear_space()}<p class="note">Keep X clear on every side. X is the gap between the symbol and the word, about a quarter of the symbol's width. It scales with the logo.</p></div>
<section><h2>Colour</h2>
<table><tr><th></th><th>Name</th><th>HEX</th><th>RGB</th><th>CMYK (proof first)</th></tr>
{swatch(BLUE, 'Ballpoint blue', '#2340C8', '35 64 200', '82 68 0 22')}
{swatch(HI, 'Highlighter yellow', '#FFE14D', '255 225 77', '0 12 70 0')}
{swatch(INK, 'Ink, for the word', '#141A2B', '20 26 43', '53 40 0 83')}
{swatch(NIGHT, 'Night', '#0C1226', '12 18 38', '68 53 0 85')}
</table>
<p class="note">CMYK is straight arithmetic from RGB, not a colour-managed conversion. No Pantone is matched yet: for the blue start from Pantone 2728 C, which is slightly greener, and pick the yellow from a physical guide.</p></section></div>
<div class="col"><div><h2>Minimum size</h2>
<table><tr><th>Version</th><th>Screen</th><th>Print</th></tr>
<tr><td>Horizontal</td><td class="m">120 px wide</td><td class="m">30 mm wide</td></tr>
<tr><td>Stacked</td><td class="m">96 px wide</td><td class="m">25 mm wide</td></tr>
<tr><td>Symbol, tile</td><td class="m">24 px</td><td class="m">6 mm</td></tr>
<tr><td>Small-cut tile</td><td class="m">16 to 23 px</td><td class="m">never</td></tr></table>
<div class="sizes">{art('horizontal/cut-once-horizontal-color.svg', 120)}{art('stacked/cut-once-stacked-color.svg', 96)}{art('symbol/cut-once-symbol-color.svg', 24)}{art('symbol/cut-once-tile-small.svg', 16)}</div>
<p class="note">Shown at minimum size when printed at 100%. Below 24 px only the small-cut tile holds: its kerf sits on whole pixels.</p></div>
<div><h2>Type</h2><p><b>Atkinson Hyperlegible Next:</b> ExtraBold for the wordmark and headings, Regular for text. <span class="m">Atkinson Hyperlegible Mono</span> for numbers and measurements. Both are the app's own fonts, under the SIL Open Font License.</p></div></div>
</section>

<section><h2>Approved backgrounds</h2><div class="c6">
{chip('#fff', 'horizontal/cut-once-horizontal-color.svg', 'Colour on white <span class="m">8.0:1</span>', 92, True)}
{chip(PAPER, 'horizontal/cut-once-horizontal-color.svg', 'Colour on paper <span class="m">7.4:1</span>', 92)}
{chip(NIGHT, 'horizontal/cut-once-horizontal-on-dark.svg', 'Two-colour on night <span class="m">14:1</span>', 92)}
{chip(BLUE, 'horizontal/cut-once-horizontal-on-dark.svg', 'Two-colour on blue <span class="m">6.1:1</span>', 92)}
{chip(HI, 'horizontal/cut-once-horizontal-black.svg', 'Black on yellow <span class="m">16:1</span>', 92)}
{chip('#3a3f4b', 'horizontal/cut-once-horizontal-white.svg', 'White on any dark colour', 92)}
</div><p class="note">Ratios are the weakest logo colour against that background. On photos, use the tile. Yellow stays on blue or night; it never touches white or paper. Files: <span class="m">-color</span> for light backgrounds, <span class="m">-on-dark</span> for night and blue, <span class="m">-black</span> and <span class="m">-white</span> for one ink.</p></section>

<section><h2>Please don't</h2><div class="c6">
{wrong('#fff', two, 'Yellow on white <span class="m">1.3:1</span>', True)}
{wrong(NIGHT, blue, 'Blue on night <span class="m">2.3:1</span>')}
{wrong('#fff', f'<g transform="translate(256 0) scale(-1 1)">{blue}</g>', 'Mirror: the 1 reads backward', True)}
{wrong('#fff', filled, 'Close or narrow the kerf', True)}
{wrong(BLUE, swapped, 'Swap the two pieces')}
{wrong('#fff', effect, 'Add outlines or effects', True)}
</div><p class="note">Also: don't stretch or rotate, don't resize the parts of a lockup, and don't retype the word. Use the outlined files.</p></section>

</main></body></html>'''


def main():
    pdf = os.path.join(KIT, 'usage-guide.pdf')
    if os.path.exists(pdf):
        os.remove(pdf)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:
        # The page points at fonts by absolute path, so it stays out of the kit.
        html = os.path.join(tmp, 'usage-guide.html')
        with open(html, 'w', encoding='utf-8') as fh:
            fh.write(page().replace('\\', '/'))
        proc = subprocess.Popen([
            render_png.find_chrome(), '--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer',
            f'--user-data-dir={os.path.join(tmp, "profile")}', f'--print-to-pdf={pdf}', 'file:///' + html.replace('\\', '/'),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.time() + 45
        while time.time() < deadline and not (os.path.exists(pdf) and os.path.getsize(pdf) > 0):
            time.sleep(0.25)
        time.sleep(1)
        proc.kill()
    if not os.path.exists(pdf):
        raise SystemExit('chrome produced no PDF')
    print('wrote', pdf)


if __name__ == '__main__':
    main()
