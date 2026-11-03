import type {
  Design,
  GenerateResult,
  Panel,
  ParamSpec,
  Placement,
  Step,
  Template,
  TemplateParams,
  ValidationIssue,
} from '../types.ts';
import { DEFAULT_MATERIAL, FIBRACEL_3, MATERIAL_OPTIONS, getStock } from '../stock.ts';
import {
  DEFAULT_EDGE_BANDING,
  EDGE_BANDING_OPTIONS,
  NO_EDGES,
  bandEdges,
  edgeBandingMode,
  ironStep,
  prepSentence,
} from '../edge-banding.ts';
import { paramIssues, resolveParams, spanIssue } from '../validation.ts';
import { MIN_DOOR_THICKNESS, doorSet, doorWidth } from '../parts/door.ts';
import { mergeHardware } from '../parts/merge.ts';
import { WALL_HARDWARE, wallStep } from '../parts/wall.ts';

const PLINTH = 70; // mm, zoclo height
const MIN_SHOE_GAP = 150; // mm of clear height: a pair of shoes, not boots
const VENT = 100; // mm the back stops short of the top, so shoes behind closed doors can air out
const BACK_SCREW_SPACING = 200; // mm between back screws
const WALL_FIX_HEIGHT = 1200; // mm from which a full rack can tip over, as with the bookshelf
const MAX_SINGLE_DOOR = 600; // mm; a wider single door sags and racks
const MIN_DOOR = 200; // mm; a narrower door is useless

const params: ParamSpec[] = [
  { kind: 'number', key: 'width', label: 'Ancho', unit: 'mm', min: 500, max: 830, step: 10, default: 800 },
  { kind: 'number', key: 'height', label: 'Alto', unit: 'mm', min: 450, max: 1400, step: 10, default: 900 },
  { kind: 'number', key: 'depth', label: 'Profundidad', unit: 'mm', min: 300, max: 400, step: 10, default: 320 },
  { kind: 'number', key: 'shelfCount', label: 'Número de entrepaños', unit: '', min: 1, max: 6, step: 1, default: 3 },
  {
    kind: 'select',
    key: 'doors',
    label: 'Puertas',
    unit: '',
    options: [
      { value: 0, label: 'Sin puertas' },
      { value: 1, label: '1 puerta' },
      { value: 2, label: '2 puertas' },
    ],
    default: 2,
  },
  { kind: 'select', key: 'material', label: 'Material', unit: '', options: MATERIAL_OPTIONS, default: DEFAULT_MATERIAL },
  {
    kind: 'select',
    key: 'edgeBanding',
    label: 'Cubrecanto',
    unit: '',
    options: EDGE_BANDING_OPTIONS,
    default: DEFAULT_EDGE_BANDING,
  },
];

/**
 * A shoe cabinet on a zoclo: fixed shelves at least a shoe apart, a Fibracel back that stops 100 mm
 * short of the top so shoes air out, and 0–2 doors. From 1200 mm tall it is fixed to the wall.
 * `depth` is the overall depth, back included, doors excluded.
 */
