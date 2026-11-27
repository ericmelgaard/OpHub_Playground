// User guide for store and menu staff. Plain, short how-to text.
// Add a What's new entry (newest first) whenever something staff will notice changes;
// the guide button shows a dot until they've opened it.

export interface GuideUpdate {
  id: string;        // stable, unique; used to remember what's been seen
  date: string;      // YYYY-MM-DD
  title: string;
  text: string;
  section?: string;  // guide section to read more in
  showMe?: GuideShowMe;
}

// "Show me": the screen to open and the spot (data-guide="…") to point at, with a one-line note
export interface GuideShowMe {
  open: 'site-settings' | 'smart-labels' | 'products' | 'label' | 'product';
  target: string;
  note: string;
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
    id: '2026-11-26-picked-day',
    date: '2026-11-26',
    title: 'Day strips match everywhere',
    text: 'Item days on a label page now look like the days on Products: an outline means the source serves it that day, a blue fill means it shows on the label. Days it isn\'t on are simply unfilled. On Products, days picked in the Day filter have a small blue line under them.',
    section: 'days',
    showMe: { open: 'label', target: 'add-daypart', note: 'Each item\'s days: outline = the source serves it, blue fill = on this label.' },
  },
  {
    id: '2026-11-26-one-day',
    date: '2026-11-26',
    title: 'Items added on one day stay on that day',
    text: 'An item you add on one day is on the label that day only. On the other days it isn\'t on the page: find it in Available Items like any product and add it to put it on that day too. To have it follow its normal days all week, add it with Every day picked.',
    section: 'days',
    showMe: { open: 'label', target: 'add-daypart', note: 'Pick a day, then add items here. They go on that day only.' },
  },
  {
    id: '2026-11-25-variants',
    date: '2026-11-25',
    title: 'One product, served at several stations',
    text: 'A product from the source can be served at more than one station and daypart, each with its own name, price or portion. Open a product: "Served at" lists each one, with the card\'s picked. Pick another to see its days and price. Edit asks whether to change just that one or the whole product. When you add it to a label and it isn\'t clear which, you\'re asked to pick the station.',
    section: 'items',
    showMe: { open: 'product', target: 'variant-tabs', note: 'Tap a station to see what it serves this product as.' },
  },
  {
    id: '2026-11-24-show-me',
    date: '2026-11-24',
    title: 'See where each update is',
    text: 'Updates here have a "Show me" link. It opens the screen the update is about and points to the spot.',
  },
  {
    id: '2026-11-17-business-days',
    date: '2026-11-17',
    title: 'Set the days you\'re open',
    text: 'In Site settings (the menu at the top left), pick your business days. Empty spots on days you\'re closed aren\'t flagged anymore. You can still add items on those days.',
    section: 'labels',
    showMe: { open: 'site-settings', target: 'business-days', note: 'Tap a day to mark it open or closed, then Save.' },
  },
  {
    id: '2026-11-17-label-names',
    date: '2026-11-17',
    title: 'Name your labels',
    text: 'Give a label a name like "Grill Station - 1" in its settings (the gear on the label page). Lists and cards show the name; the device ID is on the label page and in its settings.',
    section: 'labels',
    showMe: { open: 'label', target: 'label-settings', note: 'Open the label\'s settings to give it a name.' },
  },
  {
    id: '2026-11-15-day-fill',
    date: '2026-11-15',
    title: 'Easier to see which days are on labels',
    text: 'The day letters on each product now have a blue fill on the days it\'s on a label. The outline still means the source offers it that day.',
    section: 'products',
    showMe: { open: 'products', target: 'day-strip', note: 'A blue fill means the product is on a label that day.' },
  },
  {
    id: '2026-11-15-pick-daypart',
    date: '2026-11-15',
    title: 'Pick the daypart to add from',
    text: 'Available Items always lists one daypart, and items you add follow its days. Searching shows "2 more in Breakfast" when other dayparts have matches. Tap it to switch.',
    section: 'items',
    showMe: { open: 'label', target: 'add-daypart', note: 'Pick the daypart to add items from.' },
  },
  {
    id: '2026-11-15-custom-dayparts',
    date: '2026-11-15',
    title: 'Pick a custom product\'s dayparts',
    text: 'Tick each daypart a custom product is offered at. "All" ticks every one.',
    section: 'products',
    showMe: { open: 'products', target: 'create-product', note: 'Create a product, then tick the dayparts it\'s offered at.' },
  },
  {
    id: '2026-11-15-follows-daypart',
    date: '2026-11-15',
    title: 'Items from another daypart keep their days',
    text: 'Add a Brunch item to the Breakfast page and it shows on the days Brunch is offered, marked "Follows Brunch". Each daypart also uses its own days now: an item served at Lunch on weekdays only shows on weekdays on the Lunch page.',
    section: 'items',
    showMe: { open: 'label', target: 'add-daypart', note: 'Pick another daypart here. Items you add keep that daypart\'s days.' },
  },
  {
    id: '2026-11-15-save',
    date: '2026-11-15',
    title: 'One Save button',
    text: 'Label changes are always saved with Save. The label shows them on the days they\'re for, and changes for today show right away.',
    section: 'apply',
    showMe: { open: 'label', target: 'save', note: 'Save applies your changes to this label.' },
  },
  {
    id: '2026-11-15-edit-source-products',
    date: '2026-11-15',
    title: 'Edit products from the source',
    text: 'Every product can be edited now. For products from a source, your changes are kept here and marked "Local", and the source isn\'t changed. Changing a product\'s dayparts changes where it can be added.',
    section: 'products',
    showMe: { open: 'product', target: 'product-edit', note: 'Edit any product. Your changes are marked Local.' },
  },
  {
    id: '2026-11-14-everyday-preview',
    date: '2026-11-14',
    title: 'Every day shows your everyday menu',
    text: 'With Every day picked, the label preview shows the items that are on all 7 days. Items on some days only are tagged "Some days". Pick a day to see them on the label.',
    section: 'every-day',
    showMe: { open: 'label', target: 'every-day', note: 'Every day previews the items on all 7 days.' },
  },
  {
    id: '2026-11-14-all-dayparts',
    date: '2026-11-14',
    title: 'Change every daypart at once',
    text: 'All dayparts lists each item on the label for the day you picked, across every daypart. Add an item to all its dayparts in one step, or tap "+ Lunch" to add it to one more.',
    section: 'every-day',
    showMe: { open: 'label', target: 'all-dayparts', note: 'Change the day you picked across every daypart.' },
  },
  {
    id: '2026-11-14-item-week',
    date: '2026-11-14',
    title: 'Each item has its own week',
    text: 'Adding an item on one day puts it on that day only. To have it follow its normal days, add it with Every day picked.',
    section: 'days',
    showMe: { open: 'label', target: 'day-tiles', note: 'Pick a day first to add an item for that day only.' },
  },
  {
    id: '2026-11-14-default-week',
    date: '2026-11-14',
    title: 'Set an item\'s normal week',
    text: 'Day settings in the Default Week are the item\'s normal week on that label. Weeks without their own schedule use them.',
    section: 'weeks',
    showMe: { open: 'smart-labels', target: 'schedule', note: 'Open Schedule to set the Default Week.' },
  },
  {
    id: '2026-11-14-browse-dayparts',
    date: '2026-11-14',
    title: 'Add items from another daypart',
    text: 'Available Items has a daypart dropdown, so you can add a Brunch item to the Lunch page. Items from another daypart are turned On when you add them.',
    section: 'items',
    showMe: { open: 'label', target: 'add-daypart', note: 'Pick another daypart to add its items to this page.' },
  },
  {
    id: '2026-11-14-product-ids',
    date: '2026-11-14',
    title: 'Product IDs and day strips',
    text: 'Every product shows its own ID. Products that come from a source also show the source ID next to a link icon. The day letters on each product show which days it\'s on labels this week.',
    section: 'products',
    showMe: { open: 'products', target: 'product-id', note: 'Every product shows its own ID. Tap the icon to copy it.' },
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
      { term: 'Closed days', text: 'Days you\'re closed (Site settings → Business days) aren\'t flagged for empty spots. On the label page their day looks dimmed and says "Closed", but you can still pick it and add items.' },
      { term: 'Name a label', text: 'Open the label, tap the gear, and type a name like "Grill Station - 1". Leave it blank to use the device ID. Search and Scan find a label by either one.' },
    ],
  },
  {
    id: 'items',
    title: 'Adding and ordering items',
    icon: 'items',
    entries: [
      { term: 'Add items', text: 'Find the item in Available Items and tap +. Search by name, or narrow by Station and daypart.' },
      { term: 'Pick a daypart', text: 'Available Items lists one daypart at a time. It starts on the page\'s daypart. Pick another, like Brunch, to add its items to this page. They follow that daypart\'s days and are marked "Follows Brunch".' },
      { term: 'Pick the station', text: 'Some products are served at more than one station. When it isn\'t clear which you mean, adding asks you to pick, and the + shows a small arrow first. Items that still need a choice show "Choose station". Each size of a product (cup, bowl) is its own product.' },
      { term: 'Can\'t find it?', text: 'If your search matches items in other dayparts, "2 more in Breakfast" shows under the list. Tap it to switch.' },
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
      { term: 'Off', text: 'Takes the item off this day. It\'s no longer on the page that day; add it from Available Items to put it back.' },
      { term: 'Not available', text: 'Items on the page that the source doesn\'t offer that day are listed under "Not available", where "On" shows them anyway.' },
      { term: 'Items without a source', text: 'Custom products have no days to follow, so they only have Off and On.' },
      { term: 'Adding on one day', text: 'Adds the item for that day only. On other days it isn\'t on the page. To follow the source all week, add it with Every day picked.' },
      { term: 'Adding to another day', text: 'Pick the day and add the item from Available Items, where it\'s listed like any other product.' },
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
      { term: 'Day letters', text: 'An outline means the source offers it that day. A blue fill means it\'s on a label that day in the week you picked.' },
      { term: 'Usage filter', text: 'In Filters, Usage finds products that are on labels or not in use.' },
      { term: 'Custom products', text: 'Create and edit them from the product sheet.' },
      { term: 'Editing products from a source', text: 'Tap Edit in the product sheet. Your changes are kept here and the source isn\'t changed. Changed fields are marked "Local"; tap "Use source" to go back to the source\'s value.' },
      { term: 'Dayparts', text: 'Tick each daypart a custom product is offered at ("All" ticks every one). That decides where it appears in Available Items.' },
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
