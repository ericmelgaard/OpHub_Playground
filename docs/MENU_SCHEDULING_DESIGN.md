# Menu Scheduling Design

| | |
|---|---|
| **Status** | **Proposed — awaiting approval.** No build work starts until this is approved. |
| **Version** | 1.5 · 2026-11-25 |
| **Owner** | Eric Melgaard |
| **Scope** | Infrastructure, table schema and the logic that populates menu schedules on smart labels and signage menu zones |
| **Source of truth** | This file (`docs/MENU_SCHEDULING_DESIGN.md`). Any review page is a copy of it. Change this file first, add a row to the change log, then rebuild. |

**How to use this document.** Each part of the build should point back to a section here: the
tables in §7–9, retention in §10, the flows in §11 (`F1`–`F13`), the APIs in §12. Decisions have IDs
(`D1`–`D44`, §14). Start with §4: it explains the life of a menu item, which everything else serves. If
code and this document disagree, this document wins until it's changed on purpose.

## 1. Goals and non-goals

**Goals**

- Schedule what each smart label and signage menu zone shows, by daypart, day and week, from a
  Default Week plus week overrides.
- Support two kinds of menu with one model:
  - **Webtrition menus**: scheduled at the site on a menu cycle (usually 4 weeks). Webtrition is the
    system of record for those items. WAND adds site and company enrichment, validates items against
    the day's menu, and places them in the right positions.
  - **Retail menus**: relatively static. The WAND product database is the system of record. Items are
    seeded at the concept and linked to any number of POS APIs.
- **For Webtrition, schedule against the validation response.** What can be scheduled on a date is
  what Webtrition has on the menu for that date. The product database enriches it and keeps a
  placement's identity across dates (§4).
- Keep every store working when a source (Webtrition, a POS) is down.
- Hold only the data the schedule needs, for as long as it needs it (§10).
- Nothing slow in front of the UI.

**Non-goals**

- How attributes display on labels or signage (out of stock, badges, colors). Out of stock is just an
  attribute here.
- Rebuilding Webtrition's recipe, menu or cycle systems.
- The existing playground product tables. The product database can be built new.

## 2. Architecture

Three systems with separate responsibilities.

```mermaid
flowchart TB
  subgraph Sources
    W[Webtrition wds<br/>+ menu templates]
    P[POS / retail APIs<br/>full catalog each pull]
  end
  E[ETL server<br/>always on]
  PD[(Product database<br/>projections, links,<br/>overrides, location products)]
  S[(Scheduling + validation<br/>targets, weeks, items,<br/>resolved menus)]
  D[Labels via AIMS<br/>signage players<br/>public API]
  W --> E
  P --> E
  E -- service request API --> PD
  S -- validate, source menu --> E
  S -- service request API --> PD
  PD -- product.changed --> S
  S -- resolved menus --> D
```

| System | Owns | Never does |
|---|---|---|
| **ETL server** | Every call to a source. Attribute maps. The Webtrition validation cache (this week and next). POS staging catalogs. Creating and refreshing projections. | Store schedules or local overrides |
| **Product database** | What an item *is*: projections, source links, harvested values, overrides at concept / company / store, and each store's always-available product set (`location_products`). Reached only through its **service request API**. | Know which day or target an item is on |
| **Scheduling + validation** | Where and when an item shows: targets, Default Week, weeks, placements, menu item links, order locks, resolved menus. For Webtrition targets it works from the **validation response first**. | Call a source directly, or store product attributes beyond a one-week override |

## 3. Infrastructure choices

| # | Choice | Why | Rejected |
|---|---|---|---|
| I1 | **Three separate systems** (ETL, product DB, scheduling) | The product database serves many APIs and locations beyond menus. Scheduling only places items. Source calls stay in one place. | One combined menu service: mixes the system of record with placement, and source outages leak into the UI |
| I2 | **ETL is an always-on service** answering direct calls. Background work runs on workers or a nightly job. | Rule: no slow DAGs in front of a UI. `validate` and `source-menu` are called while a person waits. | Airflow DAGs on the request path. Airflow is allowed only for the nightly batch. |
| I3 | **Day-level validation cache in the ETL** (`source_menu_days`): 1-day pulls for here-and-now validation, 7-day pulls for planning | Freshness is per day; today can be re-validated every 15 minutes without re-pulling the week. WAND's wds route never caches items, so this *is* the cache, and it keeps a stale copy when a source is down. | Week snapshots only. Calling the source per request. Keeping dated Webtrition items long. |
| I4 | **Product database behind a service request API** | Many callers (scheduling, ETL, other apps). Lets the product DB change inside without breaking callers. | Shared tables joined directly by scheduling |
| I5 | **`location_products`: a resolved product set per store**, rebuilt on change | Enrichment for every item, the primary list for retail, and the fallback when Webtrition can't answer. A store works when sources are down. | Resolving through the source chain on every read |
| I11 | **Webtrition scheduling reads the validation response first** (§4) | Webtrition is the system of record for what is on a menu on a date; WAND schedules and validates against that | Scheduling from the product database and only checking against Webtrition afterwards |
| I12 | **Placements store identity, links are made per date** (`menu_item_links`) | Menu item ids change every day; a placement must survive until its date's menu item exists, and keep a visible record of what it matched | Storing a menu item id on the placement; keeping matches only inside cached menus |
| I14 | **A compact record of what was shown** (`shown_menus`) for past days | Past days never change and must be answerable ("what did the label show last Tuesday?") even after products are renamed or repriced | Rebuilding past days from today's product data |
| I15 | **Every date is readable by UI and API the same way** (§5.6) | An endpoint asking for a future date must get the same answer the UI shows | API reading only the cached window |
| I13 | **Dated rows stay slim; detail is stored once per product**; date-keyed tables are partitioned by date | Keeps the cache about 10x smaller (§10) and makes retention a partition drop | Nutrition and allergens copied onto every dated row |
| I6 | **Resolved menus cached** for this week and next, with a hash | Devices, signage, the AIMS push and the public API read only this. The hash decides whether to push. | Resolving on every device request |
| I7 | **Events, not polling**, between systems (`product.changed`) | Product and price changes reach menus right away without scans | Nightly reconciliation only |
| I9 | **Sync policies in data** + an always-on **policy scheduler** with a priority queue, per-source rate limiter and single-flight (§5) | Sources differ and change (Webtrition every 15 min, PAR once a day). A POS rule change is a row change. Forced and UI requests jump the queue but still respect source limits. | Fixed cron per source; hard-coded intervals |
| I10 | **Change feed + webhooks + ETag polling** for endpoints (§5.5) | Validated changes during the day reach labels and signage automatically, by push or cheap poll | Endpoints re-pulling whole menus on a timer |
| I8 | **Postgres** for all three. Playground: one Supabase project with schemas `product`, `etl`, `schedule`. | Matches today's stack. Schemas keep the boundaries real. | Separate databases in the playground |

**Where it runs**

| Piece | Production | Playground |
|---|---|---|
| ETL server | WAND service (always on) + workers | Supabase edge function (`populate-menu-data` grows into it) + `pg_cron` |
| Product database + service request API | WAND service on Postgres | `product` schema + RPC functions standing in for the API |
| Scheduling + validation | WAND service on Postgres | `schedule` schema + edge function |
| Events | Queue or webhook | Trigger + `pg_notify` |
| Policy scheduler, queue, rate limiter | ETL workers (always on) | `pg_cron` every minute reading `source_sync_status.next_due_at` + a jobs table |
| Change feed dispatch (webhooks) | Worker with retries | Edge function on a `pg_cron` tick |
| Nightly / rollover / retention | Scheduled job (Airflow allowed here) | `pg_cron` |

**Why not Airflow for the core.** Airflow is a batch orchestrator. Most of this system is a person or a
device asking for an answer in seconds (validate today, fetch an uncached week, force a refresh), and an
Airflow run takes seconds to minutes to start and returns nothing to the caller. Validating every store
every 15 minutes is about 96 tiny runs per store per day, which Airflow's scheduler isn't built for.
Per-source rules (PAR once a day, forced pulls that still respect quotas, single-flight) don't map onto
pools and priority weights, and policies that change at runtime fight DAGs defined in code. The core
runs on an always-on service with a durable job queue (Postgres-backed such as pg-boss or Graphile
Worker, or SQS / Redis). Airflow is acceptable only for the light scheduled batch: the daily template
check, seeding, the Saturday rollover and retention.

## 4. Life of a menu item

This section is the core of the design for Webtrition targets: what the scheduler sees for a date,
when a scheduled item becomes a real menu item, and how the link holds while it does.

### 4.1 Who answers "what is on the menu"

| Target | Primary input for a date | Product database role |
|---|---|---|
| **Webtrition** | The **validation response**: that date's Webtrition menu items, from the ETL (§5) | Enrichment (site and company values, translations, POS price), the identity that carries a placement across dates, and the fallback when there's no response for the date |
| **Retail** | The product database (`location_products`, categories) | Primary |