export function generateShoeRack(raw: TemplateParams): GenerateResult {
  const p = resolveParams(params, raw);
  const rangeIssues = paramIssues(params, p);
  if (rangeIssues.length > 0) return { ok: false, issues: rangeIssues };

  // resolveParams guarantees every spec key exists; paramIssues vetted the select values
  const W = p['width']!;
  const H = p['height']!;
  const D = p['depth']!;
  const N = p['shelfCount']!;
  const doors = p['doors']! as 0 | 1 | 2;
  const stock = getStock(p['material']!);
  const mode = edgeBandingMode(p['edgeBanding']!);
  const t = stock.thickness;
  const tb = FIBRACEL_3.thickness;
  const Dc = D - tb; // case depth; the back makes up the rest
  const zc = tb / 2; // case center, shifted forward (+z) so the back sits behind it
  const span = W - 2 * t;
  const gap = (H - PLINTH - 2 * t - N * t) / (N + 1);

  const issues: ValidationIssue[] = [];
  const spanProblem = spanIssue(span, stock);
  if (spanProblem) issues.push({ paramKey: 'width', message: spanProblem.message });
  if (gap < MIN_SHOE_GAP) {
    issues.push({
      paramKey: 'shelfCount',
      message:
        `Con ${N} entrepaños quedarían ${Math.floor(gap)} mm entre ellos y un par de zapatos necesita ${MIN_SHOE_GAP} mm. ` +
        'Usa menos entrepaños o aumenta el alto.',
    });
  }
  if (doors === 1 && doorWidth(1, W) > MAX_SINGLE_DOOR) {
    issues.push({
      paramKey: 'doors',
      message: `Una sola puerta de ${doorWidth(1, W)} mm pesa y se descuadra; el máximo es ${MAX_SINGLE_DOOR} mm. Usa dos puertas.`,
    });
  }
  if (doors === 2 && doorWidth(2, W) < MIN_DOOR) {
    issues.push({
      paramKey: 'doors',
      message: `Dos puertas quedarían de ${doorWidth(2, W)} mm y el mínimo es ${MIN_DOOR} mm. Usa una puerta.`,
    });
  }
  if (doors > 0 && t < MIN_DOOR_THICKNESS) {
    issues.push({
      paramKey: 'material',
      message: `Las bisagras necesitan un tablero de al menos ${MIN_DOOR_THICKNESS} mm. Elige un material más grueso o quita las puertas.`,
    });
  }
  if (issues.length > 0) return { ok: false, issues };

  // Undersides of each shelf, bottom to top.
  const undersides = Array.from({ length: N }, (_, i) => PLINTH + t + (i + 1) * gap + i * t);
  const door = doorSet({
    count: doors,
    width: W,
    bottom: PLINTH,
    top: H,
    frontZ: D / 2,
    stock,
    mode,
    avoid: [{ bottom: PLINTH, top: PLINTH + t }, { bottom: H - t, top: H }, ...undersides.map((y) => ({ bottom: y, top: y + t }))],
  });

  // Every panel fits a 1220 × 2440 sheet: W ≤ 830, H ≤ 1400.
  const flatPanel = (id: string, label: string, qty: number): Panel => ({
    id,
    label,
    length: span,
    width: Dc,
    stock,
    grain: 'length',
    edges: bandEdges(mode, 'L1'),
    qty,
  });
  const panels: Panel[] = [
    { id: 'side', label: 'Lateral', length: H, width: Dc, stock, grain: 'length', edges: bandEdges(mode, 'L1', 'A1'), qty: 2 },
    flatPanel('top', 'Tapa', 1),
    flatPanel('bottom', 'Base', 1),
    { id: 'plinth', label: 'Zoclo', length: span, width: PLINTH, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
    flatPanel('shelf', 'Entrepaño', N),
    ...door.panels,
    { id: 'back', label: 'Fondo', length: W, width: H - VENT, stock: FIBRACEL_3, grain: 'any', edges: NO_EDGES, qty: 1 },
  ];

  const flat = (panelId: string, instance: number, bottomY: number): Placement => ({
    panelId,
    instance,
    position: [0, bottomY + t / 2, zc],
    size: [span, t, Dc],
  });
  const placements: Placement[] = [
    { panelId: 'side', instance: 0, position: [-(W - t) / 2, H / 2, zc], size: [t, H, Dc] },
    { panelId: 'side', instance: 1, position: [(W - t) / 2, H / 2, zc], size: [t, H, Dc] },
    flat('top', 0, H - t),
    flat('bottom', 0, PLINTH),
    { panelId: 'plinth', instance: 0, position: [0, PLINTH / 2, D / 2 - t / 2], size: [span, PLINTH, t] },
    ...undersides.map((y, i) => flat('shelf', i, y)),
    ...door.placements,
    { panelId: 'back', instance: 0, position: [0, (H - VENT) / 2, -D / 2 + tb / 2], size: [W, H - VENT, tb] },
  ];

  const wallFixed = H >= WALL_FIX_HEIGHT;
  // The back's top edge is free, so only its bottom, its two sides and each shelf take screws.
  const backScrews = Math.ceil((W + 2 * (H - VENT)) / BACK_SCREW_SPACING) + N * Math.ceil(span / BACK_SCREW_SPACING);
  const hardware = mergeHardware([
    { type: 'confirmat', size: '5x50', qty: (N + 2) * 4 + 2 }, // Tapa, Base and shelves; zoclo
    { type: 'screw', size: '3.5x16', qty: backScrews },
    ...(wallFixed ? WALL_HARDWARE : []),
    ...door.hardware,
  ]);

  const steps: Omit<Step, 'order'>[] = [
    {
      title: 'Prepara y marca',
      description:
        `${prepSentence(stock, mode)} Marca en los laterales la cara de abajo de cada pieza: base a ${PLINTH} mm y ` +
        `entrepaños a ${undersides.map((y) => Math.round(y)).join(' · ')} mm.`,
      panelRefs: ['side'],
    },
    ...(mode === 'diy' ? [ironStep(panels.filter((pn) => Object.values(pn.edges).some(Boolean)).map((pn) => pn.id))] : []),
    {
      title: 'Arma la caja',
      description:
        'Fija la base y la tapa entre los laterales con tornillos confirmat, 2 por lado, y el zoclo bajo la base, al frente, con 1 por lado.',
      panelRefs: ['side', 'top', 'bottom', 'plinth'],
      explodeOffsets: { top: [0, 150, 0], bottom: [0, -150, 0], plinth: [0, 0, 150] },
    },
    {
      title: 'Instala los entrepaños',
      description: 'Coloca cada entrepaño en su marca y fíjalo con 2 confirmat por lado.',
      panelRefs: ['shelf'],
      explodeOffsets: { shelf: [0, 0, 200] },
    },
    {
      title: 'Verifica la escuadra y coloca el fondo',
      description:
        'Con el mueble boca abajo, mide las dos diagonales: deben ser iguales. Atornilla el fondo de fibracel con la cara lisa hacia el ' +
        `frente, cada ${BACK_SCREW_SPACING / 10} cm, desde el borde de abajo: a los laterales, a la base y a cada entrepaño. ` +
        `Deja libres los ${VENT / 10} cm de arriba para que se ventilen los zapatos.`,
      panelRefs: ['back'],
      explodeOffsets: { back: [0, 0, -200] },
    },
    ...(wallFixed ? [wallStep('zapatera', true)] : []),
    ...door.steps,
  ];

  const design: Design = {
    templateId: 'shoe-rack',
    params: p,
    panels,
    placements,
    hardware,
    fittings: door.fittings,
    boring: door.boring,
    steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
    edgeBanding: mode,
  };
  return { ok: true, design };
}

export const shoeRack: Template = {
  id: 'shoe-rack',
  name: 'Zapatera',
  description: 'Mueble para zapatos con entrepaños fijos, fondo ventilado y hasta 2 puertas.',
  params,
  generate: (raw) => generateShoeRack(raw),
};
