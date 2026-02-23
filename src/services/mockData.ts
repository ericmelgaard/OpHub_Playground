import { MenuItem, Device, Concept, Company, Store, Placement } from '../types';

// Mock menu items remain unchanged
export const mockMenuItems: MenuItem[] = [
  // ... existing menu items
];

// Mock devices remain unchanged 
export const mockDevices: Device[] = [
  // ... existing devices
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
            devices: [mockDevices[0]],
            children: []
          },
          {
            id: "placement-1-1-2",
            name: "Student Union",
            devices: [mockDevices[1]],
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