So for a Webtrition label, the items offered for Tuesday lunch are the menu items Webtrition has for
that Tuesday and meal period, shown with their WAND values. Searching the product database adds
anything else, shown as not on that day's menu.

### 4.2 Three kinds of item in a schedule

| Kind | What it is | Stored where |
|---|---|---|
| **Menu item** | Webtrition's item for one date, meal period and station (`menu_item_id`) | ETL day cache, short-lived (§10) |
| **Placement** | "This product, at this meal period, on this target's daypart page, on these days" | `menu_week_items`; never holds a menu item id |
| **Menu item link** | A placement matched to a menu item on one date, with its state | `menu_item_links`, one row per placement per date |

### 4.3 States of a placement on a date

```mermaid
stateDiagram-v2
  [*] --> planned: scheduled on a date with no response yet
  planned --> linked: date's menu items arrive and match
  planned --> missing: date's menu items arrive, no match
  linked --> missing: item removed, or portion / meal period changed
  missing --> linked: item comes back
  linked --> linked: re-validated (new menu_item_id if Webtrition changed it)
```

| Link state | Meaning |
|---|---|
| `planned` | Scheduled on a date Webtrition hasn't answered for yet: past the active template's end, or not fetched. Offered from the seeded cycle (the product's usual days and meal periods). Not a menu item yet. |
| `linked` | Matched by MRN + portion + meal period to that date's menu item, bound to its `menu_item_id` |
| `missing` | Webtrition answered for the date and has no match |

Each link also carries its freshness from §5.3 (`validated`, `stale`, `unvalidated`, `limited`), taken
from when that date was last fetched.

### 4.4 How the link stays in place

- A placement holds the product (which carries MRN + portion) and the meal period. It never holds a
  menu item id, because those are per date.
- Every time a date's menu items are fetched (opening the week, a forced refresh, here-and-now
  validation, the date entering this week or next), each placement on that date is matched again and
  its `menu_item_links` row is written.
- `planned` becomes `linked` by itself when the date's menu items arrive. Nobody re-adds anything.
- One placement links to a different `menu_item_id` on each day of the week.
- The Default Week is **followed by reference**: weeks that follow it hold no copies. Copying a week and
  recurring copy **placements** (new ids), never links. Links are always made for the actual dates.
- If Webtrition replaces the item (a different portion is a different item), that date becomes
  `missing`. A person picks the replacement, which is a new placement.
- On the day, an Auto placement that's `missing` doesn't show (it follows the source); one forced On
  still shows, flagged.

### 4.5 Example: Chicken Tenders, three weeks out

1. **Seed.** The cycle seed made a projection for MRN 13404, portion "1 each". The store's product set
   knows it's usually served at lunch, Monday to Friday.
2. **Plan.** On Nov 25 a manager opens the week of Dec 13. Nothing is cached, so the scheduler asks the
   ETL for Dec 13–19 (an on-demand pull, §5.1). Webtrition has published those dates, so the lunch list
   is that response. The manager adds Chicken Tenders to the Grill label's lunch page for Tuesday. A
   placement is stored; its Dec 15 link is `linked` to that day's menu item. The fetched days are
   dropped from the cache once stale; the placement and link stay.
   - If Webtrition hadn't published Dec 13–19 yet, the list would come from the seeded cycle and the
     link would be `planned`.
3. **Approach.** When the week of Dec 13 becomes next week, opening it re-fetches the dates and
   re-matches. The link updates if Webtrition changed the menu item id.
4. **The day.** On Dec 15 here-and-now validation runs every 15 minutes. The link stays `linked` and
   `validated`; the label shows the item. If Webtrition removes it at 11:00, the link turns `missing`,
   the resolved menu changes, the change feed records it and the label updates.
5. **After.** The placement and its links are kept with the schedule for 8 weeks, then purged (§10).

### 4.6 How a weekly menu is stored: Webtrition and custom items together

A week holds only *placements*: which product goes where, on which days. Names, prices and nutrition
are never copied into a week, so every read gets current values, and a week stays small.

**Example:** the Grill Station label's lunch page for the week of Dec 13 holds a Webtrition item and a
custom item.

| Row | Table | Holds | Size |
|---|---|---|---|
| The week | `menu_weeks` | target, `week_start = 2026-12-13`, origin (Default Week / copy / recurring), `edited` | ~150 B |
| Chicken Tenders placement | `menu_week_items` | product id (company projection for MRN 13404, portion "1 each"), meal period Lunch, station Grill, `on_mask` / `off_mask` (Auto = follow Webtrition), sort keys, any this-week override | ~300 B |
| Chicken Tenders, Tue Dec 15 | `menu_item_links` | `linked`, menu item id for that date, when the date was fetched | ~80 B |
| Soup of the Day placement | `menu_week_items` | product id (company custom projection), no meal period, days Mon–Fri forced On | ~300 B |
| Soup of the Day links | none | Custom and retail items have no source dates, so no links; always available | 0 |

- **Values at read time.** Chicken Tenders gets its name and price from that day's Webtrition menu item
  (validation response), then the company and store values from the product database, then any
  this-week override. Soup of the Day gets everything from the product database. A retail item works the
  same way, with its POS price harvested per the POS sync policy.
- **Default Week** placements are stored once under the target's Default Week row, with day masks and
  no dates. Weeks that follow the Default Week have **no row and no copies**; reading any date in them
  resolves straight from these placements (§4.7). A retail menu that never changes is one set of
  placements, kept forever.
- **Size:** a target's page is a few kilobytes a week; 50 targets is about 1 MB a week of placements,
  plus links for Webtrition placements only (§10.2).
- **Updates:** because only identities are stored, a product edit or a new validation result changes
  what every week shows the next time it's resolved: at once for today through next week (events), and
  on access for later weeks (§5.6). Past days are read from what was shown (§9, `shown_menus`).
- **Days that follow another meal period.** A placement can follow a different Webtrition meal period
  than its page (`follows_meal_period_id`): a Brunch item on the Breakfast page shows on the days Brunch
  offers it.
- **Hidden autofill items.** Removing an autofilled item stores a placement with `state = 'hidden'`, so
  autofill doesn't bring it back that week.

### 4.7 Which placements apply to a date: Default Week, recurring and edited weeks

For a target and a date, the scheduler takes the first that exists:

1. **The week's own schedule**: a `menu_weeks` row for that week (`kind = 'week'`). It exists only
   when someone edited that week (an Override), copied or pasted into it, or a recurring week was
   applied to it.
2. **A recurring week that lands on it**: a week marked to repeat every N weeks from its start date,
   until its optional end date. On first access to a week it lands on, its placements are copied into a
   new week row for that week (new items for the new week, per the original requirement), with
   `origin = 'recurring'` and `edited = false`.
3. **The Default Week**, by reference. No row, no copies.

| | Default Week | A week set to repeat |
|---|---|---|
| What it is | The base for any week with no schedule of its own | A real, dated week that repeats every N weeks from its start date, until an optional end date |
| Dates | None; days of the week only | Starts on a date; can alternate (every 2 weeks, a rotation) |
| Its items | Special items, stored once | Each occurrence gets new items for its week (copied on first access) |
| Later edits to the original | Apply at once to every week that follows it | Reach occurrences that are still unedited (`edited = false`) |
| Precedence | Lowest: used when nothing else applies | Beats the Default Week on the weeks it lands on |
| Best for | A menu that basically never changes (a retail brand) | Rotations, or "from Jan 4, every week is this" while the Default Week stays the fallback |

Editing a week that follows the Default Week creates its row and copies the Default Week's placements
into it, then applies the edit; from then on it's an Override and stops following the Default Week.

## 5. Freshness and sync strategy

This is the core of the system: how single-day validation, UI requests for uncached dates, forced
refreshes and source limits fit together, and how validated changes reach endpoints.

### 5.1 Four kinds of data request

| Request | Example | Granularity | Served from | Speed target |
|---|---|---|---|---|
| **Here and now** (validation) | Is today's lunch still right? | **1 day** (today; tomorrow near close) | Source, on the store's sync policy (Webtrition about every 15 min) | Background; endpoints never wait |
| **Planning** (this week, next week) | Opening next week in the UI | 7 days per call | Day cache, refreshed when opened if older than its max age | Cache: instant |
| **Future, not cached** | Opening a week 3 weeks out | The requested days | Source on demand, single-flight; kept briefly | One source call (seconds); UI shows a loading state, falls back to projections |
| **Force fresh** | "Refresh now" in the UI, or an operator call | The requested days | Source now, bypassing the cache, **if the source policy allows it** | One source call; if not allowed, answer with the last sync time and when the next is allowed |

