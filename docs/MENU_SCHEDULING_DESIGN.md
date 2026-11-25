# Menu scheduling: data design

Draft, updated 2026-11-25. Infrastructure, table schema and the workflow for populating menu schedules
on smart labels (and later signage menu zones). Supports two kinds of menu: **Webtrition menus**
(scheduled at the site on a menu cycle) and **retail menus** (relatively static, from a POS catalog or
by hand).

## 1. Three systems

```
     Webtrition (wds, menu templates)          POS / retail APIs (full catalog each request)
                  │                                         │
                  └──────────────────┬──────────────────────┘
                                     ▼
   ┌────────────────────────────────────────────────────────────┐
   │ ETL server (always on, no slow DAGs)                       │
   │  · source adapters + attribute maps                        │
   │  · validation cache: dated Webtrition items, this + next wk│
   │  · source catalogs (what each source offers)               │
   │  · creates / updates projections for every new item        │
   └──────────────┬───────────────────────────────┬─────────────┘
   product DB      │ service API                   │ validate, autofill lists
   service API     ▼                               ▼
   ┌──────────────────────────────┐    ┌──────────────────────────────────┐
   │ Product database             │◄───│ Scheduling + validation          │
   │  · products = projections    │    │  · targets (labels, zones)       │
   │  · links in priority order   │───►│  · Default Week, weeks, items    │
   │  · overrides per level       │    │  · autofill rules, order locks   │
   │  · location products (always │    │  · resolved menus (this + next)  │
   │    available per store)      │    │                                  │
   └──────────────────────────────┘    └───────────────┬──────────────────┘
          product changed events ─────────────────────►│
                                                       ▼
                                     labels (AIMS), signage players, API
```

| System | Owns | Never does |
|---|---|---|
| **ETL server** | Every call to a source; attribute maps; the validation cache; source catalogs; keeping projections current | Store schedules or local overrides |
| **Product database** | What an item *is*: projections, source links, harvested values, overrides, and each store's always-available product set. Reached through its **service request API** | Know which day or target an item is on |
| **Scheduling + validation** | Where and when an item shows: targets, weeks, placements, order, resolved menus | Call a source directly, or store product attributes beyond a one-week override |

## 2. Principles

1. **Every item is a projection.** Projections are WAND products over one or more sources plus local
   overrides (the DoorDash / Grubhub standard). **Webtrition:** the ETL creates a projection for every
   new MRN + portion it sees. **Retail:** projections are created first (by hand, or a one-time import
   from the first POS for convenience) and then *linked*; a new POS is a mapping exercise onto the
   existing projections, never an import. However it was first created, the projection stays and
   serves any API.
2. **A location product database is always available.** Each store has its full set of products,
   resolved, regardless of whether Webtrition or a POS is reachable. Scheduling and devices never
   depend on a source being up.
3. **Seed one menu cycle.** A new store is seeded with about 4 weeks: the Webtrition menu cycle from the
   menu templates (`duration`, usually 28 days; `cyclemenus` gives `menuRotationPeriod` and
   `nextPlayDate`), so every item in the rotation exists as a projection before anyone schedules.
4. **Source data keeps flowing in** for every mapped attribute, unless that attribute is overridden
   locally. Out of stock is just another attribute; how it displays is decided elsewhere.
5. **Sources can be swapped.** Each source type has an attribute map. Changing POS means relinking the
   product; the product and its overrides stay.
6. **Links fill attributes in priority order.** Priority 1 supplies every attribute it maps. Priority 2
   supplies the attributes priority 1 doesn't map but it does, and so on.
7. **Ownership:** retail products are owned by the **concept** (one Whopper, however many POS APIs).
   Webtrition and custom products bubble up to the **company** (translations for all locations from
   one place). Values inherit down; a higher-level edit wins and stores have no say.
8. **Dated Webtrition items are not kept.** They're unique per date × meal period × station; the
   validation cache holds this week and next, then drops them. Projections (per MRN + portion) are kept.
9. **One target model.** A label and a signage menu zone are both a *menu target*.
10. **Default Week is day-of-week only; real weeks are concrete.** Converting, copying or recurring a week
    makes new menu items for the new week. Weeks are created on view or API request, with autofill
    applied and validated then. Default Week changes apply instantly.
