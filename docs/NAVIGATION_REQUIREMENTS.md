# CCGS Navigation Requirements

## Overview

The CCGS navigation system lets operators move between levels of their organizational hierarchy: **WAND** (root) → **Concept** → **Company** → **Store**. Two surfaces provide this capability:

1. **Quick Nav** — the compact location selector embedded in the top navigation bar, designed for fast drill-down from WAND all the way to a store, one step at a time.
2. **Full Nav** — the Location Selection modal, a larger browse-and-search surface for exploring the full hierarchy and jumping to any node.

Both surfaces share the same data model and selection callbacks, but differ in interaction style and depth of exploration.

---

## Shared Data Model

### Hierarchy Levels

| Level | Description | Default Icon | Example |
|-------|-------------|--------------|---------|
| WAND | Root / top level. The operator's home base. | `Wand2` (lucide), with a small brand WebP image rendered at 16px | WAND |
| Concept | A dining concept (e.g., University Dining, Healthcare). | `Building2` | University Dining |
| Company | A company group within a concept. | `Building` | Northeast University Group |
| Store | An individual store location. | `Store` (lucide) | Main Campus Dining Hall |

### Data Types

- **Concept**: `{ id: string; name: string; children: Concept[] }`
- **Company**: `{ id: string; name: string; conceptId: string }`
- **Store**: `{ id: string; name: string; companyId: string }`

### Future Data Point

- **Concept logos**: each concept may carry an optional `logo` field (PNG or WebP, small format, displayed at icon size). Default icons remain in place until a logo is provided.

### Selection State

A single set of selection state drives both surfaces:

- `selectedConcept: string | null`
- `selectedCompany: string | null`
- `selectedStore: string | null`
- `expandedConcept: string | null` — which concept is expanded in the browse tree
- `expandedCompany: string | null` — which company is expanded in the browse tree

### Derived Level

The current level is derived from the deepest non-null selection:

- store selected → `store`
- company selected (no store) → `company`
- concept selected (no company) → `concept`
- nothing selected → `wand`

---

## Quick Nav (Header Dropdown)

### Purpose

Fast, inline drill-down through the organizational hierarchy, one step at a time, without opening a modal. The dropdown always shows the **children** of the current location (WAND → concepts, concept → companies, company → stores), letting the operator step all the way down to a store. At the store level it shows **sibling stores** within the same company, plus an "Other stores" group for stores the user has access to outside the current hierarchy.

### Location

Embedded in the fixed top navigation bar, left section, immediately after the hamburger menu button.

### Components

1. **Current-location button**
   - Displays the current level's icon (or WAND brand image at the WAND level) and the current location label.
   - Icon size: 16px (`h-4 w-4`), matching the surrounding icons.
   - WAND level: renders `/wand-level.webp` at 16px; the image must not disrupt alignment or exceed the icon box.
   - All other levels: lucide icon colored `rgb(0, 173, 240)`.
   - Label: concept/company/store name, or "WAND" at root.
   - Chevron-down icon (16px) indicates dropdown affordance.
   - Click toggles the sibling dropdown.

2. **Drill-down dropdown**
   - Opens below the current-location button.
   - Card panel, 288px wide (`w-72`), max height 384px with vertical scroll.
   - Header label adapts to the current level:
     - WAND → "Concepts"
     - concept → "Companies"
     - company → "Stores"
     - store → "Stores in Company"
   - Lists items at one step below the current level:
     - WAND: all concepts (children).
     - concept: companies within the selected concept (children).
     - company: stores within the selected company (children).
     - store: stores within the selected company (siblings).
   - At the store level, an additional **"Other stores"** section appears below the sibling stores, separated by a divider and its own header. It contains stores the user has access to that are **not** inherited from the current company. For the demo, this always shows one entry: "Creative Service Lab".
   - Each row shows its level icon (16px) and name (truncated).
   - Active item (matching the current selection) is highlighted with the brand-blue background (`rgb(0, 173, 240)`) and white text.
   - Clicking an item selects it and closes the dropdown. Selecting a company also sets the parent concept; selecting a store also sets the parent company and concept. Selecting an "Other store" sets its full parent chain so the hierarchy stays consistent.
   - You can use the quick nav to go from WAND all the way to a site — each step is always one level down.

3. **Nav spinner**
   - On any navigation action, a `Loader2` spinner (16px, white at 70% opacity) appears next to the button for 600ms to give visual feedback.

4. **Return-to-WAND button**
   - Visible only when the current level is not `wand`.
   - Home icon (16px), gray.
   - Clicking resets the location to WAND root.

5. **Full Location Selector button**
   - MapPin icon (20px), brand blue.
   - Opens the Full Nav modal.

### Loading State

- If `loadingLocations` is true and siblings are empty, the dropdown shows a centered spinner.

### Empty State

- If no items are found (and no "Other stores"), the dropdown shows "No locations found."

### Interaction

- Clicking outside the dropdown closes it (mousedown listener on document).
- The dropdown does not close on item click until after selection is applied.

---

