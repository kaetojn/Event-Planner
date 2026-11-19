import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type PointerEvent, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Tick, Cross } from './icons';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger'; size?: 'md' | 'lg' };

export function Button({ variant = 'secondary', size = 'md', className, ...p }: ButtonProps) {
  return (
    <button
      type="button"
      {...p}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[4px] font-bold tracking-[.02em] transition-[background-color,border-color,color,transform,box-shadow] duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
        size === 'lg' ? 'h-[52px] px-6 text-[15px]' : 'h-11 px-4 text-sm',
        variant === 'primary' && 'bg-accent text-on-accent hover:brightness-95',
        variant === 'secondary' && 'border border-edge bg-surface text-ink hover:border-ink',
        variant === 'soft' && 'bg-tint text-accent hover:brightness-[.97]',
        variant === 'ghost' && 'text-ink',
        variant === 'danger' && 'text-bad',
        className,
      )}
    />
  );
}

export function IconButton({ label, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} {...p} className={clsx('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] transition-[background-color,color,transform] duration-200 hover:bg-wash active:scale-95 disabled:pointer-events-none disabled:opacity-50', className)} />;
}

export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => <div className={clsx('eyebrow', className)}>{children}</div>;

/** The shared phone-first frame keeps every screen on the same quiet editorial grid. */
export const Page = ({ children, className }: { children: ReactNode; className?: string }) => <main className={clsx('mx-auto flex min-h-dvh w-full max-w-[620px] flex-col px-5 pt-5 pb-[max(32px,env(safe-area-inset-bottom))] sm:px-8', className)}>{children}</main>;

export function ScreenHeading({ title, detail, action }: { title: ReactNode; detail?: ReactNode; action?: ReactNode }) {
  return <header className="flex flex-col gap-2.5">
    {action && <div>{action}</div>}
    <h1 className="font-serif text-[42px] leading-[.98] font-bold tracking-[-0.03em] [&_em]:font-medium">{title}</h1>
    {detail && <p className="max-w-[38rem] text-[15px] leading-relaxed text-muted">{detail}</p>}
  </header>;
}

/** The round control that marks something done. It also shows a skipped state. */
export function Check({ state, label, onClick }: { state: 'todo' | 'done' | 'skipped'; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} aria-pressed={state === 'done'} onClick={onClick} className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center">
      {state === 'done' && <span className="inline-flex h-6 w-6 animate-pop items-center justify-center rounded-[2px] bg-accent text-on-accent"><Tick width={13} height={13} /></span>}
      {state === 'skipped' && <span className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] border border-ring text-muted"><Cross width={11} height={11} /></span>}
      {state === 'todo' && <span className="h-6 w-6 rounded-[2px] border border-ring" />}
    </button>
  );
}

/** A large tappable answer, used for one-question-per-screen choices. */
export function Choice({ selected, title, hint, onClick }: { selected: boolean; title: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={clsx('flex items-center gap-4 rounded-[4px] border bg-surface p-[18px] text-left transition active:scale-[.99]', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
      <span className="flex flex-1 flex-col gap-1">
        <span className="font-serif text-2xl leading-tight font-semibold">{title}</span>
        {hint && <span className="text-[13px] text-muted">{hint}</span>}
      </span>
      {selected ? <span className="inline-flex h-6 w-6 animate-pop items-center justify-center rounded-[2px] bg-accent text-on-accent"><Tick width={13} height={13} /></span> : <span className="h-6 w-6 rounded-[2px] border border-ring" />}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid rounded-[4px] border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)} className={clsx('h-11 rounded-[2px] border-r border-line text-[13px] transition last:border-r-0', o.id === value ? 'bg-ink font-bold text-ground' : 'font-medium text-muted')}>{o.label}</button>
      ))}
    </div>
  );
}

export function Field({ label, hint, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={clsx('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-semibold">{label}</span>
      <input {...p} className="h-12 w-full rounded-[4px] border border-edge bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export function SelectField({ label, hint, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <label className={clsx('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-semibold">{label}</span>
      <select {...p} className="h-12 w-full rounded-[4px] border border-edge bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20">
        {children}
      </select>
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

/**
 * A bottom sheet on phones and a centred dialog on wider screens.
 * It is drawn at the top of the page, outside whatever opened it. A sheet left inside an animated
 * section is positioned against that section instead of the screen, and ends up off-centre and cut off.
 */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  // Focus and scroll locking belong to the sheet opening, not every form update.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = before; };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center print:hidden">
      <div className="absolute inset-0 animate-fade bg-black/45" onClick={onClose} />
        <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative flex max-h-[92dvh] w-full max-w-xl animate-sheet flex-col rounded-t-[12px] border-x border-t border-line bg-ground shadow-[var(--shadow)] outline-none md:rounded-[8px] md:border">
        <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-2">
          <h2 className="font-serif text-[28px] leading-none font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-3 text-muted"><Cross /></IconButton>
        </div>
        <div className={clsx('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 pt-3 [&>*]:shrink-0', footer ? 'pb-5' : 'pb-[max(20px,env(safe-area-inset-bottom))]')}>{children}</div>
        {footer && <div className="flex shrink-0 gap-2 border-t border-line px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Lets a row be dragged sideways with a finger: right to complete, left to skip.
 * Returns the handlers to spread on the row. The row slides with the finger and springs back.
 */
export function useSwipe(onRight: () => void, onLeft: () => void) {
  const start = useRef<{ x: number; y: number; el: HTMLElement; live: boolean } | null>(null);
  // A swipe ends with the finger lifting over the row, which the browser also reports as a tap. Ignore that tap.
  const swiped = useRef(false);
  const move = (el: HTMLElement, dx: number, animate: boolean) => {
    el.style.transition = animate ? 'transform .22s cubic-bezier(.16,1,.3,1)' : 'none';
    el.style.transform = dx ? `translateX(${dx}px)` : '';
  };
  return {
    style: { touchAction: 'pan-y' as const },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') return;
      start.current = { x: e.clientX, y: e.clientY, el: e.currentTarget, live: false };
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (!s.live && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) s.live = true;
      if (s.live) move(s.el, Math.max(-96, Math.min(96, dx)), false);
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      if (!s?.live) return;
      swiped.current = true;
      setTimeout(() => { swiped.current = false; }, 80);
      const dx = e.clientX - s.x;
      move(s.el, 0, true);
      if (dx > 64) { navigator.vibrate?.(10); onRight(); }
      else if (dx < -64) { navigator.vibrate?.(10); onLeft(); }
    },
    onClickCapture: (e: { stopPropagation: () => void; preventDefault: () => void }) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); } },
    onPointerCancel: () => { if (start.current) move(start.current.el, 0, true); start.current = null; },
  };
}
