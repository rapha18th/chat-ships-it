# Decisions and verified sources

Recorded October 25, 2026, Africa/Johannesburg. Official API pages were fetched directly after web-search tools failed. Browser search then located and opened the correct event page: https://twitchcon-codex.devpost.com/rules. Submission deadline: November 2, 2026, 2:00 pm Pacific (November 3, 00:00 SAST).

## Verified implementation

| Item             | Choice / evidence                                                                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime          | Node 24.18.0, pnpm 11.25.0                                                                                                                                                                                                                                 |
| Codex SDK        | `@openai/codex-sdk` 0.164.0; installed TypeScript definitions inspected                                                                                                                                                                                    |
| Web server       | Fastify 5.12.7, `@fastify/static` 8.3.0, ws 8.22.0                                                                                                                                                                                                         |
| Client           | Vite 8.3.5, Canvas 2D, TypeScript 5.9.3                                                                                                                                                                                                                    |
| Schema           | Zod 4.6.7; literal AST extraction with TypeScript compiler                                                                                                                                                                                                 |
| Auth             | Existing ChatGPT CLI sign-in, confirmed with `codex login status`                                                                                                                                                                                          |
| Model            | Unspecified; use account default. No fabricated availability or speed comparison                                                                                                                                                                           |
| Measured latency | One real Codex SDK build: 14,385 ms; 18,322 input tokens and 144 output tokens; all gates passed                                                                                                                                                           |
| Twitch identity  | OAuth channel-owner user token, `user:read:chat` only                                                                                                                                                                                                      |
| EventSub         | `wss://eventsub.wss.twitch.tv/ws`; `POST https://api.twitch.tv/helix/eventsub/subscriptions`; type `channel.chat.message`, version `1`; condition `broadcaster_user_id` and `user_id` both signed-in broadcaster                                           |
| OAuth            | `https://id.twitch.tv/oauth2/authorize`, `https://id.twitch.tv/oauth2/token`, `https://id.twitch.tv/oauth2/validate`; single-use random state, ten-minute lifetime                                                                                         |
| Gemini           | `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent`; `x-goog-api-key` header; JSON structured response schema. Current default `gemini-3.8-flash`, verified in official docs and account-tested October 25, 2026 |

`pnpm-lock.yaml` pins the entire resolved dependency tree. The Google Fonts stylesheet is optional visual polish; system fallbacks work offline.

## Core product refinement

The demo is a tiny live show, with one irreversible-looking moment made reversible: a viewer’s rule changes an already-running game. Keep the proposed rule readable in one sentence. Keep the new mechanic visually obvious. Put the code and gates beside the consequence. Credit the proposer after the ship. A failed build resolves the suspense without taking down the game.

Three mechanics are enough: tiny duck splitting, gravity reversal, and slow-motion pickups. Raid transfer, Predictions, Channel Points and chat replies add integration risk without strengthening the first reveal, so they are deferred. Ordinary numbered chat votes work on channels without Affiliate status. The confidence feature has no currency, rewards or prizes.

## Deliberate deviations from the pasted architecture

1. **Declarative TypeScript instead of arbitrary JavaScript in SES.** The parser accepts exactly one export-default object containing allowed literal values. It rejects computed properties, duplicate keys, spreads, calls, accessors, imports and all other statements. The schema rejects unknown keys and out-of-bounds values. No generated JavaScript is evaluated. This eliminates the need to claim SES can solve infinite loops or CPU exhaustion.
2. **Read-only SDK workspace instead of agent-editable Git worktrees.** The agent returns the actual source file through a structured JSON response. It has no reason to edit or execute files. The host validates and installs it. The worker gets a new empty scratch directory, agent networking and web search disabled, per-attempt abort, and a minimal environment. The OS sandbox is defense in depth; read-only mode does not promise that every file outside the workspace is unreadable. Isolation on a dedicated VM is recommended.
3. **No extra Gemini dependency for trusted starter ideas.** Reviewed specs are built by the same real SDK worker. Free-form live proposals require Gemini screening. Rehearsal example loading and live generation are explicitly labeled.
4. **Single server, separate browser views.** The game, studio and overlay share one frontend bundle and state hub. This removes a deployment step. Separate game pages run independent simulations.
5. **Explicit human build approval.** Winning the vote only enters `ready`. A streamer action launches Codex. Votes and confidence votes close before building. Only one build runs; a failed artifact gets at most one repair. Kill switch aborts in-flight work and rejects stale completions.

## What the gates prove

The gate validates syntax/capabilities, property bounds, finite state in a 3,600-tick reference simulation, and a 500 ms validator time budget. The browser engine caps asteroids at 96, bullets at 80, pickups at 12 and particles at 240. It does **not** benchmark rendering across every device or prove every mechanic is fun. Runtime frame duration is measured by the engine, but it is not used as an agent promotion gate. Text is escaped before DOM insertion; Canvas text has no markup execution. Free-form proposal moderation is provided by Gemini, not claimed as a formal safety proof.