11. **Order freezes once shown.** New items go to the end; they can't take a showing position unless
    they're the only item that could show.
12. **Keep 8 weeks of schedule history.** The Default Week is never purged.
13. **Nothing slow sits in front of the UI.** No slow Airflow DAGs; the ETL server and product database
    answer directly.

## 3. Identities and matching

| Thing | Identity | Lives in |
|---|---|---|
| Webtrition menu item (one day) | Webtrition `id`, unique per date × meal period × station | Validation cache only |
| Webtrition item across days | **fingerprint** `(mrn, portion, meal_period)`; portion makes it unique | Week items |
| Webtrition projection | `(company, mrn, portion)` | Product database |
| POS / retail item | `(source_system, external_id)` within the API's scope (store, company) | Catalog, product links |
| WAND product | `product_id` | Product database |

- **Station is not part of the match.** People add from the right station; it's saved for sorting and
  as a tie-break, never checked.
- **Different portion = different item**, always. Product edits apply to the same MRN + portion only.

## 4. Product database

Can be built new. Reached only through its service request API (section 4.6). Week start is Sunday;
day masks use bit 0 = Sunday.

### 4.1 Hierarchy

```sql
concepts         (id uuid pk, name)
companies        (id uuid pk, name)
company_concepts (company_id fk, concept_id fk, pk (company_id, concept_id))
stores           (id uuid pk, company_id fk, name, sap_code, venue, timezone, settings jsonb)
```

### 4.2 Projections and links

```sql
products (
  id uuid pk,
  owner_level text check (owner_level in ('concept','company')),
  owner_id uuid,                                  -- concept for retail, company for the rest
  kind text check (kind in ('webtrition','retail','custom')),
  mrn text, portion text,                         -- webtrition only; portion '' when none
  name_key text,                                  -- normalized name, for the name check
  status text default 'active',                   -- active | inactive (not seen for a while)
  first_seen date, last_seen date,
  created_by text,                                -- 'etl' (auto-import), 'catalog', a user
  updated_at timestamptz
)
create unique index on products (owner_id, mrn, portion) where kind = 'webtrition';
create unique index on products (owner_id, name_key) where kind <> 'webtrition';

source_attribute_maps (                            -- one map per source type; swap POS = other map
  source_system int, source_field text,
  attribute text,                                 -- name, price, calories, allergens, out_of_stock…
  transform text,                                 -- optional: cents→dollars, code→icon…
  pk (source_system, source_field)
)

product_links (
  id uuid pk, product_id fk,
  priority int,                                   -- 1 = primary, 2, 3… For API links the store's
                                                  -- store_sources.priority is used when set
  target text check (target in ('api','product')),
  source_system int,
  external_id text,                               -- POS item id, or 'mrn|portion' for Webtrition
  linked_product_id uuid,                         -- target 'product': e.g. a Webtrition product
                                                  -- linked to a retail product
  scope_level text, scope_id uuid,                -- where the link applies (a store's POS…)
  linked_at timestamptz, unlinked_at timestamptz  -- relink on POS change; history kept
)
create unique index on product_links (product_id, priority) where unlinked_at is null;
create unique index on product_links (source_system, external_id, scope_id) where unlinked_at is null;

product_source_values (                            -- harvested by the ETL, already mapped
  link_id fk pk, values jsonb, source_hash text, harvested_at timestamptz
)

product_values (                                   -- local overrides per level; any attribute
  product_id fk,
  level text check (level in ('concept','company','store')),
  level_id uuid,
  values jsonb,                                   -- incl. translations: {"fr-CA": {"name": …}}
  updated_at timestamptz, updated_by uuid,
  pk (product_id, level, level_id)
)
```

### 4.3 How one attribute gets its value

For a product at a store, per attribute, the first that has a value wins:

1. **Local override**, most specific first: store → company → concept. (A one-week override in the
   scheduling system sits above these for that week.)
