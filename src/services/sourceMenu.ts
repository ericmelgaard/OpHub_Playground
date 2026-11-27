import { supabase } from '../lib/supabase';
import { getWeekStartDate, localDate } from '../lib/weekSchedule';
import {
  SourceDay, SourceMenuItem, SOURCE_CACHE_VERSION,
  dayKey, deleteDays, hashItems, readDays, writeDays,
} from '../lib/sourceCache';

// The source menu per day, cached in this browser (src/lib/sourceCache.ts), following the menu
// platform spec §5.6: show the cached copy at once, refresh it in the background when it's past its
// max age, and update the app quietly only when something actually changed.
//
// - This week and next are kept warm (loaded at startup).
// - Later weeks are fetched when someone opens them.
// - Retention (spec §10.1): days before this week are dropped; days after next week are dropped
//   once past their max age (fetched again when opened). Run with the stored copy's cleanup.

const SOURCE = 'webtrition';

// Max age before a background re-check (spec §5.2 sync policy; Proposed, tune with real data)
const MAX_AGE_TODAY = 15 * 60 * 1000;        // here-and-now validation
const MAX_AGE_NEAR = 60 * 60 * 1000;         // rest of this week and next week
const MAX_AGE_LATER = 24 * 60 * 60 * 1000;   // weeks after next

// ---- The data call -------------------------------------------------------------------------
// STUB: reads the stored copy (Supabase `menu_items`, filled by populate-menu-data) for the dates.
// When real data is wired in, replace this with the ETL's source-menu call (spec §12.2,
// `GET /source-menu`), which pulls from Webtrition when its own copy is stale. Keep the shape:
// one SourceDay per date asked for; a date with no menu is 'not_published'.
async function fetchSourceDays(dates: string[]): Promise<SourceDay[]> {
  const sorted = [...dates].sort();
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, date, mrn, portion, station_id, meal_period_id, name, price')
      .gte('date', sorted[0])
      .lte('date', sorted[sorted.length - 1])
      // Products created in the app aren't source data
      .or('source_name.is.null,source_name.neq.converge-custom')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const byDate = new Map<string, SourceMenuItem[]>();
  for (const r of rows) {
    const list = byDate.get(r.date) ?? [];
    list.push({
      id: r.id, date: r.date, mrn: r.mrn, portion: r.portion ?? null,
      stationId: r.station_id, mealPeriodId: r.meal_period_id, name: r.name, price: r.price,
    });
    byDate.set(r.date, list);
  }
  const now = Date.now();
  return dates.map(date => {
    const items = byDate.get(date) ?? [];
    return {
      key: dayKey(SOURCE, date), source: SOURCE, date,
      status: items.length ? 'published' : 'not_published',
      items, hash: hashItems(items), fetchedAt: now, version: SOURCE_CACHE_VERSION,
    };
  });
}

// ---- Change notices (this tab and other open tabs) -----------------------------------------
type Listener = (changedDates: string[]) => void;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;
try {
  channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('wand-source-menu') : null;
  if (channel) channel.onmessage = e => listeners.forEach(l => l(e.data as string[]));
} catch { channel = null; }

// Called with the dates whose menu changed after a background refresh
export function onSourceMenuChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function announce(dates: string[]) {
  if (dates.length === 0) return;
  listeners.forEach(l => l(dates));
  try { channel?.postMessage(dates); } catch { /* other tabs miss it; they re-check on their own */ }
}

// ---- Weeks ------------------------------------------------------------------------------------
const weekDates = (weekOffset: number): string[] => {
  const start = getWeekStartDate(weekOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return localDate(d);
  });
};

function maxAge(date: string, weekOffset: number): number {
  if (date === localDate(new Date())) return MAX_AGE_TODAY;
  return weekOffset <= 1 ? MAX_AGE_NEAR : MAX_AGE_LATER;
}

// One refresh per week at a time, in this tab and (where supported) across tabs
const inFlight = new Map<number, Promise<void>>();

async function refreshWeek(weekOffset: number, dates: string[]): Promise<void> {
  const existing = inFlight.get(weekOffset);
  if (existing) return existing;
  const job = (async () => {
    const work = async () => {
      const cached = await readDays(SOURCE, dates);
      const fresh = await fetchSourceDays(dates);
      const changed = fresh.filter(d => {
        const old = cached.get(d.date);
        return !old || old.hash !== d.hash || old.status !== d.status;
      }).map(d => d.date);
      await writeDays(fresh);
      // A first load isn't a change people need to hear about; a different answer is
      announce(changed.filter(date => cached.has(date)));
    };
    const locks = (navigator as any).locks;
    if (locks?.request) await locks.request(`wand-source-week-${dates[0]}`, work);
    else await work();
  })().finally(() => inFlight.delete(weekOffset));
  inFlight.set(weekOffset, job);
  return job;
}

export interface SourceWeek {
  days: Map<string, SourceDay>;
  // Missing days were fetched before returning; stale ones are being refreshed in the background
  refreshing: boolean;
}

// A week's source menu: cached days at once; days missing from the cache are fetched first (the
// one wait); days past their max age are refreshed in the background (onSourceMenuChange reports
// any that changed). `force` re-checks every day now.
export async function getSourceWeek(weekOffset: number, opts: { force?: boolean } = {}): Promise<SourceWeek> {
  const dates = weekDates(weekOffset);
  let days = await readDays(SOURCE, dates);
  const missing = dates.filter(d => !days.has(d));
  if (missing.length || opts.force) {
    try {
      await refreshWeek(weekOffset, dates);
      days = await readDays(SOURCE, dates);
    } catch (e) {
      console.warn('Source menu fetch failed; using what is cached', e);
    }
    return { days, refreshing: false };
  }
  const now = Date.now();
  const stale = dates.some(d => now - days.get(d)!.fetchedAt > maxAge(d, weekOffset));
  if (stale) refreshWeek(weekOffset, dates).catch(e => console.warn('Background source refresh failed', e));
  return { days, refreshing: stale };
}

// This week and next, kept warm (spec: two weeks of data)
export async function warmSourceWeeks(): Promise<void> {
  await Promise.all([getSourceWeek(0), getSourceWeek(1)]);
}

// Retention, with the stored copy's cleanup (spec §10.1): drop days before this week, and days
// after next week once past their max age
export async function cleanupSourceCache(): Promise<number> {
  const thisWeek = localDate(getWeekStartDate(0));
  const afterNext = localDate(getWeekStartDate(2));
  const now = Date.now();
  return deleteDays(d =>
    d.date < thisWeek || (d.date >= afterNext && now - d.fetchedAt > MAX_AGE_LATER));
}
