# Playground server protocol

Type: task (AFK)
Status: resolved
Blocked by: 01

## Question

Define and build the Playground Durable Object: join/leave, walk target, Say, Public/Private flag, Playground code, and the Public Playground list.

## Answer

One PlaygroundRoom DO per Playground code; seats live in WebSocket attachments so hibernation keeps them. Messages are intents only (join, walk target, say, visibility, place). Directory DO lists Public Playgrounds. Verified by `scripts/smoke.mjs`.
