# First minigame

Type: prototype (HITL)
Status: resolved
Blocked by: 05

## Question

Which silly Halloween minigame ships first, and how do two Players play it together? Default: a shared pumpkin both Players carve at once.

## Notes from charting

- A Cut is a closed straight-edged polygon. You tap points with a pen tool, and tapping near the first point closes the shape and cuts the hole.
- A carved Pumpkin is a list of Cuts in pumpkin-local 0..1 coordinates. It can be placed on the Map and is persisted in the Playground's Durable Object storage.
- Wire cost: one message per closed Cut and one per placement. Never per frame or per drag.
- Decided: placed Pumpkins stay in their Playground forever.

## Answer

Shipped the default: Old Gourd opens the pen-tool carver; the Pumpkin is placed at your feet and stays forever. The player first picks a Pumpkin Base from a fixed set that ships with the game (`src/shared/pumpkins.ts`, art at `public/pumpkins/<id>.png`). No uploads. Cuts follow the chosen base drawing's bounds.
