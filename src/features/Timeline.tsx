import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';
import { CategoryIcon } from '@/components/icons';
import { PlaceField } from '@/components/PlaceField';
import { Button, Check, Eyebrow, Field, Segmented, Sheet, useSwipe } from '@/components/ui';
import { TRAVEL_WORD, useLegs } from '@/lib/legs';
import { api } from '@/lib/api';
import { downloadItemCalendar, googleCalendarUrl } from '@/lib/calendar';
import { featuresAtom, patchItem, profileAtom, removeItem, saveItem, sessionAtom } from '@/lib/store';
import { addMinutes, clashes, clock, gapBetween, longDay, money, ordered, partOf, span, toMin, uid, zonedIso } from '@/lib/time';
import { ITEM_CATEGORIES, PARTS, type Day, type Item, type ItemCategory, type Part, type Plan } from '@/lib/types';
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
            {item.category === 'flight' && <FlightRouteHint plan={plan} item={item} />}
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

function FlightRouteHint({ plan, item }: { plan: Plan; item: Item }) {
  const session = useAtomValue(sessionAtom);
  const profile = useAtomValue(profileAtom);
  const { places } = useAtomValue(featuresAtom);
  const [route, setRoute] = useState<{ home?: number; stay?: number } | null>(null);
  const f = item.flight;
  const readyHome = !!session && places && Number.isFinite(profile.homeLat) && Number.isFinite(profile.homeLng) && Number.isFinite(f?.fromLat) && Number.isFinite(f?.fromLng) && !!item.start && !!item.startDate;
  const readyStay = !!session && places && Number.isFinite(f?.toLat) && Number.isFinite(f?.toLng) && Number.isFinite(plan.stay?.lat) && Number.isFinite(plan.stay?.lng);
  useEffect(() => {
    if (!session || (!readyHome && !readyStay)) return;
    let live = true;
    void (async () => {
      const result: { home?: number; stay?: number } = {};
      if (readyHome) {
        const guess = addMinutes(item.startDate!, item.start!, -180);
        const r = await api.route(session.token, [{ lat: profile.homeLat!, lng: profile.homeLng! }, { lat: f!.fromLat!, lng: f!.fromLng! }], 'drive', zonedIso(guess.date, guess.time, item.startZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone));
        result.home = r.legs[0]?.mins;
      }
      if (readyStay) {
        const r = await api.route(session.token, [{ lat: f!.toLat!, lng: f!.toLng! }, { lat: plan.stay!.lat!, lng: plan.stay!.lng! }], plan.travel ?? 'drive');
        result.stay = r.legs[0]?.mins;
      }
      if (live) setRoute(result);
    })().catch(() => { if (live) setRoute({}); });
    return () => { live = false; };
  }, [session?.token, readyHome, readyStay, item.startDate, item.start, item.startZone, profile.homeLat, profile.homeLng, f?.fromLat, f?.fromLng, f?.toLat, f?.toLng, plan.stay?.lat, plan.stay?.lng, plan.travel]);
  const missingHome = !Number.isFinite(profile.homeLat) || !Number.isFinite(profile.homeLng);
  const missingStay = plan.kind === 'trip' && !plan.stay?.tbd && (!Number.isFinite(plan.stay?.lat) || !Number.isFinite(plan.stay?.lng));
  const homeMins = route?.home, stayMins = route?.stay;
  if (!homeMins && !stayMins && !missingHome && !missingStay) return null;
  const leave = homeMins && item.startDate && item.start ? addMinutes(item.startDate, item.start, -(homeMins + 120)) : null;
  return <div className="ml-20 mt-2 mb-4 flex flex-col gap-1 rounded-xl bg-tint px-4 py-3 text-[13px] text-accent">
    {leave && homeMins && <span><strong>Leave home by {clock(leave.time)}</strong>{leave.date !== item.startDate ? ` on ${longDay(leave.date)}` : ''} · {span(homeMins)} drive with traffic estimate · 2 hours at the airport</span>}
    {stayMins && <span><strong>{span(stayMins)} to your stay</strong> from the arrival airport</span>}
    {missingHome && <span>Add your home address in Profile to calculate when to leave for the airport.</span>}
    {plan.stay?.tbd && <span>Your stay is marked TBD. Add it later to calculate the arrival transfer.</span>}
    {missingStay && <span>Add your hotel, rental or area in Edit to calculate the arrival transfer.</span>}
  </div>;
}

