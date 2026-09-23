import { MenuItem, Device, Concept, Company, Store, Rule, Brand, DeviceGroup } from '../types';
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

export const api = {
  // Menu Items - now from Supabase
  getMenuItems: async (): Promise<MenuItem[]> => {
    const pageSize = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          meal_period:meal_periods(id, name),
          station:stations(id, name)
        `)
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

    const data = allData;

    let allAvailability: any[] = [];
    from = 0;
    hasMore = true;
    while (hasMore) {
      const { data: avPage } = await supabase
        .from('product_availability')
        .select('mrn, day_of_week, meal_period_id, last_seen_date, meal_period:meal_periods(name)')
        .range(from, from + pageSize - 1);
      allAvailability = allAvailability.concat(avPage || []);
      hasMore = (avPage?.length || 0) === pageSize;
      from += pageSize;
    }

    const availabilityByMrn = new Map<string, any[]>();
    allAvailability.forEach((av: any) => {
      if (!availabilityByMrn.has(av.mrn)) {
        availabilityByMrn.set(av.mrn, []);
      }
      availabilityByMrn.get(av.mrn)!.push(av);
    });

    return data.map((item: any) => {
      const availability = availabilityByMrn.get(item.mrn) || [];
      const activeDays = [...new Set(availability.map((av: any) => av.day_of_week))].sort();
      const activeMealPeriods = [...new Set(availability.map((av: any) => av.meal_period?.name).filter(Boolean))];
      const availabilityDataFormatted = availability.map((av: any) => ({
        dayOfWeek: av.day_of_week,
        mealPeriod: av.meal_period?.name || '',
        lastSeen: av.last_seen_date,
      }));

      // Debug logging for Carrot Salad
      if (item.mrn === '159668.2') {
        console.log('Carrot Salad availability:', {
          mrn: item.mrn,
          name: item.name,
          activeDays,
          availability: availability.map((av: any) => ({
            day_of_week: av.day_of_week,
            meal_period: av.meal_period?.name
          }))
        });
      }

      return {
        id: item.id,
        date: item.date || new Date().toISOString().split('T')[0],
        name: item.name,
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
        calories: item.calories || '0',
        mealPeriodId: item.meal_period_id || 0,
        mealStation: item.station?.name || 'Uncategorized',
        mealPeriod: item.meal_period?.name || 'All Day',
        sortOrder: item.sort_order || 0,
        isActive: true,
        activeDays,
        activeMealPeriods,
        availabilityData: availabilityDataFormatted,
      };
    });
  },

  // Get menu items grouped by MRN
  getGroupedMenuItems: async (): Promise<MenuItem[]> => {
    const items = await api.getMenuItems();
    console.log(`Total items fetched: ${items.length}`);

    // Group items by MRN
    const groupedMap = new Map<string, MenuItem[]>();

    items.forEach(item => {
      const key = item.mrn || `no-mrn-${item.id}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(item);
    });

    console.log(`Unique MRNs: ${groupedMap.size}`);

    // Convert grouped items to consolidated MenuItem objects
    const consolidatedItems: MenuItem[] = [];
    let groupedCount = 0;

    groupedMap.forEach((groupItems, mrn) => {
      if (groupItems.length === 1) {
        // Single item, return as-is
        consolidatedItems.push(groupItems[0]);
      } else {
        // Multiple items with same MRN - consolidate
        groupedCount++;
        const firstItem = groupItems[0];
        const mealPeriods = Array.from(new Set(groupItems.map(i => i.mealPeriod)));
        const mealStations = Array.from(new Set(groupItems.map(i => i.mealStation)));
        const originalItemIds = groupItems.map(i => i.id);

        // Merge availability data from all items in the group
        const allAvailabilityData = groupItems.flatMap(i => i.availabilityData || []);
        const uniqueAvailability = Array.from(
          new Map(
            allAvailabilityData.map(av => [
              `${av.dayOfWeek}-${av.mealPeriod}`,
              av
            ])
          ).values()
        );
        const mergedActiveDays = Array.from(
          new Set(uniqueAvailability.map(av => av.dayOfWeek))
        ).sort();
        const mergedActiveMealPeriods = Array.from(
          new Set(uniqueAvailability.map(av => av.mealPeriod).filter(Boolean))
        );

        consolidatedItems.push({
          ...firstItem,
          isGrouped: true,
          mealPeriods,
          mealStations,
          originalItemIds,
          occurrenceCount: groupItems.length,
          // Use first item's meal period and station for backward compatibility
          mealPeriod: mealPeriods[0],
          mealStation: mealStations[0],
          // Merged availability data from all items
          activeDays: mergedActiveDays,
          activeMealPeriods: mergedActiveMealPeriods,
          availabilityData: uniqueAvailability,
        });
      }
    });

    console.log(`Items with duplicates grouped: ${groupedCount}`);
    console.log(`Total items after grouping: ${consolidatedItems.length}`);

    return consolidatedItems.sort((a, b) => a.name.localeCompare(b.name));
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
  }
};