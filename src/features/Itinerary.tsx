import { clock, dateRange, longDay, money, ordered } from '@/lib/time';
import { KINDS, PARTS, type Item, type Plan } from '@/lib/types';

export const when = (i: Item) => (i.start ? `${clock(i.start)}${i.end ? ` to ${clock(i.end)}` : ''}` : PARTS.find(p => p.id === i.part)?.label ?? '');
export const planTotal = (plan: Plan) => plan.costs.reduce((t, c) => t + c.amount, 0) + plan.days.reduce((t, d) => t + d.items.reduce((s, i) => s + (i.status === 'skipped' ? 0 : i.cost ?? 0), 0), 0);

/** The plan as plain text, laid out like a note, for pasting into a message. */
export function asText(plan: Plan) {
  const lines = [plan.title, ''];
  for (const d of plan.days) {
    lines.push(longDay(d.date));
    for (const i of ordered(d.items)) if (i.status !== 'skipped') lines.push(`${when(i)}: ${i.title}${i.place ? ` (${i.place})` : ''}`);
    if (!d.items.length) lines.push('Nothing planned yet');
    lines.push('');
  }
  return lines.join('\n').trim();
}

/** The whole plan set like a printed page. It is what a view-only link shows and what Save as PDF prints. */
export function Itinerary({ plan, note }: { plan: Plan; note?: string }) {
  const total = planTotal(plan);
  return (
    <article>
      <header className="flex flex-col gap-2.5 border-b border-ink pb-5">
        <div className="eyebrow flex justify-between gap-4"><span>{KINDS.find(k => k.id === plan.kind)!.label}</span>{note && <span>{note}</span>}</div>
        <h1 className="font-serif text-[46px] leading-none font-semibold tracking-[-0.01em]">{plan.title}</h1>
        <div className="text-[13px] text-muted">{[plan.destination, dateRange(plan.days[0].date, plan.days[plan.days.length - 1].date)].filter(Boolean).join(' · ')}</div>
      </header>
      {plan.days.map(d => {
        const items = ordered(d.items).filter(i => i.status !== 'skipped');
        return (
          <section key={d.date} className="flex break-inside-avoid flex-col gap-2.5 border-b border-line py-5">
            <h2 className="font-serif text-2xl leading-none font-medium italic">{longDay(d.date)}</h2>
            {items.length ? (
              <div className="grid grid-cols-[92px_1fr] gap-y-2.5 text-[15px] leading-snug print:grid-cols-[150px_1fr]">
                {items.map(i => (
                  <div key={i.id} className="contents">
                    <span className={i.start ? 'num pt-px text-[13px] font-semibold' : 'pt-px text-[13px] text-muted'}>{i.start ? clock(i.start) : when(i)}{i.end && <span className="block font-normal text-muted">{clock(i.end)}</span>}</span>
                    <span>{i.title}{i.place && <span className="text-muted">, {i.place}</span>}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[15px] text-muted">Nothing planned yet</p>}
          </section>
        );
      })}
      {total > 0 && <footer className="flex items-baseline justify-between pt-5"><span className="eyebrow">Estimated cost</span><span className="num font-serif text-3xl leading-none font-semibold">{money(total)}</span></footer>}
    </article>
  );
}
