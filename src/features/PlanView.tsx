import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { Back, Plus } from '@/components/icons';
import { Button, IconButton } from '@/components/ui';
import { accessAtom, go, plansAtom } from '@/lib/store';
import { longDay, shortDay, today } from '@/lib/time';
import { KINDS, type Plan } from '@/lib/types';
import { Budget } from './Budget';
import { Checklist } from './Checklist';
import { Itinerary } from './Itinerary';
import { MapMode } from './MapMode';
import { PlanSettingsSheet } from './PlanSettingsSheet';
import { ShareSheet } from './ShareSheet';
import { ItemSheet, Timeline } from './Timeline';

type Mode = 'timeline' | 'checklist' | 'budget' | 'map';
const MODES: { id: Mode; label: string }[] = [{ id: 'timeline', label: 'Timeline' }, { id: 'checklist', label: 'Checklist' }, { id: 'budget', label: 'Budget' }, { id: 'map', label: 'Map' }];

/** One plan. It shows a single mode at a time so the screen never carries more than one job. */
export function PlanView({ id }: { id: string }) {
  const plan = useAtomValue(plansAtom).find(p => p.id === id);
  const access = useAtomValue(accessAtom)[id];
  const [mode, setMode] = useState<Mode>('timeline');
  const [date, setDate] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [settings, setSettings] = useState(false);

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
      <main className="mx-auto flex min-h-dvh w-full max-w-[620px] flex-col px-5 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-8 print:hidden">
        <header className="flex flex-col">
          <div className="flex min-h-14 items-center justify-between border-b border-ink pb-3">
            <IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSettings(true)}>Edit</Button>
              <Button onClick={() => setSharing(true)} className="hidden sm:inline-flex">Share</Button>
              <IconButton label={`Add to ${longDay(day.date)}`} onClick={() => { setMode('timeline'); setAdding(true); }} className="bg-accent text-on-accent"><Plus width={20} height={20} /></IconButton>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-b border-line py-5">
            <h1 className="font-serif text-[42px] leading-none font-bold tracking-[-0.03em]">{plan.title}</h1>
            <p className="text-[13px] text-muted">{kind} · {plan.days.length === 1 ? shortDay(plan.days[0].date) : `${plan.days.length} days`}{plan.destination ? ` · ${plan.destination}` : ''}{access?.role === 'editor' ? ' · Shared with you' : ''}</p>
            {mode === 'timeline' && <p className="text-[13px] text-muted">{longDay(day.date)} · {day.items.filter(item => item.status === 'todo').length} {day.items.filter(item => item.status === 'todo').length === 1 ? 'thing' : 'things'} left</p>}
          </div>
          {byDay && plan.days.length > 1 && (
            <nav aria-label="Days" className="-mx-5 flex overflow-x-auto border-b border-ink px-5 sm:-mx-8 sm:px-8 [scrollbar-width:none]">
              {plan.days.map(d => (
                <button key={d.date} type="button" aria-current={d.date === day.date} onClick={() => setDate(d.date)} className={clsx('h-12 min-w-16 shrink-0 border-r border-line px-3 text-[15px] transition-colors first:border-l', d.date === day.date ? 'bg-accent font-bold text-on-accent' : 'font-medium text-muted hover:bg-wash')}>
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

      <nav aria-label="Modes" className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[620px] bg-ground px-5 pb-[max(8px,env(safe-area-inset-bottom))] sm:px-8 print:hidden">
        <div className="grid grid-cols-4 border-y border-ink bg-ground">
          {MODES.map(m => (
            <button key={m.id} type="button" aria-current={m.id === mode} onClick={() => { setMode(m.id); scrollTo(0, 0); }} className={clsx('h-12 border-r border-line text-[11px] font-bold uppercase tracking-[.12em] transition-[background-color,color,transform] duration-200 last:border-r-0 active:scale-[.98]', m.id === mode ? 'bg-accent text-on-accent' : 'text-muted hover:bg-wash hover:text-ink')}>{m.label}</button>
          ))}
        </div>
      </nav>

      {adding && <ItemSheet plan={plan} day={day} onClose={() => setAdding(false)} />}
      {sharing && <ShareSheet plan={plan} onClose={() => setSharing(false)} />}
      {settings && <PlanSettingsSheet plan={plan} onClose={() => setSettings(false)} />}
      <PrintView plan={plan} />
    </>
  );
}

/** The whole plan on paper. Hidden on screen and shown only when printing, which is how Save as PDF works. */
function PrintView({ plan }: { plan: Plan }) {
  return <div className="hidden p-2 print:block"><Itinerary plan={plan} /></div>;
}
