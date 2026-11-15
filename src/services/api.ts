import { MenuItem, Device, Concept, Company, Store, Rule, Brand, DeviceGroup, DeviceWeekSchedule, DeviceScheduleItem, DaySetting, ProductValues } from '../types';
import { applyLocalValues } from '../lib/productValues';
import { mockDevices, mockPlacements } from './mockData';
import { supabase } from '../lib/supabase';

export class NoContentError extends Error {
  constructor(message: string = 'No content available') {
    super(message);
    this.name = 'NoContentError';
  }
}

// Helper function to simulate API delay
const mockDelay = (ms: number = 800) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to deep clone objects
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Initialize mock channel items with some default data
const mockChannelItems: Record<string, Set<number>> = {
  'shelf-labels': new Set([1, 2, 3]),
  'digital-signage': new Set([4, 5]),
  'order-confirmation': new Set([6])
};

// Mock rules storage
let mockRules: Rule[] = [];

// Maps a raw device_week_schedules row (with nested items) to DeviceWeekSchedule
const mapScheduleRow = (s: any): DeviceWeekSchedule => ({
  id: s.id,
  deviceId: s.device_id,
  weekStart: s.week_start,
  isDefault: s.is_default ?? false,
  status: s.status,
  sourceType: s.source_type,
  sourceWeekStart: s.source_week_start,
  isRecurring: s.is_recurring,
  recurrenceWeeks: s.recurrence_weeks,
  notes: s.notes,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  items: (s.device_schedule_items || []).map((i: any) => ({
    id: i.id,
    scheduleId: i.schedule_id,
    daypart: i.daypart,
    dayOfWeek: i.day_of_week,
    menuItemMrn: i.menu_item_mrn,
    menuItemName: i.menu_item_name,
    menuItemPrice: i.menu_item_price,
    sortOrder: i.sort_order,
    createdAt: i.created_at,
    followsDaypart: i.follows_daypart ?? null,
  })),
});

// Identifies which schedule row to write to: the device's default or a specific week override.
type ScheduleTarget = { isDefault: boolean; weekStart: string | null };

type ScheduleItemInput = {
  daypart: string;
  dayOfWeek: number;
  menuItemMrn: string;
  menuItemName: string;
  menuItemPrice: string;
  sortOrder: number;
  followsDaypart?: string | null;
};

// Inserts schedule item rows. Before the "follows daypart" migration runs the column is
// missing; then the rows go in without it (items follow their page's daypart).
async function insertScheduleRows(rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('device_schedule_items').insert(rows);
  if (!error) return;
  if (/follows_daypart/.test(error.message)) {
    const { error: retry } = await supabase.from('device_schedule_items')
      .insert(rows.map(({ follows_daypart: _f, ...r }) => r));
    if (!retry) return;
    throw new Error(retry.message);
  }
  throw new Error(error.message);
}

// Returns the id of the device's default/override row, creating it if missing.
async function ensureScheduleRow(deviceId: string, target: ScheduleTarget): Promise<string | null> {
  let query = supabase.from('device_week_schedules').select('id').eq('device_id', deviceId);
  query = target.isDefault
    ? query.eq('is_default', true)
    : query.eq('is_default', false).eq('week_start', target.weekStart as string);
  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  const insertRow = target.isDefault
    ? { device_id: deviceId, week_start: null, is_default: true, status: 'active', source_type: 'manual' }
    : { device_id: deviceId, week_start: target.weekStart, is_default: false, status: 'draft', source_type: 'manual' };
  const { data: created, error } = await supabase
    .from('device_week_schedules')
    .insert(insertRow)
    .select('id')
    .maybeSingle();
  if (error) { console.error('ensureScheduleRow error:', error); return null; }
  return created?.id ?? null;
}

// Day settings for these schedules. Missing (left empty) until their migration runs.
async function attachDaySettings(schedules: DeviceWeekSchedule[]): Promise<DeviceWeekSchedule[]> {
  if (schedules.length === 0) return schedules;
  const { data, error } = await supabase
    .from('label_day_settings')
    .select('schedule_id, daypart, menu_item_mrn, day_of_week, state')
    .in('schedule_id', schedules.map(s => s.id));
  if (error) return schedules;
  const bySchedule = new Map<string, DaySetting[]>();
  for (const r of data || []) {
    const list = bySchedule.get(r.schedule_id) ?? [];
    list.push({ daypart: r.daypart, menuItemMrn: r.menu_item_mrn, dayOfWeek: r.day_of_week, state: r.state });
    bySchedule.set(r.schedule_id, list);
  }
  return schedules.map(s => ({ ...s, daySettings: bySchedule.get(s.id) ?? [] }));
}

// Replaces a schedule row's day settings (copy, paste and recurring carry them with the items)
async function replaceDaySettings(scheduleId: string, settings: DaySetting[]): Promise<void> {
  const { error } = await supabase.from('label_day_settings').delete().eq('schedule_id', scheduleId);
  if (error || settings.length === 0) return;
  await supabase.from('label_day_settings').insert(settings.map(s => ({
    schedule_id: scheduleId,
    daypart: s.daypart,
    menu_item_mrn: s.menuItemMrn,
    day_of_week: s.dayOfWeek,
    state: s.state,
  })));
}

