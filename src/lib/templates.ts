import { daysBetween, today, uid } from './time';
import type { Kind, Plan, Task } from './types';

/** The usual things to sort out for each kind of plan. A starting point the person edits, not a rule. */
const STARTERS: Record<Kind, string[]> = {
  weekend: ['Book the stay', 'Book travel there and back', 'Reserve dinners', 'Check check-in and checkout times', 'Pack'],
  trip: ['Check passports and entry rules', 'Book flights', 'Book stays', 'Arrange travel insurance', 'Plan the way to and from the airport', 'Reserve the dinners that book out', 'Tell the bank you are travelling', 'Pack'],
  birthday: ['Settle the guest list', 'Book the venue or table', 'Send invitations', 'Order the cake', 'Buy the gift', 'Plan what to wear'],
  wedding: ['Confirm arrival times with every vendor', 'Share the day’s timeline with the wedding party', 'Pack the rings, vows and licence', 'Prepare final payments and tips', 'Choose someone to keep the day on time', 'Confirm transport between venues', 'Pack an emergency kit', 'Confirm the photo list with the photographer'],
  event: ['Confirm the venue', 'Confirm who is coming', 'Plan how to get there', 'Plan what to wear'],
};

export const starterTasks = (kind: Kind): Task[] => STARTERS[kind].map(text => ({ id: uid(), text, done: false }));

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A made-up weekend, so a new visitor can try every part of the app before planning their own. */
export function samplePlan(): Plan {
  const start = today();
  const days = daysBetween(start, shift(start, 2));
  const item = (title: string, start?: string, end?: string, extra: object = {}) => ({ id: uid(), title, start, end, status: 'todo' as const, ...extra });
  days[0].items = [
    item('Train out of the city', '12:15', '13:45', { category: 'transport', transport: { from: 'Union Station', to: 'The Lakes', operator: 'VIA Rail', service: 'Train 64', seat: '7A' } }),
    item('Early check-in', '14:00', undefined, { category: 'stay', place: 'The Lakes Hotel', stay: { confirmation: 'PLANA', room: '412' } }),
    item('Dinner reservation', '19:30', undefined, { category: 'food', place: 'The Dining Room', food: { partySize: 2, reservation: 'DINNER-2' }, cost: 180 }),
  ];
  days[1].items = [
    item('Breakfast in the room', '11:00', undefined, { category: 'food', place: 'The Lakes Hotel', food: { partySize: 2 } }),
    item('Spa', '12:30', '15:00', { category: 'activity', place: 'Bath House', activity: { reference: 'SPA-12' }, cost: 320 }),
    item('Dinner reservation', '19:00', undefined, { category: 'food', place: 'Field & Hearth', food: { partySize: 2 }, cost: 200 }),
  ];
  days[2].items = [
    item('Gym', '08:00', '09:00', { category: 'activity', place: 'The Lakes Hotel' }),
    item('Late checkout', '12:00', undefined, { category: 'stay', place: 'The Lakes Hotel', stay: { room: '412' } }),
    item('Brunch', '13:00', undefined, { category: 'food', place: 'Field & Hearth', food: { partySize: 2 }, cost: 90 }),
    item('Train home', '15:00', '16:30', { category: 'transport', transport: { from: 'The Lakes', to: 'Union Station', operator: 'VIA Rail', service: 'Train 71' } }),
  ];
  const now = new Date().toISOString();
  return {
    id: uid(), title: 'Sample Weekend', kind: 'weekend', destination: 'A hotel out of town', detail: 'fixed', people: 2, budget: 1800,
    days, tasks: starterTasks('weekend'), costs: [{ id: uid(), label: 'Hotel, 2 nights', amount: 760 }, { id: uid(), label: 'Train tickets', amount: 140 }],
    createdAt: now, updatedAt: now,
  };
}
