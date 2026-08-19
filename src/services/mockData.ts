import { MenuItem, Device, Concept, Company, Store, Placement } from '../types';

// Mock menu items remain unchanged
export const mockMenuItems: MenuItem[] = [
  // ... existing menu items
];

// Mock menu items for ESL label previews
// Minimal items used to populate device pages with realistic content
let mockItemIdCounter = 90000;
const mkItem = (
  name: string,
  price: string,
  description: string | null,
  calories: string,
  mealPeriod: string,
  mealStation: string,
): MenuItem => ({
  id: mockItemIdCounter++,
  date: new Date().toISOString().split('T')[0],
  name,
  description,
  enticingDescription: null,
  ingredients: '',
  price,
  mrn: `MOCK-${mockItemIdCounter}`,
  nutrition: {
    calories: { value: calories, dailyValue: null, displayValue: calories },
    protein: { value: '0', dailyValue: null, displayValue: '0g' },
    carbohydrates: { value: '0', dailyValue: null, displayValue: '0g' },
    fat: { value: '0', dailyValue: null, displayValue: '0g' },
    sugar: { value: '0', dailyValue: null, displayValue: '0g' },
  },
  allergens: '',
  portion: '',
  icons: [],
  calories,
  mealPeriodId: 0,
  mealStation,
  mealPeriod,
  sortOrder: 0,
  isActive: true,
});

const breakfastItems = [
  mkItem('Avocado Toast', '8.50', 'Sourdough, smashed avocado, chili flakes, lemon', '420', 'Breakfast', 'Grill'),
  mkItem('Veggie Omelette', '9.75', 'Three eggs, bell peppers, spinach, feta', '380', 'Breakfast', 'Grill'),
  mkItem('Berry Pancakes', '7.50', 'Stack of three, mixed berries, maple syrup', '550', 'Breakfast', 'Grill'),
  mkItem('Oatmeal Bowl', '5.50', 'Steel-cut oats, brown sugar, banana, walnuts', '320', 'Breakfast', 'Hot Line'),
  mkItem('Breakfast Burrito', '8.25', 'Eggs, black beans, cheese, salsa verde', '480', 'Breakfast', 'Grill'),
  mkItem('Greek Yogurt Parfait', '6.00', 'Greek yogurt, granola, honey, mixed berries', '290', 'Breakfast', 'Cold Station'),
  mkItem('Everything Bagel', '4.50', 'Toasted with cream cheese', '350', 'Breakfast', 'Bakery'),
  mkItem('Sausage & Egg Sandwich', '6.75', 'Pork sausage, fried egg, cheddar on brioche', '520', 'Breakfast', 'Grill'),
];

const lunchItems = [
  mkItem('Margherita Flatbread', '10.50', 'Tomato, fresh mozzarella, basil, olive oil', '680', 'Lunch', 'Pizza'),
  mkItem('Cobb Salad', '11.25', 'Romaine, chicken, bacon, egg, avocado, blue cheese', '540', 'Lunch', 'Salad Bar'),
  mkItem('Turkey Club', '9.50', 'Turkey, bacon, lettuce, tomato, triple-decker', '620', 'Lunch', 'Deli'),
  mkItem('Tomato Basil Soup', '5.75', 'Creamy tomato, fresh basil, served with bread', '320', 'Lunch', 'Hot Line'),
  mkItem('Buffalo Chicken Wrap', '8.75', 'Crispy chicken, buffalo sauce, ranch, lettuce', '590', 'Lunch', 'Grill'),
  mkItem('Quinoa Power Bowl', '9.00', 'Quinoa, roasted veg, chickpeas, tahini dressing', '450', 'Lunch', 'Salad Bar'),
  mkItem('Fish Tacos', '10.25', 'Baja fish, slaw, chipotle crema, corn tortilla', '510', 'Lunch', 'Grill'),
  mkItem('Cheeseburger', '8.50', 'Beef patty, cheddar, lettuce, tomato, brioche bun', '740', 'Lunch', 'Grill'),
];

