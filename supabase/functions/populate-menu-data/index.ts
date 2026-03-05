import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const apiUrl = `https://api.wanddigital.com/services/webtrition/client/wds?SapCode=68100&Venue=71886&mealPeriod=&MenuDate=${today}T00:00:00&SourceSystem=1&Days=3&IncludeNutrition=true&IncludeIcons=false&IncludeAllergens=true&IncludeIngredients=false&IncludeRecipe=false`;

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const text = await response.text();

    if (!text || text.trim() === '') {
      throw new Error('API returned empty response');
    }

    const data: ApiResponse = JSON.parse(text);

    if (data.hasError) {
      throw new Error(data.error || "API returned an error");
    }

    const mealPeriodsMap = new Map<number, string>();
    const stationsMap = new Map<number, string>();

    data.menuItems.forEach(item => {
      if (item.mealPeriodId && item.mealPeriod) {
        mealPeriodsMap.set(item.mealPeriodId, item.mealPeriod);
      }
      if (item.stationId && item.mealStation) {
        stationsMap.set(item.stationId, item.mealStation);
      }
    });

    const mealPeriods = Array.from(mealPeriodsMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    const stations = Array.from(stationsMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    if (mealPeriods.length > 0) {
      for (const period of mealPeriods) {
        const { error: mpError } = await supabase
          .from("meal_periods")
          .upsert(period, { onConflict: "id" });

        if (mpError) {
          console.error("Error inserting meal period:", mpError);
        }
      }
    }

    if (stations.length > 0) {
      for (const station of stations) {
        const { error: stError } = await supabase
          .from("stations")
          .upsert(station, { onConflict: "id" });

        if (stError) {
          console.error("Error inserting station:", stError);
        }
      }
    }

    const uniqueItems = new Map();
    data.menuItems.forEach(item => {
      uniqueItems.set(item.id, {
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
    let insertedCount = 0;

    for (let i = 0; i < menuItems.length; i += batchSize) {
      const batch = menuItems.slice(i, i + batchSize);
      const { error: itemsError } = await supabase
        .from("menu_items")
        .upsert(batch, { onConflict: "id" });

      if (itemsError) {
        console.error(`Error inserting batch ${i}-${i + batch.length}:`, itemsError);
        throw itemsError;
      }
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully populated ${menuItems.length} menu items, ${mealPeriods.length} meal periods, and ${stations.length} stations`,
        stats: {
          menuItems: menuItems.length,
          mealPeriods: mealPeriods.length,
          stations: stations.length,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Detailed error:", error);
    const errorMessage = error instanceof Error
      ? `${error.message}\nStack: ${error.stack}`
      : JSON.stringify(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
