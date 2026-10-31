# halloween-playground

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Commands

- `pnpm dev`: Vite at http://localhost:5173/hallow-playground/ plus `wrangler dev` on 8790 (8787 is used by another project).
- `pnpm build`: typecheck client and worker, then `vite build` into `dist/hallow-playground/`.
- `node scripts/smoke.mjs`: server protocol check against the running worker.
- `node scripts/e2e.mjs`: two-browser check (desktop + touch tablet) against `pnpm dev`.

## Deploy notes

Worker script plus static assets on route `www.iambaangkok.dev/hallow-playground*` ([wrangler.jsonc](wrangler.jsonc)). The route keeps the path prefix, so Vite `base` is `/hallow-playground/` and the build lands in `dist/hallow-playground/` while assets serve from `dist/`. Change one, change the other. Cloudflare builds from `master`.

## Art

Drop PNGs in `public/`: `characters/<id>.png` for each Roster id in `src/client/roster.ts`, `characters/npc-<id>.png` for NPCs, `map.png` (2400x1600), `pumpkins/<id>.png` for each Pumpkin Base in `src/shared/pumpkins.ts`. Missing files fall back to placeholders.
