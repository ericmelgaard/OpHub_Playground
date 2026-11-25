# Menu scheduling: data design

Draft, 2026-11-24. How menus for smart labels (and later signage menu zones) are stored, built and
read: which system owns which data, the tables, and where the work runs. Supports two kinds of menu:
**Webtrition menus** (change daily, scheduled at the site) and **retail menus** (relatively static,
items from a POS or by hand).

## 1. Three systems

```
          Webtrition (wds)     POS APIs (Agilysys, …)     retail APIs
                 │                    │                       │
                 └──────────┬─────────┴───────────────────────┘
                            ▼
   ┌───────────────────────────────────────────────┐
   │ ETL server (always on, no slow DAGs)          │
   │  · source adapters + attribute maps           │
   │  · harvest → product database                 │
   │  · validate / source menu for a store + week  │
   │  · Webtrition snapshot: this week + next      │
   └──────────────┬──────────────────────┬─────────┘
       harvest    │                      │  validate, autofill lists
                  ▼                      ▼
   ┌──────────────────────────┐   ┌──────────────────────────────────┐
   │ Product database          │   │ Scheduling + validation (new)    │
   │ (exists today)            │◄──│  · targets (labels, zones)       │
   │  · products = projections │   │  · Default Week, weeks, items    │
   │  · source links + values  │──►│  · autofill rules, order locks   │
   │  · overrides per level    │   │  · resolved menus (this + next)  │
   │  · terms, categories      │   │                                  │
   └──────────────────────────┘   └───────────────┬──────────────────┘
        product changed events ──────────────────►│
                                                  ▼
                                labels (AIMS), signage players, API
```

| System | Owns | Never does |
|---|---|---|
| **ETL server** | Calls to every source; attribute maps per source; the Webtrition week snapshot | Store schedules or product overrides |
| **Product database** | What an item *is*: projections, links to sources, harvested source values, overrides at concept / company / store | Know which day or target an item is on |
| **Scheduling + validation** | Where and when an item shows: targets, weeks, placement, order, resolved menus | Call a source directly, or store product attributes beyond a one-week override |

## 2. Principles

1. **Every changed item is a projection.** A WAND product is a projection over one or more sources
   plus local overrides (the DoorDash / Grubhub standard). An untouched source item needs no product
   row; the moment someone changes it, a projection is created and linked to it.
2. **Source data keeps flowing in** for every mapped attribute, unless that attribute is overridden
   locally (at any level). Attributes a source doesn't map are WAND-only.
3. **Sources can be swapped.** Each source type (Webtrition, Agilysys, another POS) has an attribute
   map to WAND attributes. Changing POS means relinking the product to the new source; the product
   and its overrides stay.
4. **A product can have several sources.** Usually Webtrition is primary (nutrition, allergens,
   scheduling) and a POS supplies price (Agilysys). A Webtrition product can also link to a retail
   product. Which source wins per attribute is set by priority.
5. **Ownership:** retail-primary products are owned by the **concept** (one Whopper, however many POS
   APIs). Webtrition and custom products are born at the site and bubble up to the **company** only,
   so a company (a university) can set translations and other values for all its locations at once.
   Values inherit down and can be overridden below; a higher-level edit wins and stores have no say.
6. **Webtrition menu items are not kept.** They're unique per date × meal period × station, fetched a
   week at a time, held in a snapshot for this week and next, then dropped. The product database keeps
   only what's harvested for projections plus a light index for search.
7. **One target model.** A label and a signage menu zone are both a *menu target*.
8. **Default Week is day-of-week only; real weeks are concrete.** Converting, copying or recurring a
   week makes new menu items for the new week. Weeks are created on view or API request, with autofill
   applied and validated then. Default Week changes apply instantly.
9. **Order freezes once shown.** New items go to the end; they can't take a showing position unless
   they're the only item that could show.
10. **Keep 8 weeks of history.** The Default Week is never purged.
11. **Nothing slow sits in front of the UI.** No slow Airflow DAGs; the ETL server answers directly.

## 3. Identities and matching

