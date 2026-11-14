import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { saveImage } from '@/lib/image';
import type { Plan } from '@/lib/types';
import { Itinerary } from './Itinerary';

/** What someone sees when they open a view-only link. No account is needed. */
export function SharedView({ token }: { token: string }) {
  const [state, setState] = useState<{ plan: Plan; by: string } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    api.view(token).then(r => live && setState(r), e => live && setState({ error: e.message }));
    return () => { live = false; };
  }, [token]);

  if (!state) return <main className="mx-auto min-h-dvh w-full max-w-lg px-6 pt-10 text-[15px] text-muted">Opening the plan…</main>;
  if ('error' in state) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-3 px-6">
        <div className="font-serif text-[26px] leading-none font-medium">Plan <span className="italic">A</span></div>
        <p className="font-serif text-[32px] leading-tight font-semibold">{state.error}</p>
        <p className="text-[15px] text-muted">Ask the person who sent it for a new link.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg animate-rise flex-col gap-6 bg-surface px-6 pt-7 pb-[max(24px,env(safe-area-inset-bottom))] print:max-w-none print:p-2">
      <Itinerary plan={state.plan} note={state.by ? `Shared by ${state.by}` : 'View only'} />
      <div className="mt-auto flex gap-2 print:hidden">
        <Button className="h-12 flex-1 border-ink! bg-ink! text-ground!" onClick={() => print()}>Save as PDF</Button>
        <Button className="h-12 flex-1" onClick={() => void saveImage(state.plan)}>Save as image</Button>
      </div>
      <a href="#/" className="self-center text-[13px] text-muted underline underline-offset-4 print:hidden">Made with Plan A</a>
    </main>
  );
}
