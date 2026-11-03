import type { Design, GenerateResult, Panel, ParamSpec, Placement, Step, Template, TemplateParams } from '../types.ts';
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

const FIRST_SHELF = 1000; // mm from the floor to the lowest shelf, only where the 3D draws it
const CLEAT_PLAY = 2; // mm of play each way, so the box slides over the cleat
const BOX_SCREW_SPACING = 150; // mm between the screws around the Tapa and the Base
const ANCHOR_SPACING = 300; // mm between the cleat's wall anchors

const params: ParamSpec[] = [
  { kind: 'number', key: 'width', label: 'Largo', unit: 'mm', min: 400, max: 1200, step: 10, default: 800 },
  { kind: 'number', key: 'depth', label: 'Profundidad', unit: 'mm', min: 150, max: 300, step: 10, default: 220 },
  { kind: 'number', key: 'thickness', label: 'Grueso', unit: 'mm', min: 70, max: 120, step: 5, default: 80 },
  { kind: 'number', key: 'count', label: 'Repisas', unit: '', min: 1, max: 4, step: 1, default: 3 },
  { kind: 'number', key: 'spacing', label: 'Separación', unit: 'mm', min: 200, max: 500, step: 10, default: 300 },
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
 * Floating shelves: hollow boxes with no visible brackets. A cleat goes on the wall, the box slides
 * over it and is screwed to it through its Tapa and Base. Open at the back, against the wall (−z).
 * `spacing` is the clear height between shelves.
 */
export function generateFloatingShelves(raw: TemplateParams): GenerateResult {
  const p = resolveParams(params, raw);
  const rangeIssues = paramIssues(params, p);
  if (rangeIssues.length > 0) return { ok: false, issues: rangeIssues };

  // resolveParams guarantees every spec key exists; paramIssues vetted the select values
  const L = p['width']!;
  const D = p['depth']!;
  const H = p['thickness']!;
  const N = p['count']!;
  const spacing = p['spacing']!;
  const stock = getStock(p['material']!);
  const mode = edgeBandingMode(p['edgeBanding']!);
  const t = stock.thickness;
  const inner = H - 2 * t; // between the Tapa and the Base; at least 34 mm
  const between = L - 2 * t; // between the two ends
  const cleatLength = between - 2 * CLEAT_PLAY;
  const cleatWidth = inner - CLEAT_PLAY;

  // ponytail: no cross-param issues. The Tapa spans at most 264 mm to the cleat, under every stock's maxSpan;
  // the real limit is the wall and its anchors, which the step warns about.

  // Every panel fits a 1220 × 2440 sheet: L ≤ 1200, D ≤ 300.
  const panels: Panel[] = [
    { id: 'top', label: 'Tapa', length: L, width: D, stock, grain: 'length', edges: bandEdges(mode, 'L1', 'A1', 'A2'), qty: N },
    { id: 'bottom', label: 'Base', length: L, width: D, stock, grain: 'length', edges: bandEdges(mode, 'L1', 'A1', 'A2'), qty: N },
    { id: 'front', label: 'Frente', length: between, width: inner, stock, grain: 'length', edges: NO_EDGES, qty: N },
    { id: 'end', label: 'Costado', length: D, width: inner, stock, grain: 'length', edges: bandEdges(mode, 'A1'), qty: 2 * N },
    { id: 'cleat', label: 'Listón de muro', length: cleatLength, width: cleatWidth, stock, grain: 'length', edges: NO_EDGES, qty: N },
  ];

  const placements: Placement[] = [];
  for (let i = 0; i < N; i++) {
    const y = FIRST_SHELF + i * (H + spacing); // the shelf's underside
    const cy = y + H / 2;
    placements.push(
      { panelId: 'bottom', instance: i, position: [0, y + t / 2, 0], size: [L, t, D] },
      { panelId: 'top', instance: i, position: [0, y + H - t / 2, 0], size: [L, t, D] },
      { panelId: 'front', instance: i, position: [0, cy, D / 2 - t / 2], size: [between, inner, t] },
      { panelId: 'end', instance: 2 * i, position: [-(L - t) / 2, cy, 0], size: [t, inner, D] },
      { panelId: 'end', instance: 2 * i + 1, position: [(L - t) / 2, cy, 0], size: [t, inner, D] },
      { panelId: 'cleat', instance: i, position: [0, cy, -D / 2 + t / 2], size: [cleatLength, cleatWidth, t] },
    );
  }

  // Through the Tapa and the Base: into the front and the ends, then into the cleat along the back.
  const faceScrews = Math.ceil(L / BOX_SCREW_SPACING) + 2 * Math.ceil(D / BOX_SCREW_SPACING);
  const cleatScrews = Math.ceil(L / BOX_SCREW_SPACING);
  const anchors = Math.ceil(cleatLength / ANCHOR_SPACING) + 1;

  const steps: Omit<Step, 'order'>[] = [
    {
      title: 'Prepara las piezas',
      description: `${prepSentence(stock, mode)} Junta las piezas de cada repisa en un montón: ${N === 1 ? 'la repisa lleva' : 'cada repisa lleva'} tapa, base, frente, 2 costados y un listón.`,
      panelRefs: ['top', 'bottom', 'front', 'end', 'cleat'],
    },
    ...(mode === 'diy' ? [ironStep(['top', 'bottom', 'end'])] : []),
    {
      title: N === 1 ? 'Arma la caja' : 'Arma las cajas',
      description:
        'Sobre la base, pega con cola el frente y los 2 costados, y atorníllalos por debajo con tornillos 3.5×25 cada ' +
        `${BOX_SCREW_SPACING / 10} cm. Pon la tapa encima y atorníllala igual. La parte de atrás queda abierta. Prueba que el listón entre con holgura.`,
      panelRefs: ['top', 'bottom', 'front', 'end'],
      explodeOffsets: { top: [0, 80, 0], bottom: [0, -80, 0] },
    },
    {
      title: N === 1 ? 'Fija el listón al muro' : 'Fija los listones al muro',
      description:
        `Busca con un nivel la línea de ${N === 1 ? 'la repisa' : 'cada repisa'}${N === 1 ? '' : `, con ${spacing} mm libres entre una y otra`}. ` +
        `Barrena ${anchors} agujeros con broca de 1/4" (para concreto si el muro es de block o tabique), mete los taquetes y atornilla el listón con sus pijas. ` +
        'En tablaroca, los taquetes no aguantan: atornilla a los postes o usa anclas para tablaroca. Si el listón se mueve, no sigas.',
      panelRefs: ['cleat'],
      explodeOffsets: { cleat: [0, 0, -120] },
    },
    {
      title: N === 1 ? 'Monta la repisa' : 'Monta las repisas',
      description:
        'Desliza la caja sobre el listón hasta que toque el muro. Atorníllala al listón a través de la tapa y de la base, cada ' +
        `${BOX_SCREW_SPACING / 10} cm. Sirve para libros ligeros y adornos: no te sientes ni te apoyes en ella.`,
      panelRefs: ['top', 'bottom', 'cleat'],
    },
  ];

  const design: Design = {
    templateId: 'floating-shelves',
    params: p,
    panels,
    placements,
    hardware: [
      { type: 'screw', size: '3.5x25', qty: N * 2 * (faceScrews + cleatScrews) },
      { type: 'wall-anchor', size: '1/4"', qty: N * anchors },
    ],
    fittings: [],
    boring: [],
    steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
    edgeBanding: mode,
  };
  return { ok: true, design };
}

export const floatingShelves: Template = {
  id: 'floating-shelves',
  name: 'Repisas flotantes',
  description: 'Repisas huecas sin soportes a la vista, montadas sobre un listón oculto en el muro.',
  params,
  generate: (raw) => generateFloatingShelves(raw),
};
