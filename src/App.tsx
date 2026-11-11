import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { CUT_KERF, cutTotals, edgeBandTotals, nest, templates, weldTemplates } from './engine/index.ts';
import { refLabels } from './engine/labels.ts';
import { DEFAULT_CONFIG } from './engine/types.ts';
import type { Design } from './engine/types.ts';
import type { WeldDesign } from './engine/welding/types.ts';
import { useAppStore, type Mode, type View } from './state/store.ts';
import { TemplatePicker } from './components/TemplatePicker.tsx';
import { ParamForm } from './components/ParamForm.tsx';
import { Viewer3D } from './components/Viewer3D.tsx';
import { CutDiagram } from './components/CutDiagram.tsx';
import { StepsPanel } from './components/StepsPanel.tsx';
import { PrintReport } from './components/PrintReport.tsx';
import { OrderPanel } from './components/OrderPanel.tsx';
import {
  Suggestions,
  WeldCuts,
  WeldDesignView,
  WeldPrintReport,
  WeldShopping,
  WeldSteps,
} from './components/weld/WeldPanels.tsx';

/** 20 px line icons in one stroke weight; the tab bar shows them on phones. */
const ICONS: Record<View, ReactNode> = {
  design: <path d="M10 2.5 17 6.3v7.4L10 17.5 3 13.7V6.3L10 2.5Zm0 0v7.6m0 0 7-3.8M10 10.1 3 6.3" />,
  cuts: <path d="M3.5 3.5h13v13h-13zM3.5 9h13M9 9v7.5M12.5 3.5V9" />,
  steps: <path d="M8 5h9M8 10h9M8 15h9M3.5 4.2l1 1 2-2M3.5 9.2l1 1 2-2M4.5 15h.01" />,
  order: <path d="M5 2.5h10v15l-2-1.3-1.5 1.3-1.5-1.3-1.5 1.3L7 16.2l-2 1.3v-15ZM7.5 6.5h5M7.5 9.5h5M7.5 12.5h3" />,
};

const TABS: Record<Mode, { id: View; label: string }[]> = {
  wood: [
    { id: 'design', label: 'Diseño' },
    { id: 'cuts', label: 'Cortes' },
    { id: 'steps', label: 'Pasos' },
    { id: 'order', label: 'Pedido' },
  ],
  metal: [
    { id: 'design', label: 'Diseño' },
    { id: 'cuts', label: 'Cortes' },
    { id: 'steps', label: 'Pasos' },
    { id: 'order', label: 'Compras' },
  ],
};

const MODES: { id: Mode; label: string; icon: ReactNode }[] = [
  { id: 'wood', label: 'Madera', icon: <path d="M2.5 6h11M2.5 8.5h11M2.5 11h11M2.5 4.5h11v8h-11z" /> },
  { id: 'metal', label: 'Metal', icon: <path d="M3 3h10v10H3zM5.5 5.5h5v5h-5z" /> },
];

/** Keeps the last valid design so the views stay put while the user fixes an invalid combo. */
function useLastGood<T>(design: T | null): T | null {
  const last = useRef<T | null>(null);
  if (design) last.current = design;
  return last.current;
}