Seeding a cycle (F1) is a fifth, bulk kind, and it runs only **at setup and when Webtrition activates a
new menu template**. After the first seed, keeping seed data current matters little: menu item
validation (here and now, plus UI interaction) catches nearly every change, and a person can update a
single projection on demand (F9b) when they need to see a recipe change.

### 5.2 Sync policy per source and store

Every source and store has a policy, because sources differ and change (Webtrition can be pulled every
few minutes; PAR POS allows one sync a day; a POS may raise or lower its limits).

| Setting | Meaning | Webtrition | PAR POS (example) |
|---|---|---|---|
| `validate_every` | How often "here and now" runs | 15 min | 1 day |
| `validate_days` | Days each validation pulls | 1 (today) | full catalog |
| `max_age` | Older than this, data counts as **stale** | 30 min | 26 h |
| `min_interval` | Shortest gap the source allows between pulls | none | 24 h |
| `daily_quota` | Pulls per day the source allows | none | 1 |
| `force_allowed` | Can a person force a pull | yes | only if quota left |
| `window` | Hours when validation runs (store hours plus lead time) | open − 1 h to close | overnight |

Policies live in data (`source_sync_policies`, §8), so a POS rule change is a row change, not a deploy.
Attributes that need faster change detection (out of stock) can only be as fresh as the source allows;
the policy states that honestly.

### 5.3 Validation states

Every resolved item carries how trustworthy its data is:

| State | Meaning | Shown and used? |
|---|---|---|
| `validated` | Source data younger than `max_age` | Yes |
| `stale` | Source data older than `max_age` (source down, quota used) | Yes, flagged; validation keeps retrying per policy |
| `unvalidated` | No source data for that day yet (future date not fetched, new store) | Yes, from `location_products`; flagged. The link state is `planned` (§4.3) |
| `limited` | A forced refresh was refused by the source policy | Yes; the UI says when the next pull is allowed |

Rule: **endpoints always get something.** A source outage downgrades the state, never empties a menu.
Validation still runs on its requirement and upgrades the state when the source returns.

### 5.4 Patterns

- **Day-level cache.** Source data is cached per store, source and service date (`source_menu_days`).
  A 1-day validation replaces one day; a week load writes seven. Each day row has its own `fetched_at`,
  so freshness is per day.
- **Policy scheduler.** An always-on worker keeps `next_due_at` per store and source, and queues
  validation when due (inside the window, outside the quota limits). No DAGs.
- **Priority queue.** Order: forced (a person is waiting) → UI open of an uncached date → here-and-now
  validation → planning warm-up → seeding. A per-source rate limiter enforces `min_interval` and
  `daily_quota` for every job, forced ones included.
- **Single-flight.** Concurrent requests for the same store, source and day share one source call.
- **Stale-while-revalidate.** Reads return the cache at once with its state; if it's past `max_age`, a
  refresh is queued. Only force-fresh and uncached-date requests wait for the source, with a timeout
  that falls back to `stale` / `unvalidated`.
- **Short-lived future days.** Days fetched for a future week stay cached until they're older than
  `max_age` or fall outside this week and next; then they're dropped. Webtrition days are never kept
  long.
- **Change detection by hash.** Each day row stores a payload hash. Same hash: only `fetched_at`
  moves. Different hash: upsert projections, rebuild `location_products`, emit `product.changed` /
  `menu.source_changed`, and re-resolve affected menus.

How a request for source data is answered:

```mermaid
flowchart TD
  R[Request for a store, source and days] --> M{Mode}
  M -- cached --> C{Day in cache?}
  C -- yes, fresh --> V[Return: validated]
  C -- yes, past max age --> S[Return: stale<br/>queue warm job]
  C -- no --> U[Queue ui_uncached job<br/>wait up to ~5 s]
  U -- done in time --> V
  U -- timeout or failure --> N[Return: unvalidated<br/>from location products]
  M -- fresh --> F{Policy allows a pull now?}
  F -- yes --> P[Run force job first<br/>single-flight] --> V
  F -- no --> L[Return: limited<br/>last ok + next allowed]
```

### 5.5 Getting changes to endpoints

Validated changes must reach labels, signage and other endpoints automatically, ad hoc, during the day.

1. A re-resolve (F6) that produces a new hash for a target / day / daypart writes a row to
   **`menu_change_feed`** (a sequence number, target, date, daypart, hash).
2. **Push:** a dispatcher sends each change to subscribed webhooks (`endpoint_subscriptions`), with
   retries and backoff. The AIMS push is one such subscriber.
3. **Poll:** endpoints that poll call `GET /menus?target&date&daypart` with `If-None-Match` (the hash
   as ETag) and get `304` when nothing changed, or `GET /changes?since=<seq>` for everything since
   their last sequence.
4. Only today's changes are pushed during the day; future-day changes are delivered when they enter
   the push window (or by poll).

### 5.6 What refreshes when a menu is viewed or read by API

The UI and the API get the same answer for the same date. What happens depends on the date:

| Date | Viewed in the UI | Read by API (`GET /menus`, `GET /targets/{id}/weeks/…`) | Stored |
|---|---|---|---|
| **Past days** | Read-only, from `shown_menus` (what was actually sent), with placements and links for context | Same, from `shown_menus` | `shown_menus`, placements and links for 8 weeks |
| **Today** | Cached menu; validated every 15 min (policy) in the background; changes pushed as they happen | Cached menu with ETag / `304`; freshness state per item | `resolved_menus` |
| **Rest of this week and next week** | Cached menu at once; if the dates are past `max_age`, a refresh is queued and the view updates when it lands | Same as the UI: cache at once, refresh queued if stale, freshness state per item | `resolved_menus` |
| **Further out** | Dates pulled on demand (short wait), then resolved | **Resolved on demand** like the UI (F13); not stored as a cached menu | Placements and links only; pulled days dropped once past `max_age` |
| **Any date, forced** | "Refresh now": pull now if the policy allows, else `limited` | `POST /refresh` then read | As above |

- **Custom and retail items** need no source pull: they resolve from the product database on every
  read, so they're always current. Their product edits reach today through next week right away
  (`product.changed`) and later weeks on access.
- **Mixed pages** resolve both kinds together; a slow Webtrition pull never blocks custom items (they
  resolve at once; Webtrition items fall back to `stale` / `unvalidated` if the pull times out).

## 6. Concepts and identities

| Term | Meaning |
|---|---|
| **Projection** | A WAND product over one or more linked sources plus local overrides (the DoorDash / Grubhub model). Every item on a menu is a projection. |
| **Link** | A projection's connection to a source item, in priority order (1 = primary). |
| **Attribute map** | Per source type: which source field fills which WAND attribute. Changing POS means using another map, not changing products. |
| **Location products** | A store's full, resolved product set. Always available. |
| **Target** | Something that shows a menu: a smart label or a signage menu zone. |
| **Default Week** | A target's base week. Days of the week only, no dates. |
| **Week** | A target's schedule for one real week (Sunday to Saturday). It follows the Default Week until someone edits it. |
| **Validation cache** | Dated Webtrition menu items, held by the ETL per day (§5, §10) |
| **Validation response** | What the ETL returns for a store and dates: that day's menu items and their freshness. For Webtrition it is what the scheduler works from (§4) |
| **Placement** | A product placed on a target's daypart page for some days (`menu_week_items`) |
| **Menu item link** | A placement matched to one date's menu item, with a link state (§4.3) |
| **Staging catalog** | What a POS sends that no one has mapped yet |
| **Lab store** | A store a concept uses to set up and map POS catalogs |

| Thing | Identity | Lives in |
|---|---|---|
| Webtrition menu item (one day) | Webtrition `id`, unique per date × meal period × station | Validation cache only |
| Webtrition item across days | **Fingerprint** `(mrn, portion, meal_period)` | Placements; matched per date into `menu_item_links` |
| Webtrition projection | `(company, mrn, portion)` | Product database |
| POS item | `(source_system, external_id)`; ids are **global across a concept** | Staging catalog, concept maps, links |
| Retail projection | `product_id`, owned by the concept | Product database |

- **Station is not part of the match.** People add an item from the right station. Station is saved for
  sorting and as a tie-break, never checked.
- **A different portion is a different item.** Edits apply to the same MRN + portion only.
- An MRN is a master recipe. A Webtrition menu item can differ from its recipe (name, price, portion).

## 7. Data model: product database

Postgres. All tables have `created_at` / `updated_at` unless shown otherwise.

### 7.1 Hierarchy

```sql
create table concepts (
  id          uuid primary key,
  name        text not null,
  settings    jsonb not null default '{}'   -- allow_location_brand_edits, allow_make_brand_item
);

create table companies (
  id    uuid primary key,
  name  text not null
);

create table company_concepts (              -- a company can run several concepts
  company_id  uuid references companies,
  concept_id  uuid references concepts,
  primary key (company_id, concept_id)
);

create table stores (
  id          uuid primary key,
  company_id  uuid not null references companies,
  name        text not null,
  timezone    text not null,
  sap_code    text, venue text,             -- Webtrition unit + location
  is_lab      boolean not null default false,  -- a lab store a concept maps from
  settings    jsonb not null default '{}'   -- openDays…
);
```