| Thing | Identity | Lives in |
|---|---|---|
| Webtrition menu item (one day) | Webtrition `id`, unique per date × meal period × station | ETL snapshot only |
| Webtrition item across days | **fingerprint** `(mrn, portion, meal_period)`; portion makes it unique | Week items, product links |
| MRN master recipe | `mrn` (a menu item can differ from its recipe) | Product links, search index |
| POS / retail item | `(source_system, external_id)` within the API's scope (store, company) | Product links |
| WAND product | `product_id` | Product database |

- **Station is not part of the match.** That would need devices strictly tied to stations. People add
  from the right station; it's saved for sorting and as a tie-break, never checked.
- **Different portion = different item**, always. Product edits apply to the same MRN + portion only.

## 4. Product database (projections)

Existing database, extended. Week start is Sunday; day masks use bit 0 = Sunday.

### 4.1 Hierarchy

```sql
concepts         (id uuid pk, name)
companies        (id uuid pk, name)
company_concepts (company_id fk, concept_id fk, pk (company_id, concept_id))
stores           (id uuid pk, company_id fk, name, sap_code, venue, timezone, settings jsonb)
```

### 4.2 Products and their sources

```sql
products (
  id uuid pk,
  primary_kind text check (primary_kind in ('webtrition','pos','manual')),
  owner_level text check (owner_level in ('concept','company')),
  owner_id uuid,                                  -- concept for pos-primary, else company
  name_key text,                                  -- normalized name, for the name check
  origin_store_id uuid,                           -- where it was first made or changed (info only)
  updated_at timestamptz
)
create unique index on products (owner_id, name_key) where primary_kind <> 'webtrition';

source_attribute_maps (                            -- one map per source type; swap POS = other map
  source_system int, source_field text,
  attribute text,                                 -- WAND attribute: name, price, calories, allergens…
  transform text,                                 -- optional: cents→dollars, code→icon…
  priority int,                                   -- default rank for this attribute vs other sources
  pk (source_system, source_field)
)

product_links (                                    -- the sources a projection sits on
  id uuid pk, product_id fk,
  role text check (role in ('primary','secondary')),
  target text check (target in ('api','product')),
  source_system int,
  external_id text,                               -- POS item id, or 'mrn|portion' for Webtrition
  linked_product_id uuid,                         -- target 'product': a Webtrition product linked
                                                  -- to a retail product (or the other way)
  scope_level text, scope_id uuid,                -- where the link applies (a store's POS…)
  priority_overrides jsonb,                       -- per attribute, when this link beats the default
  linked_at timestamptz, unlinked_at timestamptz  -- relink on POS change; history kept
)
create unique index on product_links (source_system, external_id, scope_id) where unlinked_at is null;
create unique index on product_links (product_id) where role = 'primary' and unlinked_at is null;

product_source_values (                            -- harvested by the ETL, already mapped
  link_id fk, values jsonb,                       -- WAND attribute names only
  source_hash text, harvested_at timestamptz,
  pk (link_id)
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

For a product at a store, for each attribute, the first that has a value wins:

1. **Local override**, most specific level first: store → company → concept (only levels at or below
   the owner). A one-week override in the scheduling system sits above all of these for that week.
2. **Mapped source value**: from the linked sources that map this attribute, the highest priority
   (link `priority_overrides`, else `source_attribute_maps.priority`). Example: price from Agilysys
   beats Webtrition's price; allergens come from Webtrition because the POS doesn't map them.
   For a Webtrition source, the **day's menu item** value (from the snapshot, at resolve time) beats the
   harvested product-level value.
3. Nothing: an unmapped attribute with no override is empty.

Rules:
- A **higher-level edit wins**: saving at a level clears the same attribute at every level below it
  (and in future week overrides). Brand managers edit at the concept or above; the company edits its
  Webtrition and custom products. Stores have no say.
- **Changing POS:** close the old link, open one to the new source system. Its attribute map applies;
  overrides are untouched. No new product.
- **Becoming a projection:** editing an untouched source item creates the product with a primary link
  to it, then saves the edit as an override. Same for a POS item first used in WAND.
- **Name check:** unique `name_key` within the owner, plus a search of `source_item_index` names
  before creating anything by hand.

### 4.4 Shared helpers

```sql
source_item_index (                                -- identity + seen pattern, for search; no nutrition
  company_id fk, source_system int, mrn text, portion text,
  name text, last_station_id int, last_meal_period_id int,
  dow_mask smallint, last_seen date,
  pk (company_id, source_system, mrn, portion)
)