export default function App() {
  const mode = useAppStore((s) => s.mode);
  const templateId = useAppStore((s) => s.templateId);
  const weldTemplateId = useAppStore((s) => s.weldTemplateId);
  const paramsByTemplate = useAppStore((s) => s.paramsByTemplate);
  const view = useAppStore((s) => s.view);

  const template = templates.find((t) => t.id === templateId) ?? templates[0]!;
  const weldTemplate = weldTemplates.find((t) => t.id === weldTemplateId) ?? weldTemplates[0]!;
  const params = paramsByTemplate[template.id] ?? {};
  const weldParams = paramsByTemplate[weldTemplate.id] ?? {};

  const result = useMemo(() => template.generate(params), [template, params]);
  const weldResult = useMemo(() => weldTemplate.generate(weldParams), [weldTemplate, weldParams]);
  const design = useLastGood<Design>(result.ok ? result.design : null);
  const weld = useLastGood<WeldDesign>(weldResult.ok ? weldResult.design : null);

  const metal = mode === 'metal';
  const active = metal ? weldResult : result;
  const stale = !active.ok;
  const issues = active.ok ? [] : active.issues;

  return (
    <>
      <a
        href="#main"
        className="sr-only rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]"
      >
        Saltar al contenido
      </a>
      <div className="flex min-h-dvh flex-col bg-paper text-ink lg:h-dvh print:hidden">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-rule bg-panel px-4 lg:gap-7 lg:px-6">
          <Brand />
          <ModeSwitch />
          <ViewTabs />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => window.print()}
              aria-label="Exportar PDF"
              className="flex h-10 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-bold text-white shadow-[0_1px_2px_rgb(20_26_43/0.2)] transition-[filter] hover:brightness-110 sm:px-4"
            >
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 14.5V17h12v-2.5" />
              </svg>
              <span className="hidden sm:inline">Exportar PDF</span>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:flex-row lg:pb-0">
          {/* The rail. On a phone it sits under the stage, and only in Diseño. */}
          <aside
            className={`${view === 'design' ? 'flex' : 'hidden'} order-2 flex-col bg-panel lg:order-none lg:flex lg:w-[340px] lg:shrink-0 lg:border-r lg:border-cut`}
          >
            {/* relative: absolutely placed children (the sr-only live region) must stay inside this
                scroll box; without it they hang off the page and the whole window scrolls */}
            <div className="relative flex-1 px-5 pb-8 pt-5 lg:overflow-y-auto">
              <TemplatePicker />
              <ParamForm template={metal ? weldTemplate : template} params={metal ? weldParams : params} issues={issues}>
                {metal && weld && <Suggestions design={weld} />}
              </ParamForm>
            </div>
            <footer className="border-t border-rule px-5 py-3 text-xs leading-relaxed text-ink-soft">
              {metal ? `Disco de ${CUT_KERF} mm · tramos de 6.10 m` : `Sierra de ${DEFAULT_CONFIG.nesting.kerf} mm`} ·
              todas las medidas en milímetros
            </footer>
          </aside>

          <main id="main" tabIndex={-1} className="order-1 flex min-w-0 flex-1 flex-col focus-visible:outline-none">
            <div
              key={`${mode}-${view}`}
              id="view-panel"
              role="tabpanel"
              aria-labelledby={`tab-${view}`}
              className="rise relative flex-1 lg:overflow-hidden"
            >
              {!metal && design && view === 'design' && (
                <div className="flex flex-col lg:h-full">
                  <div className="h-[58dvh] lg:h-auto lg:min-h-0 lg:flex-1">
                    <Viewer3D design={design} stale={stale} dimensions />
                  </div>
                  <WoodSummary design={design} />
                </div>
              )}
              {!metal && design && view === 'cuts' && <CutDiagram design={design} />}
              {!metal && design && view === 'steps' && (
                <StepsPanel
                  steps={design.steps}
                  labels={refLabels(design)}
                  viewer={(step) => <Viewer3D design={design} stale={stale} highlightStep={step} />}
                />
              )}
              {!metal && design && view === 'order' && (
                <OrderPanel design={design} title={template.name} stale={stale} />
              )}

              {metal && weld && view === 'design' && <WeldDesignView design={weld} stale={stale} />}
              {metal && weld && view === 'cuts' && <WeldCuts design={weld} stale={stale} />}
              {metal && weld && view === 'steps' && <WeldSteps design={weld} stale={stale} />}
              {metal && weld && view === 'order' && (
                <WeldShopping design={weld} title={weldTemplate.name} stale={stale} />
              )}
            </div>
          </main>
        </div>
      </div>
      {metal ? <WeldPrintReport design={weld} title={weldTemplate.name} /> : <PrintReport design={design} />}
    </>
  );
}

