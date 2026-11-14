import clsx from 'clsx';
import { useState } from 'react';
import { Button, Check, Eyebrow, Field, Segmented, Sheet, useSwipe } from '@/components/ui';
import { patchItem, removeItem, saveItem } from '@/lib/store';
import { clashes, clock, gapBetween, longDay, money, ordered, partOf, span, toMin, uid } from '@/lib/time';
import { PARTS, type Day, type Item, type Part, type Plan } from '@/lib/types';

/** One day of the plan, in order, with the time between items worked out. */
export function Timeline({ plan, day, onAdd }: { plan: Plan; day: Day; onAdd: () => void }) {
  const [editing, setEditing] = useState<Item | null>(null);
  const items = ordered(day.items);

  if (!items.length) {
    return (
      <section className="flex animate-rise flex-col gap-3 pt-6">
        <Eyebrow>{longDay(day.date)}</Eyebrow>
        <p className="font-serif text-[28px] leading-tight font-medium">Nothing planned for this day yet.</p>
        <Button variant="soft" className="self-start" onClick={onAdd}>Add the first thing</Button>
      </section>
    );
  }

  return (
    <section key={day.date} className="flex flex-col pt-5">
      {items.map((item, n) => {
        const next = items[n + 1];
        const gap = next ? gapBetween(item, next) : null;
        return (
          <div key={item.id} className="animate-rise" style={{ animationDelay: `${Math.min(n, 6) * 40}ms` }}>
            <Row item={item} clash={!!next && clashes(item, next) ? next.title : undefined} onOpen={() => setEditing(item)} onStatus={status => patchItem(plan.id, day.date, item.id, { status })} />
            {gap && gap.free && gap.mins >= 120 ? (
              <div className="my-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
                <div className="flex flex-col gap-1">
                  <Eyebrow>Open time</Eyebrow>
                  <div className="font-serif text-[22px] leading-tight font-medium">{span(gap.mins)} free before {next.title}</div>
                </div>
                <Button variant="soft" className="self-start" onClick={onAdd}>Add something</Button>
              </div>
            ) : gap ? (
              <div className="flex h-11 items-center gap-2.5 pl-20 text-xs text-muted">
                <span className="w-5 border-t border-dashed border-ring" />
                {gap.free ? `${span(gap.mins)} free` : `${span(gap.mins)} until ${next.title}`}
              </div>
            ) : next ? <div className="h-5" /> : null}
          </div>
        );
      })}
      {editing && <ItemSheet plan={plan} day={day} item={editing} onClose={() => setEditing(null)} />}
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
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col gap-0.5 text-left">
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

const plus = (t: string, mins: number) => {
  const m = Math.min(23 * 60 + 30, toMin(t) + mins);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Add or change one item. A new item starts an hour after the last one in the day. */
export function ItemSheet({ plan, day, item, onClose }: { plan: Plan; day: Day; item?: Item; onClose: () => void }) {
  const lastTimed = ordered(day.items).filter(i => i.start).pop();
  const [title, setTitle] = useState(item?.title ?? '');
  const [when, setWhen] = useState<'time' | 'part'>(item ? (item.start ? 'time' : 'part') : plan.detail === 'loose' ? 'part' : 'time');
  const [start, setStart] = useState(item?.start ?? (lastTimed ? plus(lastTimed.end ?? lastTimed.start!, lastTimed.end ? 30 : 60) : '09:00'));
  const [end, setEnd] = useState(item?.end ?? '');
  const [part, setPart] = useState<Part>(item?.part ?? (lastTimed ? partOf(toMin(lastTimed.start!)) : 'morning'));
  const [place, setPlace] = useState(item?.place ?? '');
  const [cost, setCost] = useState(item?.cost ? String(item.cost) : '');
  const [note, setNote] = useState(item?.note ?? '');
  const step = plan.detail === 'half' ? 1800 : 300;
  const badEnd = when === 'time' && !!end && end <= start;

  const save = () => {
    saveItem(plan.id, day.date, {
      id: item?.id ?? uid(), title: title.trim(), status: item?.status ?? 'todo',
      ...(when === 'time' ? { start, end: end || undefined } : { part }),
      place: place.trim() || undefined, cost: +cost > 0 ? +cost : undefined, note: note.trim() || undefined,
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
      <Field label="Where (optional)" value={place} onChange={e => setPlace(e.target.value)} placeholder="Name or address" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost (optional)" type="number" inputMode="decimal" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
        <Field label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </Sheet>
  );
}
