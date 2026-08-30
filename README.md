# Together Calendar

A fun-but-functional shared scheduling app for two people, designed to make double-booking hard to ignore.

## Current implemented slice

- Responsive pink + dark-blue interface
- Eric/Ryan demo identity switcher
- Shared agenda
- Add-event workflow that asks for date/time first
- Own-schedule conflicts block creation until explicitly overridden
- Partner conflicts are informational
- Persistent future-conflict banner
- Dedicated conflicts screen
- All-day events with optional busy-all-day behavior
- Basic recurrence selector
- Supabase production schema + RLS migration
- LocalStorage demo mode so the UI works before backend credentials are connected

## Run locally

```bash
npm install
npm run dev
```

## Production backend

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor or through Supabase migrations.
3. Copy `.env.example` to `.env` and provide the project URL and anon key.
4. Replace the demo LocalStorage adapter with the Supabase adapter (next implementation step).

## Design palette

- Navy `#172554`
- Deep blue `#1E3A8A`
- Pink `#EC4899`
- Soft pink `#FCE7F3`

Conflict red is intentionally reserved for blocking conflict states.
