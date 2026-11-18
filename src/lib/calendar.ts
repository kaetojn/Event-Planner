import { addMinutes, localStamp, zonedIso } from './time';
import type { Item, Plan } from './types';

const esc = (s: string) => s.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
const partTime = { morning: '09:00', afternoon: '13:00', evening: '18:00' } as const;

function range(item: Item, fallbackDate: string) {
  const startDate = item.startDate ?? fallbackDate;
  const start = item.start ?? partTime[item.part ?? 'morning'];
  const fallback = addMinutes(startDate, start, 60);
  return { startDate, start, endDate: item.endDate ?? fallback.date, end: item.end ?? fallback.time };
}

function vevent(plan: Plan, item: Item, fallbackDate: string) {
  const r = range(item, fallbackDate), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const location = item.flight?.from && item.flight?.to ? `${item.flight.from} to ${item.flight.to}` : [item.place, item.address].filter(Boolean).join(', ');
  const details = [item.note, item.flight?.number && [item.flight.airline, item.flight.number].filter(Boolean).join(' ')].filter(Boolean).join('\n');
  return ['BEGIN:VEVENT', `UID:${item.id}@plan-a`, `DTSTAMP:${now}`, `DTSTART${item.startZone ? `;TZID=${item.startZone}` : ''}:${localStamp(r.startDate, r.start)}`, `DTEND${item.endZone || item.startZone ? `;TZID=${item.endZone ?? item.startZone}` : ''}:${localStamp(r.endDate, r.end)}`, `SUMMARY:${esc(item.title)}`, location ? `LOCATION:${esc(location)}` : '', details ? `DESCRIPTION:${esc(details)}` : '', 'END:VEVENT'].filter(Boolean).join('\r\n');
}

function file(name: string, events: string[]) {
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Plan A//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...events, 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'plan'}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadItemCalendar = (plan: Plan, item: Item, date: string) => file(item.title, [vevent(plan, item, date)]);
export const downloadPlanCalendar = (plan: Plan) => file(plan.title, plan.days.flatMap(day => day.items.filter(i => i.status !== 'skipped').map(item => vevent(plan, item, day.date))));

export function googleCalendarUrl(plan: Plan, item: Item, date: string) {
  const r = range(item, date), zone = item.startZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const location = item.flight?.from && item.flight?.to ? `${item.flight.from} to ${item.flight.to}` : [item.place, item.address].filter(Boolean).join(', ');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: item.title, dates: `${stamp(zonedIso(r.startDate, r.start, zone))}/${stamp(zonedIso(r.endDate, r.end, item.endZone ?? zone))}`, ctz: zone, details: item.note ?? `From ${plan.title}`, location });
  return `https://calendar.google.com/calendar/render?${q}`;
}
