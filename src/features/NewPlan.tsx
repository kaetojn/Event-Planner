import { useState, type ReactNode } from 'react';
import { Back } from '@/components/icons';
import { PlaceField } from '@/components/PlaceField';
import { Button, Choice, Eyebrow, Field, IconButton, Page } from '@/components/ui';
import { addPlan, go } from '@/lib/store';
import { starterTasks } from '@/lib/templates';
import { daysBetween, today, uid } from '@/lib/time';
import { DETAILS, KINDS, type Detail, type Kind, type Plan } from '@/lib/types';

const STEPS = 5;

/** The questionnaire that starts every plan: one question per screen. */
export function NewPlan() {
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind>('weekend');
  const [destination, setDestination] = useState('');
  // Filled in when the destination is picked from Google Maps, so suggestions and searches can be nearby.
  const [spot, setSpot] = useState<{ area?: string; at?: { lat: number; lng: number } }>({});
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [detail, setDetail] = useState<Detail>('half');
  const [people, setPeople] = useState(2);
  const [budget, setBudget] = useState('');
  const [title, setTitle] = useState('');

  const kindLabel = KINDS.find(k => k.id === kind)!.label;
  const suggested = kind === 'event' ? destination.trim() : [destination.trim(), kind === 'weekend' ? 'Weekend' : kindLabel].filter(Boolean).join(' ');
  const canContinue = step !== 2 || (destination.trim().length > 0 && !!start && !!end);

  const finish = () => {
    const now = new Date().toISOString();
    const plan: Plan = {
      id: uid(), title: title.trim() || suggested || kindLabel, kind, destination: destination.trim(), ...spot, detail, people,
      budget: +budget > 0 ? +budget : undefined, days: daysBetween(start, end), tasks: starterTasks(kind), costs: [], createdAt: now, updatedAt: now,
    };
    addPlan(plan);
    location.replace(`#/plan/${plan.id}`);
  };

  return (
    <Page className="gap-8">
      <header className="flex items-center gap-4">
        <IconButton label={step === 1 ? 'Back to your plans' : 'Previous question'} onClick={() => (step === 1 ? go('/') : setStep(step - 1))} className="-ml-3"><Back /></IconButton>
        <div role="img" aria-label={`Question ${step} of ${STEPS}`} className="grid flex-1 grid-cols-5 gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => <span key={i} className={`h-1 rounded-full transition-colors ${i < step ? 'bg-accent' : 'bg-edge'}`} />)}
        </div>
        <div className="num text-[13px] font-medium text-muted">{step} of {STEPS}</div>
      </header>

      <div key={step} className="stagger flex flex-1 flex-col gap-8">
        {step === 1 && (<>
          <Question title={<>What are we <em>planning</em>?</>} />
          <div className="flex flex-col gap-3">{KINDS.map(k => <Choice key={k.id} selected={kind === k.id} title={k.label} hint={k.hint} onClick={() => setKind(k.id)} />)}</div>
        </>)}
        {step === 2 && (<>
          <Question eyebrow={kindLabel} title={<>Where and <em>when</em>?</>} note="A city, a hotel or a venue. Suggestions and travel times will be worked out from here." />
          <div className="flex flex-col gap-4">
            <PlaceField label="Where" value={destination} placeholder="A city, a hotel or a venue" hint={spot.area} autoFocus
              onText={text => { setDestination(text); setSpot({}); }}
              onPick={p => { setDestination(p.name); setSpot({ area: p.detail || undefined, at: p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : undefined }); }} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" type="date" value={start} onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
              <Field label="Until" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} />
            </div>
          </div>
        </>)}
        {step === 3 && (<>
          <Question eyebrow={kindLabel} title={<>How tightly do you like to <em>plan</em> a day?</>} note="This sets how new items are added. Any item can still have an exact time or just a part of the day." />
          <div className="flex flex-col gap-3">{DETAILS.map(d => <Choice key={d.id} selected={detail === d.id} title={d.label} hint={d.hint} onClick={() => setDetail(d.id)} />)}</div>
        </>)}
        {step === 4 && (<>
          <Question eyebrow={kindLabel} title={<>Who is it for, and what is the <em>budget</em>?</>} note="The budget is optional. With one, the plan shows what is left as costs are added." />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">People</span>
              <div className="flex h-12 items-center justify-between rounded-xl border border-edge bg-surface px-1">
                <IconButton label="One fewer person" disabled={people <= 1} onClick={() => setPeople(people - 1)} className="text-xl disabled:opacity-40">−</IconButton>
                <span className="num text-[17px] font-semibold">{people}</span>
                <IconButton label="One more person" onClick={() => setPeople(people + 1)} className="text-xl">+</IconButton>
              </div>
            </div>
            <Field label="Budget in dollars" type="number" inputMode="decimal" min={0} value={budget} onChange={e => setBudget(e.target.value)} placeholder="Leave empty to skip" />
          </div>
        </>)}
        {step === 5 && (<>
          <Question eyebrow={kindLabel} title={<>What shall we <em>call</em> it?</>} note="This is the name at the top of the plan and on anything you share." />
          <Field label="Name" value={title} onChange={e => setTitle(e.target.value)} placeholder={suggested || kindLabel} autoFocus />
        </>)}
      </div>

      <div className="border-t border-line pt-4">
        <Button variant="primary" size="lg" className="w-full" disabled={!canContinue} onClick={() => (step < STEPS ? setStep(step + 1) : finish())}>{step < STEPS ? 'Continue' : 'Create the plan'}</Button>
      </div>
    </Page>
  );
}

function Question({ eyebrow, title, note }: { eyebrow?: string; title: ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-2.5">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="font-serif text-[40px] leading-[1.05] font-semibold tracking-[-0.01em] [&_em]:font-medium">{title}</h1>
      {note && <p className="text-[15px] leading-relaxed text-muted">{note}</p>}
    </section>
  );
}