catalog_terms (                                    -- quick-add chips: concept (retail) / company
  owner_level text, owner_id uuid,
  kind text check (kind in ('ingredient','allergen','icon')),
  term text, seen_count int, last_seen date, from_source bool,
  pk (owner_id, kind, term)
)

product_categories     (id uuid pk, owner_level text, owner_id uuid, name, sort)
product_category_items (category_id fk, product_id fk, sort int, pk (category_id, product_id))
```

`source_item_index` lets search show items **not on the menu this week** as prominently as available
ones. Rows not seen in ~6 months age out.

## 5. ETL server

An always-on service with source adapters. It's the only thing that calls Webtrition or a POS.

| Endpoint | Used by | Does |
|---|---|---|
| `GET /source-menu?store&week[&mealPeriod&station]` | Scheduling (autofill, search) | Webtrition menu items for the week from the snapshot, in the sort standard |
| `POST /validate {store, week, items}` | Scheduling (opening a week, adding an item) | Per item per day: available / not in source / closed, the bound Webtrition menu item id, that day's values; POS availability where mapped |
| `POST /harvest {product_id \| store}` | Product DB (on link or edit), schedule | Fetch linked sources, map, write `product_source_values`; feed `source_item_index` and `catalog_terms` |
| `POST /relink` | Product DB (POS change) | Find the item in the new source, open the new link, harvest |

**Webtrition snapshot (this week + next).** One wds call per store per week (POST `/client/wds`,
`Days=7`, `allergenMenu: "all"` or Retail Allergen menus come back empty). Served from the snapshot if
under ~15 minutes old, else refreshed; if Webtrition fails, the old snapshot is served marked `stale`.
WAND's wds route doesn't cache items, so this snapshot is the cache.

```sql
source_menu_snapshots (id, store_id, source_system, week_start, fetched_at, status, payload_hash,
                       unique (store_id, source_system, week_start))
source_menu_items (snapshot_id fk on delete cascade, menu_item_id int, service_date date,
                   meal_period_id int, station_id int, mrn text, portion text, source_sort int,
                   name text, price text, attrs jsonb,
                   pk (snapshot_id, service_date, menu_item_id))
create index on source_menu_items (snapshot_id, mrn, portion, meal_period_id);
```

**Background work (event-driven or scheduled, never blocking a person):**
- harvest when a product is linked, relinked or created from a source item;
- nightly: refresh this + next week's snapshot for every store with targets, harvest changed sources
  (POS prices), and emit **product changed** events;
- Saturday night rollover: next week becomes this week, load the new next week.

Airflow is fine for the nightly batch only. Anything a person waits on is a direct call to this service.

## 6. Scheduling + validation (new)

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
  product_id uuid,                                -- projection, when there is one
  mrn text, portion text, meal_period_id int,     -- Webtrition fingerprint (untouched items)
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
  source_status text,                             -- ok | stale
  pk (target_id, service_date, daypart_id)
)
```

- No Webtrition menu item ids on week items: one item with a day mask binds to up to 7 (one per day)
  at resolve time; bindings go in `resolved_menus`. That's how a copied week finds next week's items.
- Converting the Default Week, copying or recurring: new `menu_weeks` row, rules and items copied with
  new ids and `origin_item_id`.
- `resolved_menus` is held for this week + next. Devices, signage, the AIMS push and the API read only
  this; the hash decides whether to push.

### 6.3 Sort and frozen order

Until a day has been shown: pinned `position`, then source `sortOrder`, then Webtrition menu item id
(category fill: category order, then name). Custom items without a source sort after source items.

Once a day has been sent to a target, `menu_order_locks` holds its order. Later items go to the end,
and only take a showing position when they're the only item that could show there. Reordering by hand
writes a new lock.

## 7. Flows

### Opening a week (UI view or API request)

1. Find the week; if missing, copy the matching recurring week, else the Default Week (new ids).
2. Ask the ETL: `GET /source-menu` for autofill and `POST /validate` for the week's items (Webtrition
   targets; retail targets validate POS availability only, if mapped).
