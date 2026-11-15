import { MenuItem, ProductField, ProductValues } from '../types';
import { productDayparts } from './stations';
import { parseIngredients } from './richText';

// Every product is a WAND item. One linked to a source takes its values from the source, except
// fields changed here: those are local values (product_local_values), laid over the source when
// products load. The sync never touches them, and editing never changes the source.

export const PRODUCT_FIELDS: ProductField[] = [
  'name', 'description', 'price', 'calories', 'ingredients', 'allergens', 'icons', 'nutrition', 'dayparts',
];

export const FIELD_LABELS: Record<ProductField, string> = {
  name: 'Name',
  description: 'Description',
  price: 'Price',
  calories: 'Calories',
  ingredients: 'Ingredients',
  allergens: 'Allergens',
  icons: 'Dietary icons',
  nutrition: 'Nutrition',
  dayparts: 'Dayparts',
};

// The dayparts a product is offered at: for a source product, the dayparts its source offers it
// (what Available Items uses); empty = all dayparts
export function itemDayparts(item: MenuItem): string[] {
  const d = item.activeMealPeriods?.length ? item.activeMealPeriods : productDayparts(item);
  return [...d].sort();
}

// A product's values as shown
export function valuesOf(item: MenuItem): ProductValues {
  return {
    name: item.name.trim(),
    description: item.enticingDescription || item.description || null,
    price: parseFloat(item.price || '0').toFixed(2),
    calories: item.calories || '0',
    ingredients: item.ingredients || '',
    allergens: item.allergens || '',
    icons: item.iconImages ?? [],
    nutrition: item.nutrition,
    dayparts: itemDayparts(item),
  };
}

const split = (s: string) => s.split(',').map(a => a.trim().toLowerCase()).filter(Boolean).sort().join('|');
const NUTRIENTS = ['protein', 'carbohydrates', 'fat', 'sugar'] as const;

// Comparable form of one field, so formatting differences don't count as a change
function norm<F extends ProductField>(field: F, v: ProductValues[F] | undefined): string {
  switch (field) {
    case 'name': return String(v ?? '').trim();
    case 'description': return String(v ?? '').trim();
    case 'price': return parseFloat(String(v || '0')).toFixed(2);
    case 'calories': return String(parseFloat(String(v || '0')) || 0);
    case 'ingredients': return parseIngredients(String(v ?? '')).map(s => s.toLowerCase()).join('|');
    case 'allergens': return split(String(v ?? ''));
    case 'icons': return ((v as ProductValues['icons']) ?? []).map(i => i.name).sort().join('|');
    case 'nutrition': {
      const n = v as ProductValues['nutrition'] | undefined;
      return NUTRIENTS.map(k => parseFloat(n?.[k]?.value || '0') || 0).join('|');
    }
    case 'dayparts': return [...((v as string[]) ?? [])].sort().join('|');
  }
  return '';
}

export function sameValue<F extends ProductField>(field: F, a: ProductValues[F] | undefined, b: ProductValues[F] | undefined): boolean {
  return norm(field, a) === norm(field, b);
}

// The fields that differ from the source: what gets saved as local values
export function localDiff(source: ProductValues, next: ProductValues): Partial<ProductValues> {
  const out: Partial<ProductValues> = {};
  for (const f of PRODUCT_FIELDS) {
    if (!sameValue(f, source[f], next[f])) (out as Record<string, unknown>)[f] = next[f];
  }
  return out;
}

// Lays local values over a source product. Keeps the source's values on `source`.
export function applyLocalValues(item: MenuItem, local: Partial<ProductValues> | undefined): MenuItem {
  const source = valuesOf(item);
  const fields = PRODUCT_FIELDS.filter(f => local && f in local);
  const out: MenuItem = { ...item, source, localFields: fields };
  if (!local || fields.length === 0) return out;
  if ('name' in local) out.name = local.name ?? item.name;
  if ('description' in local) {
    out.enticingDescription = local.description ?? null;
    if (!local.description) out.description = null;
  }
  if ('price' in local) out.price = local.price ?? item.price;
  if ('ingredients' in local) out.ingredients = local.ingredients ?? '';
  if ('allergens' in local) out.allergens = local.allergens ?? '';
  if ('icons' in local) {
    out.iconImages = local.icons ?? [];
    out.icons = (local.icons ?? []).map(i => i.name);
  }
  if ('nutrition' in local && local.nutrition) out.nutrition = local.nutrition;
  if ('calories' in local) {
    const cal = local.calories || '0';
    out.calories = cal;
    out.nutrition = { ...out.nutrition, calories: { value: cal, dailyValue: null, displayValue: cal } };
  }
  if ('dayparts' in local) {
    // Changing a product's dayparts changes where it's offered (Available Items, Auto)
    const d = local.dayparts ?? [];
    out.activeMealPeriods = d;
    out.mealPeriods = d;
    out.mealPeriod = d[0] ?? '';
  }
  return out;
}
