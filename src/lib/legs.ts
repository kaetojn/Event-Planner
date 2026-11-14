import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { api } from './api';
import { featuresAtom, sessionAtom } from './store';
import type { Item, Travel } from './types';

/** Travel times already looked up, kept while the app is open. null means it was asked and there was no answer. */
const known = new Map<string, number | null>();
const keyOf = (a: Item, b: Item, mode: Travel) => `${mode}:${a.lat},${a.lng}>${b.lat},${b.lng}`;
const located = (i: Item) => typeof i.lat === 'number' && typeof i.lng === 'number';

export const TRAVEL_WORD: Record<Travel, string> = { drive: 'drive', walk: 'walk', transit: 'by transit' };

/**
 * Minutes of travel between neighbouring items that both have a place from the map.
 * Returns a lookup; it answers null until the time has arrived, or when it cannot be worked out.
 */
export function useLegs(items: Item[], mode: Travel) {
  const session = useAtomValue(sessionAtom);
  const { places } = useAtomValue(featuresAtom);
  const [, redraw] = useState(0);
  const pairs = items.slice(0, -1).map((a, n) => [a, items[n + 1]] as const).filter(([a, b]) => located(a) && located(b));
  const missing = pairs.filter(([a, b]) => !known.has(keyOf(a, b, mode)));
  const wanted = missing.map(([a, b]) => keyOf(a, b, mode)).join('|');

  useEffect(() => {
    if (!session || !places || !wanted) return;
    let live = true;
    void (async () => {
      for (const [a, b] of missing) {
        const key = keyOf(a, b, mode);
        if (known.has(key)) continue;
        known.set(key, null);
        try {
          const r = await api.route(session.token, [{ lat: a.lat!, lng: a.lng! }, { lat: b.lat!, lng: b.lng! }], mode);
          known.set(key, r.legs[0]?.mins ?? null);
        } catch { known.delete(key); break; }
      }
      if (live) redraw(n => n + 1);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, session?.token, places]);

  return (a: Item, b: Item) => (located(a) && located(b) ? known.get(keyOf(a, b, mode)) ?? null : null);
}
