import clsx from 'clsx';
import { useState } from 'react';
import { Cross } from '@/components/icons';
import { Button, Eyebrow, Field, IconButton } from '@/components/ui';
import { updatePlan } from '@/lib/store';
import { money, ordered, shortDay, uid } from '@/lib/time';
import type { Plan } from '@/lib/types';

/** What the plan costs: bookings and other fixed costs, plus anything with a cost on the timeline. */
export function Budget({ plan }: { plan: Plan }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const timed = plan.days.flatMap(d => ordered(d.items).filter(i => i.cost && i.status !== 'skipped').map(i => ({ ...i, date: d.date })));
  const total = plan.costs.reduce((t, c) => t + c.amount, 0) + timed.reduce((t, i) => t + (i.cost ?? 0), 0);
  const left = plan.budget !== undefined ? plan.budget - total : null;
  const add = () => {
    if (!label.trim() || !(+amount > 0)) return;
    updatePlan(plan.id, p => ({ ...p, costs: [...p.costs, { id: uid(), label: label.trim(), amount: +amount }] }));
    setLabel(''); setAmount('');
  };

  return (
    <section className="flex animate-rise flex-col gap-7 pt-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>{left === null ? 'Planned so far' : left < 0 ? 'Over budget by' : 'Left in the budget'}</Eyebrow>
        <div className={clsx('num font-serif text-[56px] leading-none font-semibold', left !== null && left < 0 && 'text-bad')}>{money(Math.abs(left ?? total))}</div>
        {left !== null && (
          <>
            <div className="h-1 overflow-hidden rounded-full bg-line" role="img" aria-label={`${money(total)} of ${money(plan.budget!)} planned`}><div className={clsx('h-full rounded-full transition-[width] duration-500', left < 0 ? 'bg-bad' : 'bg-accent')} style={{ width: `${Math.min(100, plan.budget ? (total / plan.budget) * 100 : 100)}%` }} /></div>
            <div className="num text-[13px] text-muted">{money(total)} planned of {money(plan.budget!)}</div>
          </>
        )}
        {plan.people > 1 && total > 0 && <div className="num text-[13px] text-muted">{money(Math.round(total / plan.people))} each for {plan.people} people</div>}
      </div>

      <Field label="Budget in dollars" type="number" inputMode="decimal" min={0} value={plan.budget ?? ''} placeholder="No budget set"
        onChange={e => updatePlan(plan.id, p => ({ ...p, budget: e.target.value === '' ? undefined : Math.max(0, +e.target.value) }))} />

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <Eyebrow>Bookings and fixed costs</Eyebrow>
        {plan.costs.length > 0 && (
          <ul className="flex flex-col border-b border-line">
            {plan.costs.map(c => (
              <li key={c.id} className="flex min-h-[52px] items-center gap-3 border-t border-line">
                <span className="flex-1 text-[15px]">{c.label}</span>
                <span className="num text-[15px] font-semibold">{money(c.amount)}</span>
                <IconButton label={`Remove ${c.label}`} onClick={() => updatePlan(plan.id, p => ({ ...p, costs: p.costs.filter(x => x.id !== c.id) }))} className="-mr-3 text-muted"><Cross width={16} height={16} /></IconButton>
              </li>
            ))}
          </ul>
        )}
        <form className="grid grid-cols-[1fr_96px_auto] gap-2" onSubmit={e => { e.preventDefault(); add(); }}>
          <input aria-label="What the cost is for" value={label} onChange={e => setLabel(e.target.value)} placeholder="Flights, hotel, tickets" className="h-12 rounded-xl border border-edge bg-surface px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
          <input aria-label="Amount in dollars" type="number" inputMode="decimal" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="$" className="num h-12 rounded-xl border border-edge bg-surface px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
          <Button type="submit" variant="primary" className="h-12" disabled={!label.trim() || !(+amount > 0)}>Add</Button>
        </form>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <Eyebrow>On the timeline</Eyebrow>
        {timed.length ? (
          <ul className="flex flex-col border-b border-line">
            {timed.map(i => (
              <li key={i.id} className="flex min-h-[52px] items-center gap-3 border-t border-line">
                <span className="flex flex-1 flex-col py-2"><span className="text-[15px]">{i.title}</span><span className="text-[13px] text-muted">{shortDay(i.date)}</span></span>
                <span className="num text-[15px] font-semibold">{money(i.cost!)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-[15px] leading-relaxed text-muted">Give a timeline item a cost and it is counted here.</p>}
      </div>
    </section>
  );
}
