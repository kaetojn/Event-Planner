import { useAtomValue } from 'jotai';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { featuresAtom, sessionAtom } from '@/lib/store';
import { uid } from '@/lib/time';
import type { PlaceMatch } from '@/lib/types';

export interface Picked { name: string; detail: string; address?: string; lat?: number; lng?: number }

/**
 * A text field that offers matching places from Google Maps as the person types.
 * They can pick one, which also brings its address and map position, or keep what they typed.
 * Signed out, or before Google Maps is set up, it is an ordinary text field.
 */
export function PlaceField({ label, value, onText, onPick, near, placeholder, hint, autoFocus }: {
  label: string; value: string; onText: (text: string) => void; onPick: (place: Picked) => void;
  near?: { lat: number; lng: number }; placeholder?: string; hint?: string; autoFocus?: boolean;
}) {
  const session = useAtomValue(sessionAtom);
  const { places } = useAtomValue(featuresAtom);
  const live = !!session && places;
  const [matches, setMatches] = useState<PlaceMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Google groups the keystrokes of one search, and the pick that ends it, under one token.
  const token = useRef(uid());
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!live || !typed.current || value.trim().length < 3) { setMatches([]); return; }
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const r = await api.autocomplete(session!.token, value.trim(), token.current, near);
        if (current) { setMatches(r.matches); setOpen(true); setActive(-1); }
      } catch { if (current) setMatches([]); }
    }, 280);
    return () => { current = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, live]);

  const pick = async (m: PlaceMatch) => {
    typed.current = false;
    setOpen(false); setMatches([]);
    onPick({ name: m.name, detail: m.detail });
    const used = token.current;
    token.current = uid();
    try { const d = await api.place(session!.token, m.id, used); onPick({ name: m.name, detail: m.detail, ...d }); } catch { /* the name alone is still useful */ }
  };

  const showing = open && matches.length > 0;
  return (
    <div className="relative flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{label}</span>
        <input
          value={value} placeholder={placeholder} autoFocus={autoFocus} autoComplete="off" enterKeyHint="done"
          role={live ? 'combobox' : undefined} aria-expanded={live ? showing : undefined} aria-controls={live ? listId : undefined} aria-autocomplete={live ? 'list' : undefined}
          aria-activedescendant={showing && active >= 0 ? `${listId}-${active}` : undefined}
          onChange={e => { typed.current = true; onText(e.target.value); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => {
            if (!showing) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % matches.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + matches.length) % matches.length); }
            else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); void pick(matches[active]); }
            else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
          }}
          className="h-12 w-full rounded-xl border border-edge bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </label>
      {showing && (
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="absolute inset-x-0 top-[78px] z-20 animate-fade overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          {matches.map((m, n) => (
            <li key={m.id} id={`${listId}-${n}`} role="option" aria-selected={n === active} className={n === active ? 'bg-tint' : undefined}>
              {/* onMouseDown keeps the field from losing focus before the pick registers */}
              <button type="button" tabIndex={-1} onMouseDown={e => e.preventDefault()} onClick={() => void pick(m)} className="flex min-h-[52px] w-full flex-col justify-center border-b border-line px-3 py-2 text-left">
                <span className="text-[15px] font-semibold">{m.name}</span>
                {m.detail && <span className="text-[13px] text-muted">{m.detail}</span>}
              </button>
            </li>
          ))}
          <li className="px-3 py-2 text-[11px] text-muted" aria-hidden="true">Suggestions from Google Maps</li>
        </ul>
      )}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </div>
  );
}
