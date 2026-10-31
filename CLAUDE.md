# playground

## Creative direction belongs to the owner

Never invent character names, character types, NPC names or dialogue, place names, scenery, themes, colors, or art. Use numbered placeholders (`Character 1`, `NPC 1`, `House 1`, `[NPC 1 line]`) and a static white wireframe on a dark grid until the owner supplies the real thing. Functional UI text (buttons, hints, errors) is fine.

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Commands

- `pnpm dev`: Vite at http://localhost:5173/playground/ plus `wrangler dev` on 8790 (8787 is used by another project).
- `pnpm build`: typecheck client and worker, then `vite build` into `dist/playground/`.
- `node scripts/smoke.mjs`: server protocol check against the running worker.
- `node scripts/e2e.mjs`: two-browser check (desktop + touch tablet) against `pnpm dev`.

## Deploy notes

Worker script plus static assets on route `iambaangkok.dev/playground*` ([wrangler.jsonc](wrangler.jsonc)). The route keeps the path prefix, so Vite `base` is `/playground/` and the build lands in `dist/playground/` while assets serve from `dist/`. Change one, change the other. Cloudflare builds from `master`.

## Art

Drop PNGs in `public/`: `characters/<id>.png` for each Roster id in `src/client/roster.ts` and each NPC `sprite` in `src/client/npcs.ts`, `map.png` (2400x1600), `pumpkins/<id>.png` for each Pumpkin Base in `src/shared/pumpkins.ts`. Missing files fall back to placeholders.

### Cutting sprites from photos

Photos of drawings go in `assets/raw/` (gitignored, they carry GPS EXIF). `assets/sprites.json` lists each sprite: `id`, the owner's `name` and `caption` as written on the page, `photo`, `box` [x,y,w,h] in full-res pixels, and optional `threshold` [lo,hi], `fill` (`holes` default, `{ "close": r }` for open shapes, `hull`, `none`), `minSpeck`, `maxSize`.

- `pnpm sprites look <photo> [--box x,y,w,h]`: preview with a coordinate grid. Read the printed image to pick boxes.
- `pnpm sprites detect <photo>`: numbered boxes around ink blobs.
- `pnpm sprites cut [id...]`: writes transparent PNGs to `assets/sprites/<dir>/<id>.png` and a review sheet at `.scratch/sprites/sheet.png`. Keep labels out of the box.

