import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { Arrow, Person } from '@/components/icons';
import { Button, Eyebrow, IconButton, Page, ScreenHeading, useSwipe } from '@/components/ui';
import { addPlan, go, plansAtom, profileAtom, removePlan, sessionAtom, syncAtom } from '@/lib/store';
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

function PlanCard({ plan, lead }: { plan: Plan; lead: boolean }) {
  const s = standing(plan), total = planned(plan);
  const swipe = useSwipe(() => {}, () => { if (confirm(`Delete "${plan.title}"? This cannot be undone.`)) removePlan(plan.id); });
  return <div className="relative overflow-hidden rounded-[4px] bg-bad">
    <div aria-hidden="true" className="absolute inset-y-0 right-0 flex w-24 items-center justify-center text-sm font-semibold text-white">Delete</div>
    <button {...swipe} type="button" onClick={() => go(`/plan/${plan.id}`)} className={clsx('group relative flex w-full flex-col border border-line bg-surface text-left transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink active:translate-y-0 active:scale-[.995]', lead && 'border-ink')}>
      <span className="flex items-stretch">
        <span className={clsx('w-2 shrink-0', lead ? 'bg-accent' : 'bg-line')} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-4 p-[18px]">
          <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.18em] text-muted"><span>{KINDS.find(k => k.id === plan.kind)?.label}</span><span className="num">{s.when === 'Happening now' || s.when === 'Past' ? s.when : dateRange(first(plan), last(plan))}</span></span>
          <span className="font-serif text-[30px] leading-none font-bold tracking-[-0.025em]">{plan.title}</span>
          <span className="flex justify-between gap-3 border-t border-line pt-3 text-[13px] text-muted"><span className="truncate"><span className="font-bold text-ink">{s.when}</span> · {s.detail}</span>{total > 0 && <span className="num shrink-0">{money(total)} planned</span>}</span>
        </span>
      </span>
    </button>
  </div>;
}

export function Home() {
  const plans = useAtomValue(plansAtom);
  const profile = useAtomValue(profileAtom);
  const session = useAtomValue(sessionAtom);
  const sync = useAtomValue(syncAtom);
  const now = today();
  // Plans that are under way or coming up lead, soonest first. Past plans follow, most recent first.
  const live = plans.filter(p => last(p) >= now).sort((a, b) => first(a).localeCompare(first(b)));
  const past = plans.filter(p => last(p) < now).sort((a, b) => first(b).localeCompare(first(a)));
  const list = [...live, ...past];

  return (
    <Page className="stagger gap-10 pb-10">
      <header className="flex items-center justify-between border-b border-ink pb-4">
        <div className="font-serif text-[27px] leading-none font-bold tracking-[-0.03em]">Plan A</div>
        <IconButton label={session ? 'Your profile' : 'Sign in or create an account'} onClick={() => go('/profile')} className="border border-edge bg-surface text-sm font-semibold">{session && profile.name ? profile.name[0].toUpperCase() : <Person width={18} height={18} />}</IconButton>
      </header>

      <section className="flex flex-col gap-5 border-b border-line pb-9">
        <ScreenHeading title={<>What are we <em>planning</em> next{profile.name ? `, ${profile.name}` : ''}?</>} detail={list.length > 0 ? 'Your next plan is ready when you are. Keep the details here, and the day moving once it starts.' : undefined} />
        <Button variant="primary" size="lg" className="self-start sm:min-w-52" onClick={() => go('/new')}>Begin a plan <Arrow width={17} height={17} /></Button>
      </section>

      {list.length > 0 ? (
        <section className="flex flex-col gap-3">
          <Eyebrow>Your plans</Eyebrow>
          {list.map((p, n) => <PlanCard key={p.id} plan={p} lead={n === 0 && live.length > 0} />)}
        </section>
      ) : (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <Eyebrow>Nothing planned yet</Eyebrow>
          <p className="text-[15px] leading-relaxed text-muted">A plan holds a timeline for each day, a checklist and a budget. Answer five short questions to start one, or open a sample to look around first.</p>
          <Button className="self-start" onClick={() => { const p = samplePlan(); addPlan(p); go(`/plan/${p.id}`); }}>Open a sample weekend</Button>
        </section>
      )}

      <p className="mt-auto border-t border-line pt-5 text-[13px] leading-relaxed text-muted" role="status">
        {session
          ? sync === 'offline' ? 'Could not reach the server. Changes are kept on this device and will be saved when you are back online.' : sync === 'saving' ? 'Saving…' : `Saved to ${session.user.email}`
          : <>Saved on this device only. <a href="#/profile" className="font-medium text-ink underline underline-offset-4">Sign in</a> to keep plans in an account, share them and get suggestions.</>}
      </p>
    </Page>
  );
}
