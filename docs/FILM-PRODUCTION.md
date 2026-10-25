# Chat Ships It film

Voice: declarative. Product first. Short sentences. Deliberate pauses. No em dashes. No contrastive antithesis. Original presenter voice.

The film uses a controlled demonstration on the owner's Twitch channel. A single signed-in account sends demo proposals and votes. The film labels this footage as a controlled demo. Codex generation is real. Any compressed wait is labeled. Audience size and independent viewer participation are never fabricated.

## Verified media services

Checked 2026-10-25 against current official documentation.

- Gemini speech: `gemini-3.8-flash-tts`, Interactions REST API, structured speech metadata, prebuilt Charon voice. Stable model listed in the current guide. https://ai.google.dev/gemini-api/docs/speech-generation
- Music: `lyria-3.5`, Interactions REST API. Current full-length model, MP3 stereo output. https://ai.google.dev/gemini-api/docs/music-generation
- REST endpoint: https://generativelanguage.googleapis.com/v1beta/interactions
- FFmpeg Windows essentials build from Gyan, linked distribution used for local editing. Release listed as 9.0.2. Verify downloaded binary and checksum. https://www.gyan.dev/ffmpeg/builds/

Credentials stay in the existing local environment. Media generators receive only the original narration and soundtrack prompt.

## Delivery

1920 by 1080 H.264 MP4. AAC stereo. Under three minutes. Narration, quiet original soundtrack, readable captions, real gameplay, real Twitch messages, real Codex output, clear demonstration labels.

The cut is 2 minutes 32 seconds. The original Lyria composition is 156.891 seconds. Narration uses six Gemini speech clips. FFmpeg slows speech to 90 percent, normalizes it, mixes the quiet score, and burns readable captions into the picture. The speech uses an original prebuilt voice. The score prompt describes instruments, tempo, and arrangement.

## Capture evidence

The local capture utility is available through `?capture=1`. It records the actual game canvas and current server state into a 1920 by 1080 MediaRecorder stream. The resulting frames carry explicit engine-capture and autopilot labels. Editorial cards show captured Twitch messages, the owner form, the private preview, actual source, and measured validation results.

The controlled Twitch round accepted two proposals from the owner's account and one Twitch vote. Real Codex generated Rainbow Honeyglow in 21.354 seconds. All four validation checks passed. Rollback restored the previous rule. The owner flow also created, play-tested, and published Honeyglow Hustle. A separate Glow Pollen draft supplied the private-preview screenshot.

`scripts/film-audio.mjs` generates narration and music. `scripts/film-evidence.mjs` records state changes. `scripts/edit-film.py` edits the captured assets. Inputs and outputs stay under the ignored `artifacts/film` directory. FFmpeg 9.0.2 was downloaded from the documented Windows distribution and verified against its SHA-256 checksum. The executable stays under the ignored `.local/media-tools` directory.

GitHub CLI publication behavior was checked on 2026-10-25 against https://cli.github.com/manual/gh_repo_create . The repository contains source and setup instructions. Credential files, local state, generated media, and local tool binaries are excluded. `scripts/check-publish-secrets.mjs` checks tracked paths and commit patches before publication.
