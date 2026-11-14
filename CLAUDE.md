# WAND Digital — AI Style Guide

Rules for any AI (or person) adding or changing UI in WAND Digital prototypes. The goal is that
new screens look like they were always part of the app. **When in doubt, find the closest
existing component and copy its patterns.**

## Rules for AI
- Copy the closest existing pattern before creating anything new.
- Use the colors, components, icons, and daypart colors defined below.
- Stay within the spacing, icon sizes, and type sizes already used in the app.
- Never invent brand names, product names, or marketing terms. Use the terms already in the
  UI, or ask.
- **Ask before deviating.** If something new is needed (a color, component, pattern, or term),
  stop and propose it with a reason. Don't just add it.
- When a deviation is approved, add it to this guide so it becomes the standard.

Stack: React + TypeScript + Vite, Tailwind CSS, shadcn/ui (`src/components/ui/`), Lucide icons,
Tiptap v2 for rich text (approved 2026-11-04). Do not add other UI kits, icon sets, or CSS frameworks.

## Components
- Use the shadcn/ui components in `src/components/ui/` first (`Button`, `Card`, `Badge`, `Input`,
  `Select`, `Label`, `Textarea`, `DropdownMenu`, `Popover`). Don't hand-style a `<button>` when `Button` fits.
- Long pick lists (stations, etc.) use a `Popover` with search, item counts, and large touch rows —
  not a native `<select>`. Reference: `src/components/StationPicker.tsx`.
- Split button (primary action + chevron menu of related actions): `Button` + `DropdownMenu`,
  as in `PendingChangesButton` (`src/components/PendingChanges.tsx`). Destructive menu items are red.
- Need a component that doesn't exist yet? Add it from shadcn/ui (new-york style) into
  `src/components/ui/` and restyle it to the colors below.
- Mobile-first. Modals go full screen under `md` using the `.modal-*` classes in `src/index.css`.
  Respect safe areas (`.safe-area-top` / `.safe-area-bottom`).

## Layout patterns
Reuse these instead of inventing new layouts. Each one has a reference implementation to copy.

### Filters → side panel
Reference: `src/components/FilterSidebar.tsx` (Products page), opened from the toolbar in
`src/components/MenuFilters.tsx`. Every list or grid that needs filtering uses this pattern.
- **Trigger:** an outline `Button` labeled "Filters" in the toolbar, with
  `PanelLeftOpen` / `PanelLeftClose` icons. Show a `sky-500` count pill when filters are active,
  and a sky selected state while the panel is open.
- **Panel:** docks on the left beside the content (`flex gap-6`, content `flex-1 min-w-0`), so
  results update live while it's open. Width `w-80` (`md:w-72 lg:w-80`); it collapses to `w-0`.
  Under `md` it becomes a full-screen overlay with a `bg-black/40` backdrop and a sticky
  "Show results" button in the footer.
- **Header:** `Filter` icon + "Filters" title + active count pill, "Clear all", and a close (`X`).
- **Results count:** "Showing X of Y items" under the header, with a thin `sky-500` progress bar
  when the results are narrowed.
- **Active filter chips:** one removable chip per active filter (soft `sky` fill). Summarize
  multi-selects ("3 stations") instead of listing every value.
- **Sections:** one collapsible section per filter dimension, each with a Lucide icon, a
  `sky-500` dot when that section has a selection, and its own "Clear" link. Open the most-used
  sections by default; collapse the rest.
- **Show every option that makes sense.** Build the choices from the data (e.g. distinct
  dayparts/stations in the items) instead of a hard-coded list. Use checkboxes for multi-select.
  When a list is longer than ~8, add a search input and a "Select all", and cap the list
  height (`max-h-48 overflow-y-auto`).
- **Free text** (name, ID) filters use an `Input` with a 300ms debounce. Dates offer quick picks
  (Today, days of the week) plus a date input, with a single / range toggle.
- Filters apply immediately; there is no "Apply" step (except a date range, which needs both ends).
- Remember open/closed state per user (`localStorage`, as `filterSidebarOpen` in `App.tsx`).

