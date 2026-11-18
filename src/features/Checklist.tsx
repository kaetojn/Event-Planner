import clsx from 'clsx';
import { useState } from 'react';
import { Cross } from '@/components/icons';
import { Button, Check, Eyebrow, IconButton } from '@/components/ui';
import { updatePlan } from '@/lib/store';
import { starterTasks } from '@/lib/templates';
import { uid } from '@/lib/time';
import type { Plan } from '@/lib/types';

/** Everything to sort out before or during the plan. Open tasks lead; finished ones settle to the bottom. */
export function Checklist({ plan }: { plan: Plan }) {
  const [text, setText] = useState('');
  const done = plan.tasks.filter(t => t.done).length;
  const tasks = [...plan.tasks.filter(t => !t.done), ...plan.tasks.filter(t => t.done)];
  const set = (tasks: Plan['tasks']) => updatePlan(plan.id, p => ({ ...p, tasks }));
  const add = () => {
    if (!text.trim()) return;
    set([...plan.tasks, { id: uid(), text: text.trim(), done: false }]);
    setText('');
  };

  return (
    <section className="flex animate-rise flex-col gap-5 pt-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Checklist</Eyebrow>
        {plan.tasks.length ? (
          <>
            <div className="font-serif text-[40px] leading-none font-semibold"><span className="num">{done}</span> of <span className="num">{plan.tasks.length}</span> <span className="font-medium italic">done</span></div>
            <div className="h-1 overflow-hidden rounded-full bg-line" role="img" aria-label={`${done} of ${plan.tasks.length} tasks done`}><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(done / plan.tasks.length) * 100}%` }} /></div>
          </>
        ) : (
          <>
            <p className="font-serif text-[28px] leading-tight font-medium">Nothing on the list yet.</p>
            <Button variant="soft" className="self-start" onClick={() => set(starterTasks(plan.kind))}>Start with the usual list</Button>
          </>
        )}
      </div>

      <ul className="flex flex-col border-b border-line">
        {tasks.map(t => (
          <li key={t.id} className="group flex min-h-[52px] items-center gap-1 border-t border-line transition-colors hover:bg-wash">
            <div className="-ml-2"><Check state={t.done ? 'done' : 'todo'} label={t.done ? `Mark "${t.text}" as not done` : `Mark "${t.text}" as done`} onClick={() => { navigator.vibrate?.(10); set(plan.tasks.map(x => (x.id === t.id ? { ...x, done: !x.done } : x))); }} /></div>
            <span className={clsx('flex-1 py-3 pl-2 text-[15px] leading-snug transition-colors', t.done && 'text-muted line-through')}>{t.text}</span>
            <IconButton label={`Remove "${t.text}"`} onClick={() => set(plan.tasks.filter(x => x.id !== t.id))} className="-mr-3 text-muted"><Cross width={16} height={16} /></IconButton>
          </li>
        ))}
      </ul>

      <form className="flex gap-2 border-t border-line pt-4" onSubmit={e => { e.preventDefault(); add(); }}>
        <input aria-label="New task" value={text} onChange={e => setText(e.target.value)} placeholder="Add a task" enterKeyHint="done" className="h-12 flex-1 rounded-xl border border-edge bg-surface px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
        <Button type="submit" variant="primary" className="h-12" disabled={!text.trim()}>Add</Button>
      </form>
    </section>
  );
}
