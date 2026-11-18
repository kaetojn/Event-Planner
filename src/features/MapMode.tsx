import { useAtomValue } from 'jotai';
import { Arrow } from '@/components/icons';
import { Eyebrow, Segmented } from '@/components/ui';
import { TRAVEL_WORD, useLegs } from '@/lib/legs';
import { featuresAtom, sessionAtom, updatePlan } from '@/lib/store';
import { clock, longDay, ordered, span } from '@/lib/time';
import { PARTS, type Day, type Plan, type Travel } from '@/lib/types';

/**
 * The day's stops in order, with the travel between them and a link that opens the whole route in Google Maps.
 * A map drawn inside the app is still to come.
 */
export function MapMode({ plan, day }: { plan: Plan; day: Day }) {
  const session = useAtomValue(sessionAtom);
  const { places } = useAtomValue(featuresAtom);
  const mode = plan.travel ?? 'drive';
  const stops = ordered(day.items).filter(i => i.place && i.status !== 'skipped');
  const legOf = useLegs(stops, mode);
  const q = (i: { place?: string; address?: string }) => encodeURIComponent(i.address ? `${i.place}, ${i.address}` : plan.destination && !i.place!.includes(',') ? `${i.place}, ${[plan.destination, plan.area].filter(Boolean).join(', ')}` : i.place!);
  const how = { drive: 'driving', walk: 'walking', transit: 'transit' }[mode];
  const route = stops.length > 1
    ? `https://www.google.com/maps/dir/?api=1&travelmode=${how}&origin=${q(stops[0])}&destination=${q(stops[stops.length - 1])}${stops.length > 2 ? `&waypoints=${stops.slice(1, -1).map(q).join('%7C')}` : ''}`
    : stops.length === 1 ? `https://www.google.com/maps/search/?api=1&query=${q(stops[0])}` : null;
  const missing = day.items.filter(i => !i.place).length;

  return (
    <section className="flex animate-rise flex-col gap-5 pt-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>{longDay(day.date)}</Eyebrow>
        <p className="font-serif text-[28px] leading-tight font-medium">{stops.length ? `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'} with a place` : 'No places on this day yet.'}</p>
        {missing > 0 && <p className="text-[15px] leading-relaxed text-muted">{missing === 1 ? 'One item has' : `${missing} items have`} no place. Open an item on the timeline and fill in where it happens.</p>}
      </div>
      {session && places && (
        <Segmented<Travel> label="How you are getting around" value={mode} onChange={travel => updatePlan(plan.id, p => ({ ...p, travel }))} options={[{ id: 'drive', label: 'Driving' }, { id: 'walk', label: 'Walking' }, { id: 'transit', label: 'Transit' }]} />
      )}
      {stops.length > 0 && (
        <ol className="flex flex-col border-b border-line">
          {stops.map((s, n) => {
            const leg = n > 0 ? legOf(stops[n - 1], s) : null;
            return (
              <li key={s.id} className="flex min-h-[60px] items-center gap-4 border-t border-line py-2.5 transition-colors hover:bg-wash">
                <span className="num inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-ground">{n + 1}</span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] font-semibold">{s.place}</span>
                  <span className="text-[13px] text-muted">{s.title} · {s.start ? clock(s.start) : PARTS.find(p => p.id === s.part)?.label}</span>
                  {leg ? <span className="text-[13px] text-muted">{span(leg)} {TRAVEL_WORD[mode]} from {stops[n - 1].place}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {route && <a href={route} target="_blank" rel="noreferrer" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent transition hover:-translate-y-px hover:brightness-95 active:translate-y-0">Open {stops.length > 1 ? 'the route' : 'it'} in Google Maps <Arrow width={18} height={18} /></a>}
    </section>
  );
}
