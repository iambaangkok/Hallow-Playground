# Scaffold the app and Worker

Type: task (AFK)
Status: resolved
Blocked by:

## Question

Stand up pnpm + Vite + TS canvas client and a Worker script with a Playground Durable Object, served under /hallow-playground/, runnable locally with one command.

## Answer

Built: pnpm + Vite + TS canvas client, Worker script with PlaygroundRoom and Directory Durable Objects (SQLite, hibernation). `pnpm dev` runs Vite on 5173 and wrangler on 8790 (8787 is taken by auto-trader).
