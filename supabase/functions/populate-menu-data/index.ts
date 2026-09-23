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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));

    // Direct insert mode: accept pre-fetched menuItems array
    if (body?.mode === "direct-insert" && Array.isArray(body?.menuItems)) {
      const items: MenuItem[] = body.menuItems;
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

      // Upsert meal periods
      const mealPeriods = Array.from(mealPeriodsMap.entries()).map(([id, name]) => ({ id, name }));
      for (const period of mealPeriods) {
        await supabase.from("meal_periods").upsert(period, { onConflict: "id" });
      }

      // Upsert stations
      const stations = Array.from(stationsMap.entries()).map(([id, name]) => ({ id, name }));
      for (const station of stations) {
        await supabase.from("stations").upsert(station, { onConflict: "id" });
      }

      // Upsert menu items
      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < menuItems.length; i += batchSize) {
        const batch = menuItems.slice(i, i + batchSize);
        const { error: itemsError } = await supabase
          .from("menu_items")
          .upsert(batch, { onConflict: "id,date" });
        if (itemsError) {
          console.error("Insert error:", itemsError);
          throw itemsError;
        }
        inserted += batch.length;
      }

      const dates = [...new Set(menuItems.map((m) => m.date))].sort();
      return new Response(
        JSON.stringify({ success: true, inserted, dates, mealPeriods: mealPeriods.length, stations: stations.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startDate = body?.date || new Date().toISOString().split("T")[0];
    const weeks = Math.min(body?.weeks || 4, 8);
    const sapCode = body?.sapCode || "72917";
    const venue = body?.venue || "73103";
    const allergenMenu = body?.allergenMenu || "all";

    const results: Array<{ week: number; date: string; items: number; error?: string }> = [];
    let totalInserted = 0;
    const allMealPeriodsMap = new Map<number, string>();
    const allStationsMap = new Map<number, string>();

    for (let week = 0; week < weeks; week++) {
      const weekDate = addDays(startDate, week * 7);
      const apiUrl = `https://api.wanddigital.com/services/webtrition/client/wds?SapCode=${sapCode}&Venue=${venue}&mealPeriod=&MenuDate=${weekDate}T00:00:00&SourceSystem=1&Days=7&IncludeNutrition=true&IncludeIcons=true&IncludeAllergens=true&IncludeIngredients=true&IncludeRecipe=false`;

      console.log(`Fetching week ${week + 1}/${weeks}: ${weekDate}`);

      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
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

        // Strip invalid control characters that break JSON.parse
        text = text.replace(/[\x00-\x1f\x7f]/g, (c) => c === "\n" || c === "\r" || c === "\t" ? c : "");

        const data: ApiResponse = JSON.parse(text);
        if (data.hasError) {
          results.push({ week: week + 1, date: weekDate, items: 0, error: data.error || "API error" });
          continue;
        }

        data.menuItems.forEach((item) => {
          if (item.mealPeriodId && item.mealPeriod) {
            allMealPeriodsMap.set(item.mealPeriodId, item.mealPeriod);
          }
          if (item.stationId && item.mealStation) {
            allStationsMap.set(item.stationId, item.mealStation);
          }
        });

        const uniqueItems = new Map();
        data.menuItems.forEach((item) => {
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
        const batchSize = 100;

        for (let i = 0; i < menuItems.length; i += batchSize) {
          const batch = menuItems.slice(i, i + batchSize);
          const { error: itemsError } = await supabase
            .from("menu_items")
            .upsert(batch, { onConflict: "id,date" });

          if (itemsError) {
            console.error(`Error inserting batch for week ${week + 1}:`, itemsError);
            throw itemsError;
          }
        }

        totalInserted += menuItems.length;
        results.push({ week: week + 1, date: weekDate, items: menuItems.length });
      } catch (weekErr) {
        const msg = weekErr instanceof Error ? weekErr.message : JSON.stringify(weekErr);
        console.error(`Week ${week + 1} error:`, weekErr);
        results.push({ week: week + 1, date: weekDate, items: 0, error: msg });
      }
    }

    // Upsert meal periods
    const mealPeriods = Array.from(allMealPeriodsMap.entries()).map(([id, name]) => ({ id, name }));
    for (const period of mealPeriods) {
      await supabase.from("meal_periods").upsert(period, { onConflict: "id" });
    }

    // Upsert stations
    const stations = Array.from(allStationsMap.entries()).map(([id, name]) => ({ id, name }));
    for (const station of stations) {
      await supabase.from("stations").upsert(station, { onConflict: "id" });
    }

    // Brand matching: assign brand_id to stations based on pattern matching
    const { data: brandPatterns } = await supabase
      .from("brand_station_patterns")
      .select("brand_id, station_pattern");

    if (brandPatterns && brandPatterns.length > 0) {
      const patternMap = new Map<string, number>();
      for (const bp of brandPatterns) {
        patternMap.set(bp.station_pattern.toLowerCase().replace(/[^a-z0-9]/g, ""), bp.brand_id);
      }

      const { data: allStations } = await supabase.from("stations").select("id, name");
      let matchCount = 0;

      if (allStations) {
        for (const station of allStations) {
          const normalized = station.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          const brandId = patternMap.get(normalized);
          if (brandId) {
            await supabase.from("stations").update({ brand_id: brandId }).eq("id", station.id);
            matchCount++;
          }
        }
      }

      console.log(`Brand matching: ${matchCount} stations matched out of ${allStations?.length || 0}`);
    }

    // Get availability stats
    const { data: availabilityData } = await supabase
      .from("product_availability")
      .select("mrn, day_of_week, meal_period_id");

    const availabilityStats = {
      uniqueProducts: new Set(availabilityData?.map((a) => a.mrn) || []).size,
      totalCombinations: availabilityData?.length || 0,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fetched ${weeks} weeks starting ${startDate}. ${totalInserted} total menu items inserted.`,
        stats: {
          totalItems: totalInserted,
          mealPeriods: mealPeriods.length,
          stations: stations.length,
          productAvailability: availabilityStats,
          weekResults: results,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Detailed error:", error);
    const errorMessage = error instanceof Error
      ? `${error.message}\nStack: ${error.stack}`
      : JSON.stringify(error);

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
