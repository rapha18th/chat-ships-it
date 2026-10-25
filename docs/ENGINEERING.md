# Engineering notes

## Generated artifacts

Codex returns TypeScript containing an export-default object. The host parses its AST and admits only allowed literal values. A strict schema rejects unknown properties and invalid bounds. Reviewed engine code applies the validated data.

The four checks cover syntax and capabilities, schema and bounds, a deterministic simulation, and the validation time budget. They check bounded behavior within supported mechanics. They do not establish device-wide rendering performance or game quality.

A failed artifact leaves the current rules active. The worker receives validation diagnostics for at most one repair attempt. Cancellation prevents a stale result from replacing the world.

## State and controls

Owner actions use the control API. Public projections omit unpublished drafts. Game inputs use a separate bounded WebSocket protocol. The garden simulation owns movement, collision, score, and time. It runs at 20 Hz and broadcasts at 10 Hz. Other game engines run solo.

Published blueprints and active rules persist to disk. Shared round progress stays in memory. A rule patch preserves the existing room. Publishing a new blueprint resets it. See [multiplayer](MULTIPLAYER.md) and [architecture](ARCHITECTURE.md).

## Vendor verification

The implementation references below were checked on October 25, 2026. Exact resolved packages are recorded in `pnpm-lock.yaml`. Dependency versions, model IDs, endpoints, and integration settings require current official documentation and registry verification before changes.

- [Codex SDK](https://developers.openai.com/codex/sdk)
- [Codex authentication](https://developers.openai.com/codex/auth)
- [Twitch EventSub WebSocket handling](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/)
- [Twitch chat message events](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage)
- [Twitch OAuth authorization code flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow)
- [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [ws API](https://github.com/websockets/ws/blob/master/doc/ws.md)

The worker uses existing Codex authentication, a fresh scratch workspace, read-only mode, disabled agent networking, and a stripped service-key environment. Isolation remains dependent on the host. See [setup](SETUP.md) before exposing a server.
