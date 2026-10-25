# Owner creates. Chat evolves.

Click **Create a game** in the top bar. Choose an arcade engine, describe the game, and submit the brief. Starter prompts are editable suggestions; clicking one does not start generation.

Gemini screens the untrusted brief into a neutral specification. The real Codex SDK generates a TypeScript blueprint. The literal-only parser, strict bounds, reference simulation and objective schema gate it; a bad blueprint gets one repair attempt. Generated display text is moderated. The owner can play the preview, discard it, or publish it. The existing game stays installed during generation and review.

## Three game engines

| Engine          | Goal                                        | Interaction                                           |
| --------------- | ------------------------------------------- | ----------------------------------------------------- |
| Arena shooter   | Reach the target score before time runs out | Fly, fire, break hazards and collect power-ups        |
| Dodge survival  | Survive the configured duration             | Fly around hazards and collect power-ups; no shooting |
| Collection race | Collect enough tokens before time runs out  | Gather 100-point tokens, avoid hazards; no shooting   |

Worlds: space, ocean, garden, neon. Avatars: ship, submarine, bee, glowing orb. The blueprint sets the theme, avatar, title, objective, round length, target score, hull, movement speed, spawn interval, palette, gravity, hazard appearance/speed/splitting, pickup, trail and score multiplier. Values stay inside enforced engine limits.

The creator generates games within these supported arcade engines. It does not generate arbitrary engines, platforms, multiplayer, cards, uploaded assets or unrestricted executable JavaScript. The UI states these limits before generation.

## Play and publish

The preview supports keyboard and touch. Click to take control. W/up thrust, A/D or left/right turn, R restarts. Space fires in the shooter engine. On touch, hold to steer; shooter also fires. Touch coordinates account for letterboxing. An explicitly labeled autopilot attracts attention before manual play; autopilot is immune to damage and is not a difficulty benchmark.

Publishing starts the new game and opens a fresh chat round. Chat continues with `!mod`, numbered votes and the existing streamer build approval. Codex receives the current game’s rules as its baseline, so unrequested settings are preserved. Chat cannot replace the engine or objective. Hazard/jellyfish/thorn wording maps to the engine’s asteroid fields.

Rollback changes the last mod. Kill switch cancels pending work and restores the current game’s starting rules. Published blueprints and current rules persist in ignored `.local/world.json`; partial votes and unpublished drafts do not survive a restart.

## Owner and spectator boundary

Owner studio WebSockets authenticate in a message, keeping tokens out of URLs. Spectator game and OBS overlay connections receive a projection that strips unpublished draft, blueprint source and draft gate/feed details. Remote owner access requires the configured admin token. Loopback without an admin token is a trusted local operator environment. This remains one channel per server instance, not a hosted multi-tenant service.

## Verified on October 25, 2026

The existing live Twitch round on @rapha18th generated Six Second Flip in 23.0 seconds. The owner creator then generated Honeyglow Hustle in 27.2 seconds: garden, bee, collector, 12 tokens, 60 seconds, magnet pickups. Its playable preview was tested and published. Automated tests cover genre-specific wins/losses, hostile blueprints, validation limits, preview isolation, single repair, cancellation, rule inheritance, baseline restoration, pointer mapping and persistence.

No package or model versions were changed for this feature. It uses the already verified `@openai/codex-sdk` 0.164.0 and `gemini-3.8-flash` with structured output. Moderation timeouts were increased from 15 to 30 seconds after a supported proposal timed out during live testing. Source links and model verification are in DECISIONS.md.