3. Resolve each day/daypart: autofill + week items (matched by fingerprint or product id), drop hidden,
   place pins, apply the order lock, then values per section 4.3 with this week's overrides on top.
4. Write `resolved_menus` for this/next week; the first send of a day writes its lock.

Unedited weeks follow their origin: a Default Week (or recurring week) change re-copies this week and
every future unedited week from **today**, rebuilds and pushes in the same request. Past days never
change.

### Adding an item

- **From the Webtrition week:** stores the fingerprint; each portion is its own item, so picking the
  item picks the portion.
- **From the product database:** validated by the ETL against that day's Webtrition items by MRN +
  portion + meal period (station ignored). No match is allowed, shown as "Not on the source menu Tue".
- **Custom quick add:** name check, chips from `catalog_terms`, creates a company product (projection
  with no source) in the product database.
- Once a day has been shown, a new item lands at the end.

### Product changes

The product database saves the override at the editor's level, clears it below, and emits **product
changed** (product id, attributes, levels). Scheduling clears the same attributes from future week
overrides for the stores under that level and rebuilds their `resolved_menus`. Harvested source
changes (a new POS price) emit the same event.

### Retention (nightly)

Delete weeks older than 8 weeks (Default Week kept), snapshots older than this week, resolved menus and
locks older than today; age out `source_item_index` and `catalog_terms` rows unseen for ~6 months.

## 8. In the playground

The playground can play all three roles in one Supabase project:

- **Schemas:** `product` (section 4) and `schedule` (section 6), so the boundary is real even in one
  database. Scheduling reads products through a view or RPC, not by joining product tables directly.
- **ETL:** `supabase/functions/populate-menu-data` becomes the ETL function (`source-menu`, `validate`,
  `harvest`) and owns `source_menu_snapshots` / `source_menu_items`.
- **Events:** a table trigger + `pg_notify` (or a webhook) for product changed.

Migration:
1. Add hierarchy, `menu_targets` (one per demo device; `device_names` folds in).
2. Products: one per changed MRN + portion (portion `''` until the sync sends it), from
   `product_local_values`, `product_display_names`, `product_dayparts` and the `converge-custom` rows;
   primary links to their MRN.
3. Weeks: from `device_week_schedules` / `device_schedule_items`, collapsing per-day rows and
   `label_day_settings` into `on_mask` / `off_mask`.
4. Point the sync at the snapshot tables (this + next week), store `portion`, `id`, `sortOrder`; feed
   `source_item_index` and `catalog_terms`.
5. Move week resolution from `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the scheduling
   function so the UI and API resolve the same way; the UI keeps a projection for optimistic edits.
6. Drop `menu_items`, `product_availability` and the folded tables.

## 9. Decisions (2026-11-24)

1. Match on MRN + portion + meal period for the date; station isn't checked.
2. Product edits apply to the same MRN **and** portion only; each portion is its own product.
3. Order freezes once a day is shown; new items go to the end.
4. Values inherit down; higher-level edits win; brand managers edit at the concept or above; stores
   have no say.
5. Retail-primary products are concept projections; Webtrition and custom products bubble up to the
   company only.
6. Source data always flows in for mapped attributes unless overridden; each POS has an attribute map,
   so the POS can be changed.
7. A product can link to several sources; Webtrition is usually primary with price from the POS. A
   Webtrition product can link to a retail product.
8. Any changed item becomes a projection.
9. Default Week changes apply instantly. Retail targets fill by category or by hand; signage zones
   need category fill and report their own capacity and overflow rules.
10. Scheduling + validation is a separate system from the product database; the ETL server makes the
    source calls, validates, and harvests into the product database.

## 10. Still open

1. **Harvest scope:** harvest only products that are projections (plus the search index), or every
   Webtrition item a company has served?
2. **Product DB access:** does scheduling read the product database through an API, or share Postgres
   with read-only views? (Playground: views; production: probably an API with a cache.)
3. **Product-to-product links:** when a Webtrition product links to a retail product, which attributes
   flow from the retail one? This draft treats the linked product like a source with its own
   attribute map and priority.
