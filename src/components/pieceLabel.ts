// Fits a piece's name and size inside its rectangle on the cut diagram (SVG units = mm).

const EM = 0.58; // Inter's average advance per em at weight 600, a little generous so text never touches the edge
const PAD = 24; // mm kept clear at each end of the line
const NAME = 42; // largest name size, mm
const DIMS_RATIO = 34 / 42; // dims line is set smaller than the name
const MIN = 26; // smallest name size; below this the name is shortened instead

export interface PieceLabel {
  rotate: boolean; // true: read along the piece's length (bottom to top)
  size: number; // name font size, mm
  name: string; // possibly shortened with "…"
  dims: string | null; // null when the second line has no room
}

const fit = (chars: number, span: number) => Math.min(NAME, (span - 2 * PAD) / (chars * EM));

/** Picks the orientation that gives the larger name, then shrinks, shortens or drops lines to stay inside. */
export function pieceLabel(name: string, dims: string, width: number, length: number): PieceLabel {
  const flat = fit(name.length, width);
  const tall = fit(name.length, length);
  const rotate = tall > flat && length > width;
  const span = rotate ? length : width;
  const cross = rotate ? width : length; // room for stacked lines

  // one line needs ~1.3 em of cross room, two lines ~2.6 em
  let size = Math.min(rotate ? tall : flat, cross / 1.4);
  let shown = name;
  if (size < MIN) {
    size = Math.min(MIN, cross / 1.4);
    const room = Math.floor((span - 2 * PAD) / (size * EM));
    if (room < name.length) shown = room > 1 ? `${name.slice(0, room - 1).trimEnd()}…` : '';
  }

  const dimsSize = size * DIMS_RATIO;
  const dimsFit = dims.length * dimsSize * EM <= span - 2 * PAD && cross >= size * 2.8;
  return { rotate, size, name: shown, dims: dimsFit ? dims : null };
}
