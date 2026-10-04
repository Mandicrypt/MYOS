# MYOS — Phase 0 (v2)

A calm personal operating system. It shows what deserves attention now, and keeps everything else out of the way.

## Run it on your computer

You need Node.js (version 20 or newer).

1. Open a terminal in this folder.
2. Run `npm install` (only the first time).
3. Run `npm run dev`.
4. Open the address it shows, usually http://localhost:5173

## Checks

- `npm run typecheck` — TypeScript
- `npm run lint` — code checks
- `npm run build` — production build into `dist/`
- `npm run build:single` — one self-contained HTML file in `dist-single/`
- `npm run check:engine` — checks the decision logic (ranking, dependencies, scoring, anti-gaming)

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
