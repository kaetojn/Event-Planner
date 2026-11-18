import { useState } from 'react';
import { PlaceField } from '@/components/PlaceField';
import { Button, Field, Sheet } from '@/components/ui';
import { resizePlan, updatePlan } from '@/lib/store';
import type { Plan } from '@/lib/types';

/** Plan-level details that can change after the first draft without rebuilding it. */
export function PlanSettingsSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [title, setTitle] = useState(plan.title);
  const [destination, setDestination] = useState(plan.destination);
  const [destinationSpot, setDestinationSpot] = useState<{ area?: string; at?: { lat: number; lng: number } }>({ area: plan.area, at: plan.at });
  const [start, setStart] = useState(plan.days[0].date);
  const [end, setEnd] = useState(plan.days[plan.days.length - 1].date);
  const [stayTbd, setStayTbd] = useState(plan.stay?.tbd ?? !plan.stay?.name);
  const [stay, setStay] = useState(plan.stay?.name ?? '');
  const [staySpot, setStaySpot] = useState<{ address?: string; lat?: number; lng?: number }>({ address: plan.stay?.address, lat: plan.stay?.lat, lng: plan.stay?.lng });

  const save = () => {
    if (start !== plan.days[0].date || end !== plan.days[plan.days.length - 1].date) resizePlan(plan.id, start, end);
    updatePlan(plan.id, p => ({
      ...p,
      title: title.trim(), destination: destination.trim(), ...destinationSpot,
      stay: stayTbd ? { tbd: true } : { name: stay.trim() || undefined, ...staySpot, tbd: false },
    }));
    onClose();
  };

  return <Sheet title="Plan details" onClose={onClose} footer={<Button variant="primary" className="flex-1" disabled={!title.trim() || !destination.trim() || end < start} onClick={save}>Save changes</Button>}>
    <Field label="Plan name" value={title} onChange={e => setTitle(e.target.value)} />
    <PlaceField label="Destination" value={destination} placeholder="City, hotel or venue" hint={destinationSpot.area} onText={text => { setDestination(text); setDestinationSpot({}); }} onPick={p => { setDestination(p.name); setDestinationSpot({ area: p.detail || undefined, at: p.lat !== undefined && p.lng !== undefined ? { lat: p.lat, lng: p.lng } : undefined }); }} />
    <div className="grid grid-cols-2 gap-3">
      <Field label="Starts" type="date" value={start} onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }} />
      <Field label="Ends" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} />
    </div>
    {plan.kind === 'trip' && <section className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex items-start justify-between gap-4">
        <div><div className="text-sm font-semibold">Where you are staying</div><p className="mt-1 text-[13px] leading-relaxed text-muted">This gives airport and day routes a useful destination.</p></div>
        <button type="button" aria-pressed={stayTbd} onClick={() => setStayTbd(v => !v)} className={stayTbd ? 'h-11 rounded-full bg-ink px-4 text-sm font-semibold text-ground' : 'h-11 rounded-full border border-edge bg-surface px-4 text-sm font-medium'}>TBD</button>
      </div>
      {!stayTbd && <PlaceField label="Hotel, rental or area" value={stay} placeholder="Hotel, address or neighbourhood" hint={staySpot.address} near={plan.at} onText={text => { setStay(text); setStaySpot({}); }} onPick={p => { setStay(p.name); setStaySpot({ address: p.address ?? p.detail, lat: p.lat, lng: p.lng }); }} />}
    </section>}
  </Sheet>;
}
