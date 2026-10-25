# Title

Chat Ships It

## One-line Summary

The community creates. The community plays. Codex ships.

## Problem

A Twitch community has ideas worth playing. Turning those ideas into a shared game takes development work, coordination, and a way to keep a live session moving.

## Solution

Chat Ships It gives a channel one world to create, play, and evolve together.

The streamer describes a game. Codex generates a blueprint. The streamer plays a private preview and publishes it. In the shared bee garden, viewers open a player link, choose a guest name, and join the hive. Every bee collects nectar for the same goal.

Twitch chat proposes the next change with `!mod`. Viewers vote with `1`, `2`, or `3`. The streamer approves the winner. Codex writes an actual TypeScript rule file. Four validation checks run. The new rule reaches every connected bee in the same room. Rollback preserves the shared round and its progress.

## Why This Matters

The community's idea becomes something everyone can experience together. A rainbow trail belongs to every bee. A new hazard changes the shared challenge. Each round gives the channel a story it helped create.

## How We Used AI

Codex generates game blueprints and live rule patches through the Codex SDK. Gemini screens chat proposals into neutral specifications and checks display text. The engine supports bounded capabilities across shooter, survival, and collection games. Multiplayer focuses on the bee garden collector.

Generated TypeScript exports a declarative object. A literal-only AST parser, strict schema, deterministic simulation, and validation budget check it before the reviewed engine applies its rules. The server owns multiplayer movement, entities, collisions, scoring, and time.

The demonstration uses Gemini narration and an original Lyria instrumental soundtrack. Three scripted clients play through the real multiplayer protocol. Their labels remain visible in the film.

## How We Used Codex

Codex helped implement the product, Twitch EventSub connection, game creator, validation pipeline, shared simulation, interface, tests, and film tools. We iterated from an individual game session to cooperative play so the community could experience its own changes together. Codex also runs inside the finished product to generate each new game and approved patch.

The recorded real patch shipped in 23.751 seconds. All four checks passed. Integration verification confirmed that patching and rollback preserved the shared round, three connected player IDs, score, team target, and remaining time. The automated suite has 21 passing tests.

Main build session: `01a1726e-fe77-78e0-a787-399855bb9955`.

## Key Features

- Owner prompt, private playable preview, publish, and discard.
- Shared bee garden with keyboard and touch play, one score, one clock, and one team goal.
- Real Twitch proposals, one vote per viewer, and streamer build approval.
- Real Codex generation with live build activity and four checks.
- Live rule changes and rollback that preserve shared progress.
- Guest player and spectator views, persisted published worlds, and credential-free rehearsal.

## Architecture

TypeScript, Fastify, WebSockets, Canvas, Zod, the Codex SDK, Twitch EventSub, and Gemini. The server simulates the garden at 20 ticks per second and broadcasts snapshots at 10 frames per second. Inputs contain bounded directions and sequence numbers. The room supports 24 bee seats; three simultaneous clients were exercised in the recorded demonstration.

## Testing Instructions

Install Node 22 or later and the pinned package manager from `package.json`. Run `pnpm install`, `pnpm build`, and `pnpm test`.

On Windows, double-click `try-multiplayer.cmd`. It loads a reviewed garden on port 4312 without credentials. Open the owner desk at `http://127.0.0.1:4312/`. Open `http://127.0.0.1:4312/?view=play` in two or more tabs, choose different names, and join. Start the shared round from the owner desk. Move each bee with WASD or arrows. Collect nectar and compare the shared score and clock across tabs. Touch and hold also steers.

Use rehearsal to try reviewed rule examples. For live generation and Twitch, follow `docs/SETUP.md`; authenticate Codex, configure the local environment, connect a channel, then submit `!mod Give every bee a rainbow trail`. Submit a second idea, open voting, vote `1`, lock, and approve the build. Observe the same round continue, then roll back.

For network verification against a running server, set `HIVE_URL` to its origin and run `pnpm exec tsx scripts/check-hive.ts`. This starts a verification round. See `docs/MULTIPLAYER.md` for architecture and limits.

## Public Demo Link

Local installation fallback supplied above. A publicly hosted multiplayer instance has not been deployed.

## Public Repository Link

https://github.com/rapha18th/chat-ships-it

## Demo Video

Public YouTube URL: pending entrant upload of `Chat-Ships-It-Multiplayer.mp4`.

The film is approximately 2 minutes 32 seconds at 1920 by 1080. Sequence: shared garden; create and preview; player link; shared scoring; actual Twitch proposal and vote; actual Codex build; rainbow for all bees; rollback; implementation and verification. The build wait is condensed and labeled. The three players are scripted clients on the actual server. The vote uses one real owner account in a controlled demonstration.

## Screenshot Shot List

1. Shared garden with three connected bees and one team score.
2. Owner creation brief and playable preview.
3. Guest join screen and player controls.
4. Actual Twitch proposal and vote.
5. Rainbow patch, measured build time, and four checks.

Assets are under the ignored local `artifacts/multiplayer-film` directory. The final film, thumbnail, and upload copy are copied to Downloads for handoff.

## Submission Readiness Notes

Rules acknowledged by the entrant on October 25, 2026. The connected account is registered and official requirements were read through the Devpost plugin. Local entry copy and evidence are prepared. Final entry awaits the public YouTube URL and final confirmation.

## Known Limitations

Shared multiplayer currently supports the garden collector with a bee avatar. Other engines run solo. Guest names are unverified. Round progress lives in server memory. The room allows 24 seats; testing exercised three concurrent players. Remote viewers require a reachable hosted address. The film's scripted clients demonstrate functionality; audience turnout and a production-scale load test are unmeasured.

## TODO Official Form Fields

Prepared answers for the live form, checked October 25, 2026:

| Field | Prepared answer |
| --- | --- |
| 29288 Repository | https://github.com/rapha18th/chat-ships-it |
| 29289 Codex session | 01a1726e-fe77-78e0-a787-399855bb9955 |
| 29290 Technical requirement | Codex helped build the application and powers runtime game creation and live TypeScript rule generation. Twitch OAuth and EventSub deliver real chat proposals and votes. Approved rules pass four checks before reaching the shared garden. The film shows actual Twitch messages and actual Codex generation. |
| 29291 Streamer and community usage | The streamer describes, previews, and publishes the starting world. Viewers join the shared garden through a player link and collect nectar together. Twitch chat proposes changes and votes. The streamer approves the winner. Codex ships it to every bee, and rollback preserves the team's progress. |

Personal declarations and survey answers supplied by the entrant are saved privately in `.local/devpost-entrant-answers.json`. The only missing asset is the public YouTube watch link. Final confirmation is required when the complete entry is ready to send.
