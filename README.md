# Operator Hub playground

A WAND Digital prototype of Operator Hub: products from the menu source, smart labels (electronic
shelf labels) and what each label shows by daypart, day and week. It's a design playground, not the
production app; the beta app takes over from here.

Live: https://ophub.playground.wanddigital.com/

## Run it

```sh
npm install
npm run dev
```

It needs a `.env` with the Supabase project it reads and writes (not committed):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

`npm run build` type-checks and builds to `dist/`.

## How it's put together

- React + TypeScript + Vite, Tailwind CSS, shadcn/ui (`src/components/ui/`), Lucide icons.
- `src/App.tsx` holds the app state; the main screens are Products (`MenuItems`), Smart Labels
  (`SmartLabelGrid` / `SmartLabelList`) and the label page (`workflows/DeviceFirstWorkflow`).
- `src/services/api.ts` talks to Supabase. Devices are demo data (`src/services/mockData.ts`).
- `supabase/migrations/` holds the database changes; they're applied by hand in the Supabase SQL
  editor. `supabase/functions/populate-menu-data` loads the menu source into `menu_items`.

## Rules for changes

[CLAUDE.md](CLAUDE.md) is the style guide for anyone (or any AI) changing the UI: colors,
components, layout patterns and wording. Copy the closest existing pattern before adding anything
new. Staff-facing changes also get an entry in the in-app user guide (`src/lib/userGuide.ts`).

## Deploys

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).
