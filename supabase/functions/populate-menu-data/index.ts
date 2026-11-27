import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NutritionValue {
  value: string;
  dailyValue: string | null;
  displayValue: string;
}

interface Nutrition {
  calories?: NutritionValue;
  protein?: NutritionValue;
  carbohydrates?: NutritionValue;
  fat?: NutritionValue;
  sugar?: NutritionValue;
  saturatedFat?: NutritionValue;
  sodium?: NutritionValue;
  fiber?: NutritionValue;
}

interface Icon {
  rank: number;
  name: string;
  fileName: string;
}

interface MenuItem {
  id: number;
  stringId: string;
  portion?: string | null;
  date: string;
  name: string;
  description: string | null;
  enticingDescription: string;
  ingredients: string;
  price: string;
  mrn: string;
  calories: string;
  allergens: string;
  nutrition: Nutrition;
  icons: Icon[];
  mealPeriodId: number;
  mealPeriod: string;
  stationId: number;
  mealStation: string;
  menuCollectionId: number;
  menuName: string;
  sourceName: string;
  sortOrder: number;
}

interface ApiResponse {
  hasError: boolean;
  errorCode: string | null;
  error: string | null;
  menuItems: MenuItem[];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function upsertItems(supabase: any, items: MenuItem[]) {
  const mealPeriodsMap = new Map<number, string>();
  const stationsMap = new Map<number, string>();

  items.forEach((item) => {
    if (item.mealPeriodId && item.mealPeriod) mealPeriodsMap.set(item.mealPeriodId, item.mealPeriod);
    if (item.stationId && item.mealStation) stationsMap.set(item.stationId, item.mealStation);
  });

  const uniqueItems = new Map();
  items.forEach((item) => {
    const uniqueKey = `${item.id}-${item.date.split("T")[0]}`;
    uniqueItems.set(uniqueKey, {
      id: item.id,
      string_id: item.stringId,
      date: item.date.split("T")[0],
      name: item.name,
      description: item.description,
      enticing_description: item.enticingDescription,
      ingredients: item.ingredients,
      price: item.price,
      mrn: item.mrn,
      portion: item.portion ?? null,
      calories: item.calories,
      allergens: item.allergens,
      nutrition: item.nutrition,
      icons: item.icons,
      meal_period_id: item.mealPeriodId,
      station_id: item.stationId,
      menu_collection_id: item.menuCollectionId,
      menu_name: item.menuName,
      source_name: item.sourceName,
      sort_order: item.sortOrder,
      updated_at: new Date().toISOString(),
    });
  });

  const menuItems = Array.from(uniqueItems.values());

  const mealPeriods = Array.from(mealPeriodsMap.entries()).map(([id, name]) => ({ id, name }));
  for (const period of mealPeriods) {
    await supabase.from("meal_periods").upsert(period, { onConflict: "id" });
  }

  const stations = Array.from(stationsMap.entries()).map(([id, name]) => ({ id, name }));
  for (const station of stations) {
    await supabase.from("stations").upsert(station, { onConflict: "id" });
  }

  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < menuItems.length; i += batchSize) {
    const batch = menuItems.slice(i, i + batchSize);
    const { error: itemsError } = await supabase
      .from("menu_items")
      .upsert(batch, { onConflict: "id,date" });
    if (itemsError) throw itemsError;
    inserted += batch.length;
  }

  // Brand matching
  const { data: brandPatterns } = await supabase
    .from("brand_station_patterns")
    .select("brand_id, station_pattern");
  if (brandPatterns && brandPatterns.length > 0) {
    const patternMap = new Map<string, number>();
    for (const bp of brandPatterns) {
      patternMap.set(bp.station_pattern.toLowerCase().replace(/[^a-z0-9]/g, ""), bp.brand_id);
    }
    const { data: allStations } = await supabase.from("stations").select("id, name");
    if (allStations) {
      for (const station of allStations) {
        const normalized = station.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const brandId = patternMap.get(normalized);
        if (brandId) {
          await supabase.from("stations").update({ brand_id: brandId }).eq("id", station.id);
        }
      }
    }
  }

  const dates = [...new Set(menuItems.map((m) => m.date))].sort();
  return { inserted, dates, mealPeriods: mealPeriods.length, stations: stations.length };
}

// This function runs with the service role and is called from the browser with the public
// anon key, so anyone with that key can call it. Each mode is limited to what the app needs:
// cleanup only removes past days, and direct-insert only takes well-formed source items for
// nearby weeks (never app-made products), in batches of a sane size.
const MAX_DIRECT_ITEMS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (d: Date) => d.toISOString().split("T")[0];
const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

