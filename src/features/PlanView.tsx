import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { Back, Plus } from '@/components/icons';
import { Button, Eyebrow, IconButton, Sheet } from '@/components/ui';
import { go, plansAtom, removePlan } from '@/lib/store';
import { clock, dateRange, longDay, money, ordered, shortDay, today } from '@/lib/time';
import { KINDS, PARTS, type Plan } from '@/lib/types';
import { Budget } from './Budget';
import { Checklist } from './Checklist';
import { MapMode } from './MapMode';
import { ItemSheet, Timeline } from './Timeline';

type Mode = 'timeline' | 'checklist' | 'budget' | 'map';
const MODES: { id: Mode; label: string }[] = [{ id: 'timeline', label: 'Timeline' }, { id: 'checklist', label: 'Checklist' }, { id: 'budget', label: 'Budget' }, { id: 'map', label: 'Map' }];

/** One plan. It shows a single mode at a time so the screen never carries more than one job. */
export function PlanView({ id }: { id: string }) {
  const plan = useAtomValue(plansAtom).find(p => p.id === id);
  const [mode, setMode] = useState<Mode>('timeline');
  const [date, setDate] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!plan) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-start justify-center gap-4 px-6">
        <p className="font-serif text-[28px] leading-tight font-medium">This plan is not on this device.</p>
        <Button onClick={() => go('/')}>Back to your plans</Button>
      </main>
    );
  }

  const now = today();
  const day = plan.days.find(d => d.date === date) ?? plan.days.find(d => d.date === now) ?? plan.days[0];
  const byDay = mode === 'timeline' || mode === 'map';
  const kind = KINDS.find(k => k.id === plan.kind)!.label;

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pt-5 pb-28 print:hidden">
        <header className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>
            <div className="flex gap-2">
              <Button onClick={() => setSharing(true)}>Share</Button>
              <IconButton label={`Add to ${longDay(day.date)}`} onClick={() => { setMode('timeline'); setAdding(true); }} className="bg-accent text-on-accent"><Plus width={20} height={20} /></IconButton>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Eyebrow>{kind} · {plan.days.length === 1 ? shortDay(plan.days[0].date) : `${plan.days.length} days`}{plan.destination ? ` · ${plan.destination}` : ''}</Eyebrow>
            <h1 className="font-serif text-[40px] leading-none font-semibold tracking-[-0.01em]">{plan.title}</h1>
          </div>
          {byDay && plan.days.length > 1 && (
            <nav aria-label="Days" className="-mx-6 flex gap-5 overflow-x-auto border-b border-line px-6 [scrollbar-width:none]">
              {plan.days.map(d => (
                <button key={d.date} type="button" aria-current={d.date === day.date} onClick={() => setDate(d.date)} className={clsx('h-12 shrink-0 border-b-2 px-0.5 text-[15px] transition-colors', d.date === day.date ? 'border-ink font-semibold' : 'border-transparent font-medium text-muted')}>
                  {shortDay(d.date)}{d.date === now && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-label="today" />}
                </button>
              ))}
            </nav>
          )}
        </header>

        {mode === 'timeline' && <Timeline plan={plan} day={day} onAdd={() => setAdding(true)} />}
        {mode === 'checklist' && <Checklist plan={plan} />}
        {mode === 'budget' && <Budget plan={plan} />}
        {mode === 'map' && <MapMode plan={plan} day={day} />}
      </main>

      <nav aria-label="Modes" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg px-4 pb-[max(16px,env(safe-area-inset-bottom))] print:hidden">
        <div className="grid grid-cols-4 gap-1 rounded-full border border-line bg-surface/95 p-1.5 shadow-lg backdrop-blur">
          {MODES.map(m => (
            <button key={m.id} type="button" aria-current={m.id === mode} onClick={() => { setMode(m.id); scrollTo(0, 0); }} className={clsx('h-11 rounded-full text-[13px] transition', m.id === mode ? 'bg-ink font-semibold text-ground' : 'font-medium text-muted')}>{m.label}</button>
          ))}
        </div>
      </nav>

      {adding && <ItemSheet plan={plan} day={day} onClose={() => setAdding(false)} />}
      {sharing && <ShareSheet plan={plan} onClose={() => setSharing(false)} />}
      <PrintView plan={plan} />
    </>
  );
}

