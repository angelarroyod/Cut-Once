import type { ReactNode } from 'react';
import { templates, weldTemplates } from '../engine/index.ts';
import { useAppStore } from '../state/store.ts';

/** Front elevations drawn in one 1.5 px stroke on a 40 px square, one per template id. */
const THUMBS: Record<string, ReactNode> = {
  bookshelf: <path d="M11 4h18v32H11zM11 12h18M11 20h18M11 28h18" />,
  'side-table': <path d="M6 12h28M9 12v22M31 12v22M9 28h22" />,
  closet: <path d="M8 4h24v32H8zM20 4v32M8 9h24M12 14h4m8 0h4M8 31h24" />,
  'tv-stand': <path d="M4 14h32v16H4zM20 14v16M8 22h8M24 22h8M7 30v4m26-4v4" />,
  pantry: <path d="M12 4h16v32H12zM12 22h16M12 33h16M25 17v3M25 24v3" />,
  desk: <path d="M3 12h34M5 12v24M35 12v24M23 12v24M23 22h12M23 30h12M27 17h4" />,
  'bed-base': <path d="M3 16h34v14H3zM20 16v14M8 23h7M25 23h7M3 16v-6h4v6" />,
  'shoe-rack': <path d="M8 4h24v30H8zM8 12h24M8 20h24M8 28h24M11 34v2M29 34v2" />,
  'floating-shelves': <path d="M6 8h28v5H6zM6 20h28v5H6zM6 32h28v5H6z" />,
  'weld-table': <path d="M4 13h32M4 15.5h32M7 15.5v20M33 15.5v20M7 29h26" />,
  'weld-stool': <path d="M11 10h18M11 12.5h18M13 12.5v24M27 12.5v24M13 26h14" />,
  'weld-shelf': <path d="M9 4v32M31 4v32M9 6h22M9 16h22M9 26h22M9 34h22" />,
};

export function TemplatePicker() {
  const metal = useAppStore((s) => s.mode === 'metal');
  const templateId = useAppStore((s) => (metal ? s.weldTemplateId : s.templateId));
  const setTemplate = useAppStore((s) => s.setTemplate);
  const items = metal ? weldTemplates : templates;

  return (
    <section>
      <h2 className="rule-label">Plantilla</h2>
      {/* A chip row on phones keeps the sizes right under the stage. On a desk the list is
          written on the page's ruled lines, not boxed: the chosen one is ticked in the margin. */}
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:mt-1 lg:block lg:divide-y lg:divide-rule lg:overflow-visible lg:px-0">
        {items.map((t) => {
          const active = t.id === templateId;
          return (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              aria-pressed={active}
              className={`group flex shrink-0 items-center gap-2.5 rounded-lg border p-1.5 pr-3.5 text-left transition-colors lg:-mx-2 lg:w-[calc(100%+1rem)] lg:gap-3 lg:rounded-md lg:border-0 lg:px-2 lg:py-3 ${
                active ? 'border-accent bg-accent-tint lg:bg-transparent' : 'border-rule lg:hover:bg-raised'
              }`}
            >
              <svg
                viewBox="0 0 40 40"
                className={`h-10 w-10 shrink-0 lg:h-11 lg:w-11 ${active ? 'text-accent-ink' : 'text-ink-faint group-hover:text-ink-soft'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                aria-hidden
              >
                {THUMBS[t.id]}
              </svg>
              <span className="min-w-0 flex-1">
                <span
                  className={`block whitespace-nowrap text-sm font-bold leading-snug lg:whitespace-normal lg:text-[15px] ${
                    active ? 'text-accent-ink' : ''
                  }`}
                >
                  {t.name}
                </span>
                <span className="mt-0.5 hidden text-[13px] leading-snug text-ink-soft lg:block">{t.description}</span>
              </span>
              {/* The ballpoint tick: desk only, the phone chip already carries the wash. */}
              <svg
                viewBox="0 0 20 20"
                className={`hidden h-5 w-5 shrink-0 self-start text-accent-ink lg:block ${active ? '' : 'invisible'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 10.5l3.8 3.8L16 5.5" />
              </svg>
            </button>
          );
        })}
      </div>
    </section>
  );
}
