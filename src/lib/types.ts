export type Kind = 'weekend' | 'trip' | 'birthday' | 'wedding' | 'event';
/** How tightly a day is planned: by the half hour, only the fixed points, or morning, afternoon and evening. */
export type Detail = 'half' | 'fixed' | 'loose';
export type Part = 'morning' | 'afternoon' | 'evening';
export type Status = 'todo' | 'done' | 'skipped';
export type Theme = 'system' | 'light' | 'dark';
export type Travel = 'drive' | 'walk' | 'transit';

/** Who can open a plan that is kept in an account. */
export interface Access { role: 'owner' | 'editor'; owner: string; editors: string[]; view: string | null }
export interface Session { token: string; user: { email: string; name: string } }
export interface Features { ai: boolean; places: boolean }
export interface PlaceMatch { id: string; name: string; detail: string }
export interface FoundPlace { id: string; name: string; address: string; lat: number; lng: number; type?: string }
export interface Suggestion { title: string; start: string; end?: string; place?: string; address?: string; lat?: number; lng?: number; rating?: number; cost?: number; why: string }

export interface Item {
  id: string;
  title: string;
  /** "HH:MM" in 24-hour time. An item has a start time or a part of the day, not both. */
  start?: string;
  end?: string;
  part?: Part;
  /** Where it happens: a name the person typed, or one chosen from a place search. */
  place?: string;
  /** Set when the place came from a search, so travel time can be worked out. */
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
  cost?: number;
  status: Status;
}

export interface Day { date: string; items: Item[] }
export interface Task { id: string; text: string; done: boolean }
/** A cost that is not tied to a moment in the day, such as flights or a hotel. */
export interface Cost { id: string; label: string; amount: number }

export interface Plan {
  id: string;
  title: string;
  kind: Kind;
  destination: string;
  /** When the destination was chosen from the map: the rest of its address, and where it is. */
  area?: string;
  at?: { lat: number; lng: number };
  detail: Detail;
  people: number;
  budget?: number;
  days: Day[];
  tasks: Task[];
  costs: Cost[];
  /** How the group gets between stops. Drives travel times. */
  travel?: Travel;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  name: string;
  home: string;
  interests: string[];
  pace: 'slow' | 'balanced' | 'full';
  spend: 'save' | 'mid' | 'treat';
  avoid: string;
}

export const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: 'weekend', label: 'Weekend away', hint: 'Two or three days, close to home' },
  { id: 'trip', label: 'Trip', hint: 'Flights, hotels and several days' },
  { id: 'birthday', label: 'Birthday', hint: 'A day or a trip built around someone' },
  { id: 'wedding', label: 'Wedding', hint: 'The day itself, hour by hour' },
  { id: 'event', label: 'Something else', hint: 'Any day worth planning properly' },
];

export const DETAILS: { id: Detail; label: string; hint: string }[] = [
  { id: 'half', label: 'By the half hour', hint: '11:30 Check in, 12:00 Lunch, 2:00 Shopping' },
  { id: 'fixed', label: 'Only the fixed points', hint: 'Train 12:15, Check in 2:00, Dinner 7:30' },
  { id: 'loose', label: 'Morning, afternoon, evening', hint: 'Morning: relax. Evening: dinner' },
];

export const PARTS: { id: Part; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
];
