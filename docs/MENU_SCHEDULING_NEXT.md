# Menu scheduling: where we left off

Last session: 2026-11-25 (evening). Design: [MENU_SCHEDULING_DESIGN.md](MENU_SCHEDULING_DESIGN.md) (three systems: ETL
server, product database, scheduling + validation; decisions in section 9). Focus is infrastructure,
table schema and the workflow for populating schedules; the product database can be new.

## Status: waiting for approval

The design (v1.0) is restructured as the build reference and is **awaiting approval**. No build work
starts until it's approved. Review page: https://claude.ai/artifact/G4TdReMkf1fWtSDo52N9na (rebuild with
`docs/review-page/`). After approval: change the status line at the top of the design, then start build
phase 1 (design §10).

## Next steps

- Write the first playground migration: `product`, `etl` and `schedule` schemas, hierarchy,
  `store_sources`, `menu_targets` (design section 8).
- Turn `supabase/functions/populate-menu-data` into the ETL function (`seed` for one menu cycle,
  `refresh`, `source-menu`, `validate`) with the this-week + next-week validation cache.
- Move week resolution out of `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the
  scheduling function.
