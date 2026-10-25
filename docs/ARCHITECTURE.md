# Architecture

![Chat Ships It system architecture](images/architecture.png)

## Devpost embed

The public diagram is embedded under **How we built it** in the project write-up. Devpost CDN: https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/701/021/datas/original.png

The diagram follows the implementation in apps/server/src/index.ts, round.ts, worker.ts, screen.ts, hive.ts, and packages/core/src/mod.ts. It distinguishes owner game creation, Twitch proposals and direct vote events, generated TypeScript validation, published world persistence, and the authoritative garden example. Other engines remain solo.

Rebuild with scripts/render-architecture.py using Pillow. The visual language combines monochrome component blocks and orthogonal connectors with purple Twitch-event paths. It is a project diagram, without an official vendor certification claim.

## Visual references and provider assets

Checked October 25, 2026. The compact revision uses the sparse rounded nodes, fine connectors, monospaced annotations, and light patterned grouping seen in OpenAI engineering figures, with the purple event paths and platform focus of Twitch technical diagrams. Descriptions stay in the write-up.

- OpenAI engineering figure inspected: https://openai.com/index/inside-our-in-house-data-agent/
- Twitch engineering slide 14 inspected: https://qconsf.com/sf2016/system/files/presentation-slides/twitch_plays_pokemon_-_qcon_sf_2016.pdf
- Official OpenAI asset pack: https://cdn.openai.com/brand/OpenAI-Logos-2025.zip
- OpenAI brand reference: https://openai.com/brand/
- Official Twitch asset pack: https://brand.twitch.com/uploads/Twitch-Brand.zip
- Twitch brand reference: https://brand.twitch.com/

The OpenAI Blossom and Twitch Glitch identify their respective services. Both marks remain in their supplied colors and proportions. The provider PNGs are kept in assets/brand/vendor so the diagram can be rebuilt. OpenAI and Twitch own their respective marks. The Codex node identifies the actual runtime worker; no separate ChatGPT API is implied.
