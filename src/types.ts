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

export interface Device {
  id: string;
  name: string;
  location: string;
  status: {
    wifiStrength: number;
    batteryLevel: number;
    currentPage: string;
    forcedPage: string | null;
    lastUpdated: string;
  };
  pages: DevicePage[];
  assignedItems: MenuItem[];
  placementId?: string;
}

export interface MenuItem {
  id: number;
  date: string;
  name: string;
  description: string | null;
  enticingDescription: string | null;
  ingredients: string;
  price: string;
  mrn: string;
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
}

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

export type FilterType = 'daypart' | 'station' | 'menu_item_name' | 'menu_item_mrn' | 'date';

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