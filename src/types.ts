// Update RuleAction type to reflect the new action structure
export interface RuleAction {
  type: 'presentation' | 'replace' | 'components';
  field?: string;
  value?: string;
  target?: string; // For replace actions
  tags?: {
    type: 'language' | 'location';
    value: string;
  }[];
  presentationRules?: {
    daypart?: string[];
    station?: string[];
    displayName?: boolean;
    displayDescription?: boolean;
    displayPrice?: boolean;
    displayCalories?: boolean;
    displayAllergens?: boolean;
    displayNutrition?: boolean;
  };
  components?: {
    [key: string]: {
      enabled: boolean;
      alternates: string[];
    };
  };
}

export interface DevicePage {
  id: string;
  name: string;
  daypart: string;
  displayCapacity: number;
  assignedItems: MenuItem[];
  itemOrder: number[];
  schedule?: {
    startTime: string;
    endTime: string;
  };
}

export type LabelSize = '2-inch' | '3-inch' | '4-inch' | '7-inch' | '11-inch';

// Push state between us and the label partner. Mocked until the partner API reports it.
export type SyncState = 'synced' | 'syncing' | 'failed';

export interface DeviceSync {
  state: SyncState;
  lastSyncedAt: string; // last successful sync
  error?: string;       // set when state is failed
}

export interface Device {
  id: string;
  name: string;
  location: string;
  labelSize: LabelSize;
  status: {
    wifiStrength: number;
    batteryLevel: number;
    currentPage: string;
    forcedPage: string | null;
    lastUpdated: string;
    sync?: DeviceSync;
  };
  pages: DevicePage[];
  assignedItems: MenuItem[];
  placementId?: string;
}

export interface MenuItem {
  id: number;
  date: string;
  name: string;
  // What labels show instead of the name, when set (see labelName())
  displayName?: string | null;
  description: string | null;
  enticingDescription: string | null;
  ingredients: string;
  price: string;
  mrn: string;
  // WAND API source system the product came from (see lib/sources.ts); unset = the default one
  sourceSystem?: number;
  nutrition: {
    calories: { value: string; dailyValue: string | null; displayValue: string };
    protein: { value: string; dailyValue: string | null; displayValue: string };
    carbohydrates: { value: string; dailyValue: string | null; displayValue: string };
    fat: { value: string; dailyValue: string | null; displayValue: string };
    sugar: { value: string; dailyValue: string | null; displayValue: string };
  };
  allergens: string;
  portion: string;
  icons: string[];
  // Dietary icon images from Webtrition (Vegan, Vegetarian), highest rank first
  iconImages?: { name: string; url: string; rank?: number }[];
  calories: string;
  mealPeriodId: number;
  mealStation: string;
  mealPeriod: string;
  sortOrder: number;
  isActive?: boolean;
  customAttributes?: CustomAttribute[];
  // MRN grouping fields
  isGrouped?: boolean;
  mealPeriods?: string[];
  mealStations?: string[];
  originalItemIds?: number[];
  occurrenceCount?: number;
  // Day-of-week availability tracking (recent imports only; see AVAILABILITY_RECENT_WEEKS)
  activeDays?: number[];
  // Has any imported availability, even if all of it is too old to count
  hasAvailability?: boolean;
  // The source's days per meal period (Breakfast → [1,2,3]); activeDays merges them
  daysByDaypart?: Record<string, number[]>;
  // On a label page only: the source daypart whose days this item follows (Auto), when it isn't
  // the page's own (a Brunch item on the Breakfast page). Unset = the page's daypart.
  followsDaypart?: string | null;
  dates?: string[];
  activeMealPeriods?: string[];
  availabilityData?: {
    dayOfWeek: number;
    mealPeriod: string;
    lastSeen: string;
  }[];
  // Linked to a source: the source's own values, and the fields changed here (local values)
  source?: ProductValues;
  localFields?: ProductField[];
}

// A product's editable values (see src/lib/productValues.ts)
export interface ProductValues {
  name: string;
  // The one description: enticing description when there is one, else the description
  description: string | null;
  price: string;
  calories: string;
  ingredients: string;
  allergens: string;
  icons: { name: string; url: string; rank?: number }[];
  nutrition: MenuItem['nutrition'];
  // Empty = all dayparts
  dayparts: string[];
}
export type ProductField = keyof ProductValues;

export interface CustomAttribute {
  definitionId: string;
  values: CustomAttributeValue[];
}

export interface CustomAttributeValue {
  value: string;
  language?: string;
  isInherited?: boolean;
}

export interface Concept {
  id: string;
  name: string;
  children: Concept[];
}

export interface Company {
  id: string;
  name: string;
  conceptId: string;
}

export interface Store {
  id: string;
  name: string;
  companyId: string;
}

export interface Placement {
  id: string;
  name: string;
  devices: Device[];
  children: Placement[];
}

export type Theme = 'light' | 'dark' | 'system';

export interface IntegrationSettings {
  type: string;
  businessUnit: string;
  location: string;
  enabled: boolean;
  customAttributeDefinitions: {
    id: string;
    label: string;
    allowAlternates?: boolean;
  }[];
  supportedLanguages?: {
    code: string;
    name: string;
  }[];
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  action: RuleAction;
  active: boolean;
}

export interface Substitution {
  id: string;
  pageId: string;
  originalItemId: number;
  substituteItem: MenuItem;
  dayOfWeek: number;
  createdAt: string;
}

export type SubstitutionKey = `${string}:${number}:${number}`;

export interface SubstitutionContext {
  originalItem: MenuItem;
  pageId: string;
  dayOfWeek: number;
  deviceId: string;
}

export interface ResolvedItem {
  item: MenuItem;
  isSubstituted: boolean;
  substitution?: Substitution;
  originalItem?: MenuItem;
  originalItemId: number;
}

export interface Brand {
  id: number;
  key: string;
  displayName: string;
  logoFilename: string | null;
  logoBaseUrl: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  members?: DeviceGroupMember[];
  brands?: DeviceGroupBrand[];
}

export interface DeviceGroupMember {
  id: string;
  groupId: string;
  deviceId: string;
}

export interface DeviceGroupBrand {
  id: string;
  groupId: string;
  brandId: number;
  brand?: Brand;
}

export interface DeviceWeekSchedule {
  id: string;
  deviceId: string;
  weekStart: string | null;
  isDefault: boolean;
  status: 'draft' | 'active' | 'published';
  sourceType: 'manual' | 'copied' | 'recurring';
  sourceWeekStart: string | null;
  isRecurring: boolean;
  recurrenceWeeks: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: DeviceScheduleItem[];
  // Off / On per item and day on this schedule's labels; no entry is Auto
  daySettings?: DaySetting[];
}

export interface DaySetting {
  daypart: string;
  menuItemMrn: string;
  dayOfWeek: number;
  state: 'on' | 'off';
}

export interface DeviceScheduleItem {
  id: string;
  scheduleId: string;
  daypart: string;
  dayOfWeek: number;
  menuItemMrn: string;
  menuItemName: string;
  menuItemPrice: string;
  sortOrder: number;
  createdAt: string;
  // Source daypart whose days the item follows on this page; null = the page's own
  followsDaypart?: string | null;
}

export type FilterType = 'daypart' | 'station' | 'menu_item_name' | 'menu_item_mrn' | 'date' | 'week' | 'placement' | 'usage';

export interface DateRange {
  start: string;
  end: string;
}

export interface FilterConfig {
  id: string;
  type: FilterType;
  selectedValues: string[];
  dateRange?: DateRange;
  singleDate?: string;
}