## Owner game creator — October 25, 2026

Added a second Codex artifact type: a flat, literal-only game blueprint. Shooter, dodger and collector engines have separate win conditions. Owners choose a mode, describe a world, play an isolated preview, then publish. Chat edits the installed rules afterward. Game creation never evaluates generated JavaScript. Ocean and garden hazards support explicit jellyfish/thorn styles as well as theme-aware rock rendering.

The mod worker receives the installed rules as its baseline, preserving the owner-created game's setup. Published blueprints and rules persist atomically in `.local/world.json`; votes and drafts stay transient. Owner WebSockets authenticate in a message. Public projections strip unpublished blueprint, source, gates and creation feed. Loopback without an admin token is a trusted operator environment.

Observed checks: real Twitch proposal → Six Second Flip, 23.010 seconds; owner generation → Honeyglow Hustle, 27.195 seconds; authenticated studio rainbow-trail patch → 21.184 seconds, preserving bee/garden/collector/magnet; rollback restored starting rules. An ocean/submarine dodger blueprint generated in 34.228 seconds. A real WebSocket check proved that spectators did not receive the draft and owner authentication revealed it. Studio tests are not presented as Twitch viewer votes.

The source review found a draft visibility defect, fixed with authenticated projections and regression coverage. Touch mapping now accounts for letterboxing. Moderation gets the trusted game context and maps player/hazard synonyms into the Mod API. Package versions, SDK configuration and the Gemini model were unchanged; the verified official references below still apply for this date. See GAME-CREATOR.md for scope and controls.

## Primary sources

- [OpenAI Codex SDK](https://developers.openai.com/codex/sdk) — SDK threads, streamed execution, structured configuration.
- [OpenAI Codex authentication](https://developers.openai.com/codex/auth) — ChatGPT sign-in, CLI auth status, plan versus API-key access. Current guidance warns against exposing Codex execution in untrusted public environments.
- [Twitch EventSub WebSocket handling](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) — welcome subscription deadline, keepalive, revocation, handoff reconnect URL and event delivery.
- [Twitch chat send and receive](https://dev.twitch.tv/docs/chat/send-receive-messages/) — chat integration surfaces.
- [Twitch EventSub subscription types](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage) — chat-message type, condition and scope.
- [Twitch OAuth token flows](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/) — authorization-code flow and token endpoint.
- [Twitch API reference](https://dev.twitch.tv/docs/api/reference/) — endpoint reference, including deferred Polls/Predictions/Channel Points/Send Chat Message. No write scopes are requested for those deferred features.
- [Twitch CLI WebSocket testing](https://dev.twitch.tv/docs/cli/websocket-event-command/) — mock-server testing. Not yet exercised; no passing mock claim is made.
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) — typed JSON model responses.

## Unverified / pending

Personal eligibility declarations; official Twitch CLI mock and long-running reconnect resilience; sustained Gemini quota/latency; Docker sandbox behavior; final entry. Devpost registration was confirmed through the connected plugin on October 25. Real OAuth, EventSub proposal delivery and chat-to-code shipping passed on @rapha18th. No `codex debug models` capability was assumed or invoked.

## Gemini model update — October 25, 2026

The configured model is now `gemini-3.8-flash`. Verified [Google’s catalog](https://ai.google.dev/gemini-api/docs/models) and [model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash): stable ID, structured outputs supported, recommended for new projects. Google describes 2.5 access as restricted to existing users rather than formally deprecated. The old default was unsuitable for this new project.

Updated both code fallbacks and `.env.example`, preserving the user’s `.env`. Live checks passed: supported proposal accepted, safe display text accepted, instruction injection rejected locally. Run `pnpm exec tsx scripts/check-gemini.ts` to repeat. Current official docs and registry metadata are now required before version/model/integration choices, recorded globally and in project AGENTS.md.
# Multiplayer decision, October 25, 2026

The garden collector runs in one authoritative server simulation. Player sockets send bounded steering input. The server owns positions, entities, collisions, score, and the clock. Rule patches update this existing room. Rollback restores rules while preserving progress. Publishing a new starting game resets the room and retains seats. The room permits 24 bees; verification and the controlled film exercised three concurrent clients.

Official ws documentation checked October 25, 2026: https://github.com/websockets/ws/blob/master/doc/ws.md . The integration uses the existing dependency and documented upgrade, message, ready-state, payload-limit, send, close, and bufferedAmount APIs. No package, model ID, or external endpoint changed for multiplayer.

The judge launcher validates a reviewed garden in an isolated save and rehearsal mode. It provides immediate cooperative play without credentials. Live creation and Twitch remain covered by the normal setup.