### Long detail pages → section bookmark nav
Reference: the "Sections" sidebar in `src/pages/ProductEdit.tsx` (viewing/editing a product).
Any full detail or edit page long enough to scroll past a couple of screens gets a left-side
bookmark nav so people can jump to what they're looking for.
- **When:** the page has roughly 4+ distinct sections or scrolls well past one screen. Short
  pages and modals don't need it.
- **Layout:** `aside` on the left beside the content (`flex gap-6`, content `flex-1 min-w-0`),
  `w-56 flex-shrink-0`, with a `sticky top-4` card inside so it stays in view while scrolling.
  Hidden under `lg` (`hidden lg:block`).
- **Header:** small uppercase "Sections" label (`text-xs font-semibold uppercase tracking-wide`).
- **Items:** one button per section, each with a Lucide icon (`h-4 w-4`) and a short sentence-case
  label that matches the section's heading. Clicking smooth-scrolls to the section, offset so the
  heading isn't hidden under the top bar.
- **Active state:** highlight the section currently in view as you scroll (scroll-spy) with the
  sky selected style: `bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300` and a
  `border-l-2 border-sky-500` marker. Others are `text-gray-600 dark:text-gray-400` with a gray hover.
- **Sections:** mark each target with a stable id (`data-section="..."`) and build the nav list
  from the same array that renders the sections, so they never drift apart.

### Long lists → compact rows
Reference: `src/components/SmartLabelList.tsx` (labels) and the `list` view in
`src/components/MenuItem.tsx` / `MenuItems.tsx` (products). Any list that can run to hundreds of
items uses one flat list of compact rows, not cards or grouped sections.
- **Flat:** don't group by a dimension that's already a filter (daypart, station). Sort by name.
- **Header:** a column header row on `lg` (`text-xs font-semibold uppercase tracking-wider`,
  bottom border). Share one `lg:grid-cols-[...]` constant between header and rows.
- **Row:** `grid gap-3 items-center px-4 py-3 rounded-lg border border-gray-100
  dark:border-gray-700/50`, `space-y-1` between rows; sky border + shadow on hover when the row
  opens something. One line of text per cell (`truncate`); no descriptions.
- **Many values in a cell:** show the first one or two and a `+N` (daypart chips from
  `daypartColor()`, first station with a lime `MapPin`).
- **Under `lg`:** keep the name, the key value (price), and the actions; fold the rest into a
  `text-xs` gray second line under the name.

### Item details → right-side sheet
Reference: `src/components/ProductSheet.tsx` (clicking a product card or row).
- Opening one item to see its details uses a sheet docked on the right: `md:w-[480px]`, full height,
  `bg-black/40` backdrop, slides in with `.product-sheet-in`. Full screen under `md`. Esc closes.
- Header: name (`text-lg font-semibold`), a source line under it, close (`X`) top right.
- Body: short sections, each a Lucide icon + sentence-case title (`text-sm font-semibold`).
- Footer: the main action as a full-width primary `Button` ("Add to label"), with `safe-area-bottom`.
- Cards and rows that open a sheet keep their quick action (`+`) and `⋯` menu; those stop the click
  from also opening the sheet.

### Label edits → pending changes, then apply
Reference: `src/lib/pendingChanges.ts`, `src/components/PendingChanges.tsx`.
Edits on a label page are **pending changes** until applied; nothing is written before that.
- **Apply is one action.** The person doesn't choose where changes go: changes that affect what
  the label shows today are sent right away; later days and weeks are saved for the nightly
  update. The button reads **Send now** when anything goes out now, otherwise **Save**.
  Saved is final — there's no "undo save".
- **Per label:** split button in the label header — apply / Review changes / Discard changes.
- **Everything:** floating bar at the bottom ("5 pending changes · 3 labels", Review, apply),
  shown on the grid and on a label page when other labels have changes.
- Pending changes survive stepping between labels and returning to the grid. Leaving Smart
  Labels (or the page) with pending changes asks first: Keep editing / Discard and leave / apply and leave.
- **Auto Fill** (per page) is its own deliberate action, top right of Available Items: pick one or
  more stations, then confirm ("Add 12 items"). It adds those stations' items for the daypart to
  the page list (teal "Auto" tag), where they're ordered and turned on/off like any item. The
  station filter is disabled while a page auto-fills. On tablets, no single tap should add or
  remove a batch of items.
