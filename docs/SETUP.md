# Credentials and launch

## Already working locally

The rehearsal needs no keys. The local Codex CLI is signed in with ChatGPT; a real SDK smoke build passed in **14,385 ms**. `.env` enables the authenticated local executable. Authentication material was not copied or printed. The default worker model is the account-configured default; no unverified model name is hard-coded. This benchmark is one run, not a latency guarantee.

## 1. Twitch application

1. Open [Twitch Developer Console → Applications](https://dev.twitch.tv/console/apps). Register an application (name: Chat Ships It; category: Application Integration; confidential client).
2. Add this OAuth redirect URL exactly: `http://localhost:4310/auth/twitch/callback`.
3. Put the Client ID and newly generated Client Secret in the project’s `.env` as `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. Do not paste secrets into chat.
4. Restart `pnpm start`, open Settings, and click **Connect Twitch**. Sign in as the channel owner. The app requests only `user:read:chat`.
5. The callback stores tokens in ignored `.local/twitch-auth.json`. It validates identity, refreshes expiring tokens, and subscribes to `channel.chat.message` over EventSub WebSocket. The signed-in account is both broadcaster and chat-reading user. A separate bot is unnecessary for this version.

Chat commands: `!mod <idea>`, `1` / `2` / `3`, `!bet ship`, `!bet fail`. Broadcaster and moderators can use `!rollback` and `!stopmods`. These commands operate on our app; confidence votes spend no Twitch points. The app does not post Twitch chat messages.

## 2. Gemini proposal screening

Get a key from [Google AI Studio → API keys](https://aistudio.google.com/apikey), set `GEMINI_API_KEY` in `.env`, and restart. `GEMINI_MODEL` is configurable; `gemini-2.5-flash` is the initial default. Confirm availability and quota for your account; this integration has not been exercised with a key here.

Free-form proposals fail closed when Gemini is unavailable. Raw ideas are sent only to the screener, never to Codex or the public feed. Codex receives the neutral capability spec. Only three finalists are retained. Twitch screening is capped at two concurrent requests, twelve attempts per minute, and one attempt per viewer per 30 seconds. Accepted proposals get a separate cooldown. Screening that finishes after a round reset cannot enter the new round.

## 3. Codex on a different machine

Install the [official Codex CLI](https://developers.openai.com/codex/cli), run `codex login`, then `codex login status`. For a headless host, inspect `codex login --help` for that installed version and use its supported device sign-in flow. Do not assume an older device-auth flag is still supported. Use ChatGPT sign-in as requested; no OpenAI API key is required for this configuration.

Set `ENABLE_CODEX=true`. Leave `CODEX_MODEL` blank to use the configured default. Set `CODEX_PATH` only if the CLI is not resolved correctly by the SDK. Run `pnpm exec tsx scripts/codex-smoke.ts` once. This consumes plan usage. It records a source validation result, duration and token counts in ignored `artifacts/codex-smoke.json`.

The worker runs a read-only sandbox in a new scratch directory, disables agent network and web search, strips service keys from its environment, requests structured output, and has a 90-second per-attempt timeout. The host owns artifact validation. Token counts are reported; ChatGPT plan quota percentages are not exposed by the SDK and are not inferred from token usage. Never expose the worker as a public, unauthenticated API.

## OBS

- Studio: `http://localhost:4310/` — streamer controls. Prefer window capture for the exact manual game run.
- Game: `http://localhost:4310/?view=game` — 1920×1080 browser source, autopilot until interacted with.
- Overlay: `http://localhost:4310/?view=overlay` — transparent 1920×1080 browser source; audience panel sits on the left. No streamer controls are rendered visibly.

Independent sources receive the same rule updates but run their own physics. They do not share a player position or score. Do not describe this as synchronized multiplayer.

## Remote hosting

Use a Linux VM behind an HTTPS reverse proxy that forwards HTTP and WebSocket upgrades. Set `PUBLIC_URL` to the final HTTPS origin, `HOST=0.0.0.0`, and a random `ADMIN_TOKEN` of at least 24 characters. Update the Twitch app callback to `${PUBLIC_URL}/auth/twitch/callback`. The streamer enters the token through Settings; it stays in that tab’s session storage. Spectator pages receive state but cannot mutate it without the token.

Docker and Compose are included. Set `ADMIN_TOKEN` even for the Compose localhost port because the process binds to all container interfaces. The Compose port is bound only to host loopback. Run `docker compose up --build -d`. For live Codex, authenticate the container CLI into its dedicated `codex-auth` volume with an interactive terminal; do not copy a Windows executable path or bake credentials into the image. Sandbox support depends on host/container configuration and must be verified by a smoke build. Prefer a host worker on the VM if the container cannot enforce the requested sandbox. Docker deployment was not tested here.

Public production hosting needs a credential storage service, per-streamer sessions, durable state and round audit logs. This build is a single trusted streamer hackathon demo.
