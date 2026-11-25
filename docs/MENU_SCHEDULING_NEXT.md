# Menu scheduling: where we left off

Last session: 2026-11-25 (afternoon). Design: [MENU_SCHEDULING_DESIGN.md](MENU_SCHEDULING_DESIGN.md) (three systems: ETL
server, product database, scheduling + validation; decisions in section 9). Focus is infrastructure,
table schema and the workflow for populating schedules; the product database can be new.

## Questions to answer next

1. **Who maps a new POS:** a brand manager once at the concept (one mapping shared by every store on
   that POS), or each company / store for its own POS?
2. **Unmapped POS items:** when a live POS sends items nobody has mapped yet, do they stay invisible
   until mapped, or is someone notified?

Answered 2026-11-25 (now in the design, section 9): harvest scope, product DB service API, link
priority, out of stock as an attribute, Default Week edits process immediately (editing a week that
only follows the Default Week creates its own schedule), inactive after two menu cycles, retail
projections first and then POS mapping (no importing beyond a one-time first-POS import).

## Next steps once those are answered

- Write the first playground migration: `product`, `etl` and `schedule` schemas, hierarchy,
  `store_sources`, `menu_targets` (design section 8).
- Turn `supabase/functions/populate-menu-data` into the ETL function (`seed` for one menu cycle,
  `refresh`, `source-menu`, `validate`) with the this-week + next-week validation cache.
- Move week resolution out of `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the
  scheduling function.
