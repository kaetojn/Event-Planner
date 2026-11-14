import type { ReactNode, SVGProps } from 'react';

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
