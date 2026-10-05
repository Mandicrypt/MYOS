# MYOS — Phase 0 (v2)

A calm personal operating system. It shows what deserves attention now, and keeps everything else out of the way.

## Run it on your computer

You need Node.js (version 20 or newer).

1. Open a terminal in this folder.
2. Run `npm install` (only the first time).
3. Run `npm run dev`.
4. Open the address it shows, usually http://localhost:5173

## Accounts and cloud sync (Supabase)

MYOS works in two modes:

- **Local-only** (no Supabase settings): no accounts, data stays in this browser. Good for trying it out.
- **Account mode**: sign in, data is saved to your Supabase database and syncs across devices.
  It still works offline and catches up when you reconnect.

### Set up Supabase (once)

1. Create a free project at supabase.com.
2. In the Supabase dashboard, open **SQL Editor → New query**.
3. Paste the whole of `supabase/migrations/001_initial_schema.sql` and click **Run**.
   This creates the tables, the security rules (Row Level Security) and the indexes.
4. Open **Project Settings → API** and copy the **Project URL** and the **anon / publishable key**.
5. In this folder, copy `.env.example` to `.env.local` and paste the two values in.
   Never commit `.env.local`, and never use the `service_role` key in the app.
6. If you deploy (for example on Vercel), add the same two values as environment variables there.

7. In **SQL Editor**, also run `supabase/migrations/002_wallets.sql` (wallet sign-in). It only adds a table.

By default Supabase asks new users to confirm their email. You can turn that off under
**Authentication → Sign In / Providers → Email** while testing.

### Wallet sign-in (Sign-In with Ethereum)

MYOS uses Supabase Auth's built-in Web3 sign-in. The wallet signs a standard Sign-In with
Ethereum message; Supabase verifies the signature on its server and starts a normal session.
No private keys, no recovery phrases, no transactions, no extra server code.

1. In Supabase, open **Authentication → Sign In / Providers → Web3 Wallet** and switch on **Ethereum**.
2. Open **Authentication → URL Configuration**. Set **Site URL** to your MYOS address
   (for example `https://myos.vercel.app`) and add it under **Redirect URLs** too.
   Supabase only accepts signatures made for these addresses. For local testing, add
   `http://localhost:5173/**`. Wallet sign-in needs `https`, or `localhost`; plain-http
   network addresses (like `http://192.168…`) won't work.
3. Optional, for phone wallets: get a free project id at cloud.reown.com and set
   `VITE_WALLETCONNECT_PROJECT_ID`. Without it, MYOS offers browser wallets only
   (MetaMask, Rabby, Coinbase Wallet and any other EIP-6963 wallet).

A wallet signs in to a MYOS account; it isn't the account itself. Wallets are recorded in the
`wallets` table by the database, from identities Supabase has verified. The app can read its
own wallets but can't add or change them.

### How sync works

```
UI → actions → reducer → AppState → persistence layer ─┬─ this device (localStorage)
                                                         └─ Supabase (PostgreSQL + RLS)
```

- The reducer, engine and pages know nothing about Supabase. Only `src/store/cloud/` does.
- Edited records: the latest `updated_at` wins.
- History (`work_events`, `user_events`) is append-only, in the app and in the database.
- Changes made offline are uploaded once the connection returns.
- The first time someone signs in on a device that already has MYOS data, they're asked
  whether to import it. Nothing on the device is deleted either way.

## Checks

- `npm run typecheck` — TypeScript
- `npm run lint` — code checks
- `npm run build` — production build into `dist/`
- `npm run build:single` — one self-contained HTML file in `dist-single/`
- `npm run check:engine` — checks the decision logic (ranking, dependencies, scoring, anti-gaming)
- `npm run check:sync` — checks cloud sync with two simulated devices (no Supabase needed)

## How it's organised

```
src/
  app/          App, routes, navigation config, UI context (quick add, task editor)
  pages/        one file per screen
  components/   layout, navigation, tasks, projects, goals, inbox, focus, ui primitives
  engine/       importance engine (swappable) and meaningful work scoring
  store/        state, actions, selectors, saving to this browser
  data/         sample data
  types/        data model: Goal → Project → Milestone → Task → Outcome
  lib/          dates, ids, class names
```

## How MYOS decides (src/engine)

- `importance.ts` — each factor (impact, deadline, goal, your importance, unblocking, postponing,
  momentum, effort) returns a *reason* with a weight. The score is the sum; the strongest reasons
  are the labels you see. Explanations always match the decision.
- `relations.ts` — the work hierarchy (Goal → Project → Milestone → Task) and dependency helpers.
- `next.ts` — what to suggest right after finishing something.
- `meaningful-work.ts` — work value for a finished task, with anti-gaming rules.
- `store/events.ts` — every correction you make is recorded as a `UserEvent` for future personalisation.

## Important design points

- **Importance engine:** `src/engine/importance.ts`. The UI only calls `engine.rank()`.
  To change how MYOS decides, replace the engine. No screen needs rewriting.
- **Meaningful work:** `src/engine/meaningful-work.ts` scores a finished task by how much it
  mattered, and stores a `WorkEvent`. No tokens, no wallets.
- **Data:** saved in this browser only (localStorage). No accounts, database or Supabase yet.
  Settings → "Restore sample data" or "Start with a clean slate".
