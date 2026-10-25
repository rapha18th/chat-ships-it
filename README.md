# Chat Ships It ↗

**Chat writes the patch notes.** Twitch viewers propose game changes, vote on a winner, and watch a real Codex worker write a bounded TypeScript rule file. The validator gates it, then the game adopts the patch without restarting. The streamer can roll back or stop every mod.

## Run it

Requires Node 22+ (tested on Node 24.18.0), pnpm 11.25.0.

```sh
pnpm install
cp .env.example .env
pnpm build
pnpm start
```

On PowerShell use `Copy-Item .env.example .env` for the copy step. Open **http://localhost:4310**. Local installation here already has `.env` configured for the authenticated Codex executable; do not overwrite it to preserve that setting.

**Try it without credentials:** Load the rehearsal → Open the vote → click a finalist → Lock the vote → Load winning example. Rehearsal uses reviewed files and explicitly identifies every example.

**Try the real agent:** enable `ENABLE_CODEX=true` after `codex login`; Settings → Try real Codex with reviewed starter ideas → close Settings → vote → approve the build. This calls the actual Codex SDK, consumes plan usage, and streams real event summaries. Sample viewer names remain labeled as examples. No Gemini key is needed for reviewed starter ideas.

The game starts in a labeled autopilot attract mode. Click the canvas for manual play: **W / ↑** thrust, **A D / ← →** turn, **Space** shoot, **R** restart. On touch, hold to steer and shoot. Sound is optional.

## Live channel setup

[docs/SETUP.md](docs/SETUP.md) has exact credential links, callback URL, scope, server steps, OBS configuration, and deployment notes. Secrets belong in `.env` and `.local`, both ignored by Git. You do not need an OpenAI API key or a second Twitch account for the current read-only chat integration.

## Validate

```sh
pnpm check
pnpm test
pnpm build
# With the server running (resets the current local round):
pnpm smoke
# Optional real agent benchmark; consumes Codex usage:
pnpm exec tsx scripts/codex-smoke.ts
```

Tests cover hostile syntax, bounded schemas, all three example mods, vote changes, confidence vote locks, single repair, parallel build denial, cancellation, and rollback. The HTTP smoke checks WebSocket snapshots, cross-origin request denial, and an entire rehearsal round.

## How it works

- `apps/web`: Canvas survival game, responsive streamer desk, read-only OBS overlay.
- `apps/server`: Fastify HTTP + WebSocket hub, round state machine, Twitch EventSub OAuth/reconnect, Gemini proposal screening, Codex SDK worker.
- `packages/core`: strict mod schema, literal-only TypeScript AST parser, deterministic validation simulation, shared protocol.
- `scripts`: reproducible integration and real-agent smoke checks.

Generated mods are actual TypeScript files exporting a declarative rule object. The host parses the syntax and hands a validated manifest to reviewed engine code. It never runs generated JavaScript. This trades unrestricted plugins for a bounded, predictable stage experience. See [docs/DECISIONS.md](docs/DECISIONS.md) for rationale and exact limits.

## Current limits

Live Twitch and Gemini require your credentials and have not been exercised on your channel. Confidence votes are in-app votes with no currency or prizes; native Twitch Predictions/Polls, Channel Points redemptions, bot replies and raid transfer are deferred. Game runs in separate browser sources are independent simulations sharing the same active rule, so capture the playing window when the broadcast must show the exact same run. State is in memory and resets on server restart. Docker files are provided but Docker deployment has not been verified on this machine.

Official event requirements and the remaining submission work are recorded in [docs/PITCH.md](docs/PITCH.md). No public repository, stream or submission has been created.
