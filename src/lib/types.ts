export type Kind = 'weekend' | 'trip' | 'birthday' | 'wedding' | 'event';
/** How tightly a day is planned: by the half hour, only the fixed points, or morning, afternoon and evening. */
export type Detail = 'half' | 'fixed' | 'loose';
export type Part = 'morning' | 'afternoon' | 'evening';
export type Status = 'todo' | 'done' | 'skipped';
export type Theme = 'system' | 'light' | 'dark';
export type Travel = 'drive' | 'walk' | 'transit';
export type ItemCategory = 'none' | 'activity' | 'flight' | 'stay' | 'food' | 'transport';
export type ItemAccent = 'brass' | 'moss' | 'clay' | 'oxblood' | 'slate' | 'aubergine';

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
  /** Date ranges are optional for older items; the containing day remains the start date. */
  startDate?: string;
  endDate?: string;
  /** IANA time zones, particularly important when departure and arrival differ. */
  startZone?: string;
  endZone?: string;
  part?: Part;
  category?: ItemCategory;
  /** A curated accent for artifact cards. It never changes the application theme. */
  accent?: ItemAccent;
  /** Where it happens: a name the person typed, or one chosen from a place search. */
  place?: string;
  /** Set when the place came from a search, so travel time can be worked out. */
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
  cost?: number;
  status: Status;
  flight?: {
    airline?: string;
    number?: string;
    from?: string;
    fromAddress?: string;
    fromLat?: number;
    fromLng?: number;
    to?: string;
    toAddress?: string;
    toLat?: number;
    toLng?: number;
  };
  activity?: { reference?: string };
  stay?: { confirmation?: string; room?: string };
  food?: { partySize?: number; reservation?: string };
  transport?: { from?: string; to?: string; operator?: string; service?: string; seat?: string };
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
  /** Where the group is staying. It may intentionally be undecided. */
  stay?: { name?: string; address?: string; lat?: number; lng?: number; tbd?: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  name: string;
  home: string;
  homeAddress?: string;
  homeLat?: number;
  homeLng?: number;
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

export const ITEM_CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'activity', label: 'Activity' },
  { id: 'flight', label: 'Flight' },
  { id: 'stay', label: 'Stay' },
  { id: 'food', label: 'Food' },
  { id: 'transport', label: 'Transport' },
];

export const ITEM_ACCENTS: { id: ItemAccent; label: string }[] = [
  { id: 'brass', label: 'Brass' },
  { id: 'moss', label: 'Moss' },
  { id: 'clay', label: 'Clay' },
  { id: 'oxblood', label: 'Oxblood' },
  { id: 'slate', label: 'Slate' },
  { id: 'aubergine', label: 'Aubergine' },
];

export const CATEGORY_ACCENT: Record<Exclude<ItemCategory, 'none'>, ItemAccent> = {
  activity: 'aubergine',
  flight: 'brass',
  stay: 'moss',
  food: 'oxblood',
  transport: 'slate',
};

/** Old saved values remain readable while the app moves them into the smaller category system. */
export const normalizeItemCategory = (category?: string): ItemCategory => {
  if (category === 'booking') return 'activity';
  if (category === 'other' || !category) return 'none';
  return ITEM_CATEGORIES.some(option => option.id === category) ? category as ItemCategory : 'none';
};