### 7.2 Projections and links

```sql
create table products (
  id           uuid primary key,
  kind         text not null check (kind in ('webtrition','retail','custom')),
  owner_level  text not null check (owner_level in ('concept','company')),
  owner_id     uuid not null,               -- concept for retail, company for webtrition / custom
  mrn          text, portion text,          -- webtrition only; portion '' when none
  name_key     text not null,               -- normalized name, for the name check
  status       text not null default 'active' check (status in ('active','inactive','retired')),
  first_seen   date, last_seen date,
  created_by   text not null,               -- 'etl', 'seed', or a user id
  check ((kind = 'retail') = (owner_level = 'concept'))
);
create unique index on products (owner_id, mrn, portion) where kind = 'webtrition';
create unique index on products (owner_id, name_key)     where kind <> 'webtrition';

create table source_attribute_maps (         -- one map per source type
  source_system  int  not null,
  source_field   text not null,
  attribute      text not null,             -- name, price, calories, allergens, out_of_stock…
  transform      text,                      -- optional: cents_to_dollars, code_to_icon…
  primary key (source_system, source_field)
);

create table product_links (
  id                 uuid primary key,
  product_id         uuid not null references products,
  priority           int  not null,         -- 1 = primary; API links use store_sources.priority when set
  target             text not null check (target in ('api','product')),
  source_system      int,
  external_id        text,                  -- POS item id, or 'mrn|portion' for Webtrition
  linked_product_id  uuid references products,  -- target 'product'
  scope_level        text check (scope_level in ('concept','company','store')),
  scope_id           uuid,
  linked_at          timestamptz not null,
  unlinked_at        timestamptz            -- closed on relink; history kept
);
create unique index on product_links (product_id, priority) where unlinked_at is null;
create unique index on product_links (source_system, external_id, scope_id) where unlinked_at is null;

create table product_source_values (         -- harvested by the ETL, already mapped
  link_id       uuid primary key references product_links,
  values        jsonb not null,             -- WAND attribute names only
  source_hash   text not null,
  harvested_at  timestamptz not null
);

create table product_values (                -- local overrides per level
  product_id  uuid references products,
  level       text check (level in ('concept','company','store')),
  level_id    uuid,
  values      jsonb not null,               -- any attribute, incl. translations {"fr-CA": {...}}
  updated_by  uuid,
  primary key (product_id, level, level_id)
);
```

### 7.3 Location products

```sql
create table location_products (             -- each store's resolved product set; always available
  store_id        uuid references stores,
  product_id      uuid references products,
  values          jsonb not null,           -- fully resolved (§11 F6 step 4, without dated values)
  sources         jsonb not null,           -- which link or level supplied each attribute
  available_days  smallint,                 -- bit 0 = Sunday; seen pattern in the current cycle
  meal_periods    int[], station_ids int[],
  version         bigint not null,
  resolved_at     timestamptz not null,
  primary key (store_id, product_id)
);
```

### 7.4 Sources, catalogs and mapping

```sql
create table store_sources (
  store_id       uuid references stores,
  source_system  int,
  active         boolean not null default false,
  priority       int not null,              -- link priority at this store; lower it to demote a POS
  create_mode    text not null check (create_mode in ('auto','seed','none')),
                 -- auto: Webtrition, a projection per new item
                 -- seed: the concept's first POS at its lab store, one-time import
                 -- none: map only
  refresh        text not null,             -- 'cycle' (Webtrition) | interval, e.g. '5 minutes'
  config         jsonb not null default '{}',  -- credentials reference, ids
  primary key (store_id, source_system)
);

create table source_catalog_items (          -- staging catalog: what a POS sends (full pull)
  store_id       uuid references stores,
  source_system  int,
  external_id    text,
  name           text,
  values         jsonb,                     -- mapped attributes
  last_seen      timestamptz, gone_at timestamptz,
  primary key (store_id, source_system, external_id)
);

create table concept_item_maps (             -- POS item → projection, once per concept
  concept_id            uuid references concepts,
  source_system         int,
  external_id           text,
  product_id            uuid not null references products,
  mapped_from_store_id  uuid references stores,
  mapped_by             uuid,
  mapped_at             timestamptz not null,
  primary key (concept_id, source_system, external_id)
);

create table concept_source_rules (          -- optional automatic import per POS
  concept_id     uuid references concepts,
  source_system  int,
  auto_import    boolean not null default false,
  primary key (concept_id, source_system)
);
```

### 7.5 Helpers

```sql
create table catalog_terms (                 -- quick-add chips
  owner_level  text, owner_id uuid,          -- concept (retail) / company
  kind         text check (kind in ('ingredient','allergen','icon')),
  term         text,
  seen_count   int, last_seen date, from_source boolean,
  primary key (owner_id, kind, term)
);

create table product_categories (
  id           uuid primary key,
  owner_level  text, owner_id uuid,
  name         text not null, sort int
);

create table product_category_items (
  category_id  uuid references product_categories,
  product_id   uuid references products,
  sort         int,
  primary key (category_id, product_id)
);
```

## 8. Data model: ETL

```sql
create table source_sync_policies (          -- per source system, overridable per store (§5.2)
  source_system   int  not null,
  store_id        uuid,                     -- null = default for the source
  validate_every  interval not null,        -- Webtrition 15 min; PAR 1 day
  validate_days   int,                      -- days per here-and-now pull (Webtrition 1); null = full catalog
  max_age         interval not null,        -- older = stale
  min_interval    interval,                 -- shortest gap the source allows
  daily_quota     int,                      -- pulls per day the source allows
  force_allowed   boolean not null default true,
  window_start    time, window_end time,    -- when here-and-now runs; null = always
  unique nulls not distinct (source_system, store_id)
);

create table source_sync_status (            -- scheduler state per store and source
  store_id        uuid,
  source_system   int,
  last_pull_at    timestamptz,
  last_ok_at      timestamptz,
  pulls_today     int not null default 0,
  next_due_at     timestamptz,
  next_allowed_at timestamptz,              -- from min_interval / quota
  last_error      text,
  primary key (store_id, source_system)
);

create table sync_jobs (                     -- the priority queue
  id             bigserial primary key,
  store_id       uuid not null,
  source_system  int  not null,
  kind           text not null check (kind in ('force','ui_uncached','validate','warm','seed')),
  priority       int  not null,             -- force 0, ui_uncached 1, validate 2, warm 3, seed 4
  date_from      date, date_to date,         -- days to pull (null = full catalog)
  requested_by   text,
  status         text not null default 'queued' check (status in ('queued','running','done','failed','refused')),
  dedupe_key     text,                      -- store|source|dates: single-flight
  created_at     timestamptz not null default now(),
  finished_at    timestamptz
);
create unique index on sync_jobs (dedupe_key) where status in ('queued','running');

create table source_menu_days (              -- day-level validation cache
  store_id       uuid not null,
  source_system  int  not null,
  service_date   date not null,
  fetched_at     timestamptz not null,
  payload_hash   text,
  status         text not null check (status in ('ok','failed')),
  primary key (store_id, source_system, service_date)
);

create table source_menu_items (             -- one dated Webtrition menu item; kept slim
  store_id            uuid not null,
  source_system       int  not null,
  service_date        date not null,
  menu_item_id        int  not null,        -- unique per date / meal period / station
  menu_collection_id  int,                  -- template it came from (F1b)
  meal_period_id      int, station_id int,
  mrn                 text, portion text,
  source_sort         int,
  name                text, price text,     -- the menu item's own values for that day
  detail_hash         text,                 -- hash of nutrition / allergens / ingredients / icons
  primary key (store_id, source_system, service_date, menu_item_id),
  foreign key (store_id, source_system, service_date) references source_menu_days on delete cascade
) partition by range (service_date);
create index on source_menu_items (store_id, service_date, mrn, portion, meal_period_id);
```

Detail (nutrition, allergens, ingredients, icons) is **not** stored on dated rows. It is stored once per
product in `product_source_values` (§7.2). When a day's `detail_hash` differs from the product's, the
ETL updates the product's harvested detail (F2). A menu item whose detail differs from its recipe still
has one detail per MRN + portion per day, which is what the hash catches.

```sql
create table source_cycles (                 -- Webtrition menu cycle per store
  store_id             uuid,
  menu_collection_id   int,
  rotation_days        int not null,        -- menu templates `duration` / cyclemenus `menuRotationPeriod`
  start_date           date, end_date date,  -- the template's active range
  next_play_date       date,
  active               boolean not null,
  detected_at          timestamptz not null, -- when WAND first saw it
  seeded_at            timestamptz,          -- null = seed still needed
  primary key (store_id, menu_collection_id)
);
```

