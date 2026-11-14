import { clock, dateRange, longDay, money, ordered } from './time';
import { KINDS, PARTS, type Plan } from './types';

/**
 * Draws the plan as a tall picture, in the same layout as the printed itinerary, for saving to a phone.
 * It is drawn by hand on a canvas because a web page cannot take a picture of itself.
 */
export async function planImage(plan: Plan): Promise<Blob> {
  const serif = '"Cormorant Garamond", Georgia, serif', sans = 'Inter, system-ui, sans-serif';
  await Promise.all([`600 96px ${serif}`, `italic 500 52px ${serif}`, `400 30px ${sans}`, `600 30px ${sans}`].map(f => document.fonts.load(f).catch(() => {})));
  const W = 1080, pad = 80, col = 300;
  const canvas = document.createElement('canvas');
  const total = plan.costs.reduce((t, c) => t + c.amount, 0) + plan.days.reduce((t, d) => t + d.items.reduce((s, i) => s + (i.status === 'skipped' ? 0 : i.cost ?? 0), 0), 0);

  // The same drawing runs twice: once to measure the height, once for real.
  const draw = (ctx: CanvasRenderingContext2D, paint: boolean) => {
    const wrap = (text: string, x: number, y: number, max: number, lh: number) => {
      let line = '';
      for (const word of text.split(' ')) {
        if (line && ctx.measureText(`${line} ${word}`).width > max) { if (paint) ctx.fillText(line, x, y); line = word; y += lh; }
        else line = line ? `${line} ${word}` : word;
      }
      if (paint) ctx.fillText(line, x, y);
      return y + lh;
    };
    const rule = (y: number, color: string) => { if (paint) { ctx.fillStyle = color; ctx.fillRect(pad, y, W - pad * 2, 2); } };
    let y = 130;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#7d5f27'; ctx.font = `600 24px ${sans}`;
    if (paint) ctx.fillText(KINDS.find(k => k.id === plan.kind)!.label.toUpperCase().split('').join(' '), pad, y);
    y += 100;
    ctx.fillStyle = '#15181b'; ctx.font = `600 96px ${serif}`;
    y = wrap(plan.title, pad, y, W - pad * 2, 96) - 40;
    ctx.fillStyle = '#5b6066'; ctx.font = `400 30px ${sans}`;
    if (paint) ctx.fillText([plan.destination, dateRange(plan.days[0].date, plan.days[plan.days.length - 1].date)].filter(Boolean).join('  ·  '), pad, y);
    y += 44; rule(y, '#15181b'); y += 80;
    for (const d of plan.days) {
      ctx.fillStyle = '#15181b'; ctx.font = `italic 500 52px ${serif}`;
      if (paint) ctx.fillText(longDay(d.date), pad, y);
      y += 62;
      const items = ordered(d.items).filter(i => i.status !== 'skipped');
      for (const i of items) {
        ctx.fillStyle = '#5b6066'; ctx.font = `400 30px ${sans}`;
        if (paint) ctx.fillText(i.start ? clock(i.start) : PARTS.find(p => p.id === i.part)?.label ?? '', pad, y);
        ctx.fillStyle = '#15181b'; ctx.font = `600 30px ${sans}`;
        y = wrap(i.title + (i.place ? `, ${i.place}` : ''), pad + col, y, W - pad * 2 - col, 42) + 10;
      }
      if (!items.length) { ctx.fillStyle = '#5b6066'; ctx.font = `400 30px ${sans}`; if (paint) ctx.fillText('Nothing planned yet', pad, y); y += 52; }
      y += 6; rule(y, '#e3e3df'); y += 80;
    }
    if (total > 0) {
      ctx.fillStyle = '#7d5f27'; ctx.font = `600 24px ${sans}`;
      if (paint) ctx.fillText('ESTIMATED COST', pad, y);
      ctx.fillStyle = '#15181b'; ctx.font = `600 64px ${serif}`; ctx.textAlign = 'right';
      if (paint) ctx.fillText(money(total), W - pad, y + 8);
      ctx.textAlign = 'left';
      y += 80;
    }
    return y;
  };

  const height = Math.min(16000, draw(canvas.getContext('2d')!, false) + 20);
  canvas.width = W; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, height);
  draw(ctx, true);
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('The picture could not be made.'))), 'image/png'));
}

/** Opens the phone's share menu with the picture, or downloads it where sharing files is not possible. */
export async function saveImage(plan: Plan) {
  const blob = await planImage(plan);
  const file = new File([blob], `${plan.title.replace(/[^\w ]+/g, '').trim() || 'plan'}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: plan.title }); } catch { /* the person closed the share menu */ }
    return;
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
