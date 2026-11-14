import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { Cross } from '@/components/icons';
import { Button, Eyebrow, IconButton, Sheet } from '@/components/ui';
import { api } from '@/lib/api';
import { saveImage } from '@/lib/image';
import { accessAtom, go, push, removePlan, sessionAtom, setAccess } from '@/lib/store';
import type { Plan } from '@/lib/types';
import { asText } from './Itinerary';

/** Everything to do with getting a plan to other people: a view-only link, editors, text, PDF and image. */
export function ShareSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const session = useAtomValue(sessionAtom);
  const access = useAtomValue(accessAtom)[plan.id];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [email, setEmail] = useState('');
  const [invited, setInvited] = useState('');
  const owner = !!session && (!access || access.role === 'owner');
  const link = access?.view ? `${location.origin}${location.pathname}#/view/${access.view}` : '';

  const run = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await push(); await work(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const base = () => access ?? { role: 'owner' as const, owner: session!.user.email, editors: [], view: null };
  const setLink = (on: boolean) => run(async () => { const r = await api.share(session!.token, plan.id, on); setAccess(plan.id, { ...base(), view: r.view }); });
  const invite = (address: string, on: boolean) => run(async () => {
    const r = await api.invite(session!.token, plan.id, address, on);
    setAccess(plan.id, { ...base(), editors: r.editors });
    setEmail('');
    setInvited(on ? (r.hasAccount ? `${address} can now open and edit this plan.` : `${address} will see this plan once they create an account with that email.`) : '');
  });
  const copy = async (what: string, text: string) => {
    try {
      if (what === 'text' && navigator.share) await navigator.share({ title: plan.title, text });
      else { await navigator.clipboard.writeText(text); setCopied(what); }
    } catch { /* the person closed the share menu */ }
  };

  return (
    <Sheet title="Share" onClose={onClose}>
      {!session ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-[18px]">
          <p className="text-[15px] leading-relaxed text-muted">Sign in to share a link that stays up to date, or to invite someone to edit this plan with you.</p>
          <Button variant="soft" className="self-start" onClick={() => go('/profile')}>Sign in or create an account</Button>
        </div>
      ) : owner ? (
        <>
          <section className="flex flex-col gap-3">
            <Eyebrow>View-only link</Eyebrow>
            {link ? (
              <>
                <p className="text-[15px] leading-relaxed text-muted">Anyone with this link can see the plan and save it as a PDF or an image. They cannot change it and do not need an account.</p>
                <div className="truncate rounded-xl border border-edge bg-surface px-3 py-3 text-[13px] text-muted">{link}</div>
                <div className="flex gap-2">
                  <Button variant="primary" className="flex-1" onClick={() => copy('link', link)}>{copied === 'link' ? 'Copied' : 'Copy the link'}</Button>
                  <Button disabled={busy} onClick={() => setLink(false)}>Turn off</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[15px] leading-relaxed text-muted">Make a link that shows this plan, always up to date, to anyone you send it to.</p>
                <Button variant="primary" disabled={busy} onClick={() => setLink(true)}>Create a view-only link</Button>
              </>
            )}
          </section>
          <section className="flex flex-col gap-3 border-t border-line pt-4">
            <Eyebrow>People who can edit</Eyebrow>
            {(access?.editors ?? []).map(e => (
              <div key={e} className="flex min-h-11 items-center justify-between gap-2 text-[15px]">
                <span className="truncate">{e}</span>
                <IconButton label={`Stop sharing with ${e}`} disabled={busy} onClick={() => invite(e, false)} className="-mr-3 text-muted"><Cross width={16} height={16} /></IconButton>
              </div>
            ))}
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (email.trim()) void invite(email.trim(), true); }}>
              <input aria-label="Email address to invite" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Their email address" autoComplete="off" className="h-12 flex-1 rounded-xl border border-edge bg-surface px-3 text-base placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
              <Button type="submit" className="h-12" disabled={busy || !email.trim()}>Invite</Button>
            </form>
            {invited && <p className="text-[13px] text-muted" role="status">{invited} No email is sent, so let them know.</p>}
          </section>
        </>
      ) : (
        <p className="text-[15px] leading-relaxed text-muted">This plan was shared with you by {access.owner}. You can edit it. Only they can change who it is shared with.</p>
      )}
      {error && <p className="text-[14px] font-medium text-bad" role="alert">{error}</p>}

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <Eyebrow>Send a copy</Eyebrow>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => copy('text', asText(plan))}>{copied === 'text' ? 'Copied' : 'As text'}</Button>
          <Button onClick={() => { onClose(); setTimeout(() => print(), 350); }}>As PDF</Button>
          <Button onClick={() => void saveImage(plan)}>As image</Button>
        </div>
      </section>

      <div className="border-t border-line pt-4 pb-3">
        <Button variant="danger" className="border border-edge" onClick={() => { if (confirm(owner || !session ? `Delete "${plan.title}"? This cannot be undone.` : `Remove "${plan.title}" from your plans?`)) { removePlan(plan.id); go('/'); } }}>{owner || !session ? 'Delete this plan' : 'Leave this plan'}</Button>
      </div>
    </Sheet>
  );
}
