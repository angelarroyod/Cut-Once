# Cut Once logo kit

One board, one saw cut, and the cut is the numeral 1. Rules for using it are in [usage-guide.pdf](usage-guide.pdf); the case for it is in [board/cut-once-board.html](board/cut-once-board.html).

The web and iOS apps use this kit. `public/` and `mobile/assets/images/` hold copies of the icons, and the mark is drawn inline in `Brand` (`src/App.tsx`) and `Mark` (`mobile/src/components/ui.tsx`), so a change here means updating those too.

## Which file do I use?

| Job | File |
|---|---|
| Logo on a light background | `logo/horizontal/cut-once-horizontal-color.svg` |
| Logo on night or blue | `logo/horizontal/cut-once-horizontal-on-dark.svg` |
| One ink only | `-black`, `-white` or `-blue`, same folder |
| Square space | `logo/stacked/` |
| Word alone | `logo/wordmark/` |
| Symbol alone | `logo/symbol/cut-once-symbol-color.svg`, `-on-dark`, `-black`, `-white` |
| App bar, avatar, anywhere on any background | `logo/symbol/cut-once-tile.svg` |
| Under 24 px | `logo/symbol/cut-once-tile-small.svg` |
| Website icons | `icons/web/`, with the tags in `head-snippet.html` |
| App Store icon | `icons/ios/cut-once-ios-1024.png` (square, no alpha) |
| PNG for documents | `logo/horizontal/png/`, `logo/stacked/png/` |

## Decisions worth knowing

- **Blue on light, two colours on dark.** Yellow on white is 1.3:1 and the board falls apart, so the white and yellow pair only appears on blue or night.
- **Three kerf widths.** 28 units on the master, 31 on reversed files because light shapes spread on dark, and a separate 16 px drawing with a 2 px kerf on whole pixels.
- **The wordmark is unmodified Atkinson Hyperlegible Next ExtraBold, outlined.** The iOS app speaks in it; the web app moved to Inter and draws this wordmark as an outlined path, so the name keeps its lettering. The symbol carries the ownable idea. The same weight is used on dark.

## Test results

Viewed by eye:

- 16 to 256 px, on both app themes.
- One colour, reversed, on brand colour, on a photo-like and a patterned background.
- Greyscale and squint blur.
- Mirrored and rotated 180°: no unwanted reading. Mirrored, the 1 reads backward, so the guide bans it.
- Browser tab, home screen, website header, avatar crop, business card.
- Shelf beside four library marks (Kotlin, Patreon, Framer, Pagekit): looks as resolved and stays distinct.

Measured:

- `svg_audit`: 98 to 100 on every SVG. This score is a heuristic.
- No live text, rasters, filters or masks in any SVG.
- The iOS icon has no alpha channel. `favicon.ico` holds 16, 32 and 48 px.
- Contrast ratios are in the guide.

## Not done

- **Trademark search.** Only one web search and a domain lookup so far. Get a professional search before the name goes public. A reverse image search on the mark is also worth doing.
- **Domain.** `cutonce.tools`, `cutonce.works` and `cutonce.build` were free when checked, and `.com` and `.app` are taken. Nothing is registered. `cutonce.tools` and `@cutonce` on the board are placeholders.
- **Print.** CMYK values are arithmetic, not colour-managed. Pantone is unmatched: 2728 C is a starting point for the blue, and the yellow has none. Proof before printing.
- **Beginner reaction.** No real users have seen the name or the mark.
- **iPhone.** The icon has not been seen on a device.
- **Android.** `mobile/app.json` still points at Expo's default Android icons. The kit has no Android set, since iOS is the documented target.

## Kept on purpose

- The `localStorage` keys `planificador.prices` and `planificador.theme`. Renaming them wipes saved prices and theme for current users.
- In the apps, the tile's blue is the `accent` token, which is lighter at night (`#3d5be8`) so the tile lifts off the night page. The icons outside the apps stay `#2340c8`.
- The iOS icon is a plain PNG, not an Icon Composer package, because a `.icon` can't be checked without a Mac.
- The older specs and plans in `docs/superpowers/` still say Planificador, because they record what was decided at the time.

## Regenerating

From the repo root, with `mobile/` installed and Pillow and the logo-design skill available:

```bash
python brand/cut-once/source/build_kit.py
```

```bash
python brand/cut-once/source/build_board.py
```

```bash
python brand/cut-once/source/build_guide.py
```

Colours and kerf widths are constants at the top of `source/build_kit.py`. The font is SIL Open Font License 1.1.