## Full Nav (Location Selection Modal)

### Purpose

Browse the entire hierarchy, search across concepts/companies/stores, and navigate to any node. Designed for discovery and cross-level jumps.

### Trigger

Opened via the Full Location Selector button (MapPin icon) in the Quick Nav.

### Layout

Centered modal, max width 896px (`max-w-4xl`), max height 90vh, vertical scroll on content area.

### Sections

1. **Header**
   - Title: "Select Location".
   - Loading spinner if `loading` is true.
   - Close button (X icon).

2. **Breadcrumb bar**
   - "Return to WAND" link with Home icon — resets selection to root and clears browse view.
   - Breadcrumb trail: WAND › [Concept] › [Company] › [Store].
   - Breadcrumbs reflect the **browse view** (what's currently displayed), not the actual selection.
   - Clicking a breadcrumb navigates the browse view to that level without changing the actual selection.
   - Current browse level is shown in dark text; parent levels are brand-blue links.
   - Separators: ChevronRight icons (16px, gray).

3. **Search**
   - Search input with Search icon prefix.
   - Placeholder adapts to browse scope:
     - WAND → "Search all concepts, companies, or stores..."
     - concept → "Search within [concept name]..."
     - company → "Search within [company name]..."
     - store → "Search sibling stores..."
   - Fuzzy (case-insensitive substring) match on names.
   - Results are scoped to the current browse view (see below).
   - Max 50 results per level, with a "Showing first N matches" note when capped.

4. **Browse tree**
   - Visible when no search query is active.
   - Has two modes depending on the browse view level:

   **Wide browse mode** (WAND or concept level):
   - Lists concepts as expandable cards.
   - Each concept card:
     - Expand/collapse chevron + concept icon (20px, brand blue) + name.
     - Company count on the right.
     - "Go" button on the right edge: selects this concept and closes the modal.
     - Expanding reveals nested companies.
   - Each company row:
     - Expand/collapse chevron + company icon (16px, gray) + name.
     - Store count on the right.
     - "Go" button: selects concept + company and closes.
     - Expanding reveals nested stores.
   - Each store row:
     - MapPin icon (16px, red) + name.
     - Click selects concept + company + store and closes.
   - Empty children: "No companies under this concept." / "No stores under this company."

   **Scoped view mode** (company or store level):
   - Shows the concept as a **non-interactive context header** — a collapsed label that tells the operator where they are, with a "Go" button to navigate to the concept level. It does not expand to expose sibling companies.
   - Below the concept header, only the **current company** is shown, already expanded with its stores listed.
   - No company expand/collapse chevron is shown (there's only one company to look at).
   - Store rows work the same as in wide browse mode.
   - To browse wider (see sibling companies or other concepts), the operator uses the **breadcrumbs** to navigate up, which widens the view to the concept or WAND level and switches to wide browse mode.

### Search Results

- Grouped into three sections: Concepts, Companies, Stores.
- Each section has a header with its icon and an uppercase title.
- Each result row:
  - Level icon (16px, gray).
  - Name with highlighted match (`<mark>`).
  - Parent path shown as small text below (e.g., "Concept › Company" for a store).
  - Click selects the appropriate levels and closes the modal.

### Browse View vs. Actual Selection

- The modal maintains a local **browse view** state (`viewConcept`, `viewCompany`) separate from the actual selection.
- When the modal opens, browse view initializes to the current selection.
- Breadcrumb clicks update the browse view only.
- Search scope follows the browse view, not the actual selection.
- Selecting a result updates the actual selection and closes the modal.

### Auto-Expand on Open

When the modal opens, the tree auto-expands based on the current selection level:

| Current selection | Concept expansion | Company expansion | Browse mode |
|-------------------|-------------------|-------------------|-------------|
| WAND (nothing selected) | collapsed | collapsed | Wide browse |
| Concept only | expanded (shows sibling companies) | collapsed | Wide browse |
| Company or store | **collapsed** (concept is context header) | **collapsed** (single company shown expanded) | Scoped view |

Key point: at the company/store level, the concept is **not** expanded. It appears as a collapsed context header, and only the current company is exposed. This avoids showing sibling companies when the operator is already scoped to one company — breadcrumbs are the way to widen the view.

### Dynamic Highlight Rule

An item in the browse tree is highlighted (brand-blue border, background tint, and blue text/icon) **only when multiple siblings at that level are visible**. When only a single item at a level is visible — because the operator is scoped into it — no highlight is shown. The highlight always means "this is the active one among several."

| Level | When highlighted | When not highlighted |
|-------|-----------------|---------------------|
| Concept | Multiple concepts visible (browsing at WAND level) | Single concept visible (scoped to a concept or below) |
| Company | Multiple companies visible (concept expanded in wide browse) | Single company visible (scoped view mode) |
| Store | Multiple stores visible under the expanded company | Single store under the company |

This rule applies in both wide browse mode and scoped view mode. It also applies dynamically when the operator breadcrumbs up: widening the view exposes siblings, which causes the highlight to appear on the current location at that level.

### Breadcrumb Navigation Widens the View

Breadcrumb clicks don't just change the browse level — they **widen what's visible**:

- **Breadcrumb to WAND**: all concepts become visible → current concept gets highlighted (multiple concepts now visible).
- **Breadcrumb to concept**: concept expands, exposing all sibling companies → current company gets highlighted (multiple companies now visible).
- **Breadcrumb to company**: switches to scoped view mode (concept as context header, current company expanded with stores).

As the view widens, highlights appear on the current location at each level because siblings become visible. As it narrows, highlights disappear because only the scoped item remains.

### Scroll Behavior

The modal auto-scrolls the highlighted (active) row into view **only when the modal first opens**. After that, the scroll position is left alone — expanding or collapsing concepts and companies, breadcrumbing, or typing in search will never yank the view. The operator is free to scroll and browse without the modal fighting them.

### Reset

- "Return to WAND" clears the actual selection, browse view, search query, and expanded states.

---

## Branding & Visual Rules

- Brand accent color: `rgb(0, 173, 240)` (light blue), used for active states, icons, links, and the WAND-level icon.
- WAND-level icon: small WebP image (`/wand-level.webp`) at 16px, constrained to the icon box — must not alter alignment, spacing, or line height.
- Concept/company/store icons: default lucide icons until per-concept logos are added as a future data point.
- Dark mode: navigation bar is `bg-gray-900` / `dark:bg-gray-950`; text is white/light-gray; hover states use `bg-gray-800` / `dark:bg-gray-900`.

---

## Responsive Behavior

- Top nav uses `px-4 sm:px-6 lg:px-8` horizontal padding.
- Quick Nav button text is always visible (no hidden-on-mobile label).
- Full Nav modal: `w-full` on mobile, `max-w-4xl` on larger screens; `p-4` outer padding on mobile.
- Breadcrumb trail wraps (`flex-wrap`) on narrow viewports.

---

## Multi-Domain Users

### Overview

Some operators have access across multiple organizational domains (e.g., a corporate user who manages both University Dining and Perrilco internal sites). The `isMultiDomainUser` flag on the access response controls whether "Other" sections appear in the quick nav.

### Access Response

The access response includes `isMultiDomainUser`, which defaults to `false`. The vast majority of users are single-domain and will never see "Other" sections. Only when the flag is explicitly `true` does the multi-domain behavior activate.

```
isMultiDomainUser: false   // default — most users
```

### Where "Other" Sections Appear

"Other" sections only appear at the **concept**, **company**, and **store** levels — never at the **WAND** level. A WAND-level user already sees every concept they have access to as direct children of root; there is no "outside the current context" to show, so multi-domain is meaningless there.

When `isMultiDomainUser` is true and the user is drilled into a hierarchy, the quick nav dropdown shows an additional "Other" group below the current-level items. The contents come from the user's selected secondary domain:

- **Concept level**: an "Other Concepts" section listing concepts from the secondary domain that aren't in the current navigation context.
- **Company level**: an "Other Companies" section listing companies from the secondary domain outside the current concept.
- **Store level**: an "Other Stores" section listing stores from the secondary domain outside the current company. (This extends the existing "Other stores" behavior already documented in the Quick Nav section.)

At WAND level, the dropdown is unchanged regardless of the flag.

### Selecting an "Other" Entry

Selecting any "Other" item jumps the entire hierarchy to that domain and sets the full parent chain (concept → company → store) so navigation stays consistent. The location change overlay and breadcrumb trail reflect the new domain immediately.

### Demo Behavior

For the demo, multi-domain mode is toggled via the "Manage Demo" control in the top navigation bar. When enabled, a dropdown lets you select which secondary domain is active from several demo options (e.g., "Perrilco (Internal)", "Midwest University Alliance", "Regional Hospital Network"). The selected domain's concepts, companies, and stores populate the "Other" sections. Switching the selection updates the "Other" entries immediately. At WAND level the dropdown shows no "Other" section even when multi-domain is enabled.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| No concepts/companies/stores loaded | Quick Nav dropdown: "No locations found." Full Nav: empty browse tree or spinner during load. |
| Loading in progress | Spinner shown in dropdown / modal header. |
| Search with no matches | "No matches found." centered in content area. |
| Search exceeds 50 per level | Truncated with "Showing first N matches" note. |
| Selecting a company from search | Also sets the parent concept (derived from `conceptId`). |
| Selecting a store from search | Also sets parent company and concept (derived from `companyId` → `conceptId`). |
| Clicking breadcrumb at current level | No-op (already there). |
| Modal reopened | Browse view resets to current selection; search cleared. Auto-expand follows the scoping rules above. |
| Modal opened at company/store level | Concept shows as collapsed context header; only current company exposed with its stores. No company highlight (single item). Store highlight only if multiple stores. |
| Breadcrumb up from company to concept | View widens: concept expands, sibling companies visible, current company highlighted. |
| Breadcrumb up from concept to WAND | View widens: all concepts visible, current concept highlighted. |