const when = (i: { start?: string; end?: string; part?: string }) => (i.start ? `${clock(i.start)}${i.end ? ` to ${clock(i.end)}` : ''}` : PARTS.find(p => p.id === i.part)?.label ?? '');

/** The plan as plain text, laid out like a note, for pasting into a message. */
function asText(plan: Plan) {
  const lines = [plan.title, ''];
  for (const d of plan.days) {
    lines.push(longDay(d.date));
    for (const i of ordered(d.items)) if (i.status !== 'skipped') lines.push(`${when(i)}: ${i.title}${i.place ? ` (${i.place})` : ''}`);
    if (!d.items.length) lines.push('Nothing planned yet');
    lines.push('');
  }
  return lines.join('\n').trim();
}

function ShareSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = asText(plan);
    try {
      if (navigator.share) await navigator.share({ title: plan.title, text });
      else { await navigator.clipboard.writeText(text); setCopied(true); }
    } catch { /* the person closed the share menu */ }
  };
  return (
    <Sheet title="Share" onClose={onClose}>
      <p className="text-[15px] leading-relaxed text-muted">Send the plan as text, or save a clean copy as a PDF. Links that stay up to date, and inviting someone to edit, are being built.</p>
      <Button variant="primary" size="lg" onClick={copy}>{copied ? 'Copied' : 'Send as text'}</Button>
      <Button size="lg" onClick={() => { onClose(); setTimeout(() => print(), 350); }}>Save as PDF</Button>
      <div className="mt-3 border-t border-line pt-4 pb-3">
        <Button variant="danger" className="border border-edge" onClick={() => { if (confirm(`Delete "${plan.title}"? This cannot be undone.`)) { removePlan(plan.id); go('/'); } }}>Delete this plan</Button>
      </div>
    </Sheet>
  );
}

/** The whole plan on paper. Hidden on screen and shown only when printing, which is how Save as PDF works. */
function PrintView({ plan }: { plan: Plan }) {
  const total = plan.costs.reduce((t, c) => t + c.amount, 0) + plan.days.reduce((t, d) => t + d.items.reduce((s, i) => s + (i.status === 'skipped' ? 0 : i.cost ?? 0), 0), 0);
  return (
    <div className="hidden p-2 print:block">
      <div className="border-b border-ink pb-4">
        <div className="eyebrow">{KINDS.find(k => k.id === plan.kind)!.label}</div>
        <div className="font-serif text-[44px] leading-none font-semibold">{plan.title}</div>
        <div className="pt-2 text-[13px] text-muted">{[plan.destination, dateRange(plan.days[0].date, plan.days[plan.days.length - 1].date)].filter(Boolean).join(' · ')}</div>
      </div>
      {plan.days.map(d => (
        <div key={d.date} className="break-inside-avoid border-b border-line py-4">
          <div className="pb-2 font-serif text-2xl font-medium italic">{longDay(d.date)}</div>
          <div className="grid grid-cols-[150px_1fr] gap-y-1.5 text-[14px]">
            {ordered(d.items).filter(i => i.status !== 'skipped').map(i => (
              <div key={i.id} className="contents"><span className="num text-muted">{when(i)}</span><span><span className="font-semibold">{i.title}</span>{i.place ? `, ${i.place}` : ''}</span></div>
            ))}
          </div>
        </div>
      ))}
      {total > 0 && <div className="flex items-baseline justify-between pt-4"><span className="eyebrow">Estimated cost</span><span className="num font-serif text-3xl font-semibold">{money(total)}</span></div>}
    </div>
  );
}
