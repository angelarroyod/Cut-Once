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
import { drawerSet, type DrawerStack } from '../parts/drawer.ts';
import { mergeHardware } from '../parts/merge.ts';

const MIN_THICKNESS = 15; // mm; 12 mm is too thin to carry a mattress and a sleeper
const MAX_DECK_SPAN = 600; // mm between ribs under a mattress, tighter than a shelf's span on the stiffest board
const RIB = 80; // mm, height of the ribs and of the front rails above the drawers
const PLINTH = 70; // mm, zoclo height under the drawers
const DRAWER_ZONE = 430; // mm of bed length the drawers take: a 16" slide and its clearance
const DECK_SCREW_SPACING = 300; // mm between the deck's screws along each support

/** Mattress sizes as sold in Mexico, stored by id in the `mattress` param: never renumber them. */
const MATTRESSES: Record<number, { width: number; length: number }> = {
  1: { width: 1000, length: 1900 },
  2: { width: 1350, length: 1900 },
  3: { width: 1500, length: 2000 },
  4: { width: 1900, length: 2000 },
};

const params: ParamSpec[] = [
  {
    kind: 'select',
    key: 'mattress',
    label: 'Colchón',
    unit: '',
    options: [
      { value: 1, label: 'Individual (100 × 190 cm)' },
      { value: 2, label: 'Matrimonial (135 × 190 cm)' },
      { value: 3, label: 'Queen (150 × 200 cm)' },
      { value: 4, label: 'King (190 × 200 cm)' },
    ],
    default: 2,
  },
  { kind: 'number', key: 'height', label: 'Alto', unit: 'mm', min: 300, max: 500, step: 10, default: 400 },
  {
    kind: 'select',
    key: 'drawers',
    label: 'Cajones al pie',
    unit: '',
    options: [
      { value: 0, label: 'Sin cajones' },
      { value: 1, label: 'Dos cajones' },
    ],
    default: 1,
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
 * A bed base the size of its mattress: two sides, a head rail, a centre spine and a deck in strips
 * that lie across the bed, each seam on a pair of ribs. No sheet is big enough for a one-piece deck.
 * With drawers, two open at the foot under a pair of front rails, in place of the foot rail.
 * +z is the foot, so the drawers face the camera.
 */
export function generateBedBase(raw: TemplateParams): GenerateResult {
  const p = resolveParams(params, raw);
  const rangeIssues = paramIssues(params, p);
  if (rangeIssues.length > 0) return { ok: false, issues: rangeIssues };

  // resolveParams guarantees every spec key exists; paramIssues vetted the select values
  const { width: W, length: L } = MATTRESSES[p['mattress']!]!;
  const H = p['height']!;
  const hasDrawers = p['drawers']! === 1;
  const stock = getStock(p['material']!);
  const mode = edgeBandingMode(p['edgeBanding']!);
  const t = stock.thickness;

  const issues: ValidationIssue[] = [];
  if (t < MIN_THICKNESS) {
    issues.push({
      paramKey: 'material',
      message: `Una base de cama necesita al menos ${MIN_THICKNESS} mm de grueso para cargar el colchón. Elige un material más grueso.`,
    });
  }
  if (issues.length > 0) return { ok: false, issues };

  const span = W - 2 * t; // deck and rails run between the sides
  const bay = Math.floor((W - 3 * t) / 2); // between a side and the spine
  const under = H - t; // spine and rails stop under the deck
  const footZ = L / 2;
  const footEnd = hasDrawers ? footZ : footZ - t; // where the spine ends
  const spineLength = footEnd - (-footZ + t);
  const spineZ = (footEnd + (-footZ + t)) / 2;

  // The deck runs from the head to the foot. With drawers its first strip covers the drawer zone and half a rib.
  const footStrip = hasDrawers ? DRAWER_ZONE + t / 2 : 0;
  const run = L - footStrip;
  const maxStrip = Math.min(MAX_DECK_SPAN, stock.maxSpan ?? MAX_DECK_SPAN);
  const strips = Math.ceil(run / maxStrip);
  const strip = Math.floor(run / strips);
  // Seams, from the head; each sits on a pair of ribs. The strip over the drawers adds one seam of its own.
  const seams = Array.from({ length: strips - 1 + (hasDrawers ? 1 : 0) }, (_, i) => -footZ + (i + 1) * strip);
  const ribsTotal = 2 * seams.length;

  const stacks: DrawerStack[] = [
    { frontLeft: -W / 2 + 2, frontRight: -2, openingLeft: -W / 2 + t, openingRight: -t / 2 },
    { frontLeft: 2, frontRight: W / 2 - 2, openingLeft: t / 2, openingRight: W / 2 - t },
  ];
  const drawer = drawerSet({ count: hasDrawers ? 1 : 0, stacks, bottom: PLINTH, top: under - RIB, frontZ: footZ, depth: DRAWER_ZONE, stock, mode });

  // Every panel fits a 1220 × 2440 sheet: L ≤ 2000, span ≤ 1864, strips ≤ 600.
  // Banded edges: the sides' top and foot end, and the foot strip over the drawers. The mattress hides the rest.
  const panels: Panel[] = [
    { id: 'side', label: 'Lateral', length: L, width: H, stock, grain: 'length', edges: bandEdges(mode, 'L1', 'A1'), qty: 2 },
    { id: 'head-rail', label: 'Cabecero', length: span, width: under, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
    ...(hasDrawers
      ? []
      : ([{ id: 'foot-rail', label: 'Piecero', length: span, width: under, stock, grain: 'length', edges: NO_EDGES, qty: 1 }] satisfies Panel[])),
    { id: 'spine', label: 'Larguero central', length: spineLength, width: under, stock, grain: 'length', edges: NO_EDGES, qty: 1 },
    { id: 'rib', label: 'Costilla', length: bay, width: RIB, stock, grain: 'length', edges: NO_EDGES, qty: ribsTotal },
    { id: 'deck', label: 'Tabla de plataforma', length: span, width: strip, stock, grain: 'length', edges: NO_EDGES, qty: strips },
    ...(hasDrawers
      ? ([
          { id: 'deck-foot', label: 'Tabla de plataforma al pie', length: span, width: footStrip, stock, grain: 'length', edges: bandEdges(mode, 'L1'), qty: 1 },
          { id: 'front-rail', label: 'Travesaño', length: bay, width: RIB, stock, grain: 'length', edges: NO_EDGES, qty: 2 },
          { id: 'bottom', label: 'Base', length: bay, width: DRAWER_ZONE, stock, grain: 'length', edges: NO_EDGES, qty: 2 },
          { id: 'plinth', label: 'Zoclo', length: bay, width: PLINTH, stock, grain: 'length', edges: NO_EDGES, qty: 2 },
        ] satisfies Panel[])
      : []),
    ...drawer.panels,
  ];

  const bayCenters = [-(W - t) / 4, (W - t) / 4];
  const deckY = H - t / 2;
  const placements: Placement[] = [
    { panelId: 'side', instance: 0, position: [-(W - t) / 2, H / 2, 0], size: [t, H, L] },
    { panelId: 'side', instance: 1, position: [(W - t) / 2, H / 2, 0], size: [t, H, L] },
    { panelId: 'head-rail', instance: 0, position: [0, under / 2, -footZ + t / 2], size: [span, under, t] },
    ...(hasDrawers ? [] : ([{ panelId: 'foot-rail', instance: 0, position: [0, under / 2, footZ - t / 2], size: [span, under, t] }] satisfies Placement[])),
    { panelId: 'spine', instance: 0, position: [0, under / 2, spineZ], size: [t, under, spineLength] },
    ...seams.flatMap((z, i): Placement[] =>
      bayCenters.map((x, k) => ({ panelId: 'rib', instance: 2 * i + k, position: [x, under - RIB / 2, z], size: [bay, RIB, t] })),
    ),
    ...Array.from({ length: strips }, (_, i): Placement => ({
      panelId: 'deck',
      instance: i,
      position: [0, deckY, -footZ + (i + 0.5) * strip],
      size: [span, t, strip],
    })),
    ...(hasDrawers
      ? ([
          { panelId: 'deck-foot', instance: 0, position: [0, deckY, footZ - footStrip / 2], size: [span, t, footStrip] },
          ...bayCenters.flatMap((x, k): Placement[] => [
            { panelId: 'front-rail', instance: k, position: [x, under - RIB / 2, footZ - t / 2], size: [bay, RIB, t] },
            { panelId: 'bottom', instance: k, position: [x, PLINTH + t / 2, footZ - DRAWER_ZONE / 2], size: [bay, t, DRAWER_ZONE] },
            { panelId: 'plinth', instance: k, position: [x, PLINTH / 2, footZ - t / 2], size: [bay, PLINTH, t] },
          ]),
        ] satisfies Placement[])
      : []),
    ...drawer.placements,
  ];

  const deckPieces = strips + (hasDrawers ? 1 : 0);
  const crossSupports = 1 + (hasDrawers ? 0 : 1) + seams.length; // head rail, foot rail and each pair of ribs
  const deckScrews =
    Math.ceil(spineLength / DECK_SCREW_SPACING) + crossSupports * Math.ceil(span / DECK_SCREW_SPACING) + (hasDrawers ? 2 * Math.ceil(bay / DECK_SCREW_SPACING) : 0);
  const hardware = mergeHardware([
    {
      type: 'confirmat',
      size: '5x50',
      qty:
        4 + // head rail
        2 + // spine into the head rail
        (hasDrawers ? 4 + 8 + 4 : 4 + 2) + // front rails, Bases and zoclos, or the foot rail and the spine into it
        2 * ribsTotal + // 1 per rib end, 1 up and 1 down on either side of the spine
        4 * deckPieces, // 2 per deck strip end, through the sides
    },
    { type: 'screw', size: '3.5x40', qty: deckScrews },
    ...drawer.hardware,
  ]);

  const drawerFrameSteps: Omit<Step, 'order'>[] = hasDrawers
    ? [
        {
          title: 'Arma el hueco de los cajones',
          description:
            `Fija cada base entre el lateral y el larguero central, al pie de la cama, con su cara de abajo a ${PLINTH} mm del piso y 2 confirmat ` +
            'por lado. Fija los zoclos debajo, al frente, con 1 por lado. Arriba, fija los travesaños al frente con 1 por lado, con su canto de arriba a la altura del larguero.',
          panelRefs: ['side', 'spine', 'bottom', 'plinth', 'front-rail'],
          explodeOffsets: { plinth: [0, 0, 150], 'front-rail': [0, 0, 150] },
        },
      ]
    : [];
  const deckIds = hasDrawers ? ['deck', 'deck-foot'] : ['deck'];
  const steps: Omit<Step, 'order'>[] = [
    {
      title: 'Prepara y marca',
      description:
        `${prepSentence(stock, mode)} Escoge el lugar definitivo: la cama armada no pasa por una puerta. ` +
        `Marca en el larguero central y en los laterales ${seams.length === 1 ? 'la costilla' : `las ${seams.length} líneas de costillas`}: ` +
        `${seams.map((z) => Math.round(z + footZ)).join(' · ')} mm desde la cabecera.`,
      panelRefs: ['side', 'spine'],
    },
    ...(mode === 'diy' ? [ironStep(panels.filter((pn) => Object.values(pn.edges).some(Boolean)).map((pn) => pn.id))] : []),
    {
      title: 'Arma el marco',
      description:
        `Fija el cabecero${hasDrawers ? '' : ' y el piecero'} entre los laterales con 2 confirmat por lado, al ras del piso. ` +
        'Atraviesa el cabecero con 2 confirmat para fijar el larguero central, centrado.' +
        (hasDrawers ? '' : ' Haz lo mismo desde el piecero.') +
        ' Mide las dos diagonales: deben ser iguales.',
      panelRefs: hasDrawers ? ['side', 'head-rail', 'spine'] : ['side', 'head-rail', 'foot-rail', 'spine'],
      explodeOffsets: { 'head-rail': [0, 0, -150], ...(hasDrawers ? {} : { 'foot-rail': [0, 0, 150] as [number, number, number] }) },
    },
    {
      title: 'Coloca las costillas',
      description:
        'En cada marca, fija una costilla a cada lado del larguero central, con su canto de arriba a la altura del larguero. Lleva 1 confirmat ' +
        'por punta. En el larguero, pon el de la izquierda arriba y el de la derecha abajo, para que no choquen.',
      panelRefs: ['rib'],
      explodeOffsets: { rib: [0, 100, 0] },
    },
    ...drawerFrameSteps,
    {
      title: 'Atornilla la plataforma',
      description:
        'Coloca las tablas una junto a otra, de la cabecera al pie, con cada unión sobre sus costillas. Atorníllalas a las costillas, al larguero, ' +
        `al cabecero y al ${hasDrawers ? 'travesaño' : 'piecero'} con tornillos 3.5×40 cada ${DECK_SCREW_SPACING / 10} cm, y a los laterales con 2 confirmat por punta. ` +
        'Las cabezas quedan bajo el colchón.',
      panelRefs: deckIds,
      explodeOffsets: Object.fromEntries(deckIds.map((id) => [id, [0, 200, 0] as [number, number, number]])),
    },
    ...drawer.steps,
  ];

  const design: Design = {
    templateId: 'bed-base',
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

export const bedBase: Template = {
  id: 'bed-base',
  name: 'Base de cama',
  description: 'Base para colchón con plataforma por tablas y dos cajones al pie. Deja 50 cm libres frente a ellos.',
  params,
  generate: (raw) => generateBedBase(raw),
};
