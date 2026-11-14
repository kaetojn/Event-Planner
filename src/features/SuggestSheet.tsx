import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { Button, Eyebrow, Sheet } from '@/components/ui';
import { api } from '@/lib/api';
import { push, saveItem, sessionAtom } from '@/lib/store';
import { clock, longDay, money, uid } from '@/lib/time';
import type { Day, Plan, Suggestion } from '@/lib/types';

/** Ideas from Claude for a stretch of open time. Each one can be added to the day with a tap. */
export function SuggestSheet({ plan, day, from, to, onClose }: { plan: Plan; day: Day; from: string; to: string; onClose: () => void }) {
  const session = useAtomValue(sessionAtom);
  const [wish, setWish] = useState('');
  const [state, setState] = useState<{ suggestions: Suggestion[]; grounded: boolean } | { error: string } | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  const ask = async (want = '') => {
    setState(null); setAdded([]);
    try {
      await push(); // the server reads the saved plan, so make sure it has the latest
      setState(await api.suggest(session!.token, { planId: plan.id, date: day.date, from, to, wish: want || undefined }));
    } catch (e) { setState({ error: (e as Error).message }); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void ask(); }, []);

  const add = (s: Suggestion) => {
    saveItem(plan.id, day.date, { id: uid(), title: s.title, start: s.start, end: s.end, place: s.place, address: s.address, lat: s.lat, lng: s.lng, cost: s.cost, status: 'todo' });
    setAdded(a => [...a, s.title + s.start]);
  };

  const left = state && 'suggestions' in state ? state.suggestions.filter(s => !added.includes(s.title + s.start)) : [];

  return (
    <Sheet title="Suggestions" onClose={onClose} footer={left.length === 0 && added.length ? <Button variant="primary" className="flex-1" onClick={onClose}>Done</Button> : left.length ? <>
      {left.length > 1 && <Button className="flex-1" onClick={() => left.forEach(add)}>Add all {left.length}</Button>}
      {added.length > 0 && <Button variant="primary" className="flex-1" onClick={onClose}>Done</Button>}
    </> : undefined}>
      <Eyebrow>{longDay(day.date)} · {clock(from)} to {clock(to)}</Eyebrow>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void ask(wish.trim()); }}>
        <input aria-label="Anything in mind?" value={wish} onChange={e => setWish(e.target.value)} placeholder="Anything in mind? A rooftop bar, a gallery" className="h-12 flex-1 rounded-xl border border-edge bg-surface px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        <Button type="submit" className="h-12" disabled={!state}>{wish.trim() ? 'Find' : 'Again'}</Button>
      </form>

      {!state && (
        <div className="flex flex-col gap-3 pb-2" role="status">
          <p className="text-[15px] text-muted">Looking for things that suit you. This takes a few seconds.</p>
          {[0, 1, 2].map(n => <div key={n} className="h-28 animate-pulse rounded-2xl bg-line" style={{ animationDelay: `${n * 150}ms` }} />)}
        </div>
      )}
      {state && 'error' in state && <p className="py-2 text-[15px] font-medium text-bad" role="alert">{state.error}</p>}
      {state && 'suggestions' in state && (
        <div className="flex flex-col gap-3 pb-3">
          {!state.suggestions.length && <p className="py-2 text-[15px] text-muted">Nothing suitable came back for this stretch of time. Try describing what you have in mind.</p>}
          {state.suggestions.map(s => {
            const done = added.includes(s.title + s.start);
            return (
              <div key={s.title + s.start} className="flex animate-rise flex-col gap-2.5 rounded-2xl border border-line bg-surface p-[18px]">
                <div className="num text-[13px] font-semibold">{clock(s.start)}{s.end ? ` to ${clock(s.end)}` : ''}{s.cost ? <span className="font-normal text-muted"> · about {money(s.cost)}</span> : null}</div>
                <div className="font-serif text-2xl leading-tight font-semibold">{s.title}</div>
                {s.place && <div className="text-[13px] text-muted">{s.place}{s.address ? `, ${s.address}` : ''}{s.rating ? ` · rated ${s.rating} on Google` : ''}</div>}
                {s.why && <p className="text-[15px] leading-snug">{s.why}</p>}
                <Button variant={done ? 'secondary' : 'soft'} className="self-start" disabled={done} onClick={() => add(s)}>{done ? 'Added' : 'Add to the day'}</Button>
              </div>
            );
          })}
          {state.suggestions.length > 0 && <p className="text-[13px] leading-relaxed text-muted">{state.grounded ? 'Places come from Google Maps. Times and costs are estimates, so check opening hours before you go.' : 'These come from Claude’s general knowledge and have not been checked against a map. Confirm each place exists and is open before you rely on it.'}</p>}
        </div>
      )}
    </Sheet>
  );
}
