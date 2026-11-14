import clsx from 'clsx';
import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { Back } from '@/components/icons';
import { Button, Eyebrow, Field, IconButton, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { featuresAtom, go, plansAtom, profileAtom, sessionAtom, signIn, signOut, themeAtom } from '@/lib/store';

const INTERESTS = ['Food and dining', 'Spa and wellness', 'Beaches', 'Nightlife', 'Art and museums', 'Shopping', 'Outdoors', 'Live music', 'Architecture', 'Sport', 'Wine and cocktails', 'Hidden gems'];

/** Who the plans are for. These answers will steer suggestions once they are switched on. */
export function Profile() {
  const [profile, setProfile] = useAtom(profileAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [plans, setPlans] = useAtom(plansAtom);
  const session = useAtomValue(sessionAtom);
  const toggle = (i: string) => setProfile({ ...profile, interests: profile.interests.includes(i) ? profile.interests.filter(x => x !== i) : [...profile.interests, i] });

  return (
    <main className="stagger mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-6 pt-5 pb-12">
      <header className="flex flex-col gap-3">
        <IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>
        <h1 className="font-serif text-[40px] leading-none font-semibold">Your <span className="font-medium italic">profile</span></h1>
        <p className="text-[15px] leading-relaxed text-muted">The more this knows about how you like to spend a day, the better its suggestions will be.</p>
      </header>

      <Account />

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

      {!session && (
        <section className="flex flex-col gap-3 border-t border-line pt-7">
          <Eyebrow>This device</Eyebrow>
          <p className="text-[15px] leading-relaxed text-muted">Your {plans.length === 1 ? 'plan is' : `${plans.length} plans are`} saved on this device only until you sign in.</p>
          <Button variant="danger" className="self-start border border-edge" disabled={!plans.length} onClick={() => { if (confirm('Erase every plan on this device? This cannot be undone.')) setPlans([]); }}>Erase all plans on this device</Button>
        </section>
      )}
    </main>
  );
}

/** Sign in, create an account, or see which account this device is using. */
function Account() {
  const session = useAtomValue(sessionAtom);
  const features = useAtomValue(featuresAtom);
  const profile = useAtomValue(profileAtom);
  const [mode, setMode] = useState<'in' | 'new'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (session) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
        <Eyebrow>Account</Eyebrow>
        <p className="text-[15px] leading-relaxed">Signed in as <span className="font-semibold">{session.user.email}</span>. Your plans are saved to this account and follow you to any device.</p>
        <p className="text-[13px] leading-relaxed text-muted">Suggestions are {features.ai ? 'on' : 'not set up yet'}. Place search and travel times are {features.places ? 'on' : 'not set up yet'}.</p>
        <Button className="self-start" disabled={busy} onClick={async () => { setBusy(true); await signOut(); setBusy(false); }}>Sign out</Button>
      </section>
    );
  }

  const submit = async () => {
    setBusy(true); setError('');
    try { await signIn(mode === 'in' ? await api.login(email, password) : await api.signup(email, password, profile.name)); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  return (
    <form className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-[18px]" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <div className="flex flex-col gap-1.5">
        <Eyebrow>Account</Eyebrow>
        <p className="text-[15px] leading-relaxed text-muted">{mode === 'in' ? 'Sign in to open your plans on this device.' : 'An account keeps your plans safe, lets you share them, and turns on suggestions. Plans already on this device move into it.'}</p>
      </div>
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
      <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={mode === 'new' ? 8 : undefined} hint={mode === 'new' ? 'At least 8 characters' : undefined} required />
      {error && <p className="text-[14px] font-medium text-bad" role="alert">{error}</p>}
      <Button type="submit" variant="primary" size="lg" disabled={busy || !email || !password}>{busy ? 'One moment' : mode === 'in' ? 'Sign in' : 'Create account'}</Button>
      <button type="button" className="h-11 self-start text-sm font-medium underline underline-offset-4" onClick={() => { setMode(mode === 'in' ? 'new' : 'in'); setError(''); }}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
    </form>
  );
}