Freshness of a day = `now() - source_menu_days.fetched_at` compared with the policy's `max_age`.

## 9. Data model: scheduling

```sql
create table dayparts (
  id                      uuid primary key,
  store_id                uuid not null,
  name                    text not null, sort int, color text,
  source_meal_period_ids  int[]             -- which Webtrition meal periods feed it
);

create table menu_targets (
  id           uuid primary key,
  store_id     uuid not null,
  kind         text not null check (kind in ('label','zone')),
  external_id  text not null,               -- AIMS label id / signage zone id
  name         text,
  menu_source  text check (menu_source in ('webtrition','retail')),  -- null = the store's
  config       jsonb not null default '{}', -- pages per daypart; zones report capacity + overflow rules
  unique (store_id, kind, external_id)
);

create table menu_weeks (                   -- default row + only weeks with their own schedule (§4.7)
  id                uuid primary key,
  target_id         uuid not null references menu_targets,
  kind              text not null check (kind in ('default','week')),
  week_start        date,                   -- null for default
  origin            text not null check (origin in ('default','copy','recurring','manual')),
  origin_week_id    uuid references menu_weeks,
  recurrence_weeks  int,                    -- set on a week that repeats every N weeks
  recurrence_end    date,                   -- optional last week it repeats
  edited            boolean not null default false,  -- true = changed after it was made (Override)
  materialized_at   timestamptz,
  check ((kind = 'default') = (week_start is null))
);
create unique index on menu_weeks (target_id) where kind = 'default';
create unique index on menu_weeks (target_id, week_start) where kind = 'week';

create table menu_autofill_rules (
  id              uuid primary key,
  week_id         uuid not null references menu_weeks on delete cascade,
  daypart_id      uuid not null references dayparts,
  kind            text not null check (kind in ('source','category')),
  station_id      int, meal_period_id int,  -- 'source': from the Webtrition week
  category_id     uuid,                     -- 'category': retail menus, signage zones
  max_items       int,                      -- or the zone's reported capacity
  sort            int
);

create table menu_week_items (
  id                      uuid primary key,
  week_id                 uuid not null references menu_weeks on delete cascade,
  daypart_id              uuid not null references dayparts,
  product_id              uuid not null,     -- always a projection
  meal_period_id          int,               -- Webtrition: with the product's MRN + portion = fingerprint
  station_id              int,               -- where it was added from; not matched
  follows_meal_period_id  int,
  state                   text not null default 'shown' check (state in ('shown','hidden')),
  on_mask                 smallint not null default 0,   -- days forced On (bit 0 = Sunday)
  off_mask                smallint not null default 0,   -- days forced Off; neither = Auto
  position                int,               -- only when pinned by hand
  source_sort             int, item_number int,   -- sort standard, frozen at creation
  overrides               jsonb not null default '{}',  -- this week only
  origin_item_id          uuid
);
create index on menu_week_items (week_id, daypart_id);
create index on menu_week_items (product_id);

create table menu_item_links (               -- a placement matched to one date's menu item (§4)
  week_item_id    uuid not null references menu_week_items on delete cascade,
  service_date    date not null,
  link_state      text not null check (link_state in ('planned','linked','missing')),
  menu_item_id    int,                       -- set when linked
  station_id      int,                       -- station of the matched menu item
  source_fetched_at timestamptz,             -- when that date was fetched (freshness)
  matched_at      timestamptz not null,
  primary key (week_item_id, service_date)
) partition by range (service_date);
create index on menu_item_links (service_date, link_state);

create table menu_order_locks (              -- frozen order once a day has been shown
  target_id     uuid,
  service_date  date,
  daypart_id    uuid,
  order_keys    text[] not null,             -- week item ids in shown order
  locked_at     timestamptz not null,
  primary key (target_id, service_date, daypart_id)
);

create table resolved_menus (                -- what devices read; this week + next
  target_id         uuid,
  service_date      date,
  daypart_id        uuid,
  items             jsonb not null,          -- ordered items, display values, link state, menu_item_id
  availability      jsonb not null,          -- per item: available | not_in_source | closed
  validation        jsonb not null,          -- per item: validated | stale | unvalidated | limited (§5.3)
  validated_at      timestamptz,             -- oldest source fetch used
  product_versions  jsonb not null,          -- location_products.version used
  hash              text not null,
  resolved_at       timestamptz not null,
  primary key (target_id, service_date, daypart_id)
);

create table shown_menus (                   -- what was actually sent, for past days (I14)
  target_id     uuid not null,
  service_date  date not null,
  daypart_id    uuid not null,
  version       int  not null,               -- 1 = first send that day; +1 per change sent
  items         jsonb not null,              -- compact: product id, display name, price, position,
                                             -- link state; no nutrition
  hash          text not null,
  sent_at       timestamptz not null,
  primary key (target_id, service_date, daypart_id, version)
) partition by range (service_date);

create table menu_change_feed (              -- every change to a resolved menu (§5.5)
  seq           bigserial primary key,
  target_id     uuid not null,
  service_date  date not null,
  daypart_id    uuid not null,
  hash          text not null,
  reason        text,                        -- source_changed | product_changed | schedule_edit | lock
  created_at    timestamptz not null default now()
);
create index on menu_change_feed (target_id, seq);

create table endpoint_subscriptions (        -- webhooks
  id           uuid primary key,
  store_id     uuid not null,
  target_id    uuid,                         -- null = every target in the store
  url          text not null,
  secret_ref   text,                         -- signing secret reference
  push_window  text not null default 'today',  -- today | this_week
  last_seq     bigint,                       -- last change delivered
  active       boolean not null default true
);
```

Retention: `menu_change_feed` keeps 7 days.

## 10. Data retention, volume and scale

### 10.1 What is kept, and for how long

| Data | Table | Kept | Why |
|---|---|---|---|
| Dated Webtrition menu items | `source_menu_items`, `source_menu_days` | Today through next week, plus days fetched for future weeks until they're past `max_age` | Validation and planning only; Webtrition is the system of record |
| POS staging catalog | `source_catalog_items` | Current catalog; gone items 30 days after `gone_at` | Mapping work and change detection |
| Products (projections) | `products`, `product_links`, `product_source_values`, `product_values` | Indefinitely; inactive after two cycles unseen (Webtrition); retired by hand | Identity across dates and APIs |
| Store product sets | `location_products` | Always current; rebuilt on change | Enrichment and fallback |
| Menu cycles | `source_cycles` | Current and next template; older 1 year | Seeding and template detection |
| Schedules | `menu_weeks`, `menu_autofill_rules`, `menu_week_items` | Default Week always; weeks from 8 weeks back to the furthest future week created | History and planning |
| Menu item links | `menu_item_links` | Same as their placements (8 weeks back) | What each placement matched, per date |
| Resolved menus | `resolved_menus` | Today through next week | What endpoints read |
| What was shown | `shown_menus` | 8 weeks, like schedules | Past days are read from it; audit |
| Order locks | `menu_order_locks` | Today only | Frozen order |
| Change feed | `menu_change_feed` | 7 days | Endpoint polling and webhook retries |
| Sync jobs and status | `sync_jobs`, `source_sync_status` | Jobs 7 days; status current | Troubleshooting |

Nothing else from a source is kept. Dated Webtrition data older than the cache window exists only as
links (which menu item a placement matched) and in what endpoints were sent.

### 10.2 Volume per store (estimate)

Assumptions, to be checked in phase 2: a large Webtrition store with about 650 menu items a day (630–690
measured), about 1,500 products (MRN + portion) per cycle, 50 targets, 4 dayparts with about 15 items a
page, and 10 weeks of schedules (8 back, this week, next week).

| Table | Rows | Size (with indexes) |
|---|---|---|
| `source_menu_items` (14 days, slim) | ~9,000 | ~3 MB |
| `product_source_values` + `location_products` | ~3,000 | ~10 MB |
| `menu_week_items` (Default Week once, plus only weeks with their own schedule) | ~3,000–30,000 | ~1–10 MB |
| `menu_item_links` (Webtrition placements × days scheduled) | up to ~200,000 | ~25 MB |
| `resolved_menus` (50 × 14 days × 4 dayparts) | ~2,800 | ~12 MB |
| `shown_menus` (50 × 56 days × 4 dayparts × ~1.5 versions, ~1 KB) | ~17,000 | ~20 MB |
| Change feed, jobs, locks, catalog | small | ~2 MB |
| **Total** | | **~80 MB per large store** |

Rough scale: 1,000 such stores is about 80 GB, most of it links, shown menus and resolved menus. Copying detail onto
every dated row instead (§8, I13) would add about 25 MB per store for the cache alone.

### 10.3 How retention runs

- Date-keyed tables (`source_menu_items`, `menu_item_links`, `resolved_menus`, `shown_menus`, `menu_change_feed`) are
  partitioned by date (weekly). Retention drops whole partitions instead of deleting rows.
