import clsx from 'clsx';
import { useAtom, useAtomValue } from 'jotai';
import { useState, type ReactNode } from 'react';
import { Back, Plus, Refresh } from '@/components/icons';
import { PlaceField } from '@/components/PlaceField';
import { Button, Eyebrow, Field, IconButton, Page, ScreenHeading, Segmented } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { go, plansAtom, profileAtom, profileSyncAtom, refreshPlans, sessionAtom, signIn, signOut, themeAtom } from '@/lib/store';
import type { Profile as ProfileData } from '@/lib/types';

const INTERESTS = ['Food and dining', 'Spa and wellness', 'Beaches', 'Nightlife', 'Art and museums', 'Shopping', 'Outdoors', 'Live music', 'Architecture', 'Sport', 'Wine and cocktails', 'Hidden gems'];
const FIRST_INTERESTS = INTERESTS.slice(0, 6);
const list = new Intl.ListFormat('en-CA', { style: 'long', type: 'conjunction' });

function Disclosure({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return <details className="group border-t border-line">
    <summary className="flex min-h-16 list-none items-center justify-between gap-4 py-2 [&::-webkit-details-marker]:hidden">
      <span className="flex flex-col gap-0.5"><span className="text-[15px] font-semibold">{title}</span><span className="text-[13px] text-muted">{detail}</span></span>
      <Plus width={18} height={18} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-45" />
    </summary>
    <div className="flex flex-col gap-7 pt-4 pb-2">{children}</div>
  </details>;
}

function PasswordField({ value, onChange, autoComplete, hint }: { value: string; onChange: (value: string) => void; autoComplete: string; hint?: string }) {
  const [shown, setShown] = useState(false);
  return <label className="flex flex-col gap-1.5">
    <span className="text-sm font-semibold">Password</span>
    <span className="relative">
      <input type={shown ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} minLength={hint ? 8 : undefined} required className="h-12 w-full rounded-xl border border-edge bg-surface px-3 pr-16 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
      <button type="button" className="absolute inset-y-0 right-1 min-w-12 px-2 text-sm font-semibold text-muted" onClick={() => setShown(value => !value)}>{shown ? 'Hide' : 'Show'}</button>
    </span>
    {hint && <span className="text-[13px] text-muted">{hint}</span>}
  </label>;
}

const authError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Plan A could not reach the server. Check your connection and try again.';
    if (error.status === 401) return 'That email and password do not match. Check them and try again.';
    if (error.status === 409) return 'An account already uses that email. Sign in instead.';
    if (error.status >= 500) return 'The server is having trouble. Your plans on this device are safe; try again shortly.';
  }
  return 'Plan A could not complete that request. Check your details and try again.';
};

const planningStyle = (profile: ProfileData) => {
  const pace = { slow: 'Unhurried days', balanced: 'A balanced pace', full: 'Full days' }[profile.pace];
  const spend = { save: 'careful spending', mid: 'comfortable spending', treat: 'room for a treat' }[profile.spend];
  const favourites = profile.interests.slice(0, 3).map(value => value.toLocaleLowerCase('en-CA'));
  return `${pace} with ${spend}${favourites.length ? ` — and ${list.format(favourites)} in the mix` : ''}.`;
};

/** The profile button leads here: the account screen when signed out, the profile when signed in. */
export function Profile() {
  return useAtomValue(sessionAtom) ? <About /> : <Account />;
}

function Appearance({ divided = true }: { divided?: boolean }) {
  const [theme, setTheme] = useAtom(themeAtom);
  return (
    <section className={clsx('flex flex-col gap-3', divided && 'border-t border-line pt-7')}>
      <Eyebrow>Appearance</Eyebrow>
      <Segmented label="Appearance" value={theme} onChange={setTheme} options={[{ id: 'system', label: 'Match device' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }]} />
    </section>
  );
}