2. **Linked sources in priority order:** the lowest-numbered link whose attribute map includes this
   attribute, skipping sources not active at the store (`store_sources.active`). A store's POS
   priority comes from `store_sources.priority`, so lowering or switching a POS at a location is one
   row, not an edit to every product. Example: Webtrition at priority 1 maps nutrition, allergens, name; Agilysys at priority 2
   maps price and out_of_stock. Webtrition doesn't map price, so price comes from Agilysys. For a
   Webtrition link, the **day's menu item** value (validation cache, at resolve time) beats the
   harvested value.
3. Otherwise empty.

Rules:
- **Higher-level edits win:** saving at a level clears the same attribute below it (and in future week
  overrides). Brand managers edit at the concept or above; the company edits Webtrition and custom
  products. Stores have no say.
- **Changing POS:** close the old link, open one to the new source at the same priority.
- **Name check:** unique `name_key` within the owner before anything is created by hand.

### 4.4 Location products (always available)

```sql
location_products (                                -- each store's resolved product set
  store_id, product_id,
  values jsonb,                                   -- fully resolved (4.3, without dated values)
  sources jsonb,                                  -- which link supplied each attribute
  available_days smallint, meal_periods int[],    -- seen pattern in the current cycle
  station_ids int[],
  resolved_at timestamptz, version bigint,
  pk (store_id, product_id)
)
```

Rebuilt for a product whenever its links, harvested values or overrides change. This is what search,
quick add and scheduling read, and what keeps a store working when a source is down. Search shows items
not on this week's menu as prominently as the ones that are.

### 4.5 Catalogs, terms, categories

```sql
store_sources (                                    -- which sources feed a store, and how
  store_id, source_system,
  active bool,                                    -- POS live for this location
  priority int,                                   -- link priority at this store (lower it to
                                                  -- demote a POS)
  create_mode text check (create_mode in ('auto','once','none')),
                                                  -- auto: Webtrition (projection per new item)
                                                  -- once: first POS, one-time import
                                                  -- none: map only (every later POS)
  refresh text,                                   -- 'cycle' (Webtrition) | interval (POS)
  config jsonb,                                   -- sap_code/venue, POS credentials ref…
  pk (store_id, source_system)
)

source_catalog_items (                             -- what an unscheduled source offers (full pull)
  store_id, source_system, external_id,
  name text, values jsonb,                        -- mapped attributes
  product_id uuid,                                -- the projection it's mapped to; null = unmapped
  last_seen timestamptz, gone_at timestamptz,
  pk (store_id, source_system, external_id)
)

catalog_terms (owner_level, owner_id, kind, term, seen_count, last_seen, from_source,
               pk (owner_id, kind, term))          -- quick-add chips: ingredient / allergen / icon
product_categories     (id, owner_level, owner_id, name, sort)
product_category_items (category_id, product_id, sort, pk (category_id, product_id))
```

For a POS the catalog is a **mapping worklist**: it shows what the POS sends and which projection each
item is mapped to. Unmapped items are the work (suggest matches by name; a person confirms). Only a
store's first POS, with `create_mode = 'once'`, may create projections from it in one pass for
convenience.

### 4.6 Service request API

| Request | Caller | Does |
|---|---|---|
| `GET /stores/{id}/products?q&day&mealPeriod&category` | Scheduling, UI | Search `location_products` |
| `GET /stores/{id}/products/{productId}` | Scheduling, devices | One resolved product |
| `POST /products/upsert-from-source` | ETL | Find or create the projection for a source item; link; save harvested values |
| `POST /products` / `PATCH /products/{id}/values?level` | UI | Custom items, overrides |
| `POST /products/{id}/links` / `DELETE …/links/{linkId}` | UI, ETL | Link, relink, reprioritize |
| `GET /stores/{id}/catalog?source&unmapped` / `POST …/catalog/map` | UI | Mapping worklist; map POS items to projections |
| `POST /stores/{id}/catalog/import-once` | UI | First POS only: create projections from its catalog |
| `PATCH /stores/{id}/sources/{source}` | UI | Make a POS active, change its priority |
| event `product.changed {product_id, store_ids, attributes}` | → Scheduling | Rebuild affected resolved menus |

## 5. ETL server

Always-on service with source adapters. The only thing that calls Webtrition or a POS.

### 5.1 What it serves

