# Menu scheduling: where we left off

Last session: 2026-11-25 (afternoon). Design: [MENU_SCHEDULING_DESIGN.md](MENU_SCHEDULING_DESIGN.md) (three systems: ETL
server, product database, scheduling + validation; decisions in section 9). Focus is infrastructure,
table schema and the workflow for populating schedules; the product database can be new.

## Questions to answer next

None blocking. The design's open questions are all answered (section 9, decisions 1–23). Start with the
next steps below; new questions will come up while building.

Answered 2026-11-25: harvest scope, product DB service API, link priority, out of stock as an
attribute, Default Week edits process immediately, inactive after two menu cycles, retail projections
seeded at the concept and then POS mapping, POS mapping at the concept (from a lab store; locations can
make brand edits / brand items when allowed), staging catalog for unmapped items, POS item ids global
across a concept, Webtrition is the system of record (WAND does site/company enrichment, validation,
placement).

## Next steps

- Write the first playground migration: `product`, `etl` and `schedule` schemas, hierarchy,
  `store_sources`, `menu_targets` (design section 8).
- Turn `supabase/functions/populate-menu-data` into the ETL function (`seed` for one menu cycle,
  `refresh`, `source-menu`, `validate`) with the this-week + next-week validation cache.
- Move week resolution out of `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the
  scheduling function.
