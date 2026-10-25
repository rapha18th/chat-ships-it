# Architecture

![Chat Ships It system architecture](images/architecture.png)

## Devpost embed

The public diagram is embedded under **How we built it** in the project write-up. Devpost CDN: https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/700/923/datas/original.png

The diagram follows the implementation in apps/server/src/index.ts, round.ts, worker.ts, screen.ts, hive.ts, and packages/core/src/mod.ts. It distinguishes owner game creation, Twitch proposals and direct vote events, generated TypeScript validation, published world persistence, and the authoritative garden example. Other engines remain solo.

Rebuild with scripts/render-architecture.py using Pillow. The visual language combines monochrome component blocks and orthogonal connectors with purple Twitch-event paths. It is a project diagram, without an official vendor certification claim.
