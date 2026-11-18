import { atom, getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { daysBetween } from './time';
import type { Access, Features, Item, Plan, Profile, Session, Theme } from './types';

// Everything is kept on the device first, so the app opens instantly and works offline.
// With an account, plans are also saved to the server and shared between devices and people.
const keep = { getOnInit: true };
const blank: Profile = { name: '', home: '', homeAddress: '', interests: [], pace: 'balanced', spend: 'mid', avoid: '' };
export const plansAtom = atomWithStorage<Plan[]>('plan-a:plans', [], undefined, keep);
export const profileAtom = atomWithStorage<Profile>('plan-a:profile', blank, undefined, keep);
export const themeAtom = atomWithStorage<Theme>('plan-a:theme', 'system', undefined, keep);
export const sessionAtom = atomWithStorage<Session | null>('plan-a:session', null, undefined, keep);
export const accessAtom = atomWithStorage<Record<string, Access>>('plan-a:access', {}, undefined, keep);
export const featuresAtom = atomWithStorage<Features>('plan-a:features', { ai: false, places: false }, undefined, keep);
/** For each plan saved to the account, the version the server has. A plan that differs still needs saving. */
const savedAtom = atomWithStorage<Record<string, string>>('plan-a:saved', {}, undefined, keep);
export const syncAtom = atom<'idle' | 'saving' | 'offline'>('idle');
export const lastSyncAtom = atom<string | null>(null);

const store = getDefaultStore();
const token = () => store.get(sessionAtom)?.token;

export function addPlan(plan: Plan) {
  store.set(plansAtom, plans => [...plans, plan]);
}

export function removePlan(id: string) {
  store.set(plansAtom, plans => plans.filter(p => p.id !== id));
  const t = token();
  if (t && store.get(savedAtom)[id]) {
    store.set(savedAtom, ({ [id]: _, ...rest }) => rest);
    void api.deletePlan(t, id).catch(() => {});
  }
}

export function updatePlan(id: string, change: (plan: Plan) => Plan) {
  store.set(plansAtom, plans => plans.map(p => (p.id === id ? { ...change(p), updatedAt: new Date().toISOString() } : p)));
}

const inDay = (plan: Plan, date: string, change: (items: Item[]) => Item[]): Plan => ({
  ...plan,
  days: plan.days.map(d => (d.date === date ? { ...d, items: change(d.items) } : d)),
});

export const saveItem = (planId: string, date: string, item: Item) =>
  updatePlan(planId, p => {
    const target = item.startDate ?? date;
    const cleared = p.days.map(d => ({ ...d, items: d.items.filter(i => i.id !== item.id) }));
    return { ...p, days: cleared.map(d => (d.date === target ? { ...d, items: [...d.items, { ...item, startDate: target }] } : d)) };
  });

export const patchItem = (planId: string, date: string, itemId: string, patch: Partial<Item>) =>
  updatePlan(planId, p => inDay(p, date, items => items.map(i => (i.id === itemId ? { ...i, ...patch } : i))));

export const removeItem = (planId: string, date: string, itemId: string) =>
  updatePlan(planId, p => inDay(p, date, items => items.filter(i => i.id !== itemId)));

/** Changes a plan's range without losing items. Items outside the new range move to the nearest edge day. */
export function resizePlan(id: string, start: string, end: string) {
  updatePlan(id, p => {
    const fresh = daysBetween(start, end);
    const byDate = new Map(fresh.map(d => [d.date, d]));
    for (const old of p.days) for (const item of old.items) {
      const wanted = item.startDate ?? old.date;
      const target = wanted < start ? start : wanted > end ? end : wanted;
      byDate.get(target)!.items.push({ ...item, startDate: target, ...(item.endDate && item.endDate < target ? { endDate: target } : item.endDate && item.endDate > end ? { endDate: end } : {}) });
    }
    return { ...p, days: fresh };
  });
}

export const setAccess = (id: string, access: Access) => store.set(accessAtom, a => ({ ...a, [id]: access }));

/* ───────────── Keeping the device and the account in step ───────────── */

function signedOut(e: unknown) {
  if (e instanceof ApiError && e.status === 401) { store.set(sessionAtom, null); return true; }
  return false;
}

/** Sends every plan that has changed since it was last saved. Returns once they are all stored. */
export async function push(): Promise<void> {
  const t = token();
  if (!t) return;
  const saved = store.get(savedAtom);
  const waiting = store.get(plansAtom).filter(p => saved[p.id] !== p.updatedAt);
  if (!waiting.length) return;
  store.set(syncAtom, 'saving');
  try {
    for (const plan of waiting) {
      const r = await api.savePlan(t, plan);
      if (r.stale) {
        // Someone else saved a newer copy. Theirs wins, and this device shows it.
        store.set(savedAtom, s => ({ ...s, [plan.id]: r.plan.updatedAt }));
        store.set(plansAtom, plans => plans.map(p => (p.id === plan.id ? r.plan : p)));
      } else {
        store.set(savedAtom, s => ({ ...s, [plan.id]: plan.updatedAt }));
        if (!store.get(accessAtom)[plan.id]) setAccess(plan.id, { role: 'owner', owner: store.get(sessionAtom)!.user.email, editors: [], view: null });
      }
    }
    store.set(syncAtom, 'idle');
    store.set(lastSyncAtom, new Date().toISOString());
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) return void pull();
    store.set(syncAtom, signedOut(e) ? 'idle' : 'offline');
  }
}