| Endpoint | Caller | Does |
|---|---|---|
| `GET /source-menu?store&week[&mealPeriod&station]` | Scheduling (autofill) | Dated Webtrition items for the week, in the sort standard |
| `POST /validate {store, week, items}` | Scheduling | Per item per day: available / not in source / closed, bound Webtrition menu item id, that day's values |
| `POST /refresh {store, source}` | UI, schedule | Pull now (catalog or cycle) |

### 5.2 Validation cache (Webtrition, this week + next)

```sql
source_menu_snapshots (id, store_id, source_system, week_start, fetched_at, status, payload_hash,
                       unique (store_id, source_system, week_start))
source_menu_items (snapshot_id fk on delete cascade, menu_item_id int, service_date date,
                   meal_period_id int, station_id int, mrn text, portion text, source_sort int,
                   name text, price text, attrs jsonb,
                   pk (snapshot_id, service_date, menu_item_id))
create index on source_menu_items (snapshot_id, mrn, portion, meal_period_id);
```

One wds call per store per week (POST `/client/wds`, `Days=7`, `allergenMenu: "all"` or Retail
Allergen menus come back empty). Served if under ~15 minutes old, else refreshed; if Webtrition fails,
the old snapshot is served marked `stale`. WAND's wds route doesn't cache items, so this is the cache.

### 5.3 Populating the product database

Every pull does both jobs: update the validation cache (Webtrition) and keep projections current.

**Webtrition (auto import, cycle-aware)**
1. **Seed** a new store: read menu templates / `cyclemenus` for the cycle length (usually 28 days),
   pull that many days (4 wds calls of 7 days), and for every distinct MRN + portion call
   `upsert-from-source` (creates the company projection if new, links it at the store's priority,
   saves mapped values). Record meal periods, stations and days seen in `location_products`.
2. **Ongoing:** each refresh of this/next week also upserts any new MRN + portion it sees, updates
   harvested values when the source hash changes, and bumps `last_seen`.
3. **Cycle change** (`nextPlayDate`, a new menu collection): pull the new cycle ahead of time, same as
   the seed.

**POS / retail (no schedule; full catalog each request)**
1. Pull the full item list on the store's interval (minutes for out of stock / price).
2. Diff against `source_catalog_items`: new, changed, gone.
3. New: lands in the catalog **unmapped**. The ETL never creates a retail projection, except the one-time
   import of a store's first POS (`create_mode = 'once'`).
4. Changed: update `product_source_values` for mapped items (price, out_of_stock…).
5. Gone: set `gone_at`; the projection and its link stay.

**Adding a POS to a location:** add `store_sources` (inactive), pull its catalog, map its items to the
existing projections, then make it active and set its priority (or lower the old POS). The projections
don't change.

After any write the product database rebuilds the affected `location_products` and emits
`product.changed`.

**Inactive projections:** a Webtrition projection not seen for **two menu cycles** becomes `inactive`:
hidden from quick add, still searchable, never deleted while scheduled. Retail projections never go
inactive from a POS; they stay to serve any API until someone retires them.

### 5.4 Timing

- Direct calls for anything a person waits on (`validate`, `source-menu`, `refresh`).
- Nightly: refresh this + next week for every Webtrition store with targets; check for a cycle change.
- POS interval pulls: always-on workers, not batch DAGs.
- Saturday night rollover: next week becomes this week, load the new next week.

Airflow is acceptable for the nightly batch only.

## 6. Scheduling + validation

### 6.1 Targets and dayparts

```sql
dayparts (id uuid pk, store_id, name, sort, color, source_meal_period_ids int[])

menu_targets (
  id uuid pk, store_id,
  kind text check (kind in ('label','zone')),
  external_id text,                               -- AIMS label id / signage zone id
  name text,
  menu_source text,                               -- 'webtrition' | 'retail'; null = store's
  config jsonb,                                   -- pages per daypart, size; zones report their
                                                  -- item capacity and overflow rules
  unique (store_id, kind, external_id)
)
```

### 6.2 Weeks and items

