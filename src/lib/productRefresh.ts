import { MenuItem } from '../types';

// Simulated "refresh from Webtrition". No API yet: the refresh takes 10–15s and
// returns a plausible diff (mostly new products, sometimes changes or removals)
// that is applied to the in-memory product list only.

export interface RefreshStep {
  label: string;
  weight: number; // share of the total duration
}

export const REFRESH_STEPS: RefreshStep[] = [
  { label: 'Connecting to Webtrition', weight: 0.15 },
  { label: 'Downloading product catalog', weight: 0.4 },
  { label: 'Comparing with your products', weight: 0.3 },
  { label: 'Applying updates', weight: 0.15 },
];

export const randomRefreshDuration = () => 10_000 + Math.round(Math.random() * 5_000);

export interface ProductFieldChange {
  field: 'Price' | 'Calories' | 'Description' | 'Name';
  from: string;
  to: string;
}

export interface RefreshReport {
  added: MenuItem[];
  changed: { item: MenuItem; changes: ProductFieldChange[] }[];
  removed: MenuItem[];
  finishedAt: string;
}

const NEW_PRODUCTS = [
  { name: 'Harvest Grain Bowl', description: 'Farro, roasted squash, kale, toasted pepitas, maple-cider vinaigrette', price: 9.25, calories: 540 },
  { name: 'Spicy Chicken Sandwich', description: 'Crispy chicken, chili honey, pickles, brioche bun', price: 8.75, calories: 690 },
  { name: 'Mango Chia Pudding', description: 'Coconut chia, fresh mango, lime zest', price: 4.5, calories: 260 },
  { name: 'Roasted Veggie Wrap', description: 'Zucchini, peppers, hummus, feta, spinach tortilla', price: 7.95, calories: 480 },
  { name: 'Lemon Herb Salmon', description: 'Grilled salmon, lemon-dill sauce, herbed rice', price: 12.5, calories: 610 },
  { name: 'Chipotle Black Bean Burger', description: 'House black bean patty, chipotle aioli, pepper jack', price: 9.5, calories: 650 },
  { name: 'Apple Cinnamon Overnight Oats', description: 'Rolled oats, oat milk, baked apple, cinnamon', price: 4.25, calories: 330 },
  { name: 'Thai Peanut Noodle Salad', description: 'Rice noodles, cabbage, carrots, cilantro, peanut dressing', price: 8.95, calories: 520 },
];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
const money = (n: number) => n.toFixed(2);

// Matches the catalog's MRN style, e.g. "63075.0"
function newMrn(base: string, taken: Set<string>): string {
  const [whole] = base.split('.');
  const digits = /^\d+$/.test(whole) ? Math.max(4, whole.length) : 5;
  const decimal = base.includes('.');
  let mrn: string;
  do {
    const n = Math.floor(10 ** (digits - 1) + Math.random() * 9 * 10 ** (digits - 1));
    mrn = decimal ? `${n}.${Math.floor(Math.random() * 10)}` : String(n);
  } while (taken.has(mrn));
  return mrn;
}

// 1 new product half the time, up to 3; changes and removals are occasional.
function weightedCount(weights: number[]): number {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    if ((r -= weights[i]) < 0) return i;
  }
  return weights.length - 1;
}

export function simulateRefresh(items: MenuItem[]): { items: MenuItem[]; report: RefreshReport } {
  const existingNames = new Set(items.map(i => i.name.toLowerCase()));
  const takenMrns = new Set(items.map(i => i.mrn));
  let nextId = items.reduce((max, i) => Math.max(max, i.id), 0) + 1;

  const addCount = 1 + weightedCount([0.5, 0.35, 0.15]);
  const added: MenuItem[] = shuffle(NEW_PRODUCTS.filter(p => !existingNames.has(p.name.toLowerCase())))
    .slice(0, addCount)
    .map(p => {
      // Borrow station, dayparts and schedule fields from a real item so the
      // new product looks at home in the catalog.
      const base = pick(items);
      const id = nextId++;
      const mrn = newMrn(base.mrn, takenMrns);
      takenMrns.add(mrn);
      return {
        ...base,
        id,
        mrn,
        name: p.name,
        description: p.description,
        enticingDescription: null,
        ingredients: '',
        price: money(p.price),
        calories: String(p.calories),
        isGrouped: false,
        mealPeriods: undefined,
        mealStations: undefined,
        originalItemIds: [id],
        occurrenceCount: 1,
        customAttributes: undefined,
      };
    });

  const candidates = shuffle(items.filter(i => parseFloat(i.price) > 0));
  const changeCount = weightedCount([0.35, 0.3, 0.2, 0.15]);
  const removeCount = weightedCount([0.7, 0.3]);

  const changed = candidates.slice(0, changeCount).map(item => {
    const changes: ProductFieldChange[] = [];
    const updated = { ...item };
    const oldPrice = parseFloat(item.price);
    const newPrice = Math.max(0.5, oldPrice + pick([-0.5, -0.25, 0.25, 0.5, 0.75, 1]));
    updated.price = money(newPrice);
    changes.push({ field: 'Price', from: `$${money(oldPrice)}`, to: `$${money(newPrice)}` });
    if (Math.random() < 0.4) {
      const oldCal = parseInt(item.calories, 10) || 0;
      const newCal = Math.max(10, oldCal + pick([-40, -20, 20, 30, 50]));
      updated.calories = String(newCal);
      changes.push({ field: 'Calories', from: `${oldCal} cal`, to: `${newCal} cal` });
    }
    return { item: updated, changes };
  });
  const changedById = new Map(changed.map(c => [c.item.id, c.item]));

  const removed = candidates.slice(changeCount, changeCount + removeCount);
  const removedIds = new Set(removed.map(i => i.id));

  return {
    items: [
      ...items.filter(i => !removedIds.has(i.id)).map(i => changedById.get(i.id) ?? i),
      ...added,
    ].sort((a, b) => a.name.localeCompare(b.name)),
    report: { added, changed, removed, finishedAt: new Date().toISOString() },
  };
}