// Replaces all items on a schedule row, and its day settings with them.
async function replaceScheduleItems(scheduleId: string, items: ScheduleItemInput[], settings: DaySetting[] = []): Promise<void> {
  await replaceDaySettings(scheduleId, settings);
  await supabase.from('device_schedule_items').delete().eq('schedule_id', scheduleId);
  await insertScheduleRows(items.map(i => ({
    schedule_id: scheduleId,
    daypart: i.daypart,
    day_of_week: i.dayOfWeek,
    menu_item_mrn: i.menuItemMrn,
    menu_item_name: i.menuItemName,
    menu_item_price: i.menuItemPrice,
    sort_order: i.sortOrder,
    ...(i.followsDaypart ? { follows_daypart: i.followsDaypart } : {}),
  })));
}

// How far back an imported weekday still counts as available
const AVAILABILITY_RECENT_WEEKS = 8;

// What the product sheet saves for a custom product
export interface ProductInput {
  name: string;
  price?: string;
  mealPeriod?: string;
  mealStation?: string;
  description?: string | null;
  enticingDescription?: string | null;
  calories?: string;
  allergens?: string;
  nutrition?: MenuItem['nutrition'];
  icons?: { name: string; url: string; rank?: number }[];
  // What labels show instead of the name; blank uses the name
  displayName?: string | null;
  // Comma-separated, like Webtrition's
  ingredients?: string;
  // Dayparts it may be offered at; empty = all dayparts
  dayparts?: string[];
  // Weekdays the product is offered (0 = Sunday); omit to leave days unset
  activeDays?: number[];
}

async function findLookupId(table: 'meal_periods' | 'stations', name?: string) {
  if (!name?.trim()) return null;
  const { data: row } = await supabase.from(table).select('id').ilike('name', name.trim()).limit(1).maybeSingle();
  return row?.id ?? null;
}

// Same shape Webtrition sends, so custom and imported icons render the same way
function toIconRows(icons?: ProductInput['icons']) {
  return (icons ?? []).map(i => ({ url: i.url, name: i.name, rank: i.rank ?? 0, fileName: i.url.split('/').pop() ?? '' }));
}

async function saveDisplayName(mrn: string, displayName: string | null | undefined) {
  const value = displayName?.trim();
  const { error } = value
    ? await supabase.from('product_display_names').upsert({ mrn, display_name: value, updated_at: new Date().toISOString() })
    : await supabase.from('product_display_names').delete().eq('mrn', mrn);
  if (error) throw new Error(`Saved, but the display name didn't save: ${error.message}`);
}

// Empty clears the row, which means all dayparts
async function saveDayparts(mrn: string, dayparts: string[]) {
  const { error } = dayparts.length
    ? await supabase.from('product_dayparts').upsert({ mrn, dayparts, updated_at: new Date().toISOString() })
    : await supabase.from('product_dayparts').delete().eq('mrn', mrn);
  if (error) throw new Error(`Saved, but the dayparts didn't save: ${error.message}`);
}

async function setCustomDays(mrn: string, days: number[]) {
  const { error } = await supabase.rpc('set_custom_product_days', { p_mrn: mrn, p_days: days });
  if (error) throw new Error(`Saved, but the days didn't save: ${error.message}`);
}

