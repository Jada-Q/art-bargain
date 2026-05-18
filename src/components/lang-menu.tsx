'use client';

import { useEffect, useRef, useState } from 'react';
import { setLocaleAction } from '@/app/i18n-action';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';

export function LangMenu({ current }: { current: Locale }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="border-border bg-background absolute top-full right-0 z-50 mt-2 min-w-[180px] border py-2 shadow-sm"
        >
          <p className="text-muted-foreground tracking-label px-4 py-2 text-[9px] uppercase">
            Language
          </p>
          {LOCALES.map((loc) => (
            <form key={loc} action={setLocaleAction}>
              <input type="hidden" name="locale" value={loc} />
              <button
                type="submit"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={
                  'hover:bg-muted/60 flex w-full items-center justify-between px-4 py-2 text-left text-[12px] transition-colors ' +
                  (current === loc ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                <span>{LOCALE_LABELS[loc]}</span>
                {current === loc ? (
                  <span aria-hidden="true" className="text-gallery-accent">
                    ·
                  </span>
                ) : null}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
