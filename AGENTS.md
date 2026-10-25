# Chat Ships It

All submission writing uses declarative, product-first prose with short sentences and deliberate pacing. No em dashes. No contrastive antithesis. Follow the user's original product-launch style without impersonating a real presenter.

Use TypeScript. Run pnpm check, pnpm test, pnpm build before commits.
Load credentials only for authorized app execution or integration validation. Never display, log, commit, or send credential files or their contents to unrelated services.
Before selecting or changing dependencies, model IDs, endpoints or integration settings, check current official vendor docs and package registry metadata. Verify lifecycle and compatibility, then record source links and the check date in docs/DECISIONS.md. Do not choose these from memory.
Never label rehearsal, sample, or simulated agent activity as live Codex output.
The only executable game logic is reviewed engine code. Generated mods are
declarative TypeScript object literals, parsed as syntax and never evaluated.
Keep controls authenticated, public state read-only, credentials server-side.
No Twitch messages or external publishing without explicit user authorization.