// A source item the sync would send: numeric id, a source MRN (not an app-made CUSTOM- one),
// a name, and a menu date within a week back / three weeks ahead
function isSourceItem(item: any): boolean {
  if (!item || typeof item !== "object") return false;
  if (typeof item.id !== "number" || typeof item.name !== "string") return false;
  if (typeof item.mrn !== "string" || item.mrn === "" || item.mrn.startsWith("CUSTOM-")) return false;
  if (item.sourceName === "converge-custom") return false;
  if (typeof item.date !== "string") return false;
  const day = item.date.split("T")[0];
  if (!isDay(day)) return false;
  const now = Date.now();
  return day >= isoDay(new Date(now - 7 * DAY_MS)) && day <= isoDay(new Date(now + 21 * DAY_MS));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;

    // --- CHECK COVERAGE: returns which dates have data ---
    if (mode === "check-coverage") {
      const { data, error } = await supabase
        .from("menu_items")
        .select("date")
        .order("date");
      if (error) throw error;
      const dates = [...new Set((data || []).map((r: any) => r.date))].sort();
      return jsonRes({ dates });
    }

    // --- CLEANUP: delete data before a given date ---
    // Products created in the app (source_name 'converge-custom', MRN 'CUSTOM-…') are kept.
    if (mode === "cleanup") {
      const before = body?.before;
      if (!isDay(before)) return jsonRes({ error: "'before' must be a YYYY-MM-DD date" }, 400);
      // Only past days can be removed (a day of slack for time zones)
      if (before > isoDay(new Date(Date.now() + DAY_MS))) {
        return jsonRes({ error: "'before' can't be in the future" }, 400);
      }
      const { error, count } = await supabase
        .from("menu_items")
        .delete({ count: "exact" })
        .lt("date", before)
        .or("source_name.is.null,source_name.neq.converge-custom");
      if (error) throw error;

      // Also clean product_availability for old data
      await supabase
        .from("product_availability")
        .delete()
        .lt("last_seen_date", before)
        .not("mrn", "like", "CUSTOM-%");

      return jsonRes({ deleted: count, before });
    }

    // --- DIRECT INSERT: accept pre-fetched menuItems array ---
    if (mode === "direct-insert" && Array.isArray(body?.menuItems)) {
      if (body.menuItems.length > MAX_DIRECT_ITEMS) {
        return jsonRes({ error: `At most ${MAX_DIRECT_ITEMS} items per call` }, 400);
      }
      const items = body.menuItems.filter(isSourceItem);
      const result = items.length ? await upsertItems(supabase, items) : { inserted: 0 };
      return jsonRes({ success: true, skipped: body.menuItems.length - items.length, ...result });
    }

    // --- DEFAULT: fetch from Wand API and insert ---
    const startDate = body?.date || new Date().toISOString().split("T")[0];
    if (body?.date !== undefined && !isDay(body.date)) return jsonRes({ error: "'date' must be a YYYY-MM-DD date" }, 400);
    const weeks = Math.min(Math.max(Number(body?.weeks) || 1, 1), 8);
    const sapCode = body?.sapCode || "72917";
    const venue = body?.venue || "73103";

    const results: Array<{ week: number; date: string; items: number; error?: string }> = [];
    let totalInserted = 0;

    for (let week = 0; week < weeks; week++) {
      const weekDate = addDays(startDate, week * 7);
      const apiUrl = `https://api.wanddigital.com/services/webtrition/client/wds?SapCode=${sapCode}&Venue=${venue}&mealPeriod=&MenuDate=${weekDate}T00:00:00&SourceSystem=1&Days=7&IncludeNutrition=true&IncludeIcons=true&IncludeAllergens=true&IncludeIngredients=true&IncludeRecipe=false`;

      console.log(`Fetching week ${week + 1}/${weeks}: ${weekDate}`);

      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
          },
        });

        if (response.status === 204 || !response.ok) {
          results.push({ week: week + 1, date: weekDate, items: 0, error: `HTTP ${response.status}` });
          continue;
        }

        let text = await response.text();
        if (!text || text.trim() === "") {
          results.push({ week: week + 1, date: weekDate, items: 0, error: "Empty response" });
          continue;
        }

        text = text.replace(/[\x00-\x1f\x7f]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");

        const data: ApiResponse = JSON.parse(text);
        if (data.hasError) {
          results.push({ week: week + 1, date: weekDate, items: 0, error: data.error || "API error" });
          continue;
        }

        const result = await upsertItems(supabase, data.menuItems);
        totalInserted += result.inserted;
        results.push({ week: week + 1, date: weekDate, items: result.inserted });
      } catch (weekErr) {
        const msg = weekErr instanceof Error ? weekErr.message : JSON.stringify(weekErr);
        console.error(`Week ${week + 1} error:`, weekErr);
        results.push({ week: week + 1, date: weekDate, items: 0, error: msg });
      }
    }

    return jsonRes({
      success: true,
      totalInserted,
      weekResults: results,
    });
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