- A daily job (F11) drops expired partitions, deletes past-window `source_menu_days`, deletes
  `menu_weeks` older than 8 weeks (placements and links cascade), and ages out catalog rows and terms.
- Products are never deleted by retention.

### 10.4 Scale as an enterprise service

Sizing example (assumptions, to confirm): 5,000 stores, 50 targets each (250,000 targets), most stores
on Webtrition.

| Load | Estimate | How the design handles it |
|---|---|---|
| **Webtrition validation** | 5,000 stores × 96 one-day pulls = ~480,000 wds calls a day; ~6/s on average, several times that at morning peaks. Each call takes 3–6 s, so ~100+ in flight at peak. | Validate only stores with active targets, only inside their window; one-day pulls; single-flight. **Biggest external dependency:** confirm WAND wds / Compass capacity, and consider calling Compass directly where it's faster (3.3 s vs 4–6 s measured). Lengthen `validate_every` outside meal periods if needed. |
| **Device reads** | 250,000 targets polling every minute = ~4,000 requests/s, nearly all `304` | Reads hit precomputed `resolved_menus` by hash (cacheable in Redis or at the edge); push (webhooks / AIMS) preferred so most devices don't poll |
| **Fan-out from one edit** | A company edit (a translation) over 300 stores re-resolves up to 300 × 50 targets × 14 days × 4 dayparts ≈ 840,000 menus; a concept edit can reach millions | Only menus containing that product (index product → placements); queued in batches, **today first**, then this week, then next; idempotent and coalesced (several edits to one product = one rebuild) |
| **Storage** | ~80 MB for a large store, much less for most; worst case ~400 GB for 5,000 large stores | Bounded by retention; Default Week by reference keeps schedules small; date partitions; shard by company (for example Citus) beyond a few TB |
| **AIMS push** | Daypart changes across thousands of stores at the same minute | Push only changed hashes; spread through the push queue; respect AIMS rate limits |

What makes it work at that scale:
- **The request path only reads precomputed data.** Devices and the API never wait on a source for today
  through next week.
- **Source calls are policy-driven and bounded**, per store and source, not per request.
- **Storage is bounded** by retention, slim dated rows and Default Week by reference.
- **Stateless services and horizontal workers.** Any worker can take any job; jobs carry idempotency keys.
- **Per-tenant fairness.** The queue round-robins across companies so one large tenant's fan-out can't
  starve another's validation.
- **Tenant isolation.** RLS by company and store on every table; credentials per source per store.
- **Service levels to measure:** validation lag per store (target: under `max_age`), push latency from a
  source change to the device, share of items `stale` / `unvalidated`, queue depth by priority.

## 11. Logic flows

### F1 · Seed a store (Webtrition)

Runs at setup, and again whenever a new menu template becomes active (F1b). Not on a schedule.

1. Read menu templates / `cyclemenus` for the active template's cycle length (usually 28 days), range
   and next play date. Save to `source_cycles`.
2. Pull that many days from wds (4 calls of 7 days, `allergenMenu: "all"`).
3. For each distinct MRN + portion, call `upsert-from-source`: find or create the **company**
   projection, link it at the store's priority, save the mapped values.
4. Record meal periods, stations and days seen. Rebuild `location_products`.
5. Keep this week and next as the validation cache. Set `seeded_at`.

### F1b · Detect a new menu template

1. **During validation (F2):** a pulled day contains a `menuCollectionId` not in `source_cycles` →
   record it and queue a `seed` job.
2. **Daily check:** read the store's menu templates (WAND `GET /client/templates`, cached 24 h, cheap)
   or `cyclemenus`. A template that is newly active, or about to start (`start_date` / `next_play_date`
   within the next week) → record it and queue a `seed` job so its items exist before it plays.
3. The seed (F1) runs for that template only. Older templates' projections age out on the
   two-cycle rule.

### F2 · Validate here and now (ongoing, per policy)

1. The policy scheduler finds stores where `next_due_at` has passed, inside the window, and queues a
   `validate` job (Webtrition: today only, `validate_days = 1`; near close, tomorrow too).
2. The worker checks the rate limiter (`next_allowed_at`, `daily_quota`). If not allowed, it waits; the
   data stays as is and turns `stale` once past `max_age`.
3. Pull the day(s) (wds POST, `Days=1`, `allergenMenu: "all"`). Single-flight: a job already queued for
   the same store and days is reused.
4. Compare the payload hash with `source_menu_days`:
   - **same:** update `fetched_at` only (now `validated`);
   - **different:** replace the day's items, upsert any new MRN + portion as a projection, update the
     product's harvested detail when `detail_hash` differs (this is how projections stay current after
     the seed), rebuild `location_products`, emit `menu.source_changed {store, dates}`. An unknown
     `menuCollectionId` triggers F1b.
   - either way, re-match the placements on those dates and write their `menu_item_links` (§4.4).
5. On failure: keep the old day, record `last_error`, retry on the policy (with backoff). Endpoints keep
   showing the last data, marked `stale`.
6. Set `next_due_at = now + validate_every`.

### F2b · Planning, uncached and forced requests

- **Planning (this week, next week):** read `source_menu_days`. Days past `max_age` are returned at
  once and a `warm` job (7-day pull) is queued. Opening a week in the UI is what keeps planning data
  current; there is no nightly warm-up.
- **Future week not cached:** queue a `ui_uncached` job for those days and wait up to a timeout
  (~5 s). On time: resolve as `validated`. On timeout or failure: resolve from `location_products`
  as `unvalidated` and update when the job finishes. Those days are dropped once older than `max_age`
  unless they fall in this week or next.
- **Force fresh:** queue a `force` job. If the policy allows it (`force_allowed`, quota, min interval),
  it runs first and the caller waits for it. If not, the job is `refused` and the caller gets `limited`
  with `last_ok_at` and `next_allowed_at`.
- A projection unseen for **two cycles** becomes `inactive` (hidden from quick add, still searchable,
  never removed while scheduled).

### F3 · Pull a POS (ongoing)

1. Pull the full catalog when its sync policy says (`validate_every`, `daily_quota`; e.g. PAR once a
   day). Forced pulls follow F2b's rules.
2. Diff against `source_catalog_items`: new, changed, gone.
3. **New:** if `concept_item_maps` has it, link the store's projection right away. Otherwise it stays
   in the **staging catalog**. A projection is created only under an automatic import: the concept
   seed (`create_mode = 'seed'`) or `concept_source_rules.auto_import`.
4. **Changed:** update `product_source_values` for linked items (price, out_of_stock…).
5. **Gone:** set `gone_at`. The projection and its link stay. Retail projections never go inactive
   because a POS dropped them.
6. Rebuild affected `location_products` and emit `product.changed`.

### F4 · Seed a concept and add a POS (retail)

1. **First POS for a concept:** add the POS to the concept's lab store with `create_mode = 'seed'`.
   Pull its catalog and create concept projections from it once. This step is optional; projections
   can also be created by hand.
2. **Every later POS:** add it to the lab store (or a location) with `create_mode = 'none'`. Pull the
   catalog.
3. A brand manager maps catalog items to existing projections in `concept_item_maps` (name matches
   suggested, a person confirms). POS ids are global across the concept, so one map covers every store.
4. If the concept allows it, a location can **make a brand edit** or **make a brand item** from an
   unmapped catalog item. It's saved at the concept.
5. The ETL links every store of the concept that has that POS.
6. Each location makes the POS active and sets its priority (or lowers the old POS). Projections don't
   change.

### F5 · Open a week (UI view or API request)

1. Find the `menu_weeks` row for (target, week).
2. If missing: if a recurring week lands on it, copy that week's rules and placements into a new row
   (new ids, `origin_item_id`, `origin = 'recurring'`, `edited = false`). Otherwise **create nothing**:
   the week follows the Default Week by reference (§4.7). No links are copied either way.
3. **Webtrition target:** get the **validation response** for the week's dates from the ETL
   (`GET /source-menu`, `mode = cached` for planning or `fresh` when forced; uncached dates are pulled on
   demand, §5.1). This is the list of what can be scheduled, per date and meal period. Enrich it with
   product values from the product database (one bulk lookup by MRN + portion). Dates with no response
   are offered from the seeded cycle and marked `planned`.
4. **Retail target:** no source call. Category rules and the item list read the product database.
5. Match placements per date and write `menu_item_links` (§4.4).
6. Resolve each day and daypart (F6). Write `resolved_menus` for days in this week and next.

### F6 · Resolve one target, day and daypart

1. **Candidates:** for Webtrition, the day's validation response filtered by the autofill rules (meal
   period / station), plus the placements for the daypart; for retail, category products plus
   placements. Match autofill results to placements by product. Drop placements with
   `state = 'hidden'`.
2. **Day check:** a placement shows on the day if its `on_mask` has the day, or neither mask has it and
   its link is `linked` (Auto follows the source). `off_mask` hides it. A `missing` placement forced On
   still shows, flagged. Closed days (store `openDays`) show nothing and aren't flagged.