- **All dayparts** on a label page is a read-only overview: one compact row per daypart (items in
  display order, "3 of 4", open slots, gaps) with Edit / Add items opening that daypart. Adding
  and reordering only happen inside one daypart, so it's always clear where an item goes.
- **Day availability (Off / Auto / On)** on a label page is per day of the week being edited
  (`src/lib/labelDisplay.ts`). Auto follows the product's days; On adds the day for this label,
  Off removes it. It never means priority — drag order does. "Every day" sets all 7 days and shows
  Mixed when they differ. Removing an item applies to the whole week. The Default Week can't hold
  day overrides (toggles are disabled there). Custom products have no days of their own: adding
  one to a label turns it On for the day being edited (all 7 in Every day).
- **Product days are view-only**, drawn with no fill. Each day has two independent parts: an
  **outline** when the product's **source** offers it that day (the API feeding products in —
  Webtrition today; the UI says "Source", not a vendor name), and the **color of the letter and
  outline** for how it's used here that week — gray unused (lighter gray when the source doesn't
  offer it either), `sky` on labels. Every letter keeps 4.5:1 contrast on the card in both modes.
  Separate colors for labels vs signage (and both) are still open; decide them when signage exists. Week = the week selector. Lists and cards show one strip
  (`ProductDayStrip`); the product sheet shows a row per source plus a legend (`ProductDayRows`).
  Reference: `src/components/ProductDays.tsx`.
- **Finding products by use:** the Products Filters panel has a **Usage** section (On labels /
  Not in use, with counts) for the same week as the day strips. Signage options join it when
  signage exists. Usage is a filter, not a mark on the card.
- **Product cards and rows** carry no status marks beyond the refresh's New / Updated tag: no
  active check, channel state, or duplicate count. The day strip says how a product is used; the
  quick action is a plain outline `+` (Add to label).
- **Products:** custom products (`CUSTOM-` MRN) are created and edited in the product sheet.
  Webtrition products are read-only there — their data comes from the sync.
- **Description** is one field: `enticingDescription || description`, shown and edited as one;
  saving writes back to the field it came from. **Display name** and description are the two
  rich text fields: plain text (Webtrition) or a small HTML subset from `RichTextEditor` —
  paragraphs, line breaks, bold, italic, nothing else. Render with `RichText` / `LabelName`
  (`src/components/RichText.tsx`); use `plainText()` / `labelName()` for search, tooltips and
  one-line text.