const dinnerItems = [
  mkItem('Gr Salmon', '14.50', 'Atlantic salmon, lemon herb butter, asparagus', '550', 'Dinner', 'Hot Line'),
  mkItem('Mushroom Risotto', '12.00', 'Arborio rice, wild mushrooms, parmesan, truffle oil', '620', 'Dinner', 'Hot Line'),
  mkItem('BBQ Brisket', '15.50', 'Slow-smoked brisket, BBQ sauce, coleslaw, bun', '780', 'Dinner', 'Grill'),
  mkItem('Pad Thai', '11.75', 'Rice noodles, shrimp, egg, peanuts, lime', '590', 'Dinner', 'Wok'),
  mkItem('Steak Frites', '16.50', 'Sirloin, herb butter, hand-cut fries', '820', 'Dinner', 'Grill'),
  mkItem('Caesar Salad', '8.50', 'Romaine, croutons, parmesan, Caesar dressing', '380', 'Dinner', 'Salad Bar'),
  mkItem('Vegetable Curry', '10.50', 'Mixed veg, coconut curry sauce, basmati rice', '520', 'Dinner', 'Hot Line'),
  mkItem('Lamb Gyro', '11.25', 'Spiced lamb, tzatziki, onion, tomato, pita', '610', 'Dinner', 'Grill'),
];

const lateNightItems = [
  mkItem('Pepperoni Pizza Slice', '4.50', 'Classic pepperoni, mozzarella, tomato sauce', '380', 'Late Night', 'Pizza'),
  mkItem('Chicken Tenders', '7.50', 'Crispy tenders, ranch dipping sauce', '520', 'Late Night', 'Grill'),
  mkItem('Loaded Fries', '6.50', 'Fries, cheese, bacon, scallions, sour cream', '680', 'Late Night', 'Grill'),
  mkItem('Mozzarella Sticks', '6.00', 'Breaded mozzarella, marinara sauce', '450', 'Late Night', 'Grill'),
];

const iceCreamItems = [
  mkItem('Vanilla Bean', '3.50', 'Premium Madagascar vanilla', '210', 'All Day', 'Ice Cream'),
  mkItem('Chocolate Fudge', '3.50', 'Rich chocolate with fudge swirls', '240', 'All Day', 'Ice Cream'),
  mkItem('Strawberry Swirl', '3.50', 'Fresh strawberry with fruit swirls', '200', 'All Day', 'Ice Cream'),
  mkItem('Mint Chocolate Chip', '3.50', 'Cool mint with dark chocolate chips', '220', 'All Day', 'Ice Cream'),
  mkItem('Cookies & Cream', '3.75', 'Vanilla with cookie pieces', '250', 'All Day', 'Ice Cream'),
  mkItem('Salted Caramel', '3.75', 'Caramel swirl with sea salt', '240', 'All Day', 'Ice Cream'),
  mkItem('Coffee Crunch', '3.75', 'Espresso ice cream with chocolate crunch', '230', 'All Day', 'Ice Cream'),
  mkItem('Pistachio', '3.50', 'Roasted pistachio, authentic flavor', '220', 'All Day', 'Ice Cream'),
];

const allMockItems = [...breakfastItems, ...lunchItems, ...dinnerItems, ...lateNightItems, ...iceCreamItems];

const makeDaypartPages = (
  deviceId: string,
  capacity: number,
  breakfast: MenuItem[],
  lunch: MenuItem[],
  dinner: MenuItem[],
  lateNight: MenuItem[] = [],
) => {
  const pages = [
    {
      id: `${deviceId}-breakfast`,
      name: 'Page 1',
      daypart: 'Breakfast',
      displayCapacity: capacity,
      assignedItems: breakfast,
      itemOrder: breakfast.map(i => i.id),
      schedule: { startTime: '06:00', endTime: '10:30' },
    },
    {
      id: `${deviceId}-lunch`,
      name: 'Page 2',
      daypart: 'Lunch',
      displayCapacity: capacity,
      assignedItems: lunch,
      itemOrder: lunch.map(i => i.id),
      schedule: { startTime: '10:30', endTime: '14:30' },
    },
    {
      id: `${deviceId}-dinner`,
      name: 'Page 3',
      daypart: 'Dinner',
      displayCapacity: capacity,
      assignedItems: dinner,
      itemOrder: dinner.map(i => i.id),
      schedule: { startTime: '16:30', endTime: '20:00' },
    },
  ];

  if (lateNight.length > 0 || capacity <= 4) {
    pages.push({
      id: `${deviceId}-latenight`,
      name: 'Page 4',
      daypart: 'Late Night',
      displayCapacity: capacity,
      assignedItems: lateNight,
      itemOrder: lateNight.map(i => i.id),
      schedule: { startTime: '20:00', endTime: '02:00' },
    });
  }

  return pages;
};

