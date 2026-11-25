import { useEffect, useState } from 'react';

// "Show me" from the user guide: a sky pulse ring and a one-line note on the spot an update is
// about (see "User guide → Show me" in CLAUDE.md). Spots are marked with data-guide="…".
// Call showGuideSpot() after opening the right screen; it waits for the spot to appear.

const EVENT = 'guide-spotlight';
const WAIT_MS = 4000;     // how long to look for the spot while the screen opens
const SHOW_MS = 6000;     // how long the ring stays
const PAD = 6;

export function showGuideSpot(target: string, note: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { target, note } }));
}

// The first matching spot that's actually on screen (grid and list both mark theirs)
function findSpot(target: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-guide="${CSS.escape(target)}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function GuideSpotlight() {
  const [spot, setSpot] = useState<{ el: HTMLElement; note: string } | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Find the spot once its screen has opened, then bring it into view
  useEffect(() => {
    let timer: number | undefined;
    const onShow = (e: Event) => {
      const { target, note } = (e as CustomEvent<{ target: string; note: string }>).detail;
      const started = Date.now();
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        const el = findSpot(target);
        if (el) {
          window.clearInterval(timer);
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          setSpot({ el, note });
        } else if (Date.now() - started > WAIT_MS) {
          window.clearInterval(timer);
        }
      }, 100);
    };
    window.addEventListener(EVENT, onShow);
    return () => { window.removeEventListener(EVENT, onShow); window.clearInterval(timer); };
  }, []);

  // Follow the spot while the page scrolls into place; close after a while or on any tap
  useEffect(() => {
    if (!spot) return;
    let frame = 0;
    const track = () => {
      setRect(spot.el.isConnected ? spot.el.getBoundingClientRect() : null);
      frame = requestAnimationFrame(track);
    };
    track();
    const close = () => setSpot(null);
    const timeout = window.setTimeout(close, SHOW_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', onKey);
      setRect(null);
    };
  }, [spot]);

  if (!spot || !rect || rect.width === 0) return null;

  const below = rect.bottom + 64 < window.innerHeight;
  const noteLeft = Math.min(Math.max(rect.left - PAD, 16), window.innerWidth - 16 - 280);
  return (
    <div className="fixed inset-0 z-[80] pointer-events-none" aria-live="polite">
      <div
        className="absolute rounded-xl ring-2 ring-sky-500 dark:ring-sky-400 guide-spot-pulse"
        style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
      />
      <div
        role="status"
        className="absolute max-w-[280px] rounded-lg px-3 py-2 text-xs font-medium shadow-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900"
        style={below ? { top: rect.bottom + PAD + 8, left: Math.max(noteLeft, 16) } : { top: rect.top - PAD - 8, left: Math.max(noteLeft, 16), transform: 'translateY(-100%)' }}
      >
        {spot.note}
      </div>
    </div>
  );
}
