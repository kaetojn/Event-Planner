import { getDefaultStore } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useEffect, useState } from 'react';
import type { Item, Plan, Profile, Theme } from './types';

// Everything is kept on this device for now. Accounts and syncing arrive with the Worker.
const keep = { getOnInit: true };
export const plansAtom = atomWithStorage<Plan[]>('plan-a:plans', [], undefined, keep);
export const profileAtom = atomWithStorage<Profile>('plan-a:profile', { name: '', home: '', interests: [], pace: 'balanced', spend: 'mid', avoid: '' }, undefined, keep);
export const themeAtom = atomWithStorage<Theme>('plan-a:theme', 'system', undefined, keep);

const store = getDefaultStore();

export function addPlan(plan: Plan) {
  store.set(plansAtom, plans => [...plans, plan]);
}

export function removePlan(id: string) {
  store.set(plansAtom, plans => plans.filter(p => p.id !== id));
}

export function updatePlan(id: string, change: (plan: Plan) => Plan) {
  store.set(plansAtom, plans => plans.map(p => (p.id === id ? { ...change(p), updatedAt: new Date().toISOString() } : p)));
}

const inDay = (plan: Plan, date: string, change: (items: Item[]) => Item[]): Plan => ({
  ...plan,
  days: plan.days.map(d => (d.date === date ? { ...d, items: change(d.items) } : d)),
});

export const saveItem = (planId: string, date: string, item: Item) =>
  updatePlan(planId, p => inDay(p, date, items => (items.some(i => i.id === item.id) ? items.map(i => (i.id === item.id ? item : i)) : [...items, item])));

export const patchItem = (planId: string, date: string, itemId: string, patch: Partial<Item>) =>
  updatePlan(planId, p => inDay(p, date, items => items.map(i => (i.id === itemId ? { ...i, ...patch } : i))));

export const removeItem = (planId: string, date: string, itemId: string) =>
  updatePlan(planId, p => inDay(p, date, items => items.filter(i => i.id !== itemId)));

/** The app's screens live in the address after the #, so the back button works and a plan can be bookmarked. */
export type Route = { screen: 'home' } | { screen: 'new' } | { screen: 'profile' } | { screen: 'plan'; id: string };

function readRoute(): Route {
  const [, a, b] = location.hash.split('/');
  if (a === 'new') return { screen: 'new' };
  if (a === 'profile') return { screen: 'profile' };
  if (a === 'plan' && b) return { screen: 'plan', id: b };
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