3. **Link and validate** (Webtrition): read the placement's `menu_item_links` row for the date (written
   in F5 / F2). Several matches on the day: prefer the placement's own station, then the sort standard.
   Freshness comes from the day's `fetched_at` and the policy (§5.3).
4. **Values** per attribute, first that has one wins:
   1. this week's `overrides`;
   2. local overrides: store → company → concept (`product_values`);
   3. linked sources in priority order: the lowest-numbered link whose attribute map includes the
      attribute, skipping sources not active at the store. For Webtrition the day's menu item values
      (name, price) beat the harvested values. Example: Webtrition at priority 1 maps name, nutrition
      and allergens but not price; Agilysys at priority 2 maps price and out_of_stock; so price comes
      from Agilysys and allergens from Webtrition;
   4. otherwise empty.
5. **Order:** if the day has a lock (F10), follow it. Otherwise pinned `position`, then source
   `sortOrder`, then Webtrition menu item id (category fill: category order, then name). Items with no
   source sort after source items.
6. Hash the result. If it changed, write `resolved_menus` and a `menu_change_feed` row (F12).

### F7 · Edit the Default Week or a week

- **Edit the Default Week:** processes immediately. Every week that follows it (no row of its own)
  changes at once, because it reads the Default Week by reference; nothing is re-copied. Cached menus
  from **today** through next week are re-resolved and pushed in the same request. Today's
  lock still applies (removed items drop off, new ones go to the end). Past days never change.
- **Edit a week that only follows the Default Week:** create its week row, copy the Default Week's
  rules and placements into it (new ids), set `edited = true` (shown as Override) and apply the edit.
  From then on it no longer follows Default Week changes.
- **Edit a recurring week (the original):** unedited occurrences (`edited = false`) are re-copied from
  it, from today onward. Editing an occurrence sets its `edited = true`.
- **Copy / paste / recur:** new week rows and items with new ids. Rules, masks and overrides are
  carried over.

### F8 · Add an item

- **Webtrition, from the day's list:** pick from the validation response for that date and meal period
  (each portion is its own item). The placement stores the product and meal period; its link for that
  date is `linked` at once.
- **Webtrition, from product search:** anything not on that day's response. Stored the same way; its
  link is `missing` (or `planned` if the date has no response yet) and shown as "Not on the source menu
  Tue".
- **Retail:** always a projection from the product database. POS items are mapped to projections, never
  placed directly.
- **Custom quick add:** name check (unique `name_key` within the owner), chips from `catalog_terms`,
  creates a company projection with no source.
- Once a day has been shown, a new item goes to the end (F10).

### F9 · A product changes

1. The product database saves an override at the editor's level and clears the same attribute at every
   level below it (higher levels win; stores have no say). Or the ETL harvests a new source value.
2. Rebuild `location_products` for the affected stores. Emit
   `product.changed {product_id, store_ids, attributes, level}`.
3. Scheduling: for a higher-level edit, clear the same attributes from week overrides from this week
   onward. Re-resolve affected days (F6) and push changed hashes.

### F9b · Update one projection on demand

A person (or an admin tool) asks to refresh a projection, for example to see a recipe change that
menu item validation won't show. The product database asks the ETL to harvest that product's links now
(Webtrition: the recipe for its MRN, `GET /client/{bu}/recipe/{mrn}`; POS: the item, within the
policy's limits). Changed values flow through F9.

### F10 · Frozen order

1. The first time a day / daypart is sent to a target, write `menu_order_locks` with the shown order.
2. After that, an item that shows up later (new in the source, autofill, added by a person) goes to the
   **end**.
3. It may take a showing position only if it's the only item that could show there.
4. Reordering by hand writes a new lock.

### F11 · Nightly, rollover, retention

- **Daily:** menu template check for every Webtrition store (F1b). No nightly re-seed or warm-up;
  validation and UI use keep data current.
- **Saturday night rollover:** next week becomes this week; load the new next week.
- **Retention:** as listed in §10: drop expired date partitions, delete past-window cache days, delete
  weeks older than 8 weeks (placements and links cascade). Products are never deleted, only marked
  inactive or retired.

### F12 · Deliver changes to endpoints

1. `menu.source_changed` or `product.changed` → scheduling re-resolves the affected targets for today
   first, then the rest of this week and next (F6).
2. Each new hash writes `menu_change_feed`.
3. The dispatcher sends rows inside each subscription's `push_window` to its webhook (signed, retries
   with backoff), and advances `last_seq`. The AIMS push is a subscriber.
3b. Each version actually sent for a day writes a `shown_menus` row (the first send also writes the
   order lock, F10).
4. Polling endpoints call `GET /menus` with `If-None-Match` (304 when unchanged) or `GET /changes?since`.

### F13 · Read a menu for any date (UI or API)

1. **Past date:** return the last `shown_menus` version for that target, date and daypart (with earlier
   versions on request). Never re-resolved.
2. **Today through next week:** return `resolved_menus` with its ETag. If its source days are past
   `max_age`, queue a refresh (F2b) and return the cache with freshness states.
3. **Further out:** find the placements for that date (§4.7; a recurring week is copied on first
   access, the Default Week is read by reference), get the validation response on demand, write links,
   resolve the day (F6) and return it. Not stored as a
   cached menu; links are kept.
4. **Forced:** `POST /refresh` first (subject to policy), then as above.

## 12. APIs

### 12.1 Product database: service request API

| Request | Caller | Does |
|---|---|---|
| `GET /stores/{id}/products?q&day&mealPeriod&category` | Scheduling, UI | Search `location_products`; unavailable items listed as prominently as available ones |
| `GET /stores/{id}/products/{productId}` | Scheduling, devices | One resolved product |
| `POST /products/upsert-from-source` | ETL | Find or create the projection for a source item; link it; save harvested values |
| `POST /stores/{id}/products/lookup {keys}` | Scheduling | Bulk enrichment of a validation response by MRN + portion (or product id) |
| `POST /products` · `PATCH /products/{id}/values?level=` | UI | Custom items, overrides at a level |
| `POST /products/{id}/links` · `DELETE /products/{id}/links/{linkId}` | UI, ETL | Link, relink, change priority |
| `POST /products/{id}/refresh` | UI, admin | Update one projection from its sources now (F9b) |
| `GET /stores/{id}/catalog?source&unmapped` | UI | Staging catalog at a location (often the lab store) |
| `POST /concepts/{id}/maps` | Brand manager; a location when allowed | Map POS items to concept projections; covers every store on that POS |
| `POST /concepts/{id}/products/from-catalog` | Brand manager; a location when allowed | Make a brand item from a staging catalog item |
| `POST /concepts/{id}/seed {store, source}` | Brand manager | One-time: concept projections from the lab store's POS catalog |
| `PATCH /stores/{id}/sources/{source}` | UI | Make a POS active, change its priority |
| event `product.changed` | → Scheduling | `{product_id, store_ids, attributes, level}` |

### 12.2 ETL server

| Request | Caller | Does |
|---|---|---|
| `GET /source-menu?store&dates&mode[&mealPeriod&station]` | Scheduling | Dated Webtrition items in the sort standard; `mode = cached \| fresh` (F2b); each day with `fetched_at` and validation state |
| `POST /validate {store, dates, items, mode}` | Scheduling | Per item per day: availability, bound `menu_item_id`, that day's values, validation state |
| `POST /refresh {store, source, dates}` | UI, jobs | Force fresh (F2b); returns the result, or `limited` with `next_allowed_at` |
| `GET /sync-status?store` | UI | Per source: last pull, last success, next due, next allowed, error |
| `PUT /sync-policies/{source}[?store]` | Admin | Change a source's policy (§5.2) |
| `POST /seed {store[, menuCollectionId]}` | Setup, F1b | Seed one menu template (F1) |
| `POST /harvest {productId}` | Product DB (F9b) | Harvest one product's links now |

### 12.3 Scheduling

| Request | Caller | Does |
|---|---|---|
| `GET /targets/{id}/weeks/{weekStart}` | UI, API | F5: open (create if needed), resolve, return |
| `GET /targets/{id}/default-week` · `PATCH …` | UI | Default Week and its edits (F7) |
| `POST/PATCH/DELETE /targets/{id}/weeks/{weekStart}/items` | UI | Add, change, hide, pin items |
| `POST /targets/{id}/weeks/{weekStart}/copy` · `/recur` | UI | Copy, paste, recurring |
| `GET /targets/{id}/available?date&daypart` | UI | What can be scheduled: the date's validation response, enriched (Webtrition), or products (retail); each with link state |
| `GET /targets/{id}/links?from&to` | UI, support | Menu item links per placement and date |
| `GET /menus?target&date&daypart` | Devices, signage, public API | Any date (F13): past from `shown_menus`, today to next week from `resolved_menus` (ETag = hash, `304` when unchanged), later dates resolved on demand |
| `GET /targets/{id}/shown?date[&daypart]` | UI, support | Every version sent for a past day |
| `GET /changes?store&since=<seq>` | Polling endpoints | Changes since a sequence number |
| `POST/DELETE /subscriptions` | Endpoint setup | Register a webhook (§5.5) |