- **Ingredients** come from the product's comma-separated `ingredients`; split them with
  `parseIngredients()` (keeps commas inside parentheses, drops Webtrition's `^` sub-recipe marker on purpose, removes repeats).
- **Name vs display name:** anything that shows what a label displays (label preview, label list
  and grid, page item lists, substitution notes) uses `labelName()` from `src/lib/labelDisplay.ts`.
  Product lists, Available Items, and search show the product's own name. Any product can have a
  display name (`product_display_names`, keyed by MRN).
- Label sync has three states only: `Synced 2m ago`, `Syncing…`, `Sync failed` (with Retry, icon-only
  on cards). There's no "saved but not sent" state — unapplied edits are the amber `3 pending` pill.
  Details go in the tooltip.

## Color
Use Tailwind's palette. Every color has a job — don't pick one for looks. Brand hex values
come from the WAND stylesheet (2021-12-22): Blue `#00ADEF`, Light Blue `#8ED9F8`, Dark Blue
`#002F5E`, Magenta `#DD37DD` (action accent), Yellow `#FFE066` (static accent), Grey `#D2D3D5`.
The ones in use live in `tailwind.config.js` under `brand`; don't retype hex values in components.

| Role | Tailwind | Used for |
|---|---|---|
| **Primary action** | `bg-brand hover:bg-brand-dark` (`#00ADEF`) | Filled primary buttons — the `Button` default variant already does this |
| **Primary / accent** | `sky` (600/400 text, 50/900 soft bg, 500 ring) | Links, selected state, focus, "in progress", info |
| Brand navy | `brand-navy` (`#002F5E`) | Brand headers only — the top nav bar is `bg-brand-navy` in light mode and `dark:bg-gray-950` in dark mode, with `hover:bg-white/10 dark:hover:bg-gray-900` controls |
| Brand magenta | `brand-magenta` (`#C42EC4`) | Store-level icons only (see Location levels) |
| Neutrals | `gray` | Surfaces, borders, body text |
| Success | `emerald` | Synced, done, complete, "New" |
| Warning | `amber` | Pending, partial, substitution, "Updated", needs attention |
| Error / destructive | `red` | Failed, delete, errors |
| Auto Fill | `teal` | System-generated / auto-filled content only |

**Dayparts** (category colors — only on daypart chips, bars, and labels):
Breakfast `amber` · Lunch `emerald` · Dinner `blue` · Late Night `violet` · All Day / Custom `gray`.
Always get them from `daypartColor()` in `src/lib/daypartColors.ts` — never redefine them.

**Location levels** — one icon and one icon color per level, used everywhere it appears.
Color the icon only, never the name or row. Always get colors from `levelIconColor()` in
`src/lib/levelColors.ts`.

| Level | Icon | Color | Why |
|---|---|---|---|
| Concept | `Building2` | `gray` | Most passive. Placeholder for a future brand-specific icon (concept ↔ brand is a future topic) |
| Company | `Building` | `brand` (`#00ADEF` blue) | |
| Store | `Store` (import as `Store as StoreIcon`) | `brand-magenta` (`#C42EC4`, dark `brand-magenta-light`) | Lowest override level — most prominent. WAND shop-button magenta |
| Placement / station | `MapPin` | `lime` | Same thing today (to be reconciled) — one icon, one color |

- When the row is selected, drop the level color and let the selected style win.
- Don't use `MapPin` for a store, or `Store` for a placement.
- `MapPin` (on `brand`, no level color) also means "location" in general: the full location
  selector button in `Navigation.tsx` and the location change overlay.
- `brand-magenta` and `lime` are reserved for this — don't use them elsewhere (beyond the
  categorical palettes below). Never use magenta (or a magenta tint) on a button.

Don't use `indigo`, `purple`, `cyan`, `green`, or `yellow` — use the roles above. `blue` is
reserved for the Dinner daypart. The only exceptions are deliberate categorical palettes: brand
avatars (`getBrandColor` in `GroupsPage.tsx`) and quick-action icon colors in `App.tsx`.
Never use inline `style={{ color }}` or arbitrary values like `bg-[rgb(...)]` for theme colors.

**Light / dark mode:** every color needs a `dark:` pair. Defaults:
- Page `bg-gray-50 dark:bg-gray-900` · Card/panel `bg-white dark:bg-gray-800`
- Border `border-gray-200 dark:border-gray-700`
- Text `text-gray-900 dark:text-white` · secondary `text-gray-500 dark:text-gray-400`
- Soft status fill: `bg-{color}-50 dark:bg-{color}-900/30 text-{color}-700 dark:text-{color}-300 border-{color}-200 dark:border-{color}-800`
  (see `src/components/SyncStatus.tsx`)

## Shape, type, spacing
- Corners: `rounded-lg` by default; `rounded-full` for pills, dots, avatars, toggles;
  `rounded-xl` only for large sheets/cards.
- Type: system font (no web fonts). Sizes `text-xs`, `text-sm` (default), `text-lg` for headings;
  `text-xl`/`2xl` only for page titles. `font-medium` / `font-semibold` for emphasis.
- Tiny labels (`text-[10px]`/`[11px]`) are fine for dense chips and counters only.
- Use Tailwind spacing steps; no arbitrary pixel values unless matching an existing pattern.

## Icons & logos
- Icons: `lucide-react` only. Default `h-4 w-4` inline, `h-5 w-5` in buttons/headers.
  No hand-drawn SVGs, emoji, or other icon libraries.
- Logos live in `public/` (`wand-level.webp` mark, `wand-digital-41-years-and-counting_(1).png`).
  Don't recreate, recolor, or stretch them.

## Motion
- Keep it short (150–450ms) and purposeful: feedback, state change, entering sheets.
- Put keyframes in `src/index.css` and add every new animation to a
  `prefers-reduced-motion: reduce` block.

## Writing
- Short, plain labels in sentence case ("Add items", not "Add Items To Page").
- Status text says what's happening and what's next ("Waiting · label is full").
