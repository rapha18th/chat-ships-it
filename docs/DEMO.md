# Demo verification

The [published demo](https://www.youtube.com/watch?v=LRW1DpWr15M) shows a creator-made garden collection game. Three explicitly labeled scripted clients connect through the ordinary multiplayer join and input protocol. The server controls their positions, shared nectar, score, and clock.

Real Twitch proposals and one owner-account vote select the rainbow change. The actual Codex worker generates the TypeScript rule artifact. Rainbow Nectar shipped in 23.751 seconds and passed four checks. The build wait is condensed and labeled.

Integration snapshots confirmed that patch and rollback preserved the same shared round, three connected player IDs, score, target, and remaining time. Capacity is 24 seats; concurrent verification exercised three. The demo runs locally. Remote viewers need a reachable hosted server.

Reproduce multiplayer verification with `scripts/check-hive.ts` against a running server. `scripts/check-shared-patch.mjs` verifies a live build or rollback in a three-player room and consumes Codex usage when building. Outputs go into ignored `artifacts/`.

The video uses original Gemini narration and an original Lyria instrumental. The scripts under `scripts/` provide capture and editing utilities. Media service documentation was checked October 25, 2026:

- [Gemini speech generation](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Lyria music generation](https://ai.google.dev/gemini-api/docs/music-generation)
- [FFmpeg Windows build distribution](https://www.gyan.dev/ffmpeg/builds/)