## 13. Build plan

Each phase is reviewed before the next starts.

| Phase | Builds | Done when |
|---|---|---|
| **0. Approve** | This document | Approved; status changed above |
| **1. Schemas** | `product`, `etl`, `schedule` schemas with §7–9 tables in the playground Supabase; hierarchy and one demo store | Migration applies cleanly; RLS stays open for the playground |
| **2. ETL Webtrition** | `populate-menu-data` becomes the ETL: `seed` (F1), new template detection (F1b), sync policies, scheduler, queue and rate limiter, validate here and now (F2), cached / uncached / forced (F2b), `source-menu`, `validate` | Demo store seeded for one cycle; today re-validated every 15 min; a forced refresh and an uncached future week both work; projections in `location_products` |
| **3. Product DB API** | RPC functions for §12.1 (search, upsert-from-source, overrides, links); `product.changed` via `pg_notify` | Search returns available and unavailable items; an override shows up in `location_products` |
| **4. Scheduling core** | Targets, Default Week, weeks, placements, `menu_item_links`, `shown_menus`; F5–F7, F10, F12, F13; `resolved_menus`, change feed, `GET /menus` with ETag; retention job (§10) | Existing demo schedules migrated and resolving the same as today's UI; a future-week placement goes `planned` → `linked`; a source change during the day shows in the change feed |
| **5. UI switch-over** | UI reads and writes through scheduling and product functions; week resolution moved out of `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` | Smart Labels and Products work on the new tables; old tables dropped |
| **6. Retail** | `store_sources`, staging catalog, concept maps, seed (F3, F4), category autofill | A test POS catalog seeded at a lab store and mapped; a retail target fills by category |
| **7. Signage zones** | `menu_targets.kind = 'zone'` with reported capacity and overflow | A zone resolves a category menu |

**Playground migration notes:** `device_names` becomes `menu_targets.name`. `device_week_schedules` /
`device_schedule_items` become `menu_weeks` / `menu_week_items` (per-day rows and `label_day_settings`
become `on_mask` / `off_mask`; MRNs become projections). `product_local_values`, `product_display_names`,
`product_dayparts` become store overrides. `converge-custom` rows become custom projections.
`menu_items` and `product_availability` are dropped.

## 14. Decisions

| ID | Decision | Date |
|---|---|---|
| D1 | Webtrition items are matched by MRN + portion + meal period for the date; station isn't checked | 11-24 |
| D2 | A different portion is a different item; edits apply to the same MRN and portion | 11-24 |
| D3 | Order freezes once a day is shown; new items go to the end unless they're the only item that could show | 11-24 |
| D4 | Values inherit down; a higher-level edit wins and clears lower levels; stores have no say | 11-24 |
| D5 | Brand managers edit at the concept or above; the company edits Webtrition and custom products | 11-24 |
| D6 | Signage zones report their own capacity and overflow rules | 11-24 |
| D7 | Retail targets fill by category or by hand; signage zones need category fill | 11-24 |
| D8 | Scheduling + validation is separate from the product database; the ETL makes all source calls | 11-24 |
| D9 | Every item is a projection; the ETL creates one for every new Webtrition item | 11-25 |
| D10 | Each store has an always-available location product set; stores are seeded with one menu cycle | 11-25 |
| D11 | The product database is reached through a service request API | 11-25 |
| D12 | Links fill attributes in priority order: link 1 supplies all it maps; each next link only what earlier ones don't map | 11-25 |
| D13 | Source data always flows in for mapped attributes unless overridden; each POS has an attribute map so POS can change | 11-25 |
| D14 | Out of stock is an attribute; display rules are out of scope | 11-25 |
| D15 | Default Week edits process immediately; editing a week that only follows the Default Week gives it its own schedule | 11-25 |
| D16 | Webtrition projections go inactive after two cycles unseen; retail projections don't | 11-25 |
| D17 | Retail projections come first, then links; a new POS is a mapping exercise, not an import | 11-25 |
| D18 | Retail projections are seeded at the concept; a one-time import from the concept's first POS is optional | 11-25 |
| D19 | POS mapping is done once at the concept, usually from a lab store; locations may make brand edits or brand items when allowed | 11-25 |
| D20 | Unmapped POS items stay in a staging catalog unless an automatic import applies | 11-25 |
| D21 | POS item ids are global across a concept | 11-25 |
| D22 | Webtrition and custom projections are owned by the company (translations for all locations); retail by the concept | 11-25 |
| D23 | Webtrition is the system of record for its items; WAND does site and company enrichment, validation and placement | 11-25 |

| D24 | Here-and-now validation pulls one day (today) on each source's sync policy; Webtrition about every 15 minutes, and it can be forced | 11-25 |
| D25 | Each source has a sync policy in data (interval, max age, min interval, quota, force allowed, window); POS limits like PAR's one sync a day are respected even for forced pulls | 11-25 |
| D26 | When a source is down or limited, cached data is used and marked stale; validation keeps trying per its requirement; menus never go empty | 11-25 |
| D27 | Future dates that aren't cached are fetched on demand with a short wait, then fall back to unvalidated projection data | 11-25 |
| D28 | Validated changes reach endpoints automatically: change feed, webhooks, and ETag / since polling | 11-25 |

| D29 | Seeding runs at setup and when a new menu template becomes active; no scheduled re-seed or nightly warm-up | 11-25 |
| D30 | Menu item validation keeps projections current after the seed; UI interaction refreshes planning data | 11-25 |
| D31 | A person can update a single projection on demand (e.g. to see a recipe change) | 11-25 |
| D32 | For Webtrition targets the scheduler works from the validation response; the product database enriches it and is the fallback | 11-25 |
| D33 | Placements store product + meal period, never a menu item id; links are made per date in `menu_item_links` (planned, linked, missing) | 11-25 |
| D34 | Copy and recur copy placements, never links (Default Week: see D42) | 11-25 |
| D35 | Dated Webtrition rows are slim; nutrition and allergen detail is stored once per product | 11-25 |
| D36 | Retention per §10; date-keyed tables are partitioned by date so retention drops partitions | 11-25 |
| D37 | A week stores placements only (product identity, days, position, this-week overrides); values are resolved at read time, for Webtrition, custom and retail items alike | 11-25 |
| D38 | Custom and retail placements have no menu item links; they're always available and resolve from the product database | 11-25 |
| D39 | UI and API get the same answer for any date: past from what was shown, today to next week from the cache, later dates resolved on demand | 11-25 |
| D40 | What was sent to each target is kept as a compact record (`shown_menus`) for 8 weeks; past days are read from it, never re-resolved | 11-25 |
| D41 | Airflow is not used for the core (request path, validation, queue); it's acceptable only for light scheduled batch work | 11-25 |
| D42 | The Default Week is followed by reference: weeks that follow it have no row and no copies; a week row exists only when that week has its own schedule | 11-25 |
| D43 | A recurring week copies its placements into each week it lands on, on first access; it can have an end date | 11-25 |
| D44 | Built to run as an enterprise service: precomputed reads, policy-bounded source calls, batched today-first fan-out, per-tenant fairness (§10.4) | 11-25 |

## 15. Open items

None blocking approval. To confirm while building phase 2:

- The wait before an uncached future request falls back to unvalidated (draft: ~5 s).
- Each source's real limits for its starting policy (PAR's daily sync time, other POS rates).

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-25 | Restructured as the reference for approval: infrastructure choices, full schema, flows F1–F11, APIs, build plan |
| 1.5 | 2026-11-25 | Default Week by reference (§4.7, F5, F7, F13); recurring end date; §10.4 scale as an enterprise service; D42–D44 |
| 1.4 | 2026-11-25 | §4.6 how a mixed weekly menu is stored; §5.6 what refreshes on view and API by date; `shown_menus` for past days; `GET /menus` for any date (F13); why not Airflow; link priority example; D37–D41 |
| 1.3 | 2026-11-25 | New §4 Life of a menu item (validation response first, placements vs menu item links, link states, example); new §10 Data retention and volume; `menu_item_links`; slim dated rows; F5, F6, F8 rewritten; D32–D36 |
| 1.2 | 2026-11-25 | Seeding only at setup and on a new active menu template (F1b); no nightly warm-up; on-demand projection update (F9b); D29–D31 |
| 1.1 | 2026-11-25 | Added §5 freshness and sync strategy: request kinds, sync policies, validation states, scheduler / queue / single-flight patterns, change delivery. Day-level cache, sync tables, change feed and subscriptions; flows F2, F2b, F12; D24–D28 |
