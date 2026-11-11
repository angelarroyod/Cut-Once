import { useEffect, useState } from 'react';

const STATUS_HOLD = 2500; // ms "Copiado" stays before clearing

/**
 * Compartir (Web Share, where the browser has it) and Copiar for a plain-text
 * order or shopping list. The status line is always mounted so screen readers
 * hear each change, and it clears itself.
 */
export function ShareActions({ title, text, disabled }: { title: string; text: string; disabled: boolean }) {
  const [status, setStatus] = useState('');
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), STATUS_HOLD);
    return () => clearTimeout(t);
  }, [status]);

  async function share() {
    try {
      await navigator.share({ title, text });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setStatus('No se pudo compartir');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copiado');
    } catch {
      setStatus('No se pudo copiar');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span role="status" className="text-[13px] font-semibold text-ink-soft">
        {status}
      </span>
      {canShare && (
        <button
          onClick={share}
          disabled={disabled}
          className="h-10 rounded-lg bg-accent px-4 text-sm font-bold text-white shadow-[0_1px_2px_rgb(20_26_43/0.2)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
        >
          Compartir
        </button>
      )}
      <button
        onClick={copy}
        disabled={disabled}
        className="h-10 rounded-lg border border-rule bg-panel px-4 text-sm font-bold text-ink transition-colors hover:border-rule-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-rule"
      >
        Copiar
      </button>
    </div>
  );
}
