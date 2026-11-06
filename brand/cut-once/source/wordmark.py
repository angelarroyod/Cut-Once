"""Outline text from a static TTF. Stdlib only, so the logo files carry paths and never live <text>."""
import struct

# GPOS kerning is not read, so pairs that need it are set by eye, in font units.
KERN = {}


class Font:
    def __init__(self, path):
        self.d = open(path, 'rb').read()
        n = struct.unpack('>H', self.d[4:6])[0]
        self.t = {}
        for i in range(n):
            tag, _, off, ln = struct.unpack('>4sIII', self.d[12 + i * 16:28 + i * 16])
            self.t[tag.decode()] = (off, ln)
        h = self.t['head'][0]
        self.upem = struct.unpack('>H', self.d[h + 18:h + 20])[0]
        self.long_loca = struct.unpack('>h', self.d[h + 50:h + 52])[0] == 1
        self.n_hm = struct.unpack('>H', self.d[self.t['hhea'][0] + 34:self.t['hhea'][0] + 36])[0]
        self.cmap = self._cmap()

    def _cmap(self):
        base = self.t['cmap'][0]
        n = struct.unpack('>H', self.d[base + 2:base + 4])[0]
        for i in range(n):
            pid, eid, off = struct.unpack('>HHI', self.d[base + 4 + i * 8:base + 12 + i * 8])
            s = base + off
            if struct.unpack('>H', self.d[s:s + 2])[0] == 4 and pid in (0, 3):
                return self._cmap4(s)
        raise SystemExit('no format 4 cmap')

    def _cmap4(self, s):
        seg = struct.unpack('>H', self.d[s + 6:s + 8])[0] // 2
        arr = lambda o, f='>H': [struct.unpack(f, self.d[o + j * 2:o + j * 2 + 2])[0] for j in range(seg)]
        end = arr(s + 14)
        start = arr(s + 16 + seg * 2)
        delta = arr(s + 16 + seg * 4, '>h')
        ro_at = s + 16 + seg * 6
        ro = arr(ro_at)
        out = {}
        for j in range(seg):
            for c in range(start[j], end[j] + 1):
                if c == 0xFFFF:
                    continue
                if ro[j] == 0:
                    g = (c + delta[j]) & 0xFFFF
                else:
                    p = ro_at + j * 2 + ro[j] + (c - start[j]) * 2
                    g = struct.unpack('>H', self.d[p:p + 2])[0]
                    g = (g + delta[j]) & 0xFFFF if g else 0
                out[c] = g
        return out

    def advance(self, g):
        i = min(g, self.n_hm - 1)
        o = self.t['hmtx'][0] + i * 4
        return struct.unpack('>H', self.d[o:o + 2])[0]

    def _glyph_span(self, g):
        loca = self.t['loca'][0]
        if self.long_loca:
            a, b = struct.unpack('>II', self.d[loca + g * 4:loca + g * 4 + 8])
        else:
            a, b = (2 * v for v in struct.unpack('>HH', self.d[loca + g * 2:loca + g * 2 + 4]))
        return self.t['glyf'][0] + a, b - a

    def contours(self, g, dx=0, dy=0):
        o, ln = self._glyph_span(g)
        if ln == 0:
            return []
        nc = struct.unpack('>h', self.d[o:o + 2])[0]
        p = o + 10
        if nc < 0:  # composite: only plain offsets, which is all the basic Latin needs
            out = []
            while True:
                flags, sub = struct.unpack('>HH', self.d[p:p + 4])
                p += 4
                if flags & 1:
                    ax, ay = struct.unpack('>hh', self.d[p:p + 4])
                    p += 4
                else:
                    ax, ay = struct.unpack('>bb', self.d[p:p + 2])
                    p += 2
                out += self.contours(sub, dx + ax, dy + ay)
                if flags & 8:
                    p += 2
                elif flags & 0x40:
                    p += 4
                elif flags & 0x80:
                    p += 8
                if not flags & 0x20:
                    return out
        ends = list(struct.unpack(f'>{nc}H', self.d[p:p + nc * 2]))
        p += nc * 2
        p += 2 + struct.unpack('>H', self.d[p:p + 2])[0]
        count = ends[-1] + 1
        flags = []
        while len(flags) < count:
            f = self.d[p]
            p += 1
            flags.append(f)
            if f & 8:
                flags += [f] * self.d[p]
                p += 1

        def axis(short, same):
            nonlocal p
            v, out = 0, []
            for f in flags:
                if f & short:
                    b = self.d[p]
                    p += 1
                    v += b if f & same else -b
                elif not f & same:
                    v += struct.unpack('>h', self.d[p:p + 2])[0]
                    p += 2
                out.append(v)
            return out

        xs = axis(2, 16)
        ys = axis(4, 32)
        out, s = [], 0
        for e in ends:
            out.append([(xs[i] + dx, ys[i] + dy, flags[i] & 1) for i in range(s, e + 1)])
            s = e + 1
        return out


def contour_path(pts, sx, ox, oy):
    # TrueType: two off-curve points in a row imply an on-curve midpoint.
    full = []
    for i, (x, y, on) in enumerate(pts):
        full.append((x, y, on))
        nx, ny, non = pts[(i + 1) % len(pts)]
        if not on and not non:
            full.append(((x + nx) / 2, (y + ny) / 2, 1))
    k = next(i for i, q in enumerate(full) if q[2])
    full = full[k:] + full[:k]
    f = lambda x, y: f'{ox + x * sx:.1f} {oy - y * sx:.1f}'
    d = [f'M{f(full[0][0], full[0][1])}']
    i = 1
    while i < len(full):
        x, y, on = full[i]
        if on:
            d.append(f'L{f(x, y)}')
            i += 1
        else:
            nx, ny, _ = full[(i + 1) % len(full)]
            d.append(f'Q{f(x, y)} {f(nx, ny)}')
            i += 2
    return ''.join(d) + 'Z'


def word_path(font, text, cap_px, ox, cy, tracking=0.0):
    """Returns (path data, ink left, ink right) for text whose caps are centred on cy, starting at ox."""
    cap = max(y for c in font.contours(font.cmap[ord('H')]) for _, y, _ in c)
    sx = cap_px / cap
    baseline = cy + cap_px / 2
    x, parts, xs = ox, [], []
    for i, ch in enumerate(text):
        g = font.cmap[ord(ch)]
        for c in font.contours(g):
            parts.append(contour_path(c, sx, x, baseline))
            xs += [x + q[0] * sx for q in c]
        pair = text[i:i + 2]
        x += (font.advance(g) * (0.75 if ch == ' ' else 1) + KERN.get(pair, 0)) * sx + tracking
    return ''.join(parts), min(xs), max(xs)