export const api = {
  // Menu Items - from condensed Supabase view (pre-grouped by MRN + name)
  getMenuItems: async (): Promise<MenuItem[]> => {
    const pageSize = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('menu_items_condensed')
        .select('*')
        .order('name')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Error fetching menu items:', error);
        return [];
      }

      allData = allData.concat(data || []);
      hasMore = (data?.length || 0) === pageSize;
      from += pageSize;
    }

    // Fetch meal periods and stations in parallel for name lookups
    const [mpResult, stResult, avResult, dnResult, dpResult, lvResult] = await Promise.all([
      supabase.from('meal_periods').select('id, name'),
      supabase.from('stations').select('id, name'),
      (async () => {
        let all: any[] = [];
        let f = 0;
        let more = true;
        while (more) {
          const { data: avPage } = await supabase
            .from('product_availability')
            .select('mrn, day_of_week, meal_period_id, last_seen_date, meal_period:meal_periods(name)')
            .range(f, f + pageSize - 1);
          all = all.concat(avPage || []);
          more = (avPage?.length || 0) === pageSize;
          f += pageSize;
        }
        return all;
      })(),
      supabase.from('product_display_names').select('mrn, display_name'),
      supabase.from('product_dayparts').select('mrn, dayparts'),
      supabase.from('product_local_values').select('mrn, local_values'),
    ]);
    // Local values on linked products; missing until its migration runs
    const localValues = new Map<string, Partial<ProductValues>>((lvResult.data || []).map((d: any) => [d.mrn, d.local_values || {}]));

    const mpMap = new Map((mpResult.data || []).map((mp: any) => [mp.id, mp.name]));
    const stMap = new Map((stResult.data || []).map((st: any) => [st.id, st.name]));
    // Missing until the display names migration runs; products then just have none
    const displayNames = new Map<string, string>((dnResult.data || []).map((d: any) => [d.mrn, d.display_name]));
    // Custom products' dayparts (no row = all dayparts); missing until its migration runs
    const customDayparts = new Map<string, string[]>((dpResult.data || []).map((d: any) => [d.mrn, d.dayparts || []]));

    // A weekday counts only if the product was seen on it recently; one odd day long
    // ago shouldn't make it available that day forever
    const cutoff = new Date(Date.now() - AVAILABILITY_RECENT_WEEKS * 7 * 86_400_000).toISOString().slice(0, 10);
    const hasAnyAvailability = new Set<string>(avResult.map((av: any) => av.mrn));
    const availabilityByMrn = new Map<string, any[]>();
    avResult.forEach((av: any) => {
      if (av.last_seen_date && av.last_seen_date < cutoff && !String(av.mrn).startsWith('CUSTOM-')) return;
      if (!availabilityByMrn.has(av.mrn)) {
        availabilityByMrn.set(av.mrn, []);
      }
      availabilityByMrn.get(av.mrn)!.push(av);
    });

    const items: MenuItem[] = allData.map((item: any) => {
      // Custom products have no daypart, station or days of their own; they come from the labels
      // they're on (see labelUseByMrn). Ignore anything stored on older custom rows.
      const custom = String(item.mrn || '').startsWith('CUSTOM-');
      const mealPeriodIds: number[] = custom ? [] : item.meal_period_ids || [];
      const stationIds: number[] = custom ? [] : item.station_ids || [];

      // Custom products carry their own dayparts; an empty list means all dayparts
      const mealPeriodNames = custom ? customDayparts.get(item.mrn) ?? [] : mealPeriodIds.map(id => mpMap.get(id) || 'All Day');
      const stationNames = stationIds.map(id => stMap.get(id) || 'Uncategorized');

      const availability = custom ? [] : availabilityByMrn.get(item.mrn) || [];
      const activeDays = [...new Set(availability.map((av: any) => av.day_of_week))].sort();
      const activeMealPeriods = custom
        ? mealPeriodNames
        : [...new Set(availability.map((av: any) => av.meal_period?.name).filter(Boolean))];
      // Days per meal period, so an item can follow one daypart's days (see followsDaypart)
      const daysByDaypart: Record<string, number[]> = {};
      for (const av of availability) {
        const mp = av.meal_period?.name;
        if (!mp) continue;
        const list = daysByDaypart[mp] ?? (daysByDaypart[mp] = []);
        if (!list.includes(av.day_of_week)) list.push(av.day_of_week);
      }
      Object.values(daysByDaypart).forEach(l => l.sort());
      const availabilityDataFormatted = availability.map((av: any) => ({
        dayOfWeek: av.day_of_week,
        mealPeriod: av.meal_period?.name || '',
        lastSeen: av.last_seen_date,
      }));

      const isGrouped = (item.occurrence_count || 1) > 1;

      return {
        id: item.id,
        date: (item.dates && item.dates[0]) || new Date().toISOString().split('T')[0],
        name: item.name,
        displayName: displayNames.get(item.mrn) ?? null,
        description: item.description || null,
        enticingDescription: item.enticing_description || null,
        ingredients: item.ingredients || '',
        price: item.price || '0.00',
        mrn: item.mrn || '',
        nutrition: {
          calories: {
            value: item.nutrition?.calories?.value || item.calories || '0',
            dailyValue: item.nutrition?.calories?.dailyValue || null,
            displayValue: item.nutrition?.calories?.displayValue || item.calories || '0'
          },
          protein: {
            value: item.nutrition?.protein?.value || '0',
            dailyValue: item.nutrition?.protein?.dailyValue || null,
            displayValue: item.nutrition?.protein?.displayValue || '0g'
          },
          carbohydrates: {
            value: item.nutrition?.carbohydrates?.value || '0',
            dailyValue: item.nutrition?.carbohydrates?.dailyValue || null,
            displayValue: item.nutrition?.carbohydrates?.displayValue || '0g'
          },
          fat: {
            value: item.nutrition?.fat?.value || '0',
            dailyValue: item.nutrition?.fat?.dailyValue || null,
            displayValue: item.nutrition?.fat?.displayValue || '0g'
          },
          sugar: {
            value: item.nutrition?.sugar?.value || '0',
            dailyValue: item.nutrition?.sugar?.dailyValue || null,
            displayValue: item.nutrition?.sugar?.displayValue || '0g'
          },
        },
        allergens: item.allergens || '',
        portion: item.nutrition?.portion || '',
        icons: item.icons ? (Array.isArray(item.icons) ? item.icons.map((i: any) => i.name || i) : []) : [],
        iconImages: Array.isArray(item.icons)
          ? item.icons
              .filter((i: any) => i?.url && i?.name)
              .sort((a: any, b: any) => (b.rank ?? 0) - (a.rank ?? 0))
              .map((i: any) => ({ name: i.name, url: i.url, rank: i.rank ?? 0 }))
          : [],
        calories: item.calories || '0',
        mealPeriodId: mealPeriodIds[0] || 0,
        mealStation: custom ? '' : stationNames[0] || 'Uncategorized',
        // No daypart means offered at all of them (shown as "All dayparts"), not the All Day daypart
        mealPeriod: mealPeriodNames[0] || '',
        sortOrder: item.sort_order || 0,
        isActive: true,
        activeDays,
        hasAvailability: !custom && hasAnyAvailability.has(item.mrn),
        daysByDaypart,
        activeMealPeriods,
        availabilityData: availabilityDataFormatted,
        isGrouped,
        dates: item.dates || [],
        mealPeriods: isGrouped || custom ? mealPeriodNames : undefined,
        mealStations: isGrouped ? stationNames : undefined,
        occurrenceCount: item.occurrence_count || 1,
      };
    });
    // Linked products: local values over the source's (custom products are edited in place)
    return items.map(i => (String(i.mrn).startsWith('CUSTOM-') ? i : applyLocalValues(i, localValues.get(i.mrn))));
  },

  // Saves the local values of a product linked to a source: only the fields that differ from
  // the source. Nothing changed means none (it follows the source). Throws on failure.
  setLocalValues: async (mrn: string, local: Partial<ProductValues>): Promise<void> => {
    const { error } = Object.keys(local).length
      ? await supabase.from('product_local_values').upsert({ mrn, local_values: local, updated_at: new Date().toISOString() })
      : await supabase.from('product_local_values').delete().eq('mrn', mrn);
    if (error) {
      throw new Error(/relation|does not exist|schema cache/i.test(error.message)
        ? 'Apply the "product local values" migration in Supabase.'
        : error.message);
    }
  },

  // Saves a product created in the app. It's tagged 'converge-custom' (the only rows the app
  // may insert) and gets a negative id and a CUSTOM- MRN so it never collides with Webtrition
  // data. Returns the new id; reload with getMenuItems() to get the full item. Throws on failure.
  createMenuItem: async (data: ProductInput): Promise<number> => {
    const [mealPeriodId, stationId] = await Promise.all([
      findLookupId('meal_periods', data.mealPeriod),
      findLookupId('stations', data.mealStation),
    ]);

    const id = -(Math.floor(Math.random() * 2_000_000_000) + 1);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const { error } = await supabase.from('menu_items').insert({
      id,
      date: today,
      name: data.name.trim(),
      description: data.description || null,
      enticing_description: data.enticingDescription || null,
      ingredients: data.ingredients || '',
      price: data.price || '0.00',
      mrn: `CUSTOM-${-id}`,
      calories: data.calories || '0',
      allergens: data.allergens || '',
      nutrition: data.nutrition ?? null,
      icons: toIconRows(data.icons),
      meal_period_id: mealPeriodId,
      station_id: stationId,
      source_name: 'converge-custom',
    });
    if (error) throw new Error(error.message);
    if (data.activeDays) await setCustomDays(`CUSTOM-${-id}`, data.activeDays);
    if (data.displayName?.trim()) await saveDisplayName(`CUSTOM-${-id}`, data.displayName);
    if (data.dayparts?.length) await saveDayparts(`CUSTOM-${-id}`, data.dayparts);
    return id;
  },

  // Sets what labels show for a product (any product); blank clears it. Throws on failure.
  setDisplayName: (mrn: string, displayName: string | null | undefined): Promise<void> => saveDisplayName(mrn, displayName),

  // Saves changes to a custom product (only custom rows may be updated). Throws on failure.
  updateCustomProduct: async (mrn: string, data: ProductInput): Promise<void> => {
    const [mealPeriodId, stationId] = await Promise.all([
      findLookupId('meal_periods', data.mealPeriod),
      findLookupId('stations', data.mealStation),
    ]);
    const { data: rows, error } = await supabase
      .from('menu_items')
      .update({
        name: data.name.trim(),
        description: data.description || null,
        enticing_description: data.enticingDescription || null,
        ingredients: data.ingredients || '',
        price: data.price || '0.00',
        calories: data.calories || '0',
        allergens: data.allergens || '',
        nutrition: data.nutrition ?? null,
        icons: toIconRows(data.icons),
        meal_period_id: mealPeriodId,
        station_id: stationId,
        updated_at: new Date().toISOString(),
      })
      .eq('mrn', mrn)
      .eq('source_name', 'converge-custom')
      .select('id');
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) {
      throw new Error('The database didn\'t accept the change. Apply the "edit custom products" migration in Supabase.');
    }
    // Days come from labels now; only rewrite them when a caller passes days
    if (data.activeDays) await setCustomDays(mrn, data.activeDays);
    if (data.displayName !== undefined) await saveDisplayName(mrn, data.displayName);
    if (data.dayparts !== undefined) await saveDayparts(mrn, data.dayparts);
  },

  // Devices
  getDevices: async (): Promise<Device[]> => {
    await mockDelay();
    return clone(mockDevices);
  },

  // Location hierarchy — fetched from Supabase
  getConcepts: async (): Promise<Concept[]> => {
    const { data, error } = await supabase
      .from('concepts')
      .select('id, name')
      .order('name');
    if (error) {
      console.error('Error fetching concepts:', error);
      return [];
    }
    return (data || []).map((c: any) => ({
      id: String(c.id),
      name: c.name,
      children: [],
    }));
  },

  getCompanies: async (): Promise<Company[]> => {
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, concept_id')
        .order('name')
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('Error fetching companies:', error);
        break;
      }
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all.map((c: any) => ({
      id: String(c.id),
      name: c.name,
      conceptId: String(c.concept_id),
    }));
  },

  getStores: async (): Promise<Store[]> => {
    const all: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, company_id')
        .order('name')
        .range(from, from + pageSize - 1);
      if (error) {
        console.error('Error fetching stores:', error);
        break;
      }
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all
      .filter((s: any) => s.company_id !== null)
      .map((s: any) => ({
        id: String(s.id),
        name: s.name,
        companyId: String(s.company_id),
      }));
  },

  // Placements
  getPlacements: async () => {
    await mockDelay();
    return clone(mockPlacements);
  },

  // Rules
  getRules: async (): Promise<Rule[]> => {
    await mockDelay();
    return clone(mockRules);
  },

  createRule: async (rule: Rule): Promise<Rule> => {
    await mockDelay();
    const newRule = clone(rule);
    mockRules.push(newRule);
    return newRule;
  },

  updateRule: async (rule: Rule): Promise<Rule> => {
    await mockDelay();
    const index = mockRules.findIndex(r => r.id === rule.id);
    if (index === -1) throw new Error('Rule not found');
    mockRules[index] = clone(rule);
    return rule;
  },

  deleteRule: async (ruleId: string): Promise<void> => {
    await mockDelay();
    mockRules = mockRules.filter(r => r.id !== ruleId);
  },

  // Channel operations
  assignItemToChannel: async (itemId: number, channelId: string): Promise<void> => {
    await mockDelay();
    if (!mockChannelItems[channelId]) {
      mockChannelItems[channelId] = new Set();
    }
    mockChannelItems[channelId].add(itemId);
  },

  removeItemFromChannel: async (itemId: number, channelId: string): Promise<void> => {
    await mockDelay();
    if (mockChannelItems[channelId]) {
      mockChannelItems[channelId].delete(itemId);
    }
  },

  isItemInChannel: (itemId: number, channelId: string): boolean => {
    return mockChannelItems[channelId]?.has(itemId) ?? false;
  },

  // Device page operations
  assignItemToPage: async (itemId: number, deviceId: string, pageId: string): Promise<void> => {
    await mockDelay();

    // Find the device and make a copy to work with
    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) throw new Error('Device not found');

    const device = clone(mockDevices[deviceIndex]);

    // Find the page in the device
    const page = device.pages.find(p => p.id === pageId);
    if (!page) throw new Error('Page not found');

    // Fetch the item from Supabase
    const allItems = await api.getMenuItems();
    const item = allItems.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    // Add the item to the page if not already present
    if (!page.assignedItems.some(i => i.id === itemId)) {
      page.assignedItems.push(clone(item));
      page.itemOrder.push(itemId);
    }

    // Update the device's assigned items if needed
    if (!device.assignedItems.some(i => i.id === itemId)) {
      device.assignedItems.push(clone(item));
    }

    // Update the device in the mock data
    mockDevices[deviceIndex] = device;
  },

  removeItemFromPage: async (itemId: number, deviceId: string, pageId: string): Promise<void> => {
    await mockDelay();
    
    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) throw new Error('Device not found');
    
    const device = clone(mockDevices[deviceIndex]);
    const page = device.pages.find(p => p.id === pageId);
    if (!page) throw new Error('Page not found');
    
    // Remove item from page
    page.assignedItems = page.assignedItems.filter(item => item.id !== itemId);
    page.itemOrder = page.itemOrder.filter(id => id !== itemId);
    
    // Check if item is used in any other pages
    const isItemUsedInOtherPages = device.pages.some(p => 
      p.id !== pageId && p.assignedItems.some(item => item.id === itemId)
    );
    
    // If not used in other pages, remove from device's assignedItems
    if (!isItemUsedInOtherPages) {
      device.assignedItems = device.assignedItems.filter(item => item.id !== itemId);
    }
    
    // Update the device in the mock data
    mockDevices[deviceIndex] = device;
  },

  reorderPageItems: async (deviceId: string, pageId: string, itemOrder: number[]): Promise<void> => {
    await mockDelay();
    
    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) throw new Error('Device not found');
    
    const device = clone(mockDevices[deviceIndex]);
    const page = device.pages.find(p => p.id === pageId);
    if (!page) throw new Error('Page not found');
    
    // Update the page's itemOrder
    page.itemOrder = [...itemOrder];
    
    // Update the device in the mock data
    mockDevices[deviceIndex] = device;
  },

  // Device status operations
  // Brands
  getBrands: async (): Promise<Brand[]> => {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('display_name');
    if (error) { console.error('Error fetching brands:', error); return []; }
    return (data || []).map((b: any) => ({
      id: b.id,
      key: b.key,
      displayName: b.display_name,
      logoFilename: b.logo_filename,
      logoBaseUrl: b.logo_base_url,
    }));
  },

  // Brand Station Patterns
  getBrandStationPatterns: async (): Promise<Record<number, string[]>> => {
    const { data, error } = await supabase
      .from('brand_station_patterns')
      .select('brand_id, station_pattern')
      .order('sort_order');
    if (error) { console.error('Error fetching brand station patterns:', error); return {}; }
    const map: Record<number, string[]> = {};
    for (const row of data || []) {
      if (!map[row.brand_id]) map[row.brand_id] = [];
      map[row.brand_id].push(row.station_pattern);
    }
    return map;
  },

  addBrandStationPattern: async (brandId: number, stationPattern: string): Promise<boolean> => {
    const { error } = await supabase
      .from('brand_station_patterns')
      .insert({ brand_id: brandId, station_pattern: stationPattern.toLowerCase() });
    return !error;
  },

  removeBrandStationPattern: async (brandId: number, stationPattern: string): Promise<boolean> => {
    const { error } = await supabase
      .from('brand_station_patterns')
      .delete()
      .eq('brand_id', brandId)
      .eq('station_pattern', stationPattern);
    return !error;
  },

  // Device Groups
  getDeviceGroups: async (): Promise<DeviceGroup[]> => {
    const { data, error } = await supabase
      .from('device_groups')
      .select(`
        *,
        device_group_members(id, group_id, device_id),
        device_group_brands(
          id, group_id, brand_id,
          brands(id, key, display_name, logo_filename, logo_base_url)
        )
      `)
      .order('name');
    if (error) { console.error('Error fetching device groups:', error); return []; }
    return (data || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      members: (g.device_group_members || []).map((m: any) => ({
        id: m.id, groupId: m.group_id, deviceId: m.device_id,
      })),
      brands: (g.device_group_brands || []).map((gb: any) => ({
        id: gb.id, groupId: gb.group_id, brandId: gb.brand_id,
        brand: gb.brands ? {
          id: gb.brands.id, key: gb.brands.key,
          displayName: gb.brands.display_name,
          logoFilename: gb.brands.logo_filename,
          logoBaseUrl: gb.brands.logo_base_url,
        } : undefined,
      })),
    }));
  },

  createDeviceGroup: async (name: string, description?: string): Promise<DeviceGroup | null> => {
    const { data, error } = await supabase
      .from('device_groups')
      .insert({ name, description: description || null })
      .select()
      .maybeSingle();
    if (error) { console.error('Error creating group:', error); return null; }
    if (!data) return null;
    return { id: data.id, name: data.name, description: data.description, createdAt: data.created_at, updatedAt: data.updated_at, members: [], brands: [] };
  },

  updateDeviceGroup: async (id: string, updates: { name?: string; description?: string }): Promise<boolean> => {
    const { error } = await supabase
      .from('device_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  },

  deleteDeviceGroup: async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('device_groups').delete().eq('id', id);
    return !error;
  },

  addDeviceToGroup: async (groupId: string, deviceId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('device_group_members')
      .upsert({ group_id: groupId, device_id: deviceId }, { onConflict: 'group_id,device_id' });
    return !error;
  },

  removeDeviceFromGroup: async (groupId: string, deviceId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('device_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('device_id', deviceId);
    return !error;
  },

  addBrandToGroup: async (groupId: string, brandId: number): Promise<boolean> => {
    const { error } = await supabase
      .from('device_group_brands')
      .upsert({ group_id: groupId, brand_id: brandId }, { onConflict: 'group_id,brand_id' });
    return !error;
  },

  removeBrandFromGroup: async (groupId: string, brandId: number): Promise<boolean> => {
    const { error } = await supabase
      .from('device_group_brands')
      .delete()
      .eq('group_id', groupId)
      .eq('brand_id', brandId);
    return !error;
  },

  updateDeviceStatus: async (deviceId: string, updates: Partial<Device['status']>): Promise<Device> => {
    await mockDelay();
    
    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) throw new Error('Device not found');
    
    const device = clone(mockDevices[deviceIndex]);
    device.status = {
      ...device.status,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    // If forcing a page, update current page
    if (updates.forcedPage !== undefined) {
      device.status.currentPage = updates.forcedPage || device.status.currentPage;
    }
    
    mockDevices[deviceIndex] = device;
    return clone(device);
  },

  // Week Schedules
  getWeekSchedules: async (weekStart: string): Promise<DeviceWeekSchedule[]> => {
    const { data, error } = await supabase
      .from('device_week_schedules')
      .select(`
        *,
        device_schedule_items(*)
      `)
      .eq('week_start', weekStart)
      .eq('is_default', false);
    if (error) { console.error('Error fetching week schedules:', error); return []; }
    return attachDaySettings((data || []).map(mapScheduleRow));
  },

  // Persistent per-device default week (week_start IS NULL, is_default = true)
  getDefaultSchedules: async (): Promise<DeviceWeekSchedule[]> => {
    const { data, error } = await supabase
      .from('device_week_schedules')
      .select(`
        *,
        device_schedule_items(*)
      `)
      .eq('is_default', true);
    if (error) { console.error('Error fetching default schedules:', error); return []; }
    return attachDaySettings((data || []).map(mapScheduleRow));
  },

  // All recurring override weeks, used to resolve which weeks a pattern repeats into
  getRecurringSchedules: async (): Promise<DeviceWeekSchedule[]> => {
    const { data, error } = await supabase
      .from('device_week_schedules')
      .select(`
        *,
        device_schedule_items(*)
      `)
      .eq('is_recurring', true)
      .eq('is_default', false);
    if (error) { console.error('Error fetching recurring schedules:', error); return []; }
    return attachDaySettings((data || []).map(mapScheduleRow));
  },

  // Distinct week_start values that have an explicit (non-default) override row.
  getOverrideWeekStarts: async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('device_week_schedules')
      .select('week_start')
      .eq('is_default', false);
    if (error) { console.error('Error fetching override weeks:', error); return []; }
    return Array.from(new Set((data || []).map((r: any) => r.week_start).filter(Boolean)));
  },

  // Writes a set of schedules (device + items) into a target week as overrides.
  // Used by copy/paste from any source week or from the default week.
  pasteWeekSchedule: async (
    targetWeekStart: string,
    sourceSchedules: DeviceWeekSchedule[],
    sourceWeekStart: string | null = null,
  ): Promise<boolean> => {
    if (sourceSchedules.length === 0) return false;

    for (const schedule of sourceSchedules) {
      const rowId = await ensureScheduleRow(schedule.deviceId, { isDefault: false, weekStart: targetWeekStart });
      if (!rowId) continue;
      await supabase
        .from('device_week_schedules')
        .update({ source_type: 'copied', source_week_start: sourceWeekStart })
        .eq('id', rowId);
      await replaceScheduleItems(rowId, (schedule.items ?? []).map(i => ({
        daypart: i.daypart,
        dayOfWeek: i.dayOfWeek,
        menuItemMrn: i.menuItemMrn,
        menuItemName: i.menuItemName,
        menuItemPrice: i.menuItemPrice,
        sortOrder: i.sortOrder,
        followsDaypart: i.followsDaypart ?? null,
      })), schedule.daySettings ?? []);
    }
    return true;
  },

  copyWeekSchedule: async (sourceWeekStart: string, targetWeekStart: string): Promise<boolean> => {
    const sourceSchedules = await api.getWeekSchedules(sourceWeekStart);
    return api.pasteWeekSchedule(targetWeekStart, sourceSchedules, sourceWeekStart);
  },

  // Persists the default week for a set of devices (used to edit the canvas).
  saveDefaultSchedules: async (schedules: DeviceWeekSchedule[]): Promise<boolean> => {
    for (const schedule of schedules) {
      const rowId = await ensureScheduleRow(schedule.deviceId, { isDefault: true, weekStart: null });
      if (!rowId) continue;
      await replaceScheduleItems(rowId, (schedule.items ?? []).map(i => ({
        daypart: i.daypart,
        dayOfWeek: i.dayOfWeek,
        menuItemMrn: i.menuItemMrn,
        menuItemName: i.menuItemName,
        menuItemPrice: i.menuItemPrice,
        sortOrder: i.sortOrder,
        followsDaypart: i.followsDaypart ?? null,
      })), schedule.daySettings ?? []);
    }
    return true;
  },

  // Adds menu items to a device's schedule (default or a specific week override),
  // creating the row if needed. Items are recorded for each of their active days.
  addScheduleItems: async (
    target: ScheduleTarget,
    deviceId: string,
    daypart: string,
    items: MenuItem[],
  ): Promise<boolean> => {
    const rowId = await ensureScheduleRow(deviceId, target);
    if (!rowId) return false;

    const { data: existing } = await supabase
      .from('device_schedule_items')
      .select('*')
      .eq('schedule_id', rowId);
    const rows = existing || [];
    let maxSort = rows.reduce((m: number, r: any) => Math.max(m, r.sort_order ?? 0), 0);

    const toInsert: any[] = [];
    for (const item of items) {
      const followed = item.followsDaypart ? item.daysByDaypart?.[item.followsDaypart] : undefined;
      const days = followed?.length ? followed : item.activeDays && item.activeDays.length > 0 ? item.activeDays : [0, 1, 2, 3, 4, 5, 6];
      maxSort += 1;
      const sort = maxSort;
      for (const d of days) {
        const dup = rows.some((r: any) => r.daypart === daypart && r.day_of_week === d && r.menu_item_mrn === item.mrn);
        if (dup) continue;
        toInsert.push({
          schedule_id: rowId,
          daypart,
          day_of_week: d,
          menu_item_mrn: item.mrn,
          menu_item_name: item.name,
          menu_item_price: item.price,
          sort_order: sort,
          ...(item.followsDaypart ? { follows_daypart: item.followsDaypart } : {}),
        });
      }
    }
    await insertScheduleRows(toInsert);
    return true;
  },

  // Removes a menu item (by MRN) from a device's schedule for a daypart.
  removeScheduleItem: async (
    target: ScheduleTarget,
    deviceId: string,
    daypart: string,
    mrn: string,
  ): Promise<boolean> => {
    const rowId = await ensureScheduleRow(deviceId, target);
    if (!rowId) return false;
    await supabase
      .from('device_schedule_items')
      .delete()
      .eq('schedule_id', rowId)
      .eq('daypart', daypart)
      .eq('menu_item_mrn', mrn);
    // Its day settings go with it
    await supabase
      .from('label_day_settings')
      .delete()
      .eq('schedule_id', rowId)
      .eq('daypart', daypart)
      .eq('menu_item_mrn', mrn);
    return true;
  },

  // Before the first edit to a week that has no schedule of its own (it shows the Default Week or
  // a recurring one), copy what it shows into it, so the edit doesn't leave the week empty.
  ensureWeekCopy: async (weekStart: string, deviceId: string, shown: DeviceWeekSchedule | undefined): Promise<void> => {
    if (!shown) return;
    const { data } = await supabase
      .from('device_week_schedules')
      .select('id')
      .eq('device_id', deviceId)
      .eq('is_default', false)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (data) return;
    await api.pasteWeekSchedule(weekStart, [{ ...shown, deviceId }], null);
  },

  // Sets one item's week on a label page (Off / On per day; missing days are Auto)
  setItemDaySettings: async (
    target: ScheduleTarget,
    deviceId: string,
    daypart: string,
    mrn: string,
    days: Partial<Record<number, 'on' | 'off'>>,
  ): Promise<void> => {
    const rowId = await ensureScheduleRow(deviceId, target);
    if (!rowId) throw new Error('Could not find the schedule to save day settings to');
    const { error } = await supabase
      .from('label_day_settings')
      .delete()
      .eq('schedule_id', rowId)
      .eq('daypart', daypart)
      .eq('menu_item_mrn', mrn);
    if (error) throw new Error(`Day settings didn't save (has the label_day_settings migration run?): ${error.message}`);
    const rows = Object.entries(days)
      .filter(([, state]) => state === 'on' || state === 'off')
      .map(([d, state]) => ({ schedule_id: rowId, daypart, menu_item_mrn: mrn, day_of_week: Number(d), state }));
    if (rows.length === 0) return;
    const { error: insertError } = await supabase.from('label_day_settings').insert(rows);
    if (insertError) throw new Error(`Day settings didn't save: ${insertError.message}`);
  },

  // Marks a week as recurring every N weeks. Persists the given (resolved) items
  // first so the pattern exists even if the week was only inherited before.
  setWeekRecurring: async (
    weekStart: string,
    recurrenceWeeks: number,
    schedules: DeviceWeekSchedule[],
  ): Promise<boolean> => {
    await api.pasteWeekSchedule(weekStart, schedules, weekStart);
    const { error } = await supabase
      .from('device_week_schedules')
      .update({ is_recurring: true, recurrence_weeks: recurrenceWeeks, source_type: 'recurring' })
      .eq('week_start', weekStart)
      .eq('is_default', false);
    if (error) { console.error('Error setting recurring:', error); return false; }
    return true;
  },

  // Clears the recurring flag for a week without deleting its items.
  clearWeekRecurring: async (weekStart: string): Promise<boolean> => {
    const { error } = await supabase
      .from('device_week_schedules')
      .update({ is_recurring: false, recurrence_weeks: null })
      .eq('week_start', weekStart)
      .eq('is_default', false);
    if (error) { console.error('Error clearing recurring:', error); return false; }
    return true;
  },

  // "Empty week": creates explicit override rows with no items so the week
  // shows empty instead of inheriting the default.
  emptyWeekSchedule: async (weekStart: string, deviceIds: string[]): Promise<boolean> => {
    for (const deviceId of deviceIds) {
      const rowId = await ensureScheduleRow(deviceId, { isDefault: false, weekStart });
      if (rowId) await replaceScheduleItems(rowId, []);
    }
    return true;
  },

  // "Reset to default": removes the override rows so the week inherits again.
  resetWeekToDefault: async (weekStart: string): Promise<boolean> => {
    const { data: schedules } = await supabase
      .from('device_week_schedules')
      .select('id')
      .eq('week_start', weekStart)
      .eq('is_default', false);
    if (!schedules || schedules.length === 0) return true;
    const ids = schedules.map((s: any) => s.id);
    await supabase.from('device_schedule_items').delete().in('schedule_id', ids);
    await supabase.from('device_week_schedules').delete().in('id', ids);
    return true;
  },

  clearWeekSchedule: async (weekStart: string): Promise<boolean> => {
    return api.resetWeekToDefault(weekStart);
  },
};