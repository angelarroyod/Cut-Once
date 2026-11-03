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
import { DEFAULT_MATERIAL, MATERIAL_OPTIONS, getStock } from '../stock.ts';
import {
  DEFAULT_EDGE_BANDING,
  EDGE_BANDING_OPTIONS,
  NO_EDGES,
  bandEdges,
  edgeBandingMode,
  ironStep,
  prepSentence,
} from '../edge-banding.ts';
import { paramIssues, resolveParams } from '../validation.ts';
import { drawerSet } from '../parts/drawer.ts';
import { mergeHardware } from '../parts/merge.ts';

const MIN_THICKNESS = 15; // mm; 12 mm is too thin for a top people lean on
const MIN_KNEE = 600; // mm of clear width for the legs
const DRAWER_BAY = 400; // mm, inside width of the drawer pedestal
const PLINTH = 70; // mm, zoclo height under the pedestal
const RAIL = 60; // mm; the front rail stays this low so the thighs clear it at the lowest desk
const MODESTY = 350; // mm, height of the rear panel that keeps the desk from racking
const BRACKET_SPACING = 400; // mm between the brackets along the rail and the rear panel
const BAY_TOP_SCREWS = 6; // up through the pedestal's Tapa into the desktop

const params: ParamSpec[] = [
  { kind: 'number', key: 'width', label: 'Ancho', unit: 'mm', min: 900, max: 1600, step: 10, default: 1200 },
  { kind: 'number', key: 'height', label: 'Alto', unit: 'mm', min: 720, max: 780, step: 10, default: 750 },
  { kind: 'number', key: 'depth', label: 'Profundidad', unit: 'mm', min: 450, max: 700, step: 10, default: 600 },
  { kind: 'number', key: 'drawers', label: 'Cajones', unit: '', min: 0, max: 3, step: 1, default: 2 },
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
 * A home-office desk: a top on two sides, stiffened by a low front rail and a rear panel, so the top
 * only spans front to back. With drawers, a pedestal on the right holds them. The top is fixed from
 * below with brackets, so no screw shows on the work surface.
 */
export function generateDesk(raw: TemplateParams): GenerateResult {
  const p = resolveParams(params, raw);
  const rangeIssues = paramIssues(params, p);
  if (rangeIssues.length > 0) return { ok: false, issues: rangeIssues };

  // resolveParams guarantees every spec key exists; paramIssues vetted the select values
  const W = p['width']!;
  const H = p['height']!;
  const D = p['depth']!;
  const n = p['drawers']!;
  const stock = getStock(p['material']!);
  const mode = edgeBandingMode(p['edgeBanding']!);
  const t = stock.thickness;
  const hasDrawers = n > 0;
  const legs = H - t; // sides and divider stand on the floor, under the top
  const knee = W - 2 * t - (hasDrawers ? DRAWER_BAY + t : 0);
  const kneeCenter = -W / 2 + t + knee / 2;
  const unsupported = D - 2 * t; // between the front rail and the rear panel

  const issues: ValidationIssue[] = [];
  if (t < MIN_THICKNESS) {
    issues.push({
      paramKey: 'material',
      message: `La cubierta de un escritorio necesita al menos ${MIN_THICKNESS} mm de grueso. Elige un material más grueso.`,
    });
  } else if (stock.maxSpan !== null && unsupported > stock.maxSpan) {
    issues.push({
      paramKey: 'depth',
      message:
        `La cubierta queda sin apoyo ${unsupported} mm entre el travesaño y el faldón, y el máximo seguro de ` +
        `${stock.label.toLowerCase()} es ${stock.maxSpan} mm. Reduce la profundidad o elige un material más grueso.`,
    });
  }
  if (knee < MIN_KNEE) {
    issues.push({
      paramKey: 'drawers',
      message: `Con cajones quedan ${knee} mm para las piernas y el mínimo es ${MIN_KNEE} mm. Aumenta el ancho o quita los cajones.`,
    });
  }
  if (issues.length > 0) return { ok: false, issues };

  const bayCenter = W / 2 - t - DRAWER_BAY / 2;
  const dividerX = W / 2 - t - DRAWER_BAY - t / 2;
  const drawer = drawerSet({
    count: n,
    stacks: [{ frontLeft: dividerX - t / 2 + 2, frontRight: W / 2 - 2, openingLeft: dividerX + t / 2, openingRight: W / 2 - t }],
    bottom: PLINTH,
    top: legs - t,
    frontZ: D / 2,
    depth: D, // the pedestal has no back
    stock,
    mode,
  });

  // Every panel fits a 1220 × 2440 sheet: W ≤ 1600, H ≤ 780, D ≤ 700.
  const panels: Panel[] = [
    { id: 'top', label: 'Cubierta', length: W, width: D, stock, grain: 'length', edges: bandEdges(mode, 'L1', 'A1', 'A2'), qty: 1 },
    { id: 'side', label: 'Lateral', length: legs, width: D, stock, grain: 'length', edges: bandEdges(mode, 'L1'), qty: 2 },
    { id: 'rail', label: 'Travesaño', length: knee, width: RAIL, stock, grain: 'length', edges: bandEdges(mode, 'L1'), qty: 1 },
    { id: 'modesty', label: 'Faldón', length: knee, width: MODESTY, stock, grain: 'length', edges: bandEdges(mode, 'L1'), qty: 1 },
    ...(hasDrawers
      ? ([
          { id: 'divider', label: 'Divisor', length: legs, width: D, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
          { id: 'bay-top', label: 'Tapa de cajonera', length: DRAWER_BAY, width: D, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
          { id: 'bottom', label: 'Base', length: DRAWER_BAY, width: D, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
          { id: 'plinth', label: 'Zoclo', length: DRAWER_BAY, width: PLINTH, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
        ] satisfies Panel[])
      : []),
    ...drawer.panels,
  ];

  const placements: Placement[] = [
    { panelId: 'top', instance: 0, position: [0, H - t / 2, 0], size: [W, t, D] },
    { panelId: 'side', instance: 0, position: [-(W - t) / 2, legs / 2, 0], size: [t, legs, D] },
    { panelId: 'side', instance: 1, position: [(W - t) / 2, legs / 2, 0], size: [t, legs, D] },
    { panelId: 'rail', instance: 0, position: [kneeCenter, legs - RAIL / 2, D / 2 - t / 2], size: [knee, RAIL, t] },
    { panelId: 'modesty', instance: 0, position: [kneeCenter, legs - MODESTY / 2, -D / 2 + t / 2], size: [knee, MODESTY, t] },
    ...(hasDrawers
      ? ([
          { panelId: 'divider', instance: 0, position: [dividerX, legs / 2, 0], size: [t, legs, D] },
          { panelId: 'bay-top', instance: 0, position: [bayCenter, legs - t / 2, 0], size: [DRAWER_BAY, t, D] },
          { panelId: 'bottom', instance: 0, position: [bayCenter, PLINTH + t / 2, 0], size: [DRAWER_BAY, t, D] },
          { panelId: 'plinth', instance: 0, position: [bayCenter, PLINTH / 2, D / 2 - t / 2], size: [DRAWER_BAY, PLINTH, t] },
        ] satisfies Placement[])
      : []),
    ...drawer.placements,
  ];

  // Rail and rear panel take one bracket per 400 mm; each wall of the knee space takes 2.
  const brackets = 2 * Math.ceil(knee / BRACKET_SPACING) + 4;
  const hardware = mergeHardware([
    { type: 'confirmat', size: '5x50', qty: 2 + 4 + (hasDrawers ? 4 + 4 + 2 : 0) }, // rail; rear panel; pedestal Tapa, Base and zoclo
    { type: 'bracket', size: '2" (50 mm)', qty: brackets },
    { type: 'screw', size: '3.5x13', qty: 4 * brackets },
    ...(hasDrawers ? [{ type: 'screw' as const, size: '3.5x25', qty: BAY_TOP_SCREWS }] : []),
    ...drawer.hardware,
  ]);

  const kneeWalls = hasDrawers ? 'el lateral izquierdo y el divisor' : 'los laterales';
  const pedestalSteps: Omit<Step, 'order'>[] = hasDrawers
    ? [
        {
          title: 'Arma la cajonera',
          description:
            `Marca en el divisor y en el lateral derecho la cara de abajo de la base, a ${PLINTH} mm del piso. Fija la base en esa ` +
            'marca y la tapa de cajonera arriba, al ras, con 2 confirmat por lado. Fija el zoclo bajo la base, al frente, con 1 por lado.',
          panelRefs: ['divider', 'side', 'bay-top', 'bottom', 'plinth'],
          explodeOffsets: { 'bay-top': [0, 150, 0], bottom: [0, -150, 0], plinth: [0, 0, 150] },
        },
      ]
    : [];
  const steps: Omit<Step, 'order'>[] = [
    {
      title: 'Prepara las piezas',
      description: `${prepSentence(stock, mode)} Revisa que ${hasDrawers ? 'los laterales y el divisor midan' : 'los laterales midan'} lo mismo: de eso depende que la cubierta quede a nivel.`,
      panelRefs: hasDrawers ? ['side', 'divider'] : ['side'],
    },
    ...(mode === 'diy' ? [ironStep(panels.filter((pn) => Object.values(pn.edges).some(Boolean)).map((pn) => pn.id))] : []),
    ...pedestalSteps,
    {
      title: 'Une el travesaño y el faldón',
      description:
        `Entre ${kneeWalls}, fija el faldón atrás y el travesaño al frente, los dos al ras de arriba. ` +
        'El faldón lleva 2 confirmat por lado y el travesaño 1. Cubre las cabezas con tapones.',
      panelRefs: hasDrawers ? ['side', 'divider', 'modesty', 'rail'] : ['side', 'modesty', 'rail'],
      explodeOffsets: { modesty: [0, 0, -150], rail: [0, 0, 150] },
    },
    {
      title: 'Fija la cubierta',
      description:
        'Pon la cubierta boca abajo sobre una cobija y la estructura de cabeza encima, centrada y al ras. Mide las dos diagonales: ' +
        `deben ser iguales. Atornilla ${brackets} escuadras por dentro, con tornillos 3.5×13: 2 en cada pared del hueco de las ` +
        `piernas (${kneeWalls}) y el resto repartidas en el travesaño y el faldón.` +
        (hasDrawers ? ` Desde dentro de la cajonera, sube ${BAY_TOP_SCREWS} tornillos 3.5×25 por la tapa de cajonera hasta la cubierta.` : ''),
      panelRefs: hasDrawers ? ['top', 'bay-top'] : ['top'],
      explodeOffsets: { top: [0, 150, 0] },
    },
    ...drawer.steps,
  ];

  const design: Design = {
    templateId: 'desk',
    params: p,
    panels,
    placements,
    hardware,
    fittings: drawer.fittings,
    boring: [],
    steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
    edgeBanding: mode,
  };
  return { ok: true, design };
}

export const desk: Template = {
  id: 'desk',
  name: 'Escritorio',
  description: 'Escritorio para home office con faldón y travesaño, y hasta 3 cajones a la derecha.',
  params,
  generate: (raw) => generateDesk(raw),
};