```sql
menu_weeks (
  id uuid pk, target_id fk,
  kind text check (kind in ('default','week')),
  week_start date,                                -- null for default
  origin text check (origin in ('default','copy','recurring','manual')),
  origin_week_id uuid, recurrence_weeks int,
  edited bool default false,
  materialized_at timestamptz, updated_at timestamptz,
  check ((kind='default') = (week_start is null))
)
create unique index on menu_weeks (target_id) where kind = 'default';
create unique index on menu_weeks (target_id, week_start) where kind = 'week';

menu_autofill_rules (
  id uuid pk, week_id fk on delete cascade, daypart_id fk,
  kind text check (kind in ('source','category')),
  station_id int, meal_period_id int,             -- 'source': from the Webtrition week
  category_id uuid,                               -- 'category': retail menus, signage zones
  max_items int, sort int
)

menu_week_items (                                  -- placements; product data lives in the product DB
  id uuid pk, week_id fk on delete cascade, daypart_id fk,
  product_id uuid not null,                       -- every item is a projection now
  meal_period_id int,                             -- Webtrition: with the product's MRN + portion,
                                                  -- the fingerprint for each day's match
  station_id int,                                 -- where it was added from; not matched
  follows_meal_period_id int,
  state text check (state in ('shown','hidden')), -- hidden removes an autofill item
  on_mask smallint default 0, off_mask smallint default 0,   -- neither = Auto (source days)
  position int,                                   -- only when pinned by hand
  source_sort int, item_number int,               -- sort standard, frozen at creation
  overrides jsonb default '{}',                   -- this week only
  origin_item_id uuid, updated_at timestamptz
)

menu_order_locks (target_id, service_date, daypart_id, order_keys text[], locked_at,
                  pk (target_id, service_date, daypart_id))

resolved_menus (
  target_id, service_date, daypart_id,
  items jsonb,                                    -- final order, display values, bound menu item id
  availability jsonb, hash text, resolved_at timestamptz,
  product_versions jsonb,                         -- location_products.version used
  source_status text,                             -- ok | stale
  pk (target_id, service_date, daypart_id)
)
```

- Every week item points at a projection, since the ETL creates one for every new item. The Webtrition
  fingerprint is the product's MRN + portion plus the item's meal period.
- No Webtrition menu item ids on week items: one item with a day mask binds to up to 7 (one per day) at
  resolve time; bindings go in `resolved_menus`.
- Converting the Default Week, copying or recurring: new `menu_weeks` row, rules and items copied with
  new ids and `origin_item_id`.
- `resolved_menus` is held for this week + next. Devices, signage, the AIMS push and the API read only
  this; the hash decides whether to push.

### 6.3 Sort and frozen order

Until a day has been shown: pinned `position`, then source `sortOrder`, then Webtrition menu item id
(category fill: category order, then name). Items without a source sort after source items.

Once a day has been sent to a target, `menu_order_locks` holds its order. Later items go to the end, and
only take a showing position when they're the only item that could show there. Reordering by hand writes
a new lock.

## 7. Workflow: populating a schedule

### 7.1 Opening a week (UI view or API request)

1. Find the week; if missing, copy the matching recurring week, else the Default Week (new ids).
2. Webtrition targets: `GET /source-menu` from the ETL for autofill rules, `POST /validate` for the
   week's items. Retail targets: no source call; category rules read the product database.
3. Resolve each day/daypart: autofill + week items, drop hidden, place pins, apply the order lock, then
   values: this week's override → `location_products` values → the day's Webtrition values for
   attributes that link supplies.
4. Write `resolved_menus` for this/next week; the first send of a day writes its lock.

**Editing the Default Week** processes immediately: this week and every future week that still only
follows the Default Week (`edited = false`) are re-copied from **today**, and their resolved menus are
rebuilt and pushed in the same request. Today's frozen order still applies (removed items drop off, new
ones go to the end). Past days never change.

**Editing a week that only follows the Default Week** creates that week's own schedule: the copy is
marked `edited = true` (an Override in the UI), the edit is applied to it, and from then on it no longer
follows Default Week changes. Recurring weeks behave the same way.

If the ETL can't reach Webtrition, step 2 uses the stale snapshot; if there is none (week beyond next),
items resolve from `location_products` with availability `unknown`.

### 7.2 Adding an item

