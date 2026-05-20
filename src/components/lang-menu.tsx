'use client';

import { useEffect, useRef, useState } from 'react';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';

export function LangMenu({ current }: { current: Locale }) {
  const [open, setOpen] = useState(false);
  const [pathname, setPathname] = useState('/');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Capture current URL so the server redirects back here after setting cookie.
    setPathname(window.location.pathname + window.location.search);
  }, []);

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
          className="border-border bg-background absolute top-full right-0 z-50 mt-2 min-w-[88px] border py-1"
        >
          {LOCALES.map((loc) => (
            <form key={loc} method="POST" action="/api/locale">
              <input type="hidden" name="locale" value={loc} />
              <input type="hidden" name="next" value={pathname} />
              <button
                type="submit"
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-current={current === loc ? 'true' : undefined}
                className={
                  'hover:bg-muted/60 tracking-label flex w-full items-center gap-2 px-3 py-1 text-left text-[10px] uppercase transition-colors ' +
                  (current === loc ? 'text-foreground' : 'text-muted-foreground')
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    'text-gallery-accent inline-block w-1.5 text-center leading-none ' +
                    (current === loc ? 'opacity-100' : 'opacity-0')
                  }
                >
                  ·
                </span>
                <span>{LOCALE_LABELS[loc]}</span>
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
