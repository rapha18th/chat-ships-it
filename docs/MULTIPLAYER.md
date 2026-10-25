# One shared garden

The community creates. The community plays. Codex ships.

Publish a garden collection game with a bee avatar. The shared garden appears above the studio. Copy the player invite. Each viewer chooses a guest name and joins a bee. The streamer starts the round. Nectar from every bee advances the same team goal.

The target is the starting game's target score multiplied by the number of bees present when the round starts. Late arrivals join that goal. The server owns movement, nectar, hazards, score, and the clock. A live patch updates the same room. Rollback restores the previous rule while preserving the room's progress.

## Run

For immediate credential-free play, run `try-multiplayer.cmd` after installing dependencies and building. It validates and saves a reviewed garden in `.local/rehearsal-garden.json`, keeps existing rehearsal progress, disables live Codex generation, and starts on port 4312. Join through `http://127.0.0.1:4312/?view=play` from several browser tabs. The owner starts the round at `http://127.0.0.1:4312/`. Rehearsal patches use clearly labeled reviewed examples. Live game creation and Twitch require the normal setup.

The normal launcher uses port 4310. Run `start-multiplayer.cmd` for an alternate instance on port 4311. It uses a separate `.local/world-multiplayer.json` file and the configured Twitch authorization.

- Studio: http://127.0.0.1:4311/
- Player: http://127.0.0.1:4311/?view=play
- Spectator: http://127.0.0.1:4311/?view=hive

Loopback links work on the host machine. Remote viewers need the same server deployed at a reachable HTTPS address. Configure `HOST`, `PORT`, `PUBLIC_URL`, and a strong `ADMIN_TOKEN` using the existing hosting instructions. Keep the owner token private. Guests connect to the limited game-input socket. The player page does not authenticate as the owner. A public deployment has not been created for this demo.

## Shared state

The server simulates at 20 ticks per second and broadcasts snapshots at 10 frames per second. Browsers interpolate positions for display. Inputs contain a direction and increasing sequence number. The server bounds direction and speed, ignores stale input, and stops steering input after 350 milliseconds without a new command. Each nectar entity can be collected once. Individual hull loss causes a short return to the hive. An empty garden pauses the clock.

The room supports up to 24 connected bees. The game socket allows bounded join and input messages. It has payload, message-rate, connection, and output-buffer limits. Owner actions remain on the authenticated control API. Names are guest names. Twitch chat attribution remains attached to actual Twitch events.

The shared engine applies trails, palette metadata, hazard appearance and speed, gravity and gravity reversal, score multipliers, and shield, magnet, and slow pickups. The multiplayer experience is focused on the garden collector engine. Shooter and survival remain solo engines. Publishing a new world resets the room while retaining connected seats. Shared round progress is in memory; the published world persists on disk.

## Verification

`pnpm exec tsx scripts/check-hive.ts` connects three independent WebSocket clients to the running multiplayer server, starts a round, moves distinct bees, compares snapshots at the same server tick, and verifies that disconnecting releases seats. It writes evidence under the ignored `artifacts/film` directory. Use `HIVE_URL` to point it at another running server.

The automated suite checks single collection, shared scoring, patch continuity, bounded input, stale sequence rejection, disconnected seats, room capacity, and world replacement.

The film utility at `?capture=1` can create three scripted demo clients. They use the same join and input protocol as players. The captured film labels them as scripted players and records real server state. It does not claim independent viewer turnout.

## Documentation check

Verified 2026-10-25 against the official ws documentation: https://github.com/websockets/ws/blob/master/doc/ws.md . The existing dependency is retained. The integration uses documented no-server upgrades, connection events, ready-state checks, payload limits, send, close, and bufferedAmount. No new dependency or model version is introduced for multiplayer.