- **From the Webtrition week or search:** picks a projection (each portion is its own); validated by the
  ETL against that day's items by MRN + portion + meal period (station ignored). No match is allowed,
  shown as "Not on the source menu Tue".
- **Retail:** always a projection from the product database (POS items are mapped to projections,
  not placed directly).
- **Custom quick add:** name check, chips from `catalog_terms`, creates a company projection with no
  source.
- Once a day has been shown, a new item lands at the end.

### 7.3 When products change

`product.changed` (from an override, a relink or a harvested value such as a new POS price or out of
stock) → scheduling clears the same attributes from future week overrides when the change is a
higher-level edit, and rebuilds the affected `resolved_menus`, pushing only changed hashes.

### 7.4 Retention (nightly)

Schedule weeks older than 8 weeks (Default Week kept); validation snapshots older than this week;
resolved menus and locks older than today. Products are never deleted, only marked inactive.

## 8. In the playground

One Supabase project can play all three roles:

- **Schemas:** `product` (section 4), `etl` (5.2 and catalogs) and `schedule` (section 6). Scheduling
  calls product functions (RPC) that stand in for the service request API, never product tables
  directly.
- **ETL:** `supabase/functions/populate-menu-data` becomes the ETL function (`seed`, `refresh`,
  `source-menu`, `validate`).
- **Events:** a trigger on `location_products` + `pg_notify` (or a webhook) for `product.changed`.

Steps:
1. Hierarchy, `store_sources` (the demo store on Webtrition, auto import), `menu_targets` (one per demo
   device; `device_names` folds in).
2. Seed: run the ETL seed for 4 weeks to create projections and `location_products`.
3. Weeks: from `device_week_schedules` / `device_schedule_items`, mapping each MRN to its projection and
   collapsing per-day rows and `label_day_settings` into `on_mask` / `off_mask`. Existing local values
   (`product_local_values`, `product_display_names`, `product_dayparts`, `converge-custom`) become store
   overrides or custom projections.
4. Move week resolution from `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the scheduling
   function so the UI and API resolve the same way; the UI keeps a projection for optimistic edits.
5. Drop `menu_items`, `product_availability` and the folded tables.

## 9. Decisions

2026-11-24
1. Match on MRN + portion + meal period for the date; station isn't checked.
2. Product edits apply to the same MRN **and** portion only; each portion is its own product.
3. Order freezes once a day is shown; new items go to the end.
4. Values inherit down; higher-level edits win; brand managers edit at the concept or above; stores
   have no say.
5. Retail products are concept projections; Webtrition and custom products bubble up to the company.
6. Source data always flows in for mapped attributes unless overridden; each POS has an attribute map.
7. A product can link to several sources; a Webtrition product can link to a retail product.
8. Default Week changes apply instantly. Retail targets fill by category or by hand; signage zones
   need category fill and report their own capacity and overflow rules.
9. Scheduling + validation is separate from the product database; the ETL makes the source calls.

2026-11-25
10. The ETL creates projections for **every new Webtrition item** while updating the validation
    cache (Webtrition). Retail: see 18.
11. Each store has a **location product database** that is always available; new stores are seeded with
    one menu cycle (usually 4 weeks, from the menu templates).
12. Unscheduled sources (retail POS) send the full catalog each request; the catalog is shown as
    a mapping worklist onto projections (see 18).
13. The product database is reached through a **service request API**.
14. **Link priority:** priority 1 supplies all its mapped attributes; each next link supplies only
    attributes not mapped by the ones before it.
15. **Out of stock is an attribute** like any other; display rules are outside this design.

16. **Default Week edits process immediately**; editing a week that only follows the Default Week
    creates that week's own schedule.
17. Webtrition projections go **inactive after two menu cycles** unseen.
18. **Retail projections come first, then links.** No POS importing beyond an optional one-time import
    from a store's first POS; each new POS is mapped to the existing projections, then made active or
    given a lower priority per location. The original projection stays to serve any API.

## 10. Still open

1. **Who maps a new POS:** a brand manager once at the concept (mapping shared by every store on that
   POS), or each company / store for its own POS?
2. **Unmapped POS items:** when a live POS sends items no one has mapped yet, do they stay invisible
   until mapped, or is someone notified?
