export interface GroupTemplate {
  id: string;
  name: string;
  description: string;
  brandKeys: string[];
}

export const SUGGESTED_GROUP_TEMPLATES: GroupTemplate[] = [
  {
    id: 'exhibition',
    name: 'Exhibition',
    description: 'Showcase and feature stations for chef-driven specials',
    brandKeys: ['chefstable', 'create', 'kitchenco', 'crave'],
  },
  {
    id: 'grill',
    name: 'Grill',
    description: 'Grill-focused brands for hot sandwiches and plated meals',
    brandKeys: ['bigcitybbq', 'flame', 'butcherbaker', 'roost1996', 'coolchicks', 'flychix'],
  },
  {
    id: 'salad-bar',
    name: 'Salad Bar',
    description: 'Fresh and healthy build-your-own salad and bowl stations',
    brandKeys: ['crisp', 'earthbowl', 'leafladle', 'rootsandseeds', 'mix', 'littlelime', 'graze', 'marketfresh'],
  },
  {
    id: 'drink-cooler',
    name: 'Drink Cooler',
    description: 'Beverage stations with juices, smoothies, and aguas frescas',
    brandKeys: ['pulpculture', 'pulpculturebowl'],
  },
  {
    id: 'pizza-oven',
    name: 'Pizza Oven',
    description: 'Pizza and pasta stations with customizable options',
    brandKeys: ['piccolaitalia', 'breakfastpizza'],
  },
];
