import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { Person } from '@/components/icons';
import { Button, Eyebrow, IconButton } from '@/components/ui';
import { addPlan, go, plansAtom, profileAtom } from '@/lib/store';
import { samplePlan } from '@/lib/templates';
import { clock, dateRange, money, ordered, today } from '@/lib/time';
import { KINDS, type Plan } from '@/lib/types';

const first = (p: Plan) => p.days[0]?.date ?? '';
const last = (p: Plan) => p.days[p.days.length - 1]?.date ?? '';
const planned = (p: Plan) => p.costs.reduce((t, c) => t + c.amount, 0) + p.days.reduce((t, d) => t + d.items.reduce((s, i) => s + (i.status === 'skipped' ? 0 : i.cost ?? 0), 0), 0);

/** One short line about where a plan stands: what is next today, how far off it is, or that it is over. */
function standing(p: Plan): { when: string; detail: string } {
  const now = today();
  if (now > last(p)) return { when: 'Past', detail: p.destination };
  if (now < first(p)) {
    const days = Math.round((new Date(`${first(p)}T12:00:00`).getTime() - new Date(`${now}T12:00:00`).getTime()) / 86400000);
    return { when: days === 1 ? 'Tomorrow' : `In ${days} days`, detail: p.destination };
  }
  const hhmm = new Date().toTimeString().slice(0, 5);
  const next = ordered(p.days.find(d => d.date === now)?.items ?? []).find(i => i.status === 'todo' && (!i.start || i.start >= hhmm));
  return { when: 'Happening now', detail: next ? `Next: ${next.title}${next.start ? ` at ${clock(next.start)}` : ''}` : 'Nothing left today' };
}

export function Home() {
  const plans = useAtomValue(plansAtom);
  const profile = useAtomValue(profileAtom);
  const now = today();
  // Plans that are under way or coming up lead, soonest first. Past plans follow, most recent first.
  const live = plans.filter(p => last(p) >= now).sort((a, b) => first(a).localeCompare(first(b)));
  const past = plans.filter(p => last(p) < now).sort((a, b) => first(b).localeCompare(first(a)));
  const list = [...live, ...past];

  return (
    <main className="stagger mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-7 px-6 pt-5 pb-10">
      <header className="flex items-center justify-between">
        <div className="font-serif text-[26px] leading-none font-medium">Plan <span className="italic">A</span></div>
        <IconButton label="Your profile and settings" onClick={() => go('/profile')} className="border border-edge bg-surface text-sm font-semibold">
          {profile.name ? profile.name[0].toUpperCase() : <Person width={18} height={18} />}
        </IconButton>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="font-serif text-[44px] leading-[1.02] font-semibold tracking-[-0.01em]">What are we <span className="font-medium italic">planning</span> next{profile.name ? `, ${profile.name}` : ''}?</h1>
        <Button variant="primary" size="lg" onClick={() => go('/new')}>Begin a plan</Button>
      </section>

      {list.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Eyebrow>Your plans</Eyebrow>
          {list.map((p, n) => {
            const s = standing(p);
            const lead = n === 0 && live.length > 0;
            const total = planned(p);
            return (
              <button key={p.id} type="button" onClick={() => go(`/plan/${p.id}`)} className={clsx('flex flex-col gap-3.5 rounded-2xl p-[18px] text-left transition active:scale-[.99]', lead ? 'bg-ink text-ground' : 'border border-line bg-surface')}>
                <span className={clsx('flex items-center justify-between text-xs font-medium', lead ? 'opacity-80' : 'text-muted')}>
                  <span>{KINDS.find(k => k.id === p.kind)?.label}</span>
                  <span>{s.when === 'Happening now' || s.when === 'Past' ? s.when : `${dateRange(first(p), last(p))} · ${s.when}`}</span>
                </span>
                <span className="font-serif text-3xl leading-none font-semibold">{p.title}</span>
                <span className={clsx('flex justify-between gap-3 text-[13px]', lead ? 'opacity-80' : 'text-muted')}>
                  <span className="truncate">{s.detail}</span>
                  {total > 0 && <span className="num shrink-0">{money(total)} planned</span>}
                </span>
              </button>
            );
          })}
        </section>
      ) : (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <Eyebrow>Nothing planned yet</Eyebrow>
          <p className="text-[15px] leading-relaxed text-muted">A plan holds a timeline for each day, a checklist and a budget. Answer five short questions to start one, or open a sample to look around first.</p>
          <Button className="self-start" onClick={() => { const p = samplePlan(); addPlan(p); go(`/plan/${p.id}`); }}>Open a sample weekend</Button>
        </section>
      )}
    </main>
  );
}
