# Menu scheduling: where we left off

Last session: 2026-11-24. Design: [MENU_SCHEDULING_DESIGN.md](MENU_SCHEDULING_DESIGN.md) (three systems: ETL
server, product database, scheduling + validation; decisions in section 9).

## Questions to answer next

1. **Harvest scope.** Should the ETL harvest into the product database only products that are
   projections (plus the light search index), or every Webtrition item a company has served?
   Harvesting everything goes against "don't keep Webtrition items".
2. **Product DB access.** Does scheduling read the product database through an API (with a cache), or
   share Postgres through read-only views? Playground: views. Production: probably an API.
3. **Product-to-product links.** When a Webtrition product links to a retail product, which attributes
   flow from the retail one? Draft: treat the linked product like a source with its own attribute map
   and priority.
4. **Default Week vs today's frozen order.** Draft: a Default Week change applies instantly, but today's
   locked order still holds (removed items drop off, new ones go to the end). Or should a Default Week
   change be allowed to reorder today?
5. **POS availability.** Should an out-of-stock flag from a POS hide an item on labels/signage, or only
   mark it?
6. **Existing product database.** What does it look like today (tables, where it runs), so section 4
   can be written as changes to it rather than new tables?

## Next steps once those are answered

- Write the first migration for the playground: `product` and `schedule` schemas, hierarchy,
  `menu_targets` (design section 8).
- Turn `supabase/functions/populate-menu-data` into the ETL function (`source-menu`, `validate`,
  `harvest`) with the this-week + next-week snapshot.
- Move week resolution out of `src/lib/weekSchedule.ts` / `deviceWeekProjection.ts` into the scheduling
  function.
