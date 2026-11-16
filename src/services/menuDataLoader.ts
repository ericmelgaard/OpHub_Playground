import { supabase } from '../lib/supabase';
import { getWeekStartDate, getWeekEndDate, localDate } from '../lib/weekSchedule';

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-menu-data`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const WAND_API_BASE = 'https://api.wanddigital.com/services/webtrition/client/wds';
const SAP_CODE = '72917';
const VENUE = '73103';

// The 7 days of a week (Sunday–Saturday), as fetched from the source
function getWeekDateRange(weekOffset: number): { start: string; end: string } {
  const start = getWeekStartDate(weekOffset);
  return { start: localDate(start), end: localDate(getWeekEndDate(start)) };
}

async function callEdgeFunction(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge function error ${res.status}: ${text}`);
  }
  return res.json();
}

async function weekHasData(weekOffset: number): Promise<boolean> {
  const { start, end } = getWeekDateRange(weekOffset);
  const { count, error } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .gte('date', start)
    .lte('date', end)
    // Products created in the app don't count as synced Webtrition data
    .or('source_name.is.null,source_name.neq.converge-custom');
  if (error) {
    console.error('Error checking week data:', error);
    return false;
  }
  return (count || 0) > 0;
}

async function fetchFromWandApi(startDate: string): Promise<any[] | null> {
  const url = `${WAND_API_BASE}?SapCode=${SAP_CODE}&Venue=${VENUE}&mealPeriod=&MenuDate=${startDate}T00:00:00&SourceSystem=1&Days=7&IncludeNutrition=true&IncludeIcons=true&IncludeAllergens=true&IncludeIngredients=true&IncludeRecipe=false`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json();
    if (data.hasError || !data.menuItems?.length) return null;
    return data.menuItems;
  } catch {
    return null;
  }
}

export type WeekLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export async function ensureWeekData(weekOffset: number): Promise<{ status: WeekLoadStatus; inserted: number }> {
  const hasData = await weekHasData(weekOffset);
  if (hasData) return { status: 'loaded', inserted: 0 };

  const { start } = getWeekDateRange(weekOffset);

  // Try 1: edge function fetches from Wand API directly
  try {
    const result = await callEdgeFunction({ date: start, weeks: 1 });
    if (result.totalInserted > 0) {
      return { status: 'loaded', inserted: result.totalInserted };
    }
  } catch (e) {
    console.warn('Edge function fetch failed:', e);
  }

  // Try 2: browser fetches Wand API, sends to edge function via direct-insert
  const items = await fetchFromWandApi(start);
  if (items && items.length > 0) {
    try {
      const result = await callEdgeFunction({ mode: 'direct-insert', menuItems: items });
      if (result.inserted > 0) {
        return { status: 'loaded', inserted: result.inserted };
      }
    } catch (e) {
      console.error('Direct insert failed:', e);
    }
  }

  return { status: 'error', inserted: 0 };
}

export async function cleanupOldWeeks(): Promise<number> {
  const before = localDate(getWeekStartDate(0));
  try {
    const result = await callEdgeFunction({ mode: 'cleanup', before });
    return result.deleted || 0;
  } catch (e) {
    console.error('Cleanup failed:', e);
    return 0;
  }
}

export async function ensureCurrentAndNextWeek(): Promise<void> {
  await Promise.all([
    ensureWeekData(0),
    ensureWeekData(1),
  ]);
  cleanupOldWeeks().catch(() => {});
}
