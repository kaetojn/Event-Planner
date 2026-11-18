import type { ReactNode, SVGProps } from 'react';
import type { ItemCategory } from '@/lib/types';

const Svg = ({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
type P = SVGProps<SVGSVGElement>;

export const Back = (p: P) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const Plus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const Tick = (p: P) => <Svg strokeWidth="2.4" {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const Cross = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const Person = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>;
export const Arrow = (p: P) => <Svg {...p}><path d="M7 17L17 7M9 7h8v8" /></Svg>;
export const Refresh = (p: P) => <Svg {...p}><path d="M20 11a8 8 0 10-2.3 5.7" /><path d="M20 5v6h-6" /></Svg>;
export const Calendar = (p: P) => <Svg {...p}><path d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 011 1v14H4V6a1 1 0 011-1z" /></Svg>;
export const Plane = (p: P) => <Svg {...p}><path d="M3 11.5l8.5 1.5 7.5-7.5c1-1 2.5.5 1.5 1.5L14 14.5l1.5 5-2 1-3-4-3 3-2-.5 2-4-4-1.5z" /></Svg>;
export const Bed = (p: P) => <Svg {...p}><path d="M4 18V8m16 10v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m-3 0h16M7 10V7h5a2 2 0 012 2v1" /></Svg>;
export const Food = (p: P) => <Svg {...p}><path d="M7 3v7m-3-7v4a3 3 0 006 0V3M7 10v11M16 3v18m0-18c3 2 4 5 4 8h-4" /></Svg>;
export const Car = (p: P) => <Svg {...p}><path d="M5 17h14l1-5-2-5H6l-2 5 1 5zM7 17v2m10-2v2M4 12h16M8 14h.01M16 14h.01" /></Svg>;
export const Ticket = (p: P) => <Svg {...p}><path d="M4 7h16v4a2 2 0 000 4v4H4v-4a2 2 0 000-4V7zM12 7v12" /></Svg>;
export const Pin = (p: P) => <Svg {...p}><path d="M12 21s6-5 6-11a6 6 0 10-12 0c0 6 6 11 6 11z" /><circle cx="12" cy="10" r="2" /></Svg>;
export const More = (p: P) => <Svg {...p}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></Svg>;

export function CategoryIcon({ category = 'activity', ...p }: P & { category?: ItemCategory }) {
  if (category === 'flight') return <Plane {...p} />;
  if (category === 'stay') return <Bed {...p} />;
  if (category === 'food') return <Food {...p} />;
  if (category === 'transport') return <Car {...p} />;
  if (category === 'booking') return <Ticket {...p} />;
  if (category === 'other') return <More {...p} />;
  return <Pin {...p} />;
}
