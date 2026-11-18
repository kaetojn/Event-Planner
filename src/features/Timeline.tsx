import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { PlaceField } from '@/components/PlaceField';
import { Button, Check, Eyebrow, Field, Segmented, Sheet, useSwipe } from '@/components/ui';
import { TRAVEL_WORD, useLegs } from '@/lib/legs';
import { featuresAtom, patchItem, removeItem, saveItem, sessionAtom } from '@/lib/store';
import { clashes, clock, gapBetween, longDay, money, ordered, partOf, span, toMin, uid } from '@/lib/time';
import { PARTS, type Day, type Item, type Part, type Plan } from '@/lib/types';
import { SuggestSheet } from './SuggestSheet';

const hhmm = (mins: number) => { const m = Math.max(0, Math.min(23 * 60 + 59, mins)); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

/** One day of the plan, in order, with the time between items and the travel between places worked out. */
export function Timeline({ plan, day, onAdd }: { plan: Plan; day: Day; onAdd: () => void }) {
  const session = useAtomValue(sessionAtom);
  const features = useAtomValue(featuresAtom);
  const [editing, setEditing] = useState<Item | null>(null);
  const [window, setWindow] = useState<{ from: string; to: string } | null>(null);
  const items = ordered(day.items);
  const mode = plan.travel ?? 'drive';
  const legOf = useLegs(items, mode);
  const canSuggest = !!session && features.ai;
  const suggest = window && <SuggestSheet plan={plan} day={day} from={window.from} to={window.to} onClose={() => setWindow(null)} />;

  if (!items.length) {
    return (
      <section className="flex animate-rise flex-col gap-4 pt-7">
        <Eyebrow>{longDay(day.date)}</Eyebrow>
        <p className="font-serif text-[28px] leading-tight font-medium">Nothing planned for this day yet.</p>
        <div className="flex flex-wrap gap-2">
          {canSuggest && <Button variant="primary" onClick={() => setWindow({ from: '09:00', to: '21:00' })}>Suggest a day</Button>}
          <Button variant="soft" onClick={onAdd}>Add the first thing</Button>
        </div>
        {suggest}
      </section>
    );
  }

  const last = items[items.length - 1];
  const lastEnds = last.start ? toMin(last.end ?? last.start) + (last.end ? 0 : 60) : null;

  return (
    <section key={day.date} className="flex flex-col pt-5">
      {items.map((item, n) => {
        const next = items[n + 1];
        const gap = next ? gapBetween(item, next) : null;
        const leg = next ? legOf(item, next) : null;
        const tight = !!gap && leg !== null && leg > gap.mins;
        const travel = leg ? (tight ? `${span(leg)} ${TRAVEL_WORD[mode]}, but only ${span(gap!.mins)} between them` : `${span(leg)} ${TRAVEL_WORD[mode]}${next.start ? ` · leave by ${clock(hhmm(toMin(next.start) - leg))}` : ''}`) : null;
        return (
          <div key={item.id} className="animate-rise" style={{ animationDelay: `${Math.min(n, 6) * 40}ms` }}>
            <Row item={item} clash={!!next && clashes(item, next) ? next.title : undefined} onOpen={() => setEditing(item)} onStatus={status => patchItem(plan.id, day.date, item.id, { status })} />
            {gap && gap.free && gap.mins >= 120 ? (
              <div className="my-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
                <div className="flex flex-col gap-1">
                  <Eyebrow>Open time</Eyebrow>
                  <div className="font-serif text-[22px] leading-tight font-medium">{span(gap.mins)} free before {next.title}</div>
                  {travel && <div className="text-[13px] text-muted">{travel}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canSuggest && <Button variant="soft" onClick={() => setWindow({ from: item.end!, to: next.start! })}>Suggest something nearby</Button>}
                  <Button variant={canSuggest ? 'secondary' : 'soft'} onClick={onAdd}>Add something</Button>
                </div>
              </div>
            ) : gap || travel ? (
              <div className={clsx('flex min-h-11 items-center gap-2.5 py-2 pl-20 text-xs', tight ? 'font-medium text-bad' : 'text-muted')}>
                <span className="w-5 shrink-0 border-t border-dashed border-ring" />
                <span>{tight ? travel : [gap && (gap.free ? `${span(gap.mins)} free` : `${span(gap.mins)} until ${next.title}`), travel].filter(Boolean).join(' · ')}</span>
              </div>
            ) : next ? <div className="h-5" /> : null}
          </div>
        );
      })}
      {canSuggest && lastEnds !== null && lastEnds <= 20 * 60 && (
        <Button variant="soft" className="mt-6 self-start" onClick={() => setWindow({ from: hhmm(lastEnds), to: '22:00' })}>Suggest something for later</Button>
      )}
      {editing && <ItemSheet plan={plan} day={day} item={editing} onClose={() => setEditing(null)} />}
      {suggest}
    </section>
  );
}

function Row({ item, clash, onOpen, onStatus }: { item: Item; clash?: string; onOpen: () => void; onStatus: (s: Item['status']) => void }) {
  const done = item.status === 'done', skipped = item.status === 'skipped';
  const swipe = useSwipe(() => onStatus(done ? 'todo' : 'done'), () => onStatus(skipped ? 'todo' : 'skipped'));
  const details = [item.place, item.start && item.end ? span(toMin(item.end) - toMin(item.start)) : null, item.cost ? money(item.cost) : null, skipped ? 'Skipped' : null].filter(Boolean);
  return (
    <div {...swipe} className="flex items-start gap-4">
      <div className={clsx('num w-16 shrink-0 pt-1.5 text-[13px]', done || skipped ? 'text-muted' : 'font-semibold')}>
        {item.start ? clock(item.start) : PARTS.find(p => p.id === item.part)?.label}
        {item.end && <div className="pt-0.5 font-normal text-muted">{clock(item.end)}</div>}
      </div>
      <button type="button" onClick={onOpen} className="-mx-2 flex flex-1 flex-col gap-0.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20">
        <span className={clsx('font-serif text-2xl leading-[1.15] transition-colors', done ? 'font-medium text-muted line-through' : skipped ? 'font-medium text-muted' : 'font-semibold')}>{item.title}</span>
        {details.length > 0 && <span className="text-[13px] text-muted">{details.join(' · ')}</span>}
        {item.note && <span className="text-[13px] text-muted">{item.note}</span>}
        {clash && <span className="text-[13px] font-medium text-bad">Runs into {clash}</span>}
      </button>
      <div className="-mt-1.5">
        <Check state={item.status} label={done ? `Mark ${item.title} as not done` : `Mark ${item.title} as done`} onClick={() => { navigator.vibrate?.(10); onStatus(done || skipped ? 'todo' : 'done'); }} />
      </div>
    </div>
  );
}

/** Add or change one item. A new item starts an hour after the last one in the day. */
export function ItemSheet({ plan, day, item, onClose }: { plan: Plan; day: Day; item?: Item; onClose: () => void }) {
  const lastTimed = ordered(day.items).filter(i => i.start).pop();
  const [title, setTitle] = useState(item?.title ?? '');
  const [when, setWhen] = useState<'time' | 'part'>(item ? (item.start ? 'time' : 'part') : plan.detail === 'loose' ? 'part' : 'time');
  const [start, setStart] = useState(item?.start ?? (lastTimed ? hhmm(Math.min(23 * 60 + 30, toMin(lastTimed.end ?? lastTimed.start!) + (lastTimed.end ? 30 : 60))) : '09:00'));
  const [end, setEnd] = useState(item?.end ?? '');
  const [part, setPart] = useState<Part>(item?.part ?? (lastTimed ? partOf(toMin(lastTimed.start!)) : 'morning'));
  const [place, setPlace] = useState(item?.place ?? '');
  // The address and map position stay only while the place is the one that was picked from the search.
  const [spot, setSpot] = useState<{ address?: string; lat?: number; lng?: number }>(item ? { address: item.address, lat: item.lat, lng: item.lng } : {});
  const [cost, setCost] = useState(item?.cost ? String(item.cost) : '');
  const [note, setNote] = useState(item?.note ?? '');
  const step = plan.detail === 'half' ? 1800 : 300;
  const badEnd = when === 'time' && !!end && end <= start;
  const save = () => {
    saveItem(plan.id, day.date, {
      id: item?.id ?? uid(), title: title.trim(), status: item?.status ?? 'todo',
      ...(when === 'time' ? { start, end: end || undefined } : { part }),
      place: place.trim() || undefined, ...(place.trim() ? spot : {}), cost: +cost > 0 ? +cost : undefined, note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Sheet
      title={item ? 'Edit' : 'Add to the day'}
      onClose={onClose}
      footer={<>
        {item && <Button variant="danger" onClick={() => { removeItem(plan.id, day.date, item.id); onClose(); }}>Remove</Button>}
        <Button variant="primary" className="flex-1" disabled={!title.trim() || badEnd} onClick={save}>{item ? 'Save' : 'Add'}</Button>
      </>}
    >
      <Eyebrow>{longDay(day.date)}</Eyebrow>
      <Field label="What" value={title} onChange={e => setTitle(e.target.value)} placeholder="Dinner, check-in, a flight" autoFocus={!item} />
      <Segmented label="When" value={when} onChange={setWhen} options={[{ id: 'time', label: 'At a set time' }, { id: 'part', label: 'Part of the day' }]} />
      {when === 'time' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" type="time" step={step} value={start} onChange={e => setStart(e.target.value)} />
          <Field label="Ends (optional)" type="time" step={step} value={end} onChange={e => setEnd(e.target.value)} hint={badEnd ? 'Must be after the start' : undefined} />
        </div>
      ) : (
        <Segmented label="Part of the day" value={part} onChange={setPart} options={PARTS} />
      )}
      <PlaceField label="Where (optional)" value={place} placeholder="Name or address" hint={spot.address} near={plan.at}
        onText={text => { setPlace(text); setSpot({}); }}
        onPick={p => { setPlace(p.name); setSpot({ address: p.address ?? p.detail, lat: p.lat, lng: p.lng }); }} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost (optional)" type="number" inputMode="decimal" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
        <Field label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </Sheet>
  );
}
