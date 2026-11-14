import clsx from 'clsx';
import { useAtom } from 'jotai';
import { Back } from '@/components/icons';
import { Button, Eyebrow, Field, IconButton, Segmented } from '@/components/ui';
import { go, plansAtom, profileAtom, themeAtom } from '@/lib/store';

const INTERESTS = ['Food and dining', 'Spa and wellness', 'Beaches', 'Nightlife', 'Art and museums', 'Shopping', 'Outdoors', 'Live music', 'Architecture', 'Sport', 'Wine and cocktails', 'Hidden gems'];

/** Who the plans are for. These answers will steer suggestions once they are switched on. */
export function Profile() {
  const [profile, setProfile] = useAtom(profileAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [plans, setPlans] = useAtom(plansAtom);
  const toggle = (i: string) => setProfile({ ...profile, interests: profile.interests.includes(i) ? profile.interests.filter(x => x !== i) : [...profile.interests, i] });

  return (
    <main className="stagger mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-6 pt-5 pb-12">
      <header className="flex flex-col gap-3">
        <IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>
        <h1 className="font-serif text-[40px] leading-none font-semibold">Your <span className="font-medium italic">profile</span></h1>
        <p className="text-[15px] leading-relaxed text-muted">The more this knows about how you like to spend a day, the better its suggestions will be.</p>
      </header>

      <section className="flex flex-col gap-4">
        <Field label="First name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} autoComplete="given-name" />
        <Field label="Home city" value={profile.home} onChange={e => setProfile({ ...profile, home: e.target.value })} placeholder="Toronto" />
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>What you enjoy</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(i => {
            const on = profile.interests.includes(i);
            return <button key={i} type="button" aria-pressed={on} onClick={() => toggle(i)} className={clsx('h-11 rounded-full px-4 text-sm transition active:scale-[.97]', on ? 'bg-ink font-semibold text-ground' : 'border border-edge bg-surface font-medium')}>{i}</button>;
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Pace of a day</Eyebrow>
        <Segmented label="Pace of a day" value={profile.pace} onChange={pace => setProfile({ ...profile, pace })} options={[{ id: 'slow', label: 'Unhurried' }, { id: 'balanced', label: 'Balanced' }, { id: 'full', label: 'Full days' }]} />
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Spending</Eyebrow>
        <Segmented label="Spending" value={profile.spend} onChange={spend => setProfile({ ...profile, spend })} options={[{ id: 'save', label: 'Careful' }, { id: 'mid', label: 'Comfortable' }, { id: 'treat', label: 'Treat ourselves' }]} />
      </section>

      <Field label="Anything to avoid" value={profile.avoid} onChange={e => setProfile({ ...profile, avoid: e.target.value })} placeholder="Early starts, seafood, long drives" />

      <section className="flex flex-col gap-3 border-t border-line pt-7">
        <Eyebrow>Appearance</Eyebrow>
        <Segmented label="Appearance" value={theme} onChange={setTheme} options={[{ id: 'system', label: 'Match device' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-7">
        <Eyebrow>This device</Eyebrow>
        <p className="text-[15px] leading-relaxed text-muted">Your {plans.length === 1 ? 'plan is' : `${plans.length} plans are`} saved on this device only. Accounts, syncing between devices and sharing by link are being built.</p>
        <Button variant="danger" className="self-start border border-edge" disabled={!plans.length} onClick={() => { if (confirm('Erase every plan on this device? This cannot be undone.')) setPlans([]); }}>Erase all plans on this device</Button>
      </section>
    </main>
  );
}
