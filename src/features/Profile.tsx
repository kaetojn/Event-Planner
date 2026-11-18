import clsx from 'clsx';
import { useAtom, useAtomValue } from 'jotai';
import { useState } from 'react';
import { Back } from '@/components/icons';
import { PlaceField } from '@/components/PlaceField';
import { Button, Eyebrow, Field, IconButton, Page, ScreenHeading, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { featuresAtom, go, plansAtom, profileAtom, sessionAtom, signIn, signOut, themeAtom } from '@/lib/store';

const INTERESTS = ['Food and dining', 'Spa and wellness', 'Beaches', 'Nightlife', 'Art and museums', 'Shopping', 'Outdoors', 'Live music', 'Architecture', 'Sport', 'Wine and cocktails', 'Hidden gems'];

/** The profile button leads here: the account screen when signed out, the profile when signed in. */
export function Profile() {
  return useAtomValue(sessionAtom) ? <About /> : <Account />;
}

function Appearance() {
  const [theme, setTheme] = useAtom(themeAtom);
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-7">
      <Eyebrow>Appearance</Eyebrow>
      <Segmented label="Appearance" value={theme} onChange={setTheme} options={[{ id: 'system', label: 'Match device' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
    </section>
  );
}

/** Sign in or create an account. Without one, plans stay on this device. */
function Account() {
  const [profile, setProfile] = useAtom(profileAtom);
  const [plans, setPlans] = useAtom(plansAtom);
  const [mode, setMode] = useState<'in' | 'new'>('in');
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'new') {
        const session = await api.signup(email, password, name.trim());
        if (name.trim()) setProfile({ ...profile, name: name.trim() });
        await signIn(session);
      } else await signIn(await api.login(email, password));
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  return (
    <Page className="stagger gap-8 pb-12">
      <ScreenHeading action={<IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>} title={mode === 'in' ? <>Welcome <em>back</em></> : <>Create your <em>account</em></>} detail={mode === 'in' ? 'Sign in to open your plans on this device.' : 'An account keeps your plans safe, lets you share them and turns on suggestions. Plans already on this device move into it.'} />

      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        {mode === 'new' && <Field label="First name" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" />}
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={mode === 'new' ? 8 : undefined} hint={mode === 'new' ? 'At least 8 characters' : undefined} required />
        {error && <p className="text-[14px] font-medium text-bad" role="alert">{error}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={busy || !email || !password}>{busy ? 'One moment' : mode === 'in' ? 'Sign in' : 'Create account'}</Button>
        <button type="button" className="h-11 self-start text-sm font-medium underline underline-offset-4" onClick={() => { setMode(mode === 'in' ? 'new' : 'in'); setError(''); }}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
      </form>

      <Appearance />

      {plans.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-line pt-7">
          <Eyebrow>This device</Eyebrow>
          <p className="text-[15px] leading-relaxed text-muted">{plans.length === 1 ? 'One plan is' : `${plans.length} plans are`} saved on this device only.</p>
          <Button variant="danger" className="self-start border border-edge" onClick={() => { if (confirm('Erase every plan on this device? This cannot be undone.')) setPlans([]); }}>Erase all plans on this device</Button>
        </section>
      )}
    </Page>
  );
}

/** Who the plans are for. These answers steer suggestions. */
function About() {
  const [profile, setProfile] = useAtom(profileAtom);
  const session = useAtomValue(sessionAtom)!;
  const features = useAtomValue(featuresAtom);
  const [busy, setBusy] = useState(false);
  const toggle = (i: string) => setProfile({ ...profile, interests: profile.interests.includes(i) ? profile.interests.filter(x => x !== i) : [...profile.interests, i] });

  return (
    <Page className="stagger gap-8 pb-12">
      <ScreenHeading action={<IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>} title={<>Your <em>profile</em></>} detail="The more this knows about how you like to spend a day, the better its suggestions will be. Changes save as you make them." />

      <section className="flex flex-col gap-4">
        <Field label="First name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} autoComplete="given-name" />
        <Field label="Home city" value={profile.home} onChange={e => setProfile({ ...profile, home: e.target.value })} placeholder="Toronto" />
        <PlaceField label="Home address (optional)" value={profile.homeAddress ?? ''} placeholder="Used for airport travel time" onText={homeAddress => setProfile({ ...profile, homeAddress, homeLat: undefined, homeLng: undefined })} onPick={p => setProfile({ ...profile, homeAddress: p.address ?? [p.name, p.detail].filter(Boolean).join(', '), homeLat: p.lat, homeLng: p.lng })} />
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

      <Appearance />

      <section className="flex flex-col gap-3 border-t border-line pt-7">
        <Eyebrow>Account</Eyebrow>
        <p className="text-[15px] leading-relaxed">Signed in as <span className="font-semibold">{session.user.email}</span>.</p>
        <p className="text-[13px] leading-relaxed text-muted">Suggestions are {features.ai ? 'on' : 'not set up yet'}. Place search and travel times are {features.places ? 'on' : 'not set up yet'}.</p>
        <Button className="self-start" disabled={busy} onClick={async () => { setBusy(true); await signOut(); }}>Sign out</Button>
      </section>
    </Page>
  );
}
