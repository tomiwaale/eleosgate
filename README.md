# Eleosgate POS

Offline-first pharmacy POS built with Next.js, Dexie, and Supabase.

## What Changed

This branch hardens the sync model so the app is safer across multiple devices:

- Receipt numbers are device-unique instead of local counters.
- Stock sync uses immutable quantity deltas instead of last-write-wins product overwrites.
- Full restore pulls are paginated so stores do not stop restoring after 1000 rows.
- Categories now carry `updated_at`, so renames sync properly.
- Sync reachability now probes Supabase instead of trusting `navigator.onLine`.
- First-run setup can finish offline, with cloud backup connected later from Settings.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Supabase values.

3. Apply the SQL migration in [`supabase/migrations/20260414_sync_hardening.sql`](./supabase/migrations/20260414_sync_hardening.sql) to your Supabase project.

4. Start the app:

```bash
npm run dev
```

## Testing Offline / PWA

`next-pwa` is still off by default in development so normal local work stays predictable.

To test the real service worker in dev:

```bash
NEXT_PUBLIC_ENABLE_PWA_DEV=true npm run dev
```

When that flag is on, the dev service-worker reset helper is disabled so the PWA can stay installed between refreshes.

## Supabase Notes

- RLS is required because the anon key is public in the browser.
- The new `apply_stock_adjustment` RPC applies stock changes atomically and idempotently.
- Product quantity is no longer synced as an absolute client-side overwrite.
