import { Arrow } from '@/components/icons';
import { Eyebrow } from '@/components/ui';
import { clock, longDay, ordered } from '@/lib/time';
import { PARTS, type Day, type Plan } from '@/lib/types';

/**
 * The day's stops in order, with a link that opens the whole route in Google Maps.
 * A map drawn inside the app, and travel times between stops, need the location service.
 */
export function MapMode({ plan, day }: { plan: Plan; day: Day }) {
  const stops = ordered(day.items).filter(i => i.place && i.status !== 'skipped');
  const q = (place: string) => encodeURIComponent(plan.destination && !place.includes(',') ? `${place}, ${plan.destination}` : place);
  const route = stops.length > 1
    ? `https://www.google.com/maps/dir/?api=1&origin=${q(stops[0].place!)}&destination=${q(stops[stops.length - 1].place!)}${stops.length > 2 ? `&waypoints=${stops.slice(1, -1).map(s => q(s.place!)).join('%7C')}` : ''}`
    : stops.length === 1 ? `https://www.google.com/maps/search/?api=1&query=${q(stops[0].place!)}` : null;
  const missing = day.items.filter(i => !i.place).length;

  return (
    <section className="flex animate-rise flex-col gap-5 pt-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>{longDay(day.date)}</Eyebrow>
        <p className="font-serif text-[28px] leading-tight font-medium">{stops.length ? `${stops.length} ${stops.length === 1 ? 'stop' : 'stops'} with a place` : 'No places on this day yet.'}</p>
        {missing > 0 && <p className="text-[15px] leading-relaxed text-muted">{missing === 1 ? 'One item has' : `${missing} items have`} no place. Open an item on the timeline and fill in where it happens.</p>}
      </div>
      {stops.length > 0 && (
        <ol className="flex flex-col">
          {stops.map((s, n) => (
            <li key={s.id} className="flex min-h-[60px] items-center gap-4 border-t border-line py-2">
              <span className="num inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-ground">{n + 1}</span>
              <span className="flex flex-1 flex-col"><span className="text-[15px] font-semibold">{s.place}</span><span className="text-[13px] text-muted">{s.title} · {s.start ? clock(s.start) : PARTS.find(p => p.id === s.part)?.label}</span></span>
            </li>
          ))}
        </ol>
      )}
      {route && <a href={route} target="_blank" rel="noreferrer" className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-on-accent">Open {stops.length > 1 ? 'the route' : 'it'} in Google Maps <Arrow width={18} height={18} /></a>}
    </section>
  );
}