/** iPhone Home Screen apps have no browser chrome, so version refresh belongs in Settings. */
function AppRefresh({ divided = true }: { divided?: boolean }) {
  const session = useAtomValue(sessionAtom);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    if (session) await refreshPlans();
    const url = new URL(location.href);
    url.searchParams.set('refresh', Date.now().toString());
    location.replace(url.toString());
  };
  return <section className={clsx('flex flex-col gap-3', divided && 'border-t border-line pt-7')}>
    <Eyebrow>App</Eyebrow>
    <p className="text-[15px] leading-relaxed text-muted">Load the newest version of Plan A. {session ? 'Your plans are synced first.' : 'Plans saved on this device stay here.'}</p>
    <Button className="self-start" disabled={busy} onClick={() => void refresh()}><Refresh className={busy ? 'animate-spin' : ''} width={17} height={17} />{busy ? 'Refreshing…' : 'Refresh app'}</Button>
  </section>;
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
    } catch (e) { setError(authError(e)); }
    setBusy(false);
  };

  return (
    <Page className="stagger gap-8 pb-12">
      <ScreenHeading action={<IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>} title={mode === 'in' ? <>Welcome <em>back</em></> : <>Create your <em>account</em></>} detail={mode === 'in' ? 'Sign in to open your plans on this device.' : 'An account keeps your plans safe, lets you share them and turns on suggestions. Plans already on this device move into it.'} />

      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void submit(); }}>
        {mode === 'new' && <Field label="First name" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" />}
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        <PasswordField value={password} onChange={setPassword} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} hint={mode === 'new' ? 'At least 8 characters' : undefined} />
        {error && <p className="text-[14px] font-medium text-bad" role="alert">{error}</p>}
        <Button type="submit" variant="primary" size="lg" disabled={busy || !email || !password}>{busy ? (mode === 'in' ? 'Signing in…' : 'Creating account…') : mode === 'in' ? 'Sign in' : 'Create account'}</Button>
        <button type="button" className="h-11 self-start text-sm font-medium underline underline-offset-4" onClick={() => { setMode(mode === 'in' ? 'new' : 'in'); setError(''); }}>{mode === 'in' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
      </form>

      <Disclosure title="App settings" detail="Appearance, updates and this device">
        <Appearance divided={false} />
        <AppRefresh />
        {plans.length > 0 && <section className="flex flex-col gap-3 border-t border-line pt-7">
          <Eyebrow>This device</Eyebrow>
          <p className="text-[15px] leading-relaxed text-muted">{plans.length === 1 ? 'One plan is' : `${plans.length} plans are`} saved on this device only.</p>
          <Button variant="danger" className="self-start border border-bad/40" onClick={() => { if (confirm('Erase every plan on this device? This cannot be undone.')) setPlans([]); }}>Erase all plans on this device</Button>
        </section>}
      </Disclosure>
    </Page>
  );
}