/** Fetches the account's plans and merges them with what is on the device. The newer copy of each plan wins. */
export async function pull(): Promise<void> {
  const t = token();
  if (!t) return;
  try {
    const me = await api.me(t);
    const saved = store.get(savedAtom);
    const local = store.get(plansAtom);
    const remote = new Map(me.plans.map(s => [s.plan.id, s]));
    const merged: Plan[] = [];
    const nowSaved: Record<string, string> = {};
    for (const p of local) {
      const r = remote.get(p.id);
      if (r) {
        const mine = saved[p.id] !== p.updatedAt && p.updatedAt > r.plan.updatedAt;
        merged.push(mine ? p : r.plan);
        nowSaved[p.id] = r.plan.updatedAt;
      } else if (!saved[p.id]) merged.push(p); // made on this device and not yet saved
      // Otherwise it was deleted or unshared elsewhere, so it leaves this device too.
    }
    for (const [id, r] of remote) if (!local.some(p => p.id === id)) { merged.push(r.plan); nowSaved[id] = r.plan.updatedAt; }
    store.set(savedAtom, nowSaved);
    store.set(plansAtom, merged);
    store.set(accessAtom, Object.fromEntries(me.plans.map(s => [s.plan.id, { role: s.role, owner: s.owner, editors: s.editors, view: s.view }])));
    store.set(featuresAtom, { ai: me.ai, places: me.places });
    store.set(sessionAtom, s => (s ? { ...s, user: me.user } : s));
    const mine = store.get(profileAtom);
    const untouched = JSON.stringify(mine) === JSON.stringify(blank);
    if (me.profile && untouched) { profileSaved = JSON.stringify(me.profile); store.set(profileAtom, me.profile); }
    else if (!me.profile && !untouched) pushProfile();
    else if (me.profile) profileSaved = JSON.stringify(me.profile);
    void push();
    store.set(lastSyncAtom, new Date().toISOString());
  } catch (e) {
    if (!signedOut(e)) store.set(syncAtom, 'offline');
  }
}

export async function refreshPlans() {
  await push();
  await pull();
}

let profileSaved = '';
function pushProfile() {
  const t = token();
  const profile = store.get(profileAtom);
  if (!t || JSON.stringify(profile) === profileSaved) return;
  profileSaved = JSON.stringify(profile);
  void api.saveProfile(t, profile).catch(() => { profileSaved = ''; });
}

export async function signIn(session: Session) {
  store.set(sessionAtom, session);
  await pull();
}

/** Signing out takes the account's plans off this device. They stay in the account. */
export async function signOut() {
  await push();
  store.set(sessionAtom, null);
  store.set(plansAtom, []);
  store.set(profileAtom, blank);
  store.set(accessAtom, {});
  store.set(savedAtom, {});
  profileSaved = '';
}

/** Starts background saving. Changes are sent a moment after each edit, and when the app is put away. */
export function startSync() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = (fn: () => void, ms: number) => { clearTimeout(timer); timer = setTimeout(fn, ms); };
  store.sub(plansAtom, () => soon(() => void push(), 1200));
  store.sub(profileAtom, () => soon(pushProfile, 1500));
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? (void push(), pushProfile()) : void pull()));
  addEventListener('online', () => void pull());
  void pull();
}

/* ───────────── Screens ───────────── */

/** The app's screens live in the address after the #, so the back button works and a plan can be bookmarked. */
export type Route = { screen: 'home' } | { screen: 'new' } | { screen: 'profile' } | { screen: 'plan'; id: string } | { screen: 'view'; token: string };

function readRoute(): Route {
  const [, a, b] = location.hash.split('/');
  if (a === 'new') return { screen: 'new' };
  if (a === 'profile') return { screen: 'profile' };
  if (a === 'plan' && b) return { screen: 'plan', id: b };
  if (a === 'view' && b) return { screen: 'view', token: b };
  return { screen: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const on = () => { setRoute(readRoute()); scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path: string) => { location.hash = path; };