// Mock devices — varied ESL sizes: 2", 3", 4", 7", 11"
export const mockDevices: Device[] = [
  // 2-inch single-item shelf labels
  {
    id: 'device-1',
    name: 'ESL-DH-001',
    location: 'Main Campus - Dining Hall - Entry Display',
    labelSize: '2-inch',
    status: { wifiStrength: 4, batteryLevel: 87, currentPage: 'device-1-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-1',
    assignedItems: [breakfastItems[0]],
    pages: makeDaypartPages('device-1', 1, [breakfastItems[0]], [lunchItems[0]], [dinnerItems[0]], [lateNightItems[0]]),
  },
  {
    id: 'device-2',
    name: 'ESL-SU-002',
    location: 'Main Campus - Student Union - Food Court',
    labelSize: '2-inch',
    status: { wifiStrength: 3, batteryLevel: 92, currentPage: 'device-2-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-2',
    assignedItems: [breakfastItems[1]],
    pages: makeDaypartPages('device-2', 1, [breakfastItems[1]], [lunchItems[1]], [dinnerItems[1]], [lateNightItems[1]]),
  },
  // 3-inch single-item with more detail
  {
    id: 'device-3',
    name: 'ESL-GR-003',
    location: 'Main Campus - Dining Hall - Grill Station',
    labelSize: '3-inch',
    status: { wifiStrength: 4, batteryLevel: 65, currentPage: 'device-3-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-1',
    assignedItems: [breakfastItems[4], lunchItems[4], dinnerItems[3]],
    pages: makeDaypartPages('device-3', 1, [breakfastItems[4]], [lunchItems[4]], [dinnerItems[3]], []),
  },
  {
    id: 'device-4',
    name: 'ESL-PIZ-004',
    location: 'Main Campus - Student Union - Pizza Station',
    labelSize: '3-inch',
    status: { wifiStrength: 2, batteryLevel: 41, currentPage: 'device-4-lunch', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-2',
    assignedItems: [lunchItems[0], lateNightItems[0]],
    pages: makeDaypartPages('device-4', 1, [], [lunchItems[0]], [dinnerItems[6]], [lateNightItems[0]]),
  },
  // 4-inch single item with lots of info
  {
    id: 'device-5',
    name: 'ESL-CHEF-005',
    location: 'Main Campus - Dining Hall - Chef Specials',
    labelSize: '4-inch',
    status: { wifiStrength: 5, batteryLevel: 78, currentPage: 'device-5-lunch', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-1',
    assignedItems: [breakfastItems[2], lunchItems[2], dinnerItems[4]],
    pages: makeDaypartPages('device-5', 1, [breakfastItems[2]], [lunchItems[2]], [dinnerItems[4]], []),
  },
  {
    id: 'device-6',
    name: 'ESL-HOSP-006',
    location: 'Regional Hospital - Main Tower - Café Display',
    labelSize: '4-inch',
    status: { wifiStrength: 3, batteryLevel: 55, currentPage: 'device-6-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-3-1-1',
    assignedItems: [breakfastItems[3], lunchItems[5]],
    pages: makeDaypartPages('device-6', 1, [breakfastItems[3]], [lunchItems[5]], [], []),
  },
  // 7-inch multi-item list labels
  {
    id: 'device-7',
    name: 'ESL-HOT-007',
    location: 'Main Campus - Dining Hall - Hot Line Menu Board',
    labelSize: '7-inch',
    status: { wifiStrength: 4, batteryLevel: 72, currentPage: 'device-7-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-1',
    assignedItems: [breakfastItems[3], breakfastItems[5], breakfastItems[6], lunchItems[3], lunchItems[5], lunchItems[6], dinnerItems[6], dinnerItems[2]],
    pages: makeDaypartPages('device-7', 4, [breakfastItems[3], breakfastItems[5], breakfastItems[6]], [lunchItems[3], lunchItems[5], lunchItems[6]], [dinnerItems[6], dinnerItems[2], dinnerItems[7]], [lateNightItems[2], lateNightItems[3]]),
  },
  {
    id: 'device-8',
    name: 'ESL-SALAD-008',
    location: 'Main Campus - Student Union - Salad Bar Display',
    labelSize: '7-inch',
    status: { wifiStrength: 1, batteryLevel: 18, currentPage: 'device-8-lunch', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-2',
    assignedItems: [lunchItems[1], lunchItems[5], dinnerItems[5]],
    pages: makeDaypartPages('device-8', 4, [], [lunchItems[1], lunchItems[5]], [dinnerItems[5], dinnerItems[6]], []),
  },
  {
    id: 'device-9',
    name: 'ESL-ED-009',
    location: 'Regional Hospital - Emergency Department - Vending Display',
    labelSize: '7-inch',
    status: { wifiStrength: 0, batteryLevel: 33, currentPage: 'device-9-lunch', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-3-1-2',
    assignedItems: [lunchItems[3], lunchItems[7], lateNightItems[1]],
    pages: makeDaypartPages('device-9', 4, [], [lunchItems[3], lunchItems[7]], [], [lateNightItems[1], lateNightItems[2]]),
  },
  // 11-inch ice cream cooler label
  {
    id: 'device-10',
    name: 'ESL-ICE-010',
    location: 'Main Campus - Student Union - Ice Cream Cooler',
    labelSize: '11-inch',
    status: { wifiStrength: 4, batteryLevel: 90, currentPage: 'device-10-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-2',
    assignedItems: iceCreamItems,
    pages: [
      {
        id: 'device-10-allday',
        name: 'Page 1',
        daypart: 'All Day',
        displayCapacity: 8,
        assignedItems: iceCreamItems,
        itemOrder: iceCreamItems.map(i => i.id),
        schedule: { startTime: '07:00', endTime: '23:00' },
      },
    ],
  },
  {
    id: 'device-11',
    name: 'ESL-ICE-011',
    location: 'Regional Hospital - Main Tower - Gift Shop Cooler',
    labelSize: '11-inch',
    status: { wifiStrength: 3, batteryLevel: 62, currentPage: 'device-11-allday', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-3-1-1',
    assignedItems: [iceCreamItems[0], iceCreamItems[1], iceCreamItems[2], iceCreamItems[3]],
    pages: [
      {
        id: 'device-11-allday',
        name: 'Page 1',
        daypart: 'All Day',
        displayCapacity: 8,
        assignedItems: [iceCreamItems[0], iceCreamItems[1], iceCreamItems[2], iceCreamItems[3]],
        itemOrder: [iceCreamItems[0].id, iceCreamItems[1].id, iceCreamItems[2].id, iceCreamItems[3].id],
        schedule: { startTime: '08:00', endTime: '20:00' },
      },
    ],
  },
  // Additional 2-inch labels for variety
  {
    id: 'device-12',
    name: 'ESL-BAK-012',
    location: 'Main Campus - Dining Hall - Bakery Station',
    labelSize: '2-inch',
    status: { wifiStrength: 4, batteryLevel: 95, currentPage: 'device-12-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-1',
    assignedItems: [breakfastItems[6]],
    pages: makeDaypartPages('device-12', 1, [breakfastItems[6]], [lunchItems[3]], [dinnerItems[1]], []),
  },
  {
    id: 'device-13',
    name: 'ESL-COLD-013',
    location: 'Main Campus - Dining Hall - Cold Station',
    labelSize: '3-inch',
    status: { wifiStrength: 3, batteryLevel: 28, currentPage: 'device-13-breakfast', forcedPage: null, lastUpdated: new Date().toISOString() },
    placementId: 'placement-1-1-1',
    assignedItems: [breakfastItems[5], lunchItems[1]],
    pages: makeDaypartPages('device-13', 1, [breakfastItems[5]], [lunchItems[1]], [dinnerItems[5]], []),
  },
];

export const mockLabelPreviewItems = allMockItems;

// Enhanced mock concepts data
export const mockConcepts: Concept[] = [
  {
    id: "concept-1",
    name: "University Dining",
    children: []
  },
  {
    id: "concept-2",
    name: "Healthcare Food Services",
    children: []
  },
  {
    id: "concept-3",
    name: "Corporate Dining",
    children: []
  },
  {
    id: "concept-4",
    name: "K-12 School Dining",
    children: []
  }
];

// Enhanced mock companies data
export const mockCompanies: Company[] = [
  // University Dining Companies
  {
    id: "company-1",
    name: "Northeast University Group",
    conceptId: "concept-1"
  },
  {
    id: "company-2",
    name: "West Coast Campus Dining",
    conceptId: "concept-1"
  },
  {
    id: "company-3",
    name: "Midwest University Alliance",
    conceptId: "concept-1"
  },
  
  // Healthcare Companies
  {
    id: "company-4",
    name: "Regional Hospital Network",
    conceptId: "concept-2"
  },
  {
    id: "company-5",
    name: "Medical Center Dining Solutions",
    conceptId: "concept-2"
  },
  
  // Corporate Companies
  {
    id: "company-6",
    name: "Tech Campus Food Services",
    conceptId: "concept-3"
  },
  {
    id: "company-7",
    name: "Business Park Dining Group",
    conceptId: "concept-3"
  },
  
  // K-12 Companies
  {
    id: "company-8",
    name: "District Food Services",
    conceptId: "concept-4"
  },

  // Perrilco (demo "other store" the user has access to outside the current hierarchy)
  {
    id: "company-9",
    name: "Perrilco",
    conceptId: "concept-1"
  }
];

// Enhanced mock stores data
export const mockStores: Store[] = [
  // Northeast University Group Stores
  {
    id: "store-1",
    name: "Main Campus Dining Hall",
    companyId: "company-1"
  },
  {
    id: "store-2",
    name: "Science Center Café",
    companyId: "company-1"
  },
  {
    id: "store-3",
    name: "Student Union Food Court",
    companyId: "company-1"
  },
  {
    id: "store-4",
    name: "Athletics Center Grill",
    companyId: "company-1"
  },
  
  // West Coast Campus Dining Stores
  {
    id: "store-5",
    name: "Pacific Hall Dining",
    companyId: "company-2"
  },
  {
    id: "store-6",
    name: "Oceanview Café",
    companyId: "company-2"
  },
  
  // Midwest University Alliance Stores
  {
    id: "store-7",
    name: "Central Dining Commons",
    companyId: "company-3"
  },
  {
    id: "store-8",
    name: "Engineering Building Café",
    companyId: "company-3"
  },
  
  // Regional Hospital Network Stores
  {
    id: "store-9",
    name: "Main Hospital Cafeteria",
    companyId: "company-4"
  },
  {
    id: "store-10",
    name: "Emergency Department Café",
    companyId: "company-4"
  },
  {
    id: "store-11",
    name: "Medical Office Building Bistro",
    companyId: "company-4"
  },
  
  // Medical Center Dining Solutions Stores
  {
    id: "store-12",
    name: "Children's Hospital Café",
    companyId: "company-5"
  },
  {
    id: "store-13",
    name: "Research Center Dining",
    companyId: "company-5"
  },
  
  // Tech Campus Food Services Stores
  {
    id: "store-14",
    name: "Innovation Center Café",
    companyId: "company-6"
  },
  {
    id: "store-15",
    name: "Developer Building Food Court",
    companyId: "company-6"
  },
  
  // Business Park Dining Group Stores
  {
    id: "store-16",
    name: "Corporate HQ Cafeteria",
    companyId: "company-7"
  },
  {
    id: "store-17",
    name: "Executive Building Bistro",
    companyId: "company-7"
  },
  
  // District Food Services Stores
  {
    id: "store-18",
    name: "High School Cafeteria",
    companyId: "company-8"
  },
  {
    id: "store-19",
    name: "Middle School Dining Hall",
    companyId: "company-8"
  },
  {
    id: "store-20",
    name: "Elementary School Café",
    companyId: "company-8"
  },

  // Creative Service Lab — demo "other store" under Perrilco
  {
    id: "store-21",
    name: "Creative Service Lab",
    companyId: "company-9"
  }
];

// Demo secondary domains for multi-domain users.
// Each domain has its own concept, companies, and stores. When a user toggles
// "multi-domain" on and picks one of these, its nodes appear in the quick nav
// "Other" sections at concept/company/store level.
export interface DemoSecondaryDomain {
  id: string;
  name: string;
  concept: { id: string; name: string };
  companies: { id: string; name: string; conceptId: string }[];
  stores: { id: string; name: string; companyId: string }[];
}

export const demoSecondaryDomains: DemoSecondaryDomain[] = [
  {
    id: 'domain-perrilco',
    name: 'Perrilco (Internal)',
    concept: { id: 'concept-perrilco', name: 'Perrilco' },
    companies: [
      { id: 'company-perrilco-1', name: 'Perrilco Internal Services', conceptId: 'concept-perrilco' },
    ],
    stores: [
      { id: 'store-21', name: 'Creative Service Lab', companyId: 'company-perrilco-1' },
    ],
  },
  {
    id: 'domain-midwest',
    name: 'Midwest University Alliance',
    concept: { id: 'concept-midwest', name: 'Midwest Collegiate Dining' },
    companies: [
      { id: 'company-midwest-1', name: 'Great Lakes Campus Group', conceptId: 'concept-midwest' },
    ],
    stores: [
      { id: 'store-midwest-1', name: 'Lakeshore Dining Hall', companyId: 'company-midwest-1' },
      { id: 'store-midwest-2', name: 'Student Center Bistro', companyId: 'company-midwest-1' },
    ],
  },
  {
    id: 'domain-regional',
    name: 'Regional Hospital Network',
    concept: { id: 'concept-regional', name: 'Regional Healthcare Dining' },
    companies: [
      { id: 'company-regional-1', name: 'Tri-County Hospital Group', conceptId: 'concept-regional' },
    ],
    stores: [
      { id: 'store-regional-1', name: 'North Wing Cafeteria', companyId: 'company-regional-1' },
    ],
  },
];

// Helper function to get device references after devices are defined
const getDeviceById = (id: string): Device | undefined => {
  return mockDevices.find(d => d.id === id);
};

// Enhanced mock placements data with hierarchical structure
export const mockPlacements: Placement[] = [
  {
    id: "placement-1",
    name: "Northeast Region",
    devices: [],
    children: [
      {
        id: "placement-1-1",
        name: "Main Campus",
        devices: [],
        children: [
          {
            id: "placement-1-1-1",
            name: "Dining Hall",
            devices: [getDeviceById("device-1")].filter(Boolean) as Device[],
            children: []
          },
          {
            id: "placement-1-1-2",
            name: "Student Union",
            devices: [getDeviceById("device-2")].filter(Boolean) as Device[],
            children: []
          }
        ]
      },
      {
        id: "placement-1-2",
        name: "Science Complex",
        devices: [],
        children: [
          {
            id: "placement-1-2-1",
            name: "Research Building",
            devices: [],
            children: []
          }
        ]
      }
    ]
  },
  {
    id: "placement-2",
    name: "West Coast Region",
    devices: [],
    children: [
      {
        id: "placement-2-1",
        name: "Pacific Campus",
        devices: [],
        children: [
          {
            id: "placement-2-1-1",
            name: "Main Building",
            devices: [],
            children: []
          }
        ]
      }
    ]
  },
  {
    id: "placement-3",
    name: "Healthcare Division",
    devices: [],
    children: [
      {
        id: "placement-3-1",
        name: "Regional Hospital",
        devices: [],
        children: [
          {
            id: "placement-3-1-1",
            name: "Main Tower",
            devices: [],
            children: []
          },
          {
            id: "placement-3-1-2",
            name: "Emergency Department",
            devices: [],
            children: []
          }
        ]
      }
    ]
  }
];