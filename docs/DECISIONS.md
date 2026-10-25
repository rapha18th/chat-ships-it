# Decisions and verified sources

Recorded October 25, 2026, Africa/Johannesburg. Official API pages were fetched directly after web-search tools failed. Browser search then located and opened the correct event page: https://twitchcon-codex.devpost.com/rules. Submission deadline: November 2, 2026, 2:00 pm Pacific (November 3, 00:00 SAST).

## Verified implementation

| Item             | Choice / evidence                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime          | Node 24.18.0, pnpm 11.25.0                                                                                                                                                                                                 |
| Codex SDK        | `@openai/codex-sdk` 0.164.0; installed TypeScript definitions inspected                                                                                                                                                    |
| Web server       | Fastify 5.12.7, `@fastify/static` 8.3.0, ws 8.22.0                                                                                                                                                                         |
| Client           | Vite 8.3.5, Canvas 2D, TypeScript 5.9.3                                                                                                                                                                                    |
| Schema           | Zod 4.6.7; literal AST extraction with TypeScript compiler                                                                                                                                                                 |
| Auth             | Existing ChatGPT CLI sign-in, confirmed with `codex login status`                                                                                                                                                          |
| Model            | Unspecified; use account default. No fabricated availability or speed comparison                                                                                                                                           |
| Measured latency | One real Codex SDK build: 14,385 ms; 18,322 input tokens and 144 output tokens; all gates passed                                                                                                                           |
| Twitch identity  | OAuth channel-owner user token, `user:read:chat` only                                                                                                                                                                      |
| EventSub         | `wss://eventsub.wss.twitch.tv/ws`; `POST https://api.twitch.tv/helix/eventsub/subscriptions`; type `channel.chat.message`, version `1`; condition `broadcaster_user_id` and `user_id` both signed-in broadcaster           |
| OAuth            | `https://id.twitch.tv/oauth2/authorize`, `https://id.twitch.tv/oauth2/token`, `https://id.twitch.tv/oauth2/validate`; single-use random state, ten-minute lifetime                                                         |
| Gemini           | `POST https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent`; `x-goog-api-key` header; JSON structured response schema. Initial configurable model `gemini-2.5-flash`, not account-tested |

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

Personal eligibility; real Twitch OAuth/EventSub and reconnect behavior; Gemini account model/quota and display-text moderation responses; Docker sandbox behavior; actual stream capture and submission. No `codex debug models` capability was assumed or invoked.
