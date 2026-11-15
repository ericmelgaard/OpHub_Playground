// User guide for store and menu staff. Plain, short how-to text.
// Add a What's new entry (newest first) whenever something staff will notice changes;
// the guide button shows a dot until they've opened it.

export interface GuideUpdate {
  id: string;        // stable, unique; used to remember what's been seen
  date: string;      // YYYY-MM-DD
  title: string;
  text: string;
  section?: string;  // guide section to read more in
}

export interface GuideEntry {
  term?: string;
  text: string;
}

// Pictures drawn in UserGuideFigures.tsx
export type GuideFigureId = 'days' | 'every-day' | 'apply' | 'products';

export interface GuideSection {
  id: string;
  title: string;
  icon: 'labels' | 'items' | 'days' | 'every' | 'weeks' | 'apply' | 'autofill' | 'products' | 'sync';
  intro?: string;
  figure?: GuideFigureId;
  entries: GuideEntry[];
}

export const GUIDE_UPDATES: GuideUpdate[] = [
  {
    id: '2026-11-15-follows-daypart',
    date: '2026-11-15',
    title: 'Items from another daypart keep their days',
    text: 'Add a Brunch item to the Breakfast page and it shows on the days Brunch is offered, marked "Follows Brunch". Each daypart also uses its own days now: an item served at Lunch on weekdays only shows on weekdays on the Lunch page.',
    section: 'items',
  },
  {
    id: '2026-11-15-save',
    date: '2026-11-15',
    title: 'One Save button',
    text: 'Label changes are always saved with Save. The label shows them on the days they\'re for, and changes for today show right away.',
    section: 'apply',
  },
  {
    id: '2026-11-15-edit-source-products',
    date: '2026-11-15',
    title: 'Edit products from the source',
    text: 'Every product can be edited now. For products from a source, your changes are kept here and marked "Local", and the source isn\'t changed. Changing a product\'s dayparts changes where it can be added.',
    section: 'products',
  },
  {
    id: '2026-11-14-everyday-preview',
    date: '2026-11-14',
    title: 'Every day shows your everyday menu',
    text: 'With Every day picked, the label preview shows the items that are on all 7 days. Items on some days only are tagged "Some days". Pick a day to see them on the label.',
    section: 'every-day',
  },
  {
    id: '2026-11-14-all-dayparts',
    date: '2026-11-14',
    title: 'Change every daypart at once',
    text: 'All dayparts lists each item on the label for the day you picked, across every daypart. Add an item to all its dayparts in one step, or tap "+ Lunch" to add it to one more.',
    section: 'every-day',
  },
  {
    id: '2026-11-14-item-week',
    date: '2026-11-14',
    title: 'Each item has its own week',
    text: 'Adding an item on one day puts it on that day only. To have it follow its normal days, add it with Every day picked.',
    section: 'days',
  },
  {
    id: '2026-11-14-default-week',
    date: '2026-11-14',
    title: 'Set an item\'s normal week',
    text: 'Day settings in the Default Week are the item\'s normal week on that label. Weeks without their own schedule use them.',
    section: 'weeks',
  },
  {
    id: '2026-11-14-browse-dayparts',
    date: '2026-11-14',
    title: 'Add items from another daypart',
    text: 'Available Items has a daypart dropdown, so you can add a Brunch item to the Lunch page. Items from another daypart are turned On when you add them.',
    section: 'items',
  },
  {
    id: '2026-11-14-product-ids',
    date: '2026-11-14',
    title: 'Product IDs and day strips',
    text: 'Every product shows its own ID. Products that come from a source also show the source ID next to a link icon. The day letters on each product show which days it\'s on labels this week.',
    section: 'products',
  },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'labels',
    title: 'Labels',
    icon: 'labels',
    intro: 'Each label has a page for each daypart. The preview shows what the label displays.',
    entries: [
      { term: 'Open a label', text: 'Tap a label in Smart Labels. Pick the daypart and the day at the top.' },
      { term: 'Preview', text: 'Shows one daypart on one day, the way the label will look. "Live" marks the page on the label right now.' },
      { term: 'Full labels', text: 'Each page holds a set number of items. When it\'s full, the extra items wait and show "Waiting · label is full".' },
    ],
  },
  {
    id: 'items',
    title: 'Adding and ordering items',
    icon: 'items',
    entries: [
      { term: 'Add items', text: 'Find the item in Available Items and tap +. Search by name, or narrow by Station and daypart.' },
      { term: 'Other dayparts', text: 'Use the daypart dropdown to see items from another daypart, like Brunch, while you work on Lunch. Items you add from there follow that daypart\'s days and are marked "Follows Brunch".' },
      { term: 'Order', text: 'Drag items to set their order. When the label is full, the items at the top show first.' },
      { term: 'Remove', text: 'Removing an item takes it off that page for the whole week.' },
    ],
  },
  {
    id: 'days',
    title: 'Which days an item shows',
    icon: 'days',
    figure: 'days',
    intro: 'Each item on a label has its own week.',
    entries: [
      { term: 'Auto', text: 'Follows the days the item is offered in the source.' },
      { term: 'On', text: 'Shows the item on this day, even if the source doesn\'t offer it.' },
      { term: 'Off', text: 'Hides the item on this day. Items that are off or not offered that day are listed under "Not available", where "On" turns them back on.' },
      { term: 'Items without a source', text: 'Custom products have no days to follow, so they only have Off and On.' },
      { term: 'Adding on one day', text: 'Adds the item for that day only; the other days are Off. To follow the source all week, add it with Every day picked.' },
      { term: 'Adding to another day', text: 'Pick the day and add the item again from Available Items. Items already on the page show "On this page" there.' },
      { term: 'Mixed', text: 'In Every day, Mixed means the item is set differently on some days.' },
    ],
  },
  {
    id: 'every-day',
    title: 'Every day and All dayparts',
    icon: 'every',
    figure: 'every-day',
    entries: [
      { term: 'Every day', text: 'Changes one daypart for the whole week. The preview shows the everyday menu: the items on all 7 days.' },
      { term: 'Some days', text: 'Items that show on some days only are tagged "Some days". Pick one of their days to see them in the preview.' },
      { term: 'All dayparts', text: 'Changes the day you picked across every daypart. Each item is listed once, with a chip for each daypart it\'s on.' },
      { term: 'Add to more dayparts', text: 'Tap a dashed chip like "+ Lunch" to add the item there too. Tap a daypart chip to open that page.' },
      { term: 'Preview', text: 'A label shows one daypart at a time, so with All dayparts picked, choose a daypart to preview.' },
      { term: 'Stays on one page', text: 'Ordering, substitutions, Auto Fill and Clear page work on one daypart at a time.' },
    ],
  },
  {
    id: 'weeks',
    title: 'Weeks',
    icon: 'weeks',
    entries: [
      { term: 'Default Week', text: 'Your normal week. The items and day settings here are what every week uses unless it has its own schedule.' },
      { term: 'A specific week', text: 'Pick a week to change just that week. The first change copies what it shows, and later changes to the Default Week don\'t reach it.' },
    ],
  },
  {
    id: 'apply',
    title: 'Saving your changes',
    icon: 'apply',
    figure: 'apply',
    intro: 'Changes stay pending until you save them. Nothing changes on the label before that.',
    entries: [
      { term: 'Save', text: 'Saves your changes. The label shows them on the days they\'re for: today\'s changes right away.' },
      { term: 'Review or discard', text: 'Use the arrow next to the button to review your changes or discard them.' },
      { term: 'Several labels', text: 'The bar at the bottom shows pending changes on all labels and saves them together.' },
      { term: 'Leaving', text: 'If you leave with pending changes, you\'ll be asked to keep editing, discard them, or save them.' },
    ],
  },
  {
    id: 'autofill',
    title: 'Auto Fill',
    icon: 'autofill',
    entries: [
      { term: 'Fill a page', text: 'Tap Auto Fill, pick one or more stations, and confirm. Their items for the daypart are added to the page with an "Auto" tag.' },
      { term: 'After that', text: 'Order them and turn them on or off like any other item. The Station filter is off while a page uses Auto Fill.' },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    icon: 'products',
    figure: 'products',
    entries: [
      { term: 'IDs', text: 'Every product has its own ID. Products that come from a source also show the source ID next to a link icon.' },
      { term: 'Day letters', text: 'An outline means the source offers it that day. Blue letters mean it\'s on a label that day in the week you picked.' },
      { term: 'Usage filter', text: 'In Filters, Usage finds products that are on labels or not in use.' },
      { term: 'Custom products', text: 'Create and edit them from the product sheet.' },
      { term: 'Editing products from a source', text: 'Tap Edit in the product sheet. Your changes are kept here and the source isn\'t changed. Changed fields are marked "Local"; tap "Use source" to go back to the source\'s value.' },
      { term: 'Dayparts', text: 'Set which dayparts a custom product is offered at. That decides where it appears in Available Items.' },
      { term: 'Display name', text: 'A product can have a display name for labels. Lists and search use its own name.' },
    ],
  },
  {
    id: 'sync',
    title: 'Label status',
    icon: 'sync',
    entries: [
      { term: 'Synced', text: 'The label has your latest changes.' },
      { term: 'Syncing…', text: 'Changes are on their way to the label.' },
      { term: 'Sync failed', text: 'The label didn\'t get the changes. Tap Retry.' },
      { term: 'Pending', text: 'The amber "3 pending" pill means there are changes you haven\'t saved yet.' },
    ],
  },
];

const SEEN_KEY = 'guideSeen';

function seenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function unseenUpdates(): GuideUpdate[] {
  const seen = seenIds();
  return GUIDE_UPDATES.filter(u => !seen.has(u.id));
}

export function markUpdatesSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(GUIDE_UPDATES.map(u => u.id)));
  } catch {
    // Storage blocked: the dot just comes back next time
  }
}
