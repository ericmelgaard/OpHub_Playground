# Menu scheduling: where we left off

Last session: 2026-11-25. Design: [MENU_SCHEDULING_DESIGN.md](MENU_SCHEDULING_DESIGN.md) (three systems: ETL
server, product database, scheduling + validation; decisions in section 9). Focus is infrastructure,
table schema and the workflow for populating schedules; the product database can be new.

## Questions to answer next

1. **Default Week vs today's frozen order.** A Default Week change applies instantly. Does today's
   locked order still hold (removed items drop off, new ones go to the end), or may the change reorder
   today?
2. **Inactive projections.** Draft: a Webtrition projection unseen for two menu cycles becomes inactive
   (hidden from quick add, still searchable, never deleted while scheduled). Right length? For POS
   items, how long gone from the catalog before inactive?
3. **Retail match on auto import.** When a store's POS sends an item the concept may already have (a
   Whopper from a new POS), match only by an existing link, or also by exact name, before creating a
   new projection?

Answered 2026-11-25 (now in the design): harvest scope (every new item becomes a projection), product DB
access (service request API), product-to-product links (just a link in priority order), POS out of
stock (an attribute), existing product DB (not needed; can be new).

## Next steps once those are answered

- Write the first playground migration: `product`, `etl` and `schedule` schemas, hierarchy,
  `store_sources`, `menu_targets` (design section 8).
- Turn `supabase/functions/populate-menu-data` into the ETL function (`seed` for one menu cycle,
  `refresh`, `source-menu`, `validate`) with the this-week + next-week validation cache.
- Move week resolution out of `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the
  scheduling function.
