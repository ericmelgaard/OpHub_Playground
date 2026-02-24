import { MenuItem, Device, Concept, Company, Store, Rule } from '../types';
import { mockDevices, mockConcepts, mockCompanies, mockStores, mockPlacements } from './mockData';
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
    const { data, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        meal_period:meal_periods(id, name),
        station:stations(id, name)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching menu items:', error);
      return [];
    }

    return data.map((item: any) => ({
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
    }));
  },

  // Get menu items grouped by MRN
  getGroupedMenuItems: async (): Promise<MenuItem[]> => {
    const items = await api.getMenuItems();

    // Group items by MRN
    const groupedMap = new Map<string, MenuItem[]>();

    items.forEach(item => {
      const key = item.mrn || `no-mrn-${item.id}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, []);
      }
      groupedMap.get(key)!.push(item);
    });

    // Convert grouped items to consolidated MenuItem objects
    const consolidatedItems: MenuItem[] = [];

    groupedMap.forEach((groupItems, mrn) => {
      if (groupItems.length === 1) {
        // Single item, return as-is
        consolidatedItems.push(groupItems[0]);
      } else {
        // Multiple items with same MRN - consolidate
        const firstItem = groupItems[0];
        const mealPeriods = Array.from(new Set(groupItems.map(i => i.mealPeriod)));
        const mealStations = Array.from(new Set(groupItems.map(i => i.mealStation)));
        const originalItemIds = groupItems.map(i => i.id);

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
        });
      }
    });

    return consolidatedItems.sort((a, b) => a.name.localeCompare(b.name));
  },

  // Devices
  getDevices: async (): Promise<Device[]> => {
    await mockDelay();
    return clone(mockDevices);
  },

  // Location hierarchy
  getConcepts: async (): Promise<Concept[]> => {
    await mockDelay();
    return clone(mockConcepts);
  },

  getCompanies: async (): Promise<Company[]> => {
    await mockDelay();
    return clone(mockCompanies);
  },

  getStores: async (): Promise<Store[]> => {
    await mockDelay();
    return clone(mockStores);
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
    
    // Find the item in the menu items
    const item = mockMenuItems.find(i => i.id === itemId);
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