/** What the design asks of the lumber yard, at a glance under the stage. */
function WoodSummary({ design }: { design: Design }) {
  const layout = useMemo(() => nest(design.panels), [design]);
  const cuts = cutTotals(layout);
  const band = edgeBandTotals(design.panels).reduce((m, t) => m + t.meters, 0);
  const sheet = layout.sheets[0]?.stock.sheet;
  const cells = [
    { label: 'Hojas', value: String(layout.sheets.length), unit: sheet ? `de ${sheet.width} × ${sheet.length}` : '' },
    { label: 'Piezas', value: String(design.panels.reduce((n, p) => n + p.qty, 0)), unit: '' },
    { label: 'Cortes', value: String(cuts.count), unit: `${cuts.meters.toFixed(1)} m` },
    { label: 'Cubrecanto', value: design.edgeBanding === 'none' ? '—' : `${band.toFixed(1)} m`, unit: '' },
  ];
  return (
    <dl className="grid shrink-0 grid-cols-4 divide-x divide-rule border-t border-rule bg-panel">
      {cells.map((c) => (
        <div key={c.label} className="flex min-w-0 flex-col-reverse px-3 py-2.5 lg:px-5 lg:py-3">
          <dt className="truncate text-xs font-semibold text-ink-faint">
            {c.label}
            {c.unit && <span className="hidden font-normal sm:inline"> · {c.unit}</span>}
          </dt>
          <dd className="whitespace-nowrap font-mono text-lg font-bold lg:text-xl">{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The Cut Once mark: one board, one saw cut, and the cut is the numeral 1. Drawn from brand/cut-once. */
function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <svg viewBox="0 0 256 256" className="h-8 w-8" aria-hidden>
        <rect width="256" height="256" rx="56" fill="var(--color-accent)" />
        <path fill="#fff" d="M64 44.8H122L83.6 83.2L101.28 100.88L122 80.24V211.2H64A19.2 19.2 0 0 1 44.8 192V64A19.2 19.2 0 0 1 64 44.8Z" />
        <path fill="var(--color-hi)" d="M146.8 44.8H192A19.2 19.2 0 0 1 211.2 64V192A19.2 19.2 0 0 1 192 211.2H146.8Z" />
      </svg>
      {/* The kit's outlined wordmark, so the name keeps its own lettering whatever face the UI speaks. */}
      <svg viewBox="22 20 723 120" className="hidden h-[16px] w-auto sm:block" role="img" aria-label="Cut Once">
        <path fill="currentColor" d="M81.0 138.0Q63.4 138.0 50.6 131.1Q37.7 124.1 30.9 111.1Q24.0 98.1 24.0 80.0Q24.0 62.2 31.0 49.2Q38.1 36.2 51.0 29.1Q63.9 22.0 81.5 22.0Q97.8 22.0 109.7 29.1Q121.6 36.2 128.1 48.1L102.8 57.4Q99.1 50.7 92.9 48.1Q86.7 45.5 80.7 45.5Q73.3 45.5 67.3 49.6Q61.4 53.7 57.9 61.4Q54.3 69.1 54.3 80.0Q54.3 91.2 57.9 98.9Q61.4 106.7 67.5 110.6Q73.6 114.5 81.0 114.5Q84.7 114.5 89.0 113.6Q93.2 112.7 97.3 110.2Q101.3 107.7 103.8 102.8L128.8 112.0Q121.9 123.9 109.5 131.0Q97.1 138.0 81.0 138.0ZM168.0 138.0Q156.8 138.0 150.3 133.9Q143.9 129.8 141.3 121.8Q138.7 113.9 138.7 102.3L138.7 52.8L166.3 52.8L166.3 95.4Q166.3 101.3 166.9 106.2Q167.4 111.0 169.8 114.0Q172.2 116.9 178.3 116.9Q186.0 116.9 188.9 112.2Q191.8 107.5 191.8 96.3L191.8 52.8L219.5 52.8L219.5 136.0L195.4 136.0L191.8 124.3Q188.1 130.5 182.8 134.2Q177.4 138.0 168.0 138.0ZM272.1 136.0Q261.4 136.0 255.0 134.2Q248.7 132.3 245.9 127.2Q243.1 122.1 243.1 112.0L243.1 73.8L229.4 73.8L229.4 52.8L243.1 52.8L243.1 32.0L270.8 32.0L270.8 52.8L288.9 52.8L288.9 73.8L270.8 73.8L270.8 104.5Q270.8 110.2 273.2 111.9Q275.7 113.7 281.9 113.7L288.9 113.7L288.9 136.0ZM399.7 138.0Q382.4 138.0 369.1 130.8Q355.9 123.6 348.4 110.6Q341.0 97.6 341.0 80.0Q341.0 62.4 348.4 49.4Q355.9 36.4 369.1 29.2Q382.4 22.0 399.7 22.0Q416.9 22.0 430.2 29.2Q443.4 36.4 450.9 49.4Q458.3 62.4 458.3 80.0Q458.3 97.6 450.9 110.6Q443.4 123.6 430.2 130.8Q416.9 138.0 399.7 138.0ZM399.7 114.5Q407.4 114.5 413.7 110.7Q420.1 106.8 424.0 99.1Q427.8 91.4 427.8 80.0Q427.8 68.6 424.0 60.9Q420.1 53.2 413.7 49.3Q407.4 45.5 399.7 45.5Q391.9 45.5 385.6 49.3Q379.2 53.2 375.3 60.9Q371.5 68.6 371.5 80.0Q371.5 91.4 375.3 99.1Q379.2 106.8 385.6 110.7Q391.9 114.5 399.7 114.5ZM471.6 136.0L471.6 52.8L496.2 52.8L499.2 63.6Q501.1 60.7 504.7 57.6Q508.3 54.5 513.5 52.4Q518.7 50.3 524.9 50.3Q535.1 50.3 541.3 54.0Q547.5 57.7 550.4 65.0Q553.2 72.3 553.2 82.9L553.2 136.0L525.6 136.0L525.6 88.6Q525.6 82.7 524.3 78.9Q523.1 75.1 520.5 73.3Q517.9 71.4 513.7 71.4Q506.0 71.4 502.6 77.1Q499.2 82.9 499.2 93.7L499.2 136.0ZM609.1 138.0Q595.0 138.0 585.3 132.5Q575.7 126.9 570.8 117.0Q565.8 107.0 565.8 93.7Q565.8 80.5 571.3 70.8Q576.7 61.1 586.3 55.7Q596.0 50.3 608.7 50.3Q615.8 50.3 623.1 52.3Q630.5 54.2 637.0 59.0Q643.4 63.7 647.5 72.6L624.7 81.0Q622.8 75.6 619.0 73.5Q615.1 71.4 610.7 71.4Q606.6 71.4 602.6 73.5Q598.7 75.6 596.2 80.5Q593.8 85.4 593.8 93.9Q593.8 102.6 596.3 107.7Q598.8 112.7 602.7 114.8Q606.6 116.9 610.7 116.9Q615.8 116.9 619.2 115.0Q622.6 113.0 624.8 109.5L647.0 117.6Q642.6 125.6 636.1 130.0Q629.7 134.5 622.6 136.3Q615.6 138.0 609.1 138.0ZM699.9 138.0Q686.4 138.0 675.9 132.8Q665.4 127.6 659.4 117.7Q653.5 107.8 653.5 93.7Q653.5 80.5 659.7 70.8Q665.9 61.1 676.2 55.7Q686.5 50.3 698.8 50.3Q709.2 50.3 717.5 54.0Q725.8 57.7 731.5 64.5Q737.3 71.3 740.1 80.7Q742.9 90.1 742.0 101.6L680.3 101.6Q681.3 105.5 683.1 108.3Q684.9 111.2 687.3 113.1Q689.7 115.0 692.7 116.0Q695.7 116.9 699.1 116.9Q704.8 116.9 709.0 115.3Q713.2 113.7 715.4 111.0L737.0 119.1Q730.1 129.0 720.0 133.5Q709.8 138.0 699.9 138.0ZM680.2 85.5L716.9 85.5Q716.4 80.3 714.0 77.1Q711.7 73.8 707.9 72.2Q704.1 70.6 699.6 70.6Q695.1 70.6 691.1 72.1Q687.0 73.6 684.2 76.9Q681.3 80.2 680.2 85.5Z" />
      </svg>
    </div>
  );
}

/** Wood or metal: two workshops sharing one shell, one 3D viewer and one step list. */
function ModeSwitch() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  return (
    <div role="group" aria-label="Tipo de proyecto" className="flex rounded-xl bg-raised p-1">
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={active}
            className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-colors ${
              active ? 'bg-panel text-ink shadow-[0_1px_3px_rgb(20_26_43/0.16)]' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <svg viewBox="0 0 16 16" className={`h-4 w-4 ${active ? 'text-accent-ink' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
              {m.icon}
            </svg>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The four views. One tablist: tabs in the top bar on a desk, a thumb-reach bar
 * along the bottom on a phone. Arrows and Home/End move between views.
 */
function ViewTabs() {
  const mode = useAppStore((s) => s.mode);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const ids = TABS[mode].map((t) => t.id);
    const i = ids.indexOf(view);
    const moves: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: ids.length - 1 };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const id = ids[(next + ids.length) % ids.length]!;
    setView(id);
    document.getElementById(`tab-${id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Vistas"
      onKeyDown={onKey}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-rule bg-panel pb-[env(safe-area-inset-bottom)] lg:static lg:h-full lg:gap-7 lg:border-0 lg:bg-transparent lg:pb-0"
    >
      {TABS[mode].map((tab) => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={active}
            aria-controls="view-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => setView(tab.id)}
            className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-bold transition-colors lg:h-full lg:flex-none lg:flex-row lg:border-b-2 lg:text-[15px] ${
              active
                ? 'text-accent-ink lg:border-accent lg:text-ink'
                : 'text-ink-soft hover:text-ink lg:border-transparent'
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5 lg:hidden" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {ICONS[tab.id]}
            </svg>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Paper by day, ink-blue by night. Print is always paper. */
function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const label = `Cambiar a tema ${theme === 'dark' ? 'claro' : 'oscuro'}`;

  return (
    <button
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule text-ink-soft transition-colors hover:border-rule-strong hover:text-ink"
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        {theme === 'dark' ? (
          <>
            <circle cx="10" cy="10" r="3.6" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line key={a} x1="10" y1="2" x2="10" y2="3.8" transform={`rotate(${a} 10 10)`} />
            ))}
          </>
        ) : (
          <path d="M16.2 12.4A6.8 6.8 0 0 1 7.6 3.8a6.9 6.9 0 1 0 8.6 8.6Z" />
        )}
      </svg>
    </button>
  );
}