/** Who the plans are for. These answers steer suggestions. */
function About() {
  const [profile, setProfile] = useAtom(profileAtom);
  const [profileSync, setProfileSync] = useAtom(profileSyncAtom);
  const session = useAtomValue(sessionAtom)!;
  const [busy, setBusy] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [showAllInterests, setShowAllInterests] = useState(() => profile.interests.some(interest => !FIRST_INTERESTS.includes(interest)));
  const update = (change: Partial<ProfileData>) => { setProfileSync('saving'); setProfile({ ...profile, ...change }); };
  const toggle = (interest: string) => update({ interests: profile.interests.includes(interest) ? profile.interests.filter(value => value !== interest) : [...profile.interests, interest] });
  const visibleInterests = showAllInterests ? INTERESTS : FIRST_INTERESTS;

  return (
    <Page className="stagger gap-8 pb-12">
      <ScreenHeading action={<IconButton label="Back to your plans" onClick={() => go('/')} className="-ml-3"><Back /></IconButton>} title={<>Your <em>profile</em></>} detail="Teach Plan A how you like to spend a day. Changes save as you make them." />

      <section className="flex flex-col gap-4">
        <Eyebrow>The basics</Eyebrow>
        <Field label="First name" value={profile.name} onChange={e => update({ name: e.target.value })} autoComplete="given-name" />
        <Field label="Home city" value={profile.home} onChange={e => update({ home: e.target.value })} placeholder="Toronto" />
        <PlaceField label="Home address (optional)" value={profile.homeAddress ?? ''} placeholder="123 Main Street" hint="Used only to estimate when to leave for the airport." onText={homeAddress => update({ homeAddress, homeLat: undefined, homeLng: undefined })} onPick={p => update({ homeAddress: p.address ?? [p.name, p.detail].filter(Boolean).join(', '), homeLat: p.lat, homeLng: p.lng })} />
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>What you enjoy</Eyebrow>
        <p className="text-[13px] leading-relaxed text-muted">Pick a few. {profile.interests.length ? `${profile.interests.length} selected.` : 'You can change these any time.'}</p>
        <div className="flex flex-wrap gap-2">
          {visibleInterests.map(i => {
            const on = profile.interests.includes(i);
            return <button key={i} type="button" aria-pressed={on} onClick={() => toggle(i)} className={clsx('h-11 rounded-full px-4 text-sm transition active:scale-[.97]', on ? 'bg-ink font-semibold text-ground' : 'border border-edge bg-surface font-medium')}>{i}</button>;
          })}
        </div>
        <button type="button" aria-expanded={showAllInterests} className="h-11 self-start text-sm font-semibold underline underline-offset-4" onClick={() => setShowAllInterests(value => !value)}>{showAllInterests ? 'Show fewer interests' : `Show ${INTERESTS.length - FIRST_INTERESTS.length} more interests`}</button>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Pace of a day</Eyebrow>
        <Segmented label="Pace of a day" value={profile.pace} onChange={pace => update({ pace })} options={[{ id: 'slow', label: 'Unhurried' }, { id: 'balanced', label: 'Balanced' }, { id: 'full', label: 'Full days' }]} />
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Spending</Eyebrow>
        <Segmented label="Spending" value={profile.spend} onChange={spend => update({ spend })} options={[{ id: 'save', label: 'Careful' }, { id: 'mid', label: 'Comfortable' }, { id: 'treat', label: 'Treat ourselves' }]} />
      </section>

      <Field label="Anything to avoid" value={profile.avoid} onChange={e => update({ avoid: e.target.value })} placeholder="Early starts, seafood, long drives" />

      <section className="flex flex-col gap-2 border-y border-line py-6" aria-live="polite">
        <Eyebrow>Your planning style</Eyebrow>
        <p className="max-w-[30rem] font-serif text-[26px] leading-[1.15] font-semibold">{planningStyle(profile)}</p>
        <p className={clsx('text-[13px] font-medium', profileSync === 'offline' ? 'text-bad' : 'text-muted')}>{profileSync === 'saving' ? 'Saving your profile…' : profileSync === 'offline' ? "Saved on this device. We'll sync when you're online." : 'Saved'}</p>
      </section>

      <Disclosure title="App & account" detail="Appearance, updates and sign out">
        <Appearance divided={false} />
        <AppRefresh />
        <section className="flex flex-col gap-3 border-t border-line pt-7">
          <Eyebrow>Account</Eyebrow>
          <p className="text-[15px] leading-relaxed">Signed in as <span className="font-semibold">{session.user.email}</span>.</p>
          <p className="text-[13px] leading-relaxed text-muted">Signing out removes account plans from this device. They stay in your account.</p>
          {accountError && <p className="text-[14px] font-medium text-bad" role="alert">{accountError}</p>}
          <Button className="self-start" disabled={busy} onClick={async () => { setBusy(true); setAccountError(''); try { await signOut(); } catch (error) { setAccountError((error as Error).message); setBusy(false); } }}>{busy ? 'Signing out…' : 'Sign out'}</Button>
        </section>
      </Disclosure>
    </Page>
  );
}
