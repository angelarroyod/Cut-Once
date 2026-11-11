import { useMemo } from 'react';
import { missingPricesText, orderCost } from '../engine/cost.ts';
import { edgeCodes } from '../engine/edge-banding.ts';
import { nest } from '../engine/nesting.ts';
import { BORING_NOTE, ORDER_BAND_NOTE, buildOrder, orderText } from '../engine/order.ts';
import type { Design } from '../engine/types.ts';
import { useAppStore } from '../state/store.ts';
import { hardwareText } from '../engine/labels.ts';
import { ShareActions } from './ShareActions.tsx';
import { STALE_STICKY, StalePill } from './StalePill.tsx';

const GRAIN_LABEL = { length: 'largo', width: 'ancho' } as const;

/** The lumber-yard order: what to ask for, shared as text, plus the full cost from the user's prices. */
export function OrderPanel({ design, title, stale }: { design: Design; title: string; stale: boolean }) {
  const order = useMemo(() => buildOrder(design, nest(design.panels), title), [design, title]);
  const text = useMemo(() => orderText(order), [order]);
  const prices = useAppStore((s) => s.prices);
  const setSheetPrice = useAppStore((s) => s.setSheetPrice);
  const setCutPrice = useAppStore((s) => s.setCutPrice);
  const setCutUnit = useAppStore((s) => s.setCutUnit);
  const setBandPrice = useAppStore((s) => s.setBandPrice);
  const setHardwarePrice = useAppStore((s) => s.setHardwarePrice);
  const setBoringPrice = useAppStore((s) => s.setBoringPrice);
  const cost = orderCost(order, prices);

  function setPriceByKey(key: string, value: number) {
    if (key.startsWith('sheet:')) setSheetPrice(Number(key.slice('sheet:'.length)), value);
    else if (key === 'cut') setCutPrice(value);
    else if (key === 'boring') setBoringPrice(value);
    else if (key.startsWith('band:')) setBandPrice(key.slice('band:'.length), value);
    else if (key.startsWith('hw:')) setHardwarePrice(key.slice('hw:'.length), value);
  }

  return (
    <div className="relative bg-paper px-4 py-5 lg:h-full lg:overflow-y-auto lg:px-8 lg:py-7">
      {stale && <StalePill className={STALE_STICKY} />}
      <div className={`mx-auto max-w-[1200px] transition-opacity duration-300 ${stale ? 'opacity-40' : ''}`}>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-2xl">Pedido para maderería</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {title} · medidas en mm, largo × ancho
            </p>
          </div>
          <ShareActions title={`Pedido — ${title}`} text={text} disabled={stale} />
        </header>

        <div className="mt-8 flex flex-col gap-10 xl:flex-row xl:items-start">
          <section className="min-w-0 flex-1 space-y-8">
            {order.groups.map((g) => (
              <div key={g.stock.id}>
                <h3 className="rule-label">
                  {g.stock.label} — {g.sheets} {g.sheets === 1 ? 'hoja' : 'hojas'}
                </h3>
                <div className="overflow-x-auto"><table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-rule-strong text-left text-xs text-ink-soft">
                      <th className="pb-1.5 font-medium">#</th>
                      <th className="pb-1.5 font-medium">Pieza</th>
                      <th className="pb-1.5 text-right font-medium">Largo</th>
                      <th className="pb-1.5 text-right font-medium">Ancho</th>
                      <th className="pb-1.5 text-right font-medium">Cant.</th>
                      <th className="pb-1.5 pl-4 font-medium">Veta</th>
                      <th className="pb-1.5 font-medium">Cubrecanto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.lines.map((l) => (
                      <tr key={l.n} className="border-b border-rule">
                        <td className="py-1.5 pr-2 font-mono text-xs tabular-nums text-ink-soft">{l.n}</td>
                        <td className="py-1.5 pr-2">{l.label}</td>
                        <td className="py-1.5 text-right font-mono text-xs tabular-nums">{l.length}</td>
                        <td className="py-1.5 text-right font-mono text-xs tabular-nums">{l.width}</td>
                        <td className="py-1.5 text-right font-mono text-xs tabular-nums">{l.qty}</td>
                        <td className="py-1.5 pl-4 text-[13px] text-ink-soft">
                          {l.grain ? GRAIN_LABEL[l.grain] : '—'}
                        </td>
                        <td className="py-1.5 font-mono text-xs text-ink-soft">{edgeCodes(l.edges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            ))}

            {order.boring.length > 0 && (
              <div>
                <h3 className="rule-label">Barrenado para bisagra</h3>
                <div className="overflow-x-auto"><table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="border-b border-rule-strong text-left text-xs text-ink-soft">
                      <th className="pb-1.5 font-medium">#</th>
                      <th className="pb-1.5 font-medium">Pieza</th>
                      <th className="pb-1.5 text-right font-medium">Cant.</th>
                      <th className="pb-1.5 text-right font-medium">Perforaciones</th>
                      <th className="pb-1.5 pl-4 font-medium">Desde arriba (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.boring.map((b) => (
                      <tr key={b.n} className="border-b border-rule">
                        <td className="py-1.5 pr-2 font-mono text-xs tabular-nums text-ink-soft">{b.n}</td>
                        <td className="py-1.5 pr-2">{b.label}</td>
                        <td className="py-1.5 text-right font-mono text-xs tabular-nums">{b.qty}</td>
                        <td className="py-1.5 text-right font-mono text-xs tabular-nums">{b.along.length}</td>
                        <td className="py-1.5 pl-4 font-mono text-xs tabular-nums">{b.along.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <p className="mt-2 text-[13px] text-ink-soft">
                  Cazoleta Ø{order.boring[0]!.diameter} mm, {order.boring[0]!.depth} mm de profundidad, centro a{' '}
                  {order.boring[0]!.fromEdge} mm del canto.{' '}
                  {BORING_NOTE}
                </p>
              </div>
            )}

            <div>
              <h3 className="rule-label">Totales</h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {order.bands.map((b) => (
                  <li key={b.label}>
                    {b.label}: <span className="font-mono tabular-nums">{b.meters.toFixed(1)} m</span>
                    {order.edgeBanding !== 'none' && (
                      <span className="text-ink-soft"> — {ORDER_BAND_NOTE[order.edgeBanding]}</span>
                    )}
                  </li>
                ))}
                <li>
                  Cortes:{' '}
                  <span className="font-mono tabular-nums">
                    {order.cuts.count} ({order.cuts.meters.toFixed(1)} m lineales)
                  </span>
                </li>
                {order.hardware.map((h, i) => (
                  <li key={i}>
                    {hardwareText(h)}: <span className="font-mono tabular-nums">× {h.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="w-full xl:w-96 xl:shrink-0">
            <h3 className="rule-label">Costo</h3>
            <p className="mt-2 text-xs text-ink-soft">Precios de tu maderería en MXN. Se guardan en este navegador.</p>
            <ul className="mt-4 space-y-3">
              {cost.lines.map((l) => (
                <li key={l.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor={`price-${l.key}`} className="text-sm">
                      {l.label}
                    </label>
                    {l.key === 'cut' && (
                      <div role="group" aria-label="Cobro del corte" className="flex gap-1">
                        {(['meter', 'cut'] as const).map((u) => (
                          <button
                            key={u}
                            onClick={() => setCutUnit(u)}
                            aria-pressed={prices.cut.unit === u}
                            className={`h-10 rounded-md border px-2.5 text-xs font-semibold transition-colors lg:h-8 ${
                              prices.cut.unit === u
                                ? 'border-accent bg-accent-tint text-accent-ink'
                                : 'border-rule bg-panel text-ink-soft hover:border-rule-strong hover:text-ink'
                            }`}
                          >
                            {u === 'meter' ? 'por metro' : 'por corte'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-soft">$</span>
                    {/* uncontrolled so values like "0.5" can be typed without the store eating the "0." */}
                    <input
                      id={`price-${l.key}`}
                      type="number"
                      min={0}
                      step="any"
                      defaultValue={l.price ?? ''}
                      onChange={(e) => setPriceByKey(l.key, Number(e.target.value) || 0)}
                      placeholder="0"
                      // 16px under lg: iOS Safari zooms the page into any smaller field on focus
                      className="h-10 w-28 rounded-md border border-rule bg-panel px-2.5 font-mono text-base tabular-nums transition-colors focus:border-accent lg:h-9 lg:text-sm"
                    />
                    <span className="text-[13px] text-ink-soft">por {l.unit}</span>
                    <span className="ml-auto font-mono text-xs tabular-nums text-ink-soft">
                      × {l.qty}
                      {l.subtotal !== null && <> = ${l.subtotal.toFixed(2)}</>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-rule pt-3 text-sm">
              Total: <strong className="font-mono text-ink">${cost.total.toFixed(2)} MXN</strong>
              {cost.missing > 0 && <span className="text-ink-soft"> ({missingPricesText(cost.missing)})</span>}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
