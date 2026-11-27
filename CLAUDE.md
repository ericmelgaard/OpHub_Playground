# WAND Digital — AI Style Guide

Rules for any AI (or person) adding or changing UI in WAND Digital prototypes. The goal is that
new screens look like they were always part of the app. **When in doubt, find the closest
existing component and copy its patterns.**

**Menu platform (product database, ETL, scheduling: data, infrastructure, APIs, what the UI must show):**
the source of truth is `MENU_PLATFORM_DESIGN.md` in the public repo
[ericmelgaard/menu-platform-spec](https://github.com/ericmelgaard/menu-platform-spec). Clone it next to
this repo (`../menu-platform-spec`) or read it with `gh`. Read its "Using this document" section first;
UI that shows schedules, weeks or item states must match its §15 and the `R-UI-*` requirements.

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
- **Free text** (name, ID) filters use an `Input` with a 300ms debounce. **Day** is this week only:
  seven Mon–Sun chips with the date, multi-select, today outlined in sky (no date input, no ranges).
- Filters apply immediately; there is no "Apply" step.
- Remember open/closed state per user (`localStorage`, as `filterSidebarOpen` in `App.tsx`).

### Long detail pages → section bookmark nav
Reference: the "Sections" sidebar in `src/components/ProductEditPage.tsx` (editing a product).
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

### User guide → `BookOpen` in the top nav (approved 2026-11-14)
Reference: `src/components/UserGuideSheet.tsx`, content in `src/lib/userGuide.ts`.
- Written for store and menu staff: short how-to text in plain words, using the terms on screen.
- The `BookOpen` button sits left of the alerts bell and opens a right-side sheet (same as the
  product sheet): search, **What's new** (dated, newest first, latest 3 with "Show all"), then
  one section per topic.
- **The alert is a `sky-500` dot on the guide button** while What's new has entries this browser
  hasn't seen (`localStorage` `guideSeen`). Opening the guide clears it and marks those entries New.
- **Pictures** are drawn with the app's own components (`src/components/UserGuideFigures.tsx`),
  not screenshots, so they match the app and follow dark mode. They're inert examples in a gray
  frame with a one-line caption. Keep them to a few key sections (a section's `figure`).
- When a change is something staff will notice, add a What's new entry (stable `id`, date, a
  `section` to read more) and update the matching guide section in the same change.
- **Show me (approved 2026-11-24):** a What's new entry can have `showMe` — the screen to open
  (`site-settings`, `smart-labels`, `products`, or the first `label` / `product`), a spot
  (`data-guide="…"` on the element) and a one-line note. "Show me" closes the guide, opens the
  screen and points at the spot with a pulsing `sky` ring and a dark note bubble
  (`src/components/GuideSpotlight.tsx`, `showGuideSpot()`); it goes away after a few seconds or
  on any tap. Give every new entry a `showMe` when its spot can be reached, and mark the spot
  with `data-guide`.

### Item details → right-side sheet
Reference: `src/components/ProductSheet.tsx` (clicking a product card or row).
- Opening one item to see its details uses a sheet docked on the right: `md:w-[480px]`, full height,
  `bg-black/40` backdrop, slides in with `.product-sheet-in`. Full screen under `md`. Esc closes.
- Header: name (`text-lg font-semibold`), a source line under it, close (`X`) top right.
- Body: short sections, each a Lucide icon + sentence-case title (`text-sm font-semibold`).
- Footer: the main action as a full-width primary `Button` ("Add to label"), with `safe-area-bottom`.
- Cards and rows that open a sheet keep their quick action (`+`) and `⋯` menu; those stop the click
  from also opening the sheet.

### Editing a product → full-screen page (approved 2026-11-16)
Reference: `src/components/ProductEditPage.tsx` (Edit in the product sheet, and New product).
- Viewing stays in the right-side sheet; **Edit and New product open a full-screen page** like an
  open label: `fixed inset-x-0 top-16 bottom-0` under the top nav, a header bar (close `X`, name,
  "ID · {source} {ID label} · local values", `SaveButton` / Create product), the **Sections** bookmark
  nav on the left (`w-56`, its own scroll, scroll-spy) and the content scrolling beside it.
- One card per section (`rounded-xl`, icon + sentence-case title), in this order: Basics, Dayparts,
  Images, Served at, Ingredients, Dietary and nutrition, Schedule, Customizations, Menu source.
  Sections not built yet show an amber **Not built yet** tag and one line on what goes there.
- **Schedule** is view only and uses the Smart Labels → Schedule week tiles (Default Week, then a
  scrollable strip with the Default / Override / Recurring bars). Rows are daypart + station, days
  drawn like the product day strip; weeks the source hasn't sent yet are dashed.
- **Menu source** names the product's API and its item ID ("Webtrition · MRN 13404.3"), with a
  Field / {source} / Here table and **Use source** on local values.
- **Served at** lists the product's variants (see "Products and variants" below); each one is
  edited from the product sheet (Edit → Edit for {station} · {daypart}). **Customizations** (direction): only the changes made by levels below
  the one you're at.

### Site settings (approved 2026-11-17)
Reference: `src/components/SiteSettingsPage.tsx`, settings in `src/lib/siteSettings.ts`.
- Opened from the side panel's **Site settings** (the only settings entry). Full screen, back
  arrow + "Site settings" title, `SaveButton` in the header; one card per setting.
- Stored per site in `site_settings` (jsonb). Add a setting to `SiteSettings` with a default in
  `DEFAULT_SITE_SETTINGS` — no migration. Read it anywhere with `useSiteSettings()`; the site is
  `SITE_ID` ('default') until location selection is wired in.
- **Business days** (`openDays`, day pills, all open by default): closed days never count as
  empty slots (gap counts, amber day dots, "N gaps" on cards; `getDeviceGaps()` /
  `getWeekCoverage()` take the open days). Closed days are never blocked: they can still be
  edited and filled. Closed days look **disabled but pickable**: on the label page a dashed,
  muted day tile with "Closed" in place of the dot, gray page counts, and a gray "Closed {day}"
  note instead of the amber empty-page warnings; "Closed" beside the day in day dropdowns.

### IDs → copy button (approved 2026-11-17)
Component: `CopyButton` (`src/components/CopyButton.tsx`). **Every ID shown in the app has a copy
icon right after it**: product IDs, source IDs (MRN), device IDs. `size="xs"` in cards and rows,
the default in headers and detail views; `label` names what's copied ("device ID", "MRN"). It
shows a green check for a moment and never opens the card or row it sits in.

### Products and variants (2026-11-25, menu platform spec v2.6 §6, F8, §15.6)
References: `src/lib/variants.ts` (rules), `src/components/ProductVariants.tsx` (product display),
`src/components/VariantChooser.tsx` (picking one). **Each portion is its own product**: a source
product is MRN + portion (the database splits them: `menu_items_condensed.mrn` is the product key,
`MRN|portion` when the MRN comes in several sizes; `source_mrn`, `portion`, `family_size` beside it).
Sizes of one MRN are linked for display only. Each **meal station + daypart** a product is served at
is a **variant** with its own name and price; station and daypart always go together. The station is
the only choice when adding. Custom products have no variants.
- **On screen it's "Served at", never "variant" (decided 2026-11-26).** "Variant" is the data and
  code term (types, tables, functions, the spec) and isn't shown to staff. The list is headed
  **Served at**; each one is named by its station · daypart ("Grill · Lunch"); counts read
  "Served at 3"; the edit choice is **Edit for Grill · Lunch** vs **Edit product** ("Every
  station"). Don't say "serving" (it means serving size in nutrition).
- **Sizes:** when a recipe comes in more than one size, its products show the size in gray after the
  name ("smoked beef brisket · 1 lb") in product cards and rows, Available Items and label page rows
  (`sizeOf()`). The product sheet shows **Size** chips linking to the other sizes.
- **Products:** cards and rows show "Served at 3" (`Layers`) after the IDs when there's more than one.
  A product card or row stands for one variant, its **default** (`defaultVariant()`: the one whose
  source name and price the card shows, else the first); the card's price is that variant's
  (`cardPrice()`). The product sheet opens with **Served at**: one compact list (`VariantList`, no
  chips or sideways scrolling), a row per variant (daypart dot, station, daypart, price, its own
  name / portion, day letters), with the default **preselected**. There's no "All variants" view: the
  sheet always shows one variant (the side panel's job is adding to a label, and you add a variant).
  It shows that variant's name, portion, price and description, each tagged **Local** (set for this
  variant), **At this station** (the source's own value there) or **From product**; its days; the
  labels using it; then the product's shared values (calories, dietary, ingredients).
  Variants are merged by station + daypart name (the source sends two "Lunch" meal periods).
- **Editing (approved 2026-11-26):** one **Edit** button. With variants it opens a menu: **Edit for
  {station} · {daypart}** (local count) or **Edit product** ("Every station"); without variants it
  edits the product directly. Edit for a station opens `VariantEditPage` (same shell as the product edit
  page): name, portion, price and description only, each with **Local** / **Use product**. Saved in
  `variant_local_values` (product key + station + meal period, jsonb). Layers, lowest first: source →
  station's own source value → product local value (all variants) → variant local value
  (`variantValues()`). **Portion** is locked on the product (it's what the product is) but a variant
  can rename how it's shown ("slice" for 1/8 pie). Ingredients, nutrition, allergens and images stay
  on the product.
- **Labels show the variant's values:** `labelName()` uses the variant's own name (Local, or the
  station's when the product has no display name), `labelPrice()` / `labelPortion()` its price and
  portion.
- **Adding to a label names the variant**, chosen by logic whenever it can (`pickVariant()`): one
  station in the page's daypart is picked for you (`inferred`). Otherwise the **chooser** opens:
  Daypart chips (preselected, "This page" marked, changeable) and Meal station rows with their own
  name, price and day letters. Adding from another daypart asks, unless the filters settle it.
  **The filters are the choice (2026-11-26):** Available Items' **Station** filter matches products
  served at that station *in the daypart being browsed* (their variants), and only those list. When
  the filtered station leaves one serving location, adding picks it (`inferred`) with no question.
  In Available Items a product that will still ask says so before you tap: "2 stations" in its gray
  line and a small `ChevronDown` beside the `+` (`choiceHint()`); products settled by logic or the
  filters keep the plain `+`.
- **From a product (product-first):** the sheet shows one variant (the card's, or the one tapped).
  **Add to label** opens the label page with Available Items **filtered to that variant's station and
  daypart** (`initialFilters`; visible and clearable, never a hidden value), so it adds as that variant
  with a plain `+`. Clearing the station filter brings the normal choice back. The label picker opens
  on its daypart.
- **Days follow the variant:** an item that names its variant uses that variant's days (the days
  the source served it at that station and daypart) for Auto, the day pills and Not available.
- **Auto Fill** knows the station: the item gets that station's variant (`inferred`); when several
  picked stations serve it, the first is used and marked `review`.
- **On the page** each item shows its station in gray under the price (display only). It's changed
  from the item's menu (tap the item: Substitute, **Change station**, Remove from page), shown
  when the product is served at more than one station, with the current one under it and a lime
  `MapPin`; it reads **Choose station** (amber) when unclear. An unclear one (Auto Fill's
  `review`, or several stations and none picked) also shows an amber **Choose station** button on the
  row, and the page header counts them ("2 need a choice"). Picking is a pending change like any other.
- Stored on the label item as `variant` (`device_schedule_items.variant`: station, meal period,
  `user` / `inferred` / `review`). A product is on a page once (a second variant of it isn't
  supported yet).

### Last opened → sky ring (approved 2026-11-15)
Reference: `lastOpened` in `src/components/SmartLabelGrid.tsx` / `SmartLabelList.tsx` (labels, and
the label picker from Products) and `src/components/MenuItem.tsx` (products). Any card or row that opens a page or sheet marks the one
opened last, so people can find their place when they come back.
- `ring-2 ring-sky-400 dark:ring-sky-500` on the card or row; it wins over any other ring.
- Kept while you move around the page (open another item and it moves); cleared when you leave it.
- Track it by a stable key (label id, product MRN). When coming back from a full page, scroll it
  into view (`data-label-id` / `data-product-id`, `block: 'center'`).
- It's a place marker, not selection or status: no tag, no fill.

### Saving changes → one apply button
Component: `SaveButton` (`src/components/SaveButton.tsx`). Every place that saves edits uses it,
not a hand-built button: the label header, the pending changes bar, and the product form
(`block` for a sheet footer: full width, `h-11`). The chevron opens the side actions:
Save, Review changes (when there's a list), Discard changes.
- **Off until something changes.** Save stays visible but disabled with no changes ("No changes
  to save" tooltip), on the label header too. Changing a value back to what it was counts as no change.
- **Count in the button:** a `bg-white/25` pill with the number of changes (fields for a form,
  pending changes for labels).
- **Split button** (`Button` + `DropdownMenu`, chevron on the right): the menu holds related actions:
  "Review changes" where there's a list to review, and a red **Discard changes** (puts back what
  was there; doesn't leave the screen). Cancel / close is separate and leaves.
- **Wording:** always **Save** (labels and forms alike); creating says
  **Create product** (no split, nothing to discard). Never say how a change is delivered
  ("Send now", "nightly", "tonight") — see below (decided 2026-11-15).
- **Coming:** saving changes for a future date ("Save on a date…"). It will be another item in
  this menu; not built yet — design it with the label pending changes when it's needed.

### Label edits → pending changes, then apply
Reference: `src/lib/pendingChanges.ts`, `src/components/PendingChanges.tsx`.
Edits on a label page are **pending changes** until applied; nothing is written before that.
- **Save is one action, and it always reads Save.** How a change reaches the label is ours to
  handle and isn't shown: changes that affect what the label shows today go out right away;
  later days and weeks go with the nightly update. People see when it shows from what they're
  editing (the day and week), and whether it reached the label from the sync status
  (Syncing… / Synced / Sync failed). Saved is final — there's no "undo save".
- **Per label:** split button in the label header — Save / Review changes / Discard changes.
- **Everything:** floating bar at the bottom ("5 pending changes · 3 labels", Review, Save),
  shown on the grid and on a label page when other labels have changes.
- Pending changes survive stepping between labels and returning to the grid. Leaving Smart
  Labels (or the page) with pending changes asks first: Keep editing / Discard and leave / Save and leave.
- **Auto Fill** (per page) is its own deliberate action, top right of Available Items: pick one or
  more stations, then confirm ("Add 12 items"). It adds those stations' items for the daypart to
  the page list (teal "Auto" tag), where they're ordered and turned on/off like any item. The
  station filter is disabled while a page auto-fills. On tablets, no single tap should add or
  remove a batch of items.
- **Available Items daypart: the daypart picked is the link (approved 2026-11-15).** A dropdown
  chip next to Station (`DaypartFilter` in `src/components/StationPicker.tsx`), with counts.
  - It always lists **one daypart**; there's no All dayparts choice. It opens on the page's
    daypart when it can list it; otherwise nothing is picked and the list says "Pick a daypart to
    add from" with a button per daypart (color dot from `daypartColor()`).
  - The choices are the dayparts in the product data (the source may send ones labels don't, like
    Brunch), plus the page's daypart while custom products are offered there (a Dinner page with no
    Dinner source). No Dinner when nothing is offered at Dinner. "All Day" in the list is a real
    source meal period (Webtrition sends it), not "every daypart": it lists products tagged All Day.
  - Whatever is added **follows that daypart's days** (Auto). Another daypart shows as
    "From Brunch"; adding from it links the item (`followsDaypart` on the page's item copy,
    `device_schedule_items.follows_daypart`; `followedDaypart()` / `followsSource()` /
    `followsLabel()` in `src/lib/labelDisplay.ts`) and the row shows a gray **Follows Brunch** tag.
    Existing items follow their page's daypart. Week copies, paste and recurring carry the link.
    If the source stops sending a daypart, items following it go to Not available.
  - A search with matches in other dayparts shows "2 more in Breakfast" under the results;
    tapping it switches the daypart.
  - **Not available {day}** holds the picked daypart's items on days it isn't offered (plus items
    on the page not showing that day), not every other product.
  - **Days are per meal period** (`daysByDaypart` on products): a product on Lunch Mon–Fri and
    Breakfast Sat is on a Lunch page Mon–Fri only. All Day / Custom pages use every day the source
    offers it. A daypart set here on a linked product (local value: Dinner on a Lunch product) has
    no days of its own: it uses every day the source offers it and shows "follows Lunch"
    (`localDaypartSource()`).
  - Custom products list under each daypart they're ticked for, Off / On (no source days).
  - All dayparts editor: adding goes to every daypart the product is offered at; each page follows
    its own daypart.
- **The label preview shows one real screen** (`src/components/LabelAnchor.tsx`): one daypart, one
  day. **Every day** previews the **everyday menu** — items on all 7 days, in page order, cut to
  capacity (`isOfferedEveryDay()`; "showing" counts and statuses use the same rule). Items on some
  days only stay in the list with a gray **Some days** tag and "Pick a day to see it"; with none on
  every day the preview says "Nothing shows every day". **All dayparts** has no preview: it shows
  "Pick a daypart to preview" with a button per daypart (the live one marked). A label with only
  one daypart has no All dayparts choice and always opens on its page.
- **Every day and All dayparts mirror each other** on a label page: Every day edits one daypart
  across the week; **All dayparts** edits the day (or week) in scope across every daypart
  (`src/components/AllDaypartsEditor.tsx`). It lists each item on the label once (offered that
  day in any daypart; the rest under "Not available"), in daypart order then each item's place.
  Daypart chips show where it is (tap to open that daypart) and dashed `+ Lunch` chips add it to
  one more. Adding from Available Items goes to every daypart the product is offered at that
  isn't already holding it. Off / On (Auto) applies to every daypart it's on (Mixed when they
  differ). Removing asks first ("Remove from 3"). A capacity strip at the top ("Lunch 3 of 4 ·
  1 open", amber when empty) opens a daypart. **Reorder, substitutions, Auto Fill and Clear page
  stay inside one daypart** — they belong to that daypart's list.
- **Day availability (Off / Auto / On)** on a label page is per day of the week being edited
  (`src/lib/labelDisplay.ts`). Auto follows the product's days; On adds the day for this label,
  Off removes it. It never means priority — drag order does. "Every day" sets all 7 days and shows
  Mixed when they differ. **An item on a label is one day at a time (2026-11-26, menu platform
  spec v2.7 §4.8, D66: a "scheduled item").** Each day it's on is its own row in
  `device_schedule_items` (`day_of_week`, `state`: `auto` / `on` / `hidden`); a day with no row
  isn't on the label. Added in Every day = 7 rows on Auto (follows the source, including days it
  doesn't serve yet); added on one day = that day's row only ("Pancakes on Tue only"). Turning a
  day Off deletes that day's row; On sets `state = 'on'`; `hidden` is for Auto Fill. The page's
  Off / Auto / On toggles are worked out from the rows (`daySettingsFromRows()` in
  `src/services/api.ts`) and written back as rows (`setItemDaySettings`). To follow the source all
  week, add it in Every day. **Adding writes only the days it's added for** (one row on a single
  day, seven from Every day). **On a single day, an item that's Off (no row) isn't on that day's
  page at all** (2026-11-26, spec R-UI-10): it's not in the page list or its Not available section,
  and **Available Items** lists it like any product (up top or under Not available by its source,
  no "On this page"); adding it turns that day on (`onPageIds` in `DeviceSettingsModal.tsx`).
  Items on the page that day (Auto) but not offered by the source that day go under the page's
  collapsed **Not available {day}** (with an "On {day}" button) and under Available Items' Not
  available, marked "On this page": adding one turns that day On. Items showing that day aren't
  listed there.
  **Available Items: up top vs Not available** for products not on the page is decided by the
  source alone (the product's days and dayparts), or for an item without a source by its
  dayparts alone (a blank slate) — never by this week's label settings. So Wednesday's bacon on
  Tuesday is under **Not available Tue** ("Add anyway" turns Tue On); a custom item is up top.
  The exception: an item turned Off while you're on that day stays in the page list, struck through, so it can
  be undone (until the day or daypart changes). Removing an item applies to the whole week.
  **Layers:** source days (read-only) → the item's **base week** on that label = its day rows
  in the **Default Week** (Auto follows the source; On shows anyway; no row = not on) → a specific
  week's own rows, only when that week has its own schedule (a full copy, like its item list; it
  doesn't pick up later base changes). Bases are per label, not per product. Copy / paste /
  recurring copy the rows with their states; the first edit to a week without its own schedule
  copies what it shows first.
  Items not linked to a source have no days to follow,
  so their toggle is **Off / On** only (no Auto; a day without an On row is Off). Auto appears once an item
  is linked. Custom products have no days of their own: adding
  one to a label turns it On for the day being edited (all 7 in Every day).
- **Product days are view-only.** Each day has two independent parts: an
  **outline** when the product's **source** offers it that day (the API feeding products in —
  Webtrition today; generic text says "source", and where the product's own source is known it
  names it from `productSource()`), and a **soft fill** for how it's
  used here that week (approved 2026-11-15) — no fill when unused (gray letter; lighter gray when
  the source doesn't offer it either), `bg-sky-100 dark:bg-sky-900/60` with `text-sky-800
  dark:text-sky-200` on labels. An on-labels day the source offers has a `brand` outline
  (`dark:border-sky-400`). The fill, not the letter color, is what tells used from unused.
  Every letter keeps 4.5:1 contrast in both modes.
  Separate colors for labels vs signage (and both) are still open; decide them when signage exists. Week = the week selector. Lists and cards show one strip
  (`ProductDayStrip`); the product sheet shows a row per source plus a legend (`ProductDayRows`).
  Reference: `src/components/ProductDays.tsx`. **The label page uses the same strip** (`DayPills`
  in `DeviceSettingsModal.tsx`, 2026-11-26): the outline is the source serving it in that page's
  daypart (or the item's variant / followed daypart), the fill is it showing on that label that
  day (Auto on a served day, or On). A day it isn't on has no fill; there's no red / struck Off
  look and no extra mark for On. Products in Available Items not on the page have no fill.
  No picked-day mark there: with a day picked, the page list and Not available already split it.
- **Products is product control + "schedule lite" (decided 2026-11-16).** The list is all
  products (some on this week's menu, some on a later one). The week picker after Filters
  (`ProductWeekPicker`) offers **This week** and **Next week** only, each noting whether it follows
  the Default Week or has its own schedule. The first change to a week that follows the Default
  Week gives it its own schedule, the same as on Smart Labels (never edits the Default Week).
  Its last row, **Plan a later week**, opens Smart Labels → Schedule. Day and daypart are chosen
  in the label picker, for the picked week. Day strips, Usage, the Day filter, the label picker
  and labels opened from Products all use the picked week. The Day filter matches a product when the source
  serves it that day or a label uses it that day (what the day strip shows). The label picker
  ("Choose a label") names the week in its header, has no week or schedule controls, and has
  Scan (NFC) to pick a label by its tag. Otherwise it matches Smart Labels as closely as possible:
  the same toolbar (`MenuFilters`), Filters panel (`SmartLabelFilters`, its own placement choices),
  and grid / list view (shared with Smart Labels).
- **Finding products by use:** the Products Filters panel has a **Usage** section (On labels /
  Not in use, with counts) for the same week as the day strips. Signage options join it when
  signage exists. Usage is a filter, not a mark on the card.
- **Product cards and rows** carry no status marks beyond the refresh's New / Updated tag: no
  active check, channel state, or duplicate count. The day strip says how a product is used; the
  quick action is a plain outline `+` (Add to label).
- **Item identity (direction; linking not built yet):** every product is a WAND item with its own
  ID, and the WAND ID is always shown first ("ID 1362996575"). Items brought in from a source are
  *linked* to the source item for their values — editing one will make a local value on the WAND
  item, never change the source. Linked items show the source ID after the WAND ID with a gray
  `Link2` icon; the product sheet says "Linked to Webtrition MRN 13404.3" or "Not linked". Never show the
  `CUSTOM-` prefix — it's internal. Use `wandId()` / `linkedSourceId()` / `matchesItemId()` in
  `src/lib/labelDisplay.ts`. A mapping of source attributes to WAND fields is still to come.
- **Editing linked products (approved 2026-11-15):** every product has Edit, in the same form as
  custom products. For a linked product only the fields that differ from the source are saved, as
  **local values** (`product_local_values`, keyed by MRN, jsonb of changed fields), laid over the
  source when products load (`applyLocalValues()` in `src/lib/productValues.ts`; the source's own
  values stay on `item.source`). The sync never touches them and the source is never changed.
  In the form each changed field shows a gray **Local** tag and **Use source**; the sheet header
  says "2 local values". Changing a linked product's **dayparts** changes where it's offered
  (Available Items and Auto) on the days its source offers it. Days stay with the source.
- **Products:** custom products (`CUSTOM-` MRN) are created and edited in the product sheet.
  **Dayparts** are set on the product (multi-select, all ticked by default; `product_dayparts`,
  keyed by MRN) — they decide which dayparts' Available Items list it. **Stations and days** are
  never set on the product: they show where it's on labels that week (`labelUseByMrn()` in
  `src/lib/weekSchedule.ts`; a label's station is its placement). Any product with no daypart is
  offered at all of them and shows "Every daypart" (`productDayparts()` / `ALL_DAYPARTS` in
  `src/lib/stations.ts`) — not the "All Day" daypart.
  **Custom products tick each daypart they're offered at** (approved 2026-11-15): "All" ticks
  every box and isn't a daypart of its own; at least one is required. The choices are WAND's
  dayparts (Breakfast, Lunch, Dinner, Late Night) plus any the data uses; All Day isn't one.
  Older custom products with none stored are offered at every daypart and show "Every daypart".
  Linked products are edited there too, as local values (see above).
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
- **Label names (approved 2026-11-17):** a label (device) can have a name people give it
  ("Grill Station - 1"), set in device settings (the gear → **Name**, saved with `SaveButton`;
  `device_names`, keyed by device id). The name is what lists, cards, pickers and the label
  page show; the **device ID** ("ESL-SU-002", `device.name`) is shown only in that label's
  settings (gray `font-mono`, with a copy button), plus a tooltip on grid cards. With no name, the device ID is the name. Use `deviceName()` / `hasOwnName()` /
  `matchesDevice()` in `src/lib/deviceName.ts`; search, Scan and NFC match both.
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
A daypart stripe, bar or border always shows its daypart color and never turns into a warning
(Breakfast is amber, so an amber warning there reads as Breakfast). Say what's wrong in text
instead ("No items assigned"). One warning per problem on a row or card is enough.

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

## Weeks and days
- **Weeks run Sunday to Saturday** (decided 2026-11-16). The week start is one setting,
  `WEEK_STARTS_ON` in `src/lib/weekSchedule.ts`. Build every week and day list from there:
  `WEEK_ORDER` (days in display order), `startOfWeek()`, `getWeekStartDate()` /
  `getWeekStartString()`, `dayIndexInWeek()`. Never hard-code a day order or re-derive the week start.
- **Today is called out in sky** wherever days are listed, and only when the week shown holds
  today (never in the Default Week): day dropdowns (`DayPicker`) show a soft sky **Today** pill
  (`bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300`) after the date, on today's row
  and on the trigger when today is picked, with the row's text `font-semibold` sky; day tiles color
  the day name and date sky. No row backgrounds (they read as hover / selection) and no cyan.
- **The picked day** (the day being edited or filtered; approved 2026-11-26) has a sky edge, one
  look everywhere: day tiles and day chips get a soft sky fill + `sky-500` border
  (`bg-sky-50 dark:bg-sky-950/60 border-sky-500`, label page tiles and the Products Day filter);
  that's the selected-day standard. Products cards and rows echo the Day filter's days with a
  short `sky-500` bar under the letter in their day strip (`markDays` on `ProductDayStrip`), to
  show which picked days each product matched; never a strip fill or outline (those mean "on
  labels" and "served"). Label page strips don't mark the picked day (the page list and Not
  available already split by it). Today stays sky text (plus the Today pill in dropdowns); day
  strips don't mark today.
- Day numbers are JS `getDay()` values (0 = Sunday) everywhere, including stored `day_of_week`.
- Stored `week_start` is the week's Sunday. Dates use local time (`localDate()`), never `toISOString()`.

## Writing
- **API names are data, not copy (decided 2026-11-17).** The guide stays generic; the app shows
  the API a product comes from (name and what it calls its ID, e.g. "Webtrition", "MRN") wherever
  it's known, from `productSource()` / `sourceSystem()` in `src/lib/sources.ts`. Never type a
  vendor name or ID label into a component; add the source system there instead.
- Short, plain labels in sentence case ("Add items", not "Add Items To Page").
- Status text says what's happening and what's next ("Waiting · label is full").
