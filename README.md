# frontofficekiosk

Touchscreen visitor kiosk for the Diamond Bar High School front office — rotating photo gallery, interactive room-finding map, and school announcements, running full-screen on a dedicated touch TV.

**Start here:** [PLANNING.md](PLANNING.md) — the full project planning document (architecture, data model, backend & frontend specs, branding, deployment, content operations, testing, and rollout plan).

## Layout

| Path | What |
|---|---|
| `src/` | Kiosk app — React 19 + Vite + Tailwind 4, no router (state machine in `src/state/machine.ts`, idle timer in `src/hooks/useIdleTimer.ts`) |
| `src/map/` | Schematic campus map + fixed-origin routes (placeholder shapes keyed to the real `buildings` table ids — swap for the interactivemap SVG per PLANNING §7) |
| `supabase/migrations/` | Kiosk schema + RLS for the shared **dbhs-wayfinder** Supabase project (additive only) |
| `supabase/functions/sync-photos/` | Scheduled Drive → R2 → Postgres photo sync (PLANNING §5) |
| `scripts/kiosk-verify.mjs` | Playwright drive-through: wakes the kiosk, visits every screen, tests the idle timeout, saves screenshots |

## Develop

```bash
npm install
npm run dev            # mock mode: sample photos/announcements/rooms, no backend needed
```

Copy `.env.example` to `.env` to run against the live Supabase project (photos fall back to samples until the Drive→R2 pipeline is switched on). The Supabase URL and publishable key are public by design — Row Level Security keeps the kiosk read-only (see `supabase/migrations/0001_kiosk_v1.sql`).

Useful dev query params: `?idle=5000` (shorten the 45 s idle timeout), `?dwell=3000` (speed up the attract carousel).

## Verify

```bash
npm run build
npm run preview -- --port 4173   # then, in another shell:
npm run verify                   # screenshots land in ./verify-shots/
```

## Deploy (summary — details in PLANNING §9)

- **App**: static hosting (Cloudflare Pages), auto-deploy from `main`; the kiosk self-reloads via `version.json` on each return to the attract screen.
- **Backend**: apply `supabase/migrations/`, deploy `sync-photos`, set its secrets (`supabase secrets set`), schedule it every 15 min via Supabase Cron.
- **Device**: browser in kiosk mode per PLANNING §9.2–9.3.
