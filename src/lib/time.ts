import type { Day, Item, Part } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/** "19:00" becomes "7:00 pm". */
export function clock(t: string) {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** 90 becomes "1 h 30", 240 becomes "4 hours", 20 becomes "20 min". */
export function span(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (!h) return `${m} min`;
  if (!m) return h === 1 ? '1 hour' : `${h} hours`;
  return `${h} h ${m}`;
}

const PART_START: Record<Part, number> = { morning: 8 * 60, afternoon: 13 * 60, evening: 18 * 60 };
export const partOf = (mins: number): Part => (mins < 12 * 60 ? 'morning' : mins < 17 * 60 ? 'afternoon' : 'evening');

/** Where an item sits in the day. Items with only a part of the day sort to the start of that part. */
export const sortKey = (i: Item) => (i.start ? toMin(i.start) : PART_START[i.part ?? 'morning'] - 0.5);
export const ordered = (items: Item[]) => [...items].sort((a, b) => sortKey(a) - sortKey(b));

export interface Gap { mins: number; /** True when the earlier item has an end time, so the gap is known to be free. */ free: boolean }

/** The time between two neighbouring items, when both have clock times. */
export function gapBetween(a: Item, b: Item): Gap | null {
  if (!a.start || !b.start) return null;
  const from = a.end ? toMin(a.end) : toMin(a.start);
  const mins = toMin(b.start) - from;
  return mins > 0 ? { mins, free: !!a.end } : null;
}

/** True when two timed items overlap, which a careful planner wants to know. */
export function clashes(a: Item, b: Item) {
  return !!(a.start && a.end && b.start && toMin(b.start) < toMin(a.end));
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
const at = (date: string) => new Date(`${date}T12:00:00`);

export function daysBetween(start: string, end: string): Day[] {
  const out: Day[] = [];
  const last = at(end < start ? start : end);
  for (const d = at(start); d <= last && out.length < 60; d.setDate(d.getDate() + 1)) out.push({ date: iso(d), items: [] });
  return out;
}

export const shortDay = (date: string) => at(date).toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric' });
export const longDay = (date: string) => at(date).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

/** "Sep 4 to 9" or "Dec 30 to Jan 2" or "Sep 4". */
export function dateRange(start: string, end: string) {
  const a = at(start), b = at(end);
  const md = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  if (start === end) return md(a);
  return a.getMonth() === b.getMonth() ? `${md(a)} to ${b.getDate()}` : `${md(a)} to ${md(b)}`;
}

export const money = (n: number) => n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: n % 1 ? 2 : 0 });