function Row({ item, clash, onOpen, onStatus }: { item: Item; clash?: string; onOpen: () => void; onStatus: (s: Item['status']) => void }) {
  const done = item.status === 'done', skipped = item.status === 'skipped';
  const swipe = useSwipe(() => onStatus(done ? 'todo' : 'done'), () => onStatus(skipped ? 'todo' : 'skipped'));
  const flight = item.flight;
  const details = [flight?.number && [flight.airline, flight.number].filter(Boolean).join(' '), flight?.from && flight?.to ? `${flight.from} to ${flight.to}` : item.place, item.startDate && item.endDate && item.endDate !== item.startDate ? `Arrives ${longDay(item.endDate)}` : item.start && item.end && (!item.endDate || item.endDate === item.startDate) ? span(toMin(item.end) - toMin(item.start)) : null, item.cost ? money(item.cost) : null, skipped ? 'Skipped' : null].filter(Boolean);
  return (
    <div {...swipe} className="flex items-start gap-4">
      <div className={clsx('num w-16 shrink-0 pt-1.5 text-[13px]', done || skipped ? 'text-muted' : 'font-semibold')}>
        {item.start ? clock(item.start) : PARTS.find(p => p.id === item.part)?.label}
        {item.end && <div className="pt-0.5 font-normal text-muted">{clock(item.end)}</div>}
      </div>
      <button type="button" onClick={onOpen} className="-mx-2 flex flex-1 flex-col gap-0.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20">
        <span className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.11em] text-brass"><CategoryIcon category={item.category} width={14} height={14} />{ITEM_CATEGORIES.find(c => c.id === (item.category ?? 'activity'))?.label}</span>
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
  const [category, setCategory] = useState<ItemCategory>(item?.category ?? 'activity');
  const [when, setWhen] = useState<'time' | 'part'>(item ? (item.start ? 'time' : 'part') : plan.detail === 'loose' ? 'part' : 'time');
  const [startDate, setStartDate] = useState(item?.startDate ?? day.date);
  const [start, setStart] = useState(item?.start ?? (lastTimed ? hhmm(Math.min(23 * 60 + 30, toMin(lastTimed.end ?? lastTimed.start!) + (lastTimed.end ? 30 : 60))) : '09:00'));
  const [endDate, setEndDate] = useState(item?.endDate ?? item?.startDate ?? day.date);
  const [end, setEnd] = useState(item?.end ?? '');
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [startZone, setStartZone] = useState(item?.startZone ?? deviceZone);
  const [endZone, setEndZone] = useState(item?.endZone ?? item?.startZone ?? deviceZone);
  const [part, setPart] = useState<Part>(item?.part ?? (lastTimed ? partOf(toMin(lastTimed.start!)) : 'morning'));
  const [place, setPlace] = useState(item?.place ?? '');
  // The address and map position stay only while the place is the one that was picked from the search.
  const [spot, setSpot] = useState<{ address?: string; lat?: number; lng?: number }>(item ? { address: item.address, lat: item.lat, lng: item.lng } : {});
  const [cost, setCost] = useState(item?.cost ? String(item.cost) : '');
  const [note, setNote] = useState(item?.note ?? '');
  const [airline, setAirline] = useState(item?.flight?.airline ?? '');
  const [flightNumber, setFlightNumber] = useState(item?.flight?.number ?? '');
  const [from, setFrom] = useState(item?.flight?.from ?? '');
  const [fromSpot, setFromSpot] = useState<{ address?: string; lat?: number; lng?: number }>({ address: item?.flight?.fromAddress, lat: item?.flight?.fromLat, lng: item?.flight?.fromLng });
  const [to, setTo] = useState(item?.flight?.to ?? '');
  const [toSpot, setToSpot] = useState<{ address?: string; lat?: number; lng?: number }>({ address: item?.flight?.toAddress, lat: item?.flight?.toLat, lng: item?.flight?.toLng });
  const step = plan.detail === 'half' ? 1800 : 300;
  const badEnd = when === 'time' && !!end && (!endDate || endDate < startDate || (endDate === startDate && end <= start));
  const effectiveTitle = title.trim() || (category === 'flight' && from.trim() && to.trim() ? `Flight ${from.trim()} to ${to.trim()}` : '');
  const save = () => {
    saveItem(plan.id, day.date, {
      id: item?.id ?? uid(), title: effectiveTitle, category, status: item?.status ?? 'todo',
      ...(when === 'time' ? { startDate, start, endDate: end ? endDate : undefined, end: end || undefined, startZone: startZone.trim() || undefined, endZone: end ? endZone.trim() || undefined : undefined } : { startDate, part }),
      place: category === 'flight' ? from.trim() || undefined : place.trim() || undefined,
      ...(category !== 'flight' && place.trim() ? spot : {}), cost: +cost > 0 ? +cost : undefined, note: note.trim() || undefined,
      ...(category === 'flight' ? { flight: { airline: airline.trim() || undefined, number: flightNumber.trim() || undefined, from: from.trim() || undefined, fromAddress: fromSpot.address, fromLat: fromSpot.lat, fromLng: fromSpot.lng, to: to.trim() || undefined, toAddress: toSpot.address, toLat: toSpot.lat, toLng: toSpot.lng } } : {}),
    });
    onClose();
  };

  return (
    <Sheet
      title={item ? 'Edit' : 'Add to the day'}
      onClose={onClose}
      footer={<>
        {item && <Button variant="danger" onClick={() => { removeItem(plan.id, day.date, item.id); onClose(); }}>Remove</Button>}
        <Button variant="primary" className="flex-1" disabled={!effectiveTitle || !startDate || (when === 'time' && !start) || badEnd || (category === 'flight' && (!from.trim() || !to.trim() || !endDate || !end))} onClick={save}>{item ? 'Save' : 'Add'}</Button>
      </>}
    >
      <Eyebrow>{longDay(day.date)}</Eyebrow>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Category">
        {ITEM_CATEGORIES.map(c => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => { setCategory(c.id); if (c.id === 'flight') setWhen('time'); }} className={clsx('inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm transition', category === c.id ? 'bg-ink font-semibold text-ground' : 'border border-edge bg-surface font-medium')}><CategoryIcon category={c.id} width={17} height={17} />{c.label}</button>)}
      </div>
      <Field label="What" value={title} onChange={e => setTitle(e.target.value)} placeholder={category === 'flight' ? 'Optional — built from airports' : 'Dinner, check-in, museum'} autoFocus={!item && category !== 'flight'} />
      <Segmented label="When" value={when} onChange={setWhen} options={[{ id: 'time', label: 'At a set time' }, { id: 'part', label: 'Part of the day' }]} />
      {when === 'time' ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="grid grid-cols-[1.2fr_.8fr] gap-3">
            <Field label={category === 'flight' ? 'Departs' : 'Start date'} type="date" value={startDate} min={plan.days[0].date} max={plan.days[plan.days.length - 1].date} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} />
            <Field label="Time" type="time" step={step} value={start} onChange={e => setStart(e.target.value)} />
          </div>
          {category === 'flight' && <Field label="Departure time zone" list="plan-a-timezones" value={startZone} onChange={e => setStartZone(e.target.value)} />}
          <div className="grid grid-cols-[1.2fr_.8fr] gap-3">
            <Field label={category === 'flight' ? 'Arrives' : 'End date'} type="date" value={endDate} min={startDate} max={plan.days[plan.days.length - 1].date} onChange={e => setEndDate(e.target.value)} />
            <Field label="End time (optional)" type="time" step={step} value={end} onChange={e => setEnd(e.target.value)} hint={badEnd ? 'Must be after the start' : undefined} />
          </div>
          {category === 'flight' && <Field label="Arrival time zone" list="plan-a-timezones" value={endZone} onChange={e => setEndZone(e.target.value)} />}
          <datalist id="plan-a-timezones">{['America/Toronto', 'America/Vancouver', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'].map(z => <option key={z} value={z} />)}</datalist>
        </div>
      ) : (
        <div className="flex flex-col gap-3"><Field label="Date" type="date" value={startDate} min={plan.days[0].date} max={plan.days[plan.days.length - 1].date} onChange={e => setStartDate(e.target.value)} /><Segmented label="Part of the day" value={part} onChange={setPart} options={PARTS} /></div>
      )}
      {category === 'flight' ? <>
        <div className="grid grid-cols-2 gap-3"><Field label="Airline (optional)" value={airline} onChange={e => setAirline(e.target.value)} placeholder="Air Canada" /><Field label="Flight number" value={flightNumber} onChange={e => setFlightNumber(e.target.value)} placeholder="AC 123" /></div>
        <PlaceField label="Departure airport" value={from} placeholder="Airport name or code" hint={fromSpot.address} onText={text => { setFrom(text); setFromSpot({}); }} onPick={p => { setFrom(p.name); setFromSpot({ address: p.address ?? p.detail, lat: p.lat, lng: p.lng }); }} />
        <PlaceField label="Arrival airport" value={to} placeholder="Airport name or code" hint={toSpot.address} onText={text => { setTo(text); setToSpot({}); }} onPick={p => { setTo(p.name); setToSpot({ address: p.address ?? p.detail, lat: p.lat, lng: p.lng }); }} />
      </> : <PlaceField label="Where (optional)" value={place} placeholder="Name or address" hint={spot.address} near={plan.at}
        onText={text => { setPlace(text); setSpot({}); }}
        onPick={p => { setPlace(p.name); setSpot({ address: p.address ?? p.detail, lat: p.lat, lng: p.lng }); }} />}
      {item && <section className="flex flex-col gap-2 border-t border-line pt-4"><div className="text-sm font-semibold">Calendar</div><div className="grid grid-cols-2 gap-2"><Button onClick={() => downloadItemCalendar(plan, item, day.date)}>Download event</Button><a href={googleCalendarUrl(plan, item, day.date)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-full border border-edge bg-surface px-4 text-sm font-semibold">Open in Google</a></div></section>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cost (optional)" type="number" inputMode="decimal" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
        <Field label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
      </div>
    </Sheet>
  );
}
