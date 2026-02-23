import { MenuItem, Device, Concept, Company, Store, Placement } from '../types';

// Mock menu items remain unchanged
export const mockMenuItems: MenuItem[] = [
  // ... existing menu items
];

// Mock devices
export const mockDevices: Device[] = [
  {
    id: "device-1",
    name: "ESL-DH-001",
    location: "Main Campus - Dining Hall - Entry Display",
    status: {
      wifiStrength: 4,
      batteryLevel: 87,
      currentPage: "page-1-1",
      forcedPage: null,
      lastUpdated: new Date().toISOString()
    },
    placementId: "placement-1-1-1",
    assignedItems: [],
    pages: [
      {
        id: "page-1-1",
        name: "Page 1",
        daypart: "Breakfast",
        displayCapacity: 8,
        assignedItems: [],
        itemOrder: [],
        schedule: { startTime: "06:00", endTime: "10:30" }
      },
      {
        id: "page-1-2",
        name: "Page 2",
        daypart: "Lunch",
        displayCapacity: 8,
        assignedItems: [],
        itemOrder: [],
        schedule: { startTime: "10:30", endTime: "14:30" }
      },
      {
        id: "page-1-3",
        name: "Page 3",
        daypart: "Dinner",
        displayCapacity: 8,
        assignedItems: [],
        itemOrder: [],
        schedule: { startTime: "16:30", endTime: "20:00" }
      }
    ]
  },
  {
    id: "device-2",
    name: "ESL-SU-002",
    location: "Main Campus - Student Union - Food Court",
    status: {
      wifiStrength: 3,
      batteryLevel: 92,
      currentPage: "page-2-1",
      forcedPage: null,
      lastUpdated: new Date().toISOString()
    },
    placementId: "placement-1-1-2",
    assignedItems: [],
    pages: [
      {
        id: "page-2-1",
        name: "Page 1",
        daypart: "Breakfast",
        displayCapacity: 6,
        assignedItems: [],
        itemOrder: [],
        schedule: { startTime: "07:00", endTime: "11:00" }
      },
      {
        id: "page-2-2",
        name: "Page 2",
        daypart: "Lunch",
        displayCapacity: 6,
        assignedItems: [],
        itemOrder: [],
        schedule: { startTime: "11:00", endTime: "15:00" }
      },
      {
        id: "page-2-3",
        name: "Page 3",
        daypart: "Dinner",
        displayCapacity: 6,
        assignedItems: [],
        itemOrder: [],
        schedule: { startTime: "17:00", endTime: "21:00" }
      }
    ]
  }
];

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
  }
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