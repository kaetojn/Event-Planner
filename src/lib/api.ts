import type { Access, Features, FoundPlace, Plan, Profile, Session, Suggestion, Travel } from './types';

/** The Cloudflare Worker that holds accounts, plans, and the Claude and Google Maps keys. */
export const WORKER = 'https://plan-a.kaetojn.workers.dev';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(WORKER + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}) });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message ?? `Something went wrong (${res.status}).`);
  return json as T;
}

export type Shared = Access & { plan: Plan };

export const api = {
  login: (email: string, password: string) => post<Session>('/auth/login', { email, password }),
  signup: (email: string, password: string, name: string) => post<Session>('/auth/signup', { email, password, name }),
  me: (token: string) => post<Features & { user: Session['user']; profile: Profile | null; plans: Shared[] }>('/me', {}, token),
  saveProfile: (token: string, profile: Profile) => post('/profile/save', { profile }, token),
  savePlan: (token: string, plan: Plan) => post<{ stale: false } | ({ stale: true } & Shared)>('/plan/save', { plan }, token),
  deletePlan: (token: string, id: string) => post('/plan/delete', { id }, token),
  share: (token: string, id: string, on: boolean) => post<{ view: string | null }>('/plan/share', { id, on }, token),
  invite: (token: string, id: string, email: string, on: boolean) => post<{ editors: string[]; hasAccount: boolean }>(on ? '/plan/invite' : '/plan/uninvite', { id, email }, token),
  view: (token: string) => post<{ plan: Plan; by: string }>('/view', { token }),
  places: (token: string, q: string, near: string) => post<{ places: FoundPlace[] }>('/places', { q, near }, token),
  route: (token: string, points: { lat: number; lng: number }[], mode: Travel) => post<{ legs: ({ mins: number; km: number } | null)[] }>('/route', { points, mode }, token),
  suggest: (token: string, body: { planId: string; date: string; from: string; to: string; wish?: string }) => post<{ suggestions: Suggestion[]; grounded: boolean }>('/suggest', body, token),
};
