# Map: Hallow Playground

Label: wayfinder:map

## Destination

Hallow Playground is live at **https://www.iambaangkok.dev/hallow-playground/** by **31 Oct 2026, 19:00 ICT**. Two Players in different countries (one on a tablet) create or join the same Playground from the Lobby, Bob around the Map together in real time, Say things to each other, talk to the Link NPCs, and play at least one silly Halloween minigame.

## Notes

- **Execution is in scope.** This overrides wayfinder's plan-only default. Tickets build and ship. Hard deadline, so prefer the smallest thing that works.
- Domain language lives in [CONTEXT.md](../../CONTEXT.md). Read it first.
- Hosting mirrors `../happy25`: pnpm, Vite, TypeScript, oxlint, a Cloudflare Worker on route `www.iambaangkok.dev/hallow-playground*`, with Vite `base` `/hallow-playground/`. Unlike hello25, it has a Worker script plus Durable Objects (one per Playground, WebSocket Hibernation API).
- Rendering uses HTML canvas. DOM is used only where the canvas can't do the job (text input that needs the mobile keyboard).
- Input is touch and mouse. Tablet is a primary target.
- Character art is drawn by the owner. Each drawing fits a square or a slightly tall rectangle. Builds use placeholders until the art lands.
- Settled while charting: Lobby first. No login; the browser remembers Name and Character. Public and Private Playgrounds. Join by Playground code or link. Says show as bubbles plus a semi-transparent, auto-fading, collapsible Chat log in the top left.

## Decisions so far

- [Scaffold the app and Worker](issues/01-scaffold.md): Vite canvas client plus Worker with two Durable Objects; dev ports 5173 and 8790.
- [Playground server protocol](issues/03-playground-server.md): intents only over WebSocket, hibernation-safe seats, Directory for Public Playgrounds.
- [Lobby](issues/04-lobby.md): DOM Lobby; invite links go straight to Enter; profile remembered per browser.
- [Map, Tap-to-walk, and Bob](issues/05-map-movement.md): placeholder Map, works on touch.
- [Says and Chat log](issues/06-says-chat-log.md): bubbles plus fading, collapsible log.
- [Link NPCs](issues/07-link-npcs.md): crow to X, witch to website, gatekeeper for sharing.
- [First minigame](issues/08-first-minigame.md): pumpkin carving, placed Pumpkins persist.

## Not yet specified

- What the Map contains beyond the Link NPCs (houses, vendors, decoration) depends on what art lands today.
- A second minigame, if time allows.

## Out of scope

- Login and accounts (a later effort).
- Multiple different Maps.
