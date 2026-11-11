/**
 * Shown over a view that is holding the last valid design while the params are
 * invalid. The caller dims its content, never this pill, so the message stays
 * at full contrast; `className` places it (absolute over a stage, sticky atop a
 * scrolling panel). The errors themselves are read out by ParamForm.
 */
export function StalePill({ className }: { className: string }) {
  return (
    <div className={`pointer-events-none z-20 flex justify-center px-4 ${className}`}>
      <span className="rounded-full bg-cut-tint px-3.5 py-1.5 text-[13px] font-semibold text-cut-ink shadow-[0_1px_4px_rgb(20_26_43/0.12)]">
        Corrige los errores para actualizar el modelo
      </span>
    </div>
  );
}

/** Sticky placement for a scrolling panel: clears the phone's top bar, takes no room. */
export const STALE_STICKY = 'sticky top-20 h-0 items-start lg:top-4';
