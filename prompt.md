You are building a competition entry for make.fun's "token-radar-01" bounty ("Build the best token launch radar"). You are in the repository root (/workspace/radar-entry), which already has a LICENSE and .makefun/. Write ALL entry code yourself, here, in this session. Do not copy the starter's code files wholesale — read them for reference (the starter lives at /workspace/kitdir5/token-radar-01-kit/starter) and then author your own better versions with your own file-write tools. The one exception: copy /workspace/kitdir5/token-radar-01-kit/starter/vendor/makefun-board.ts to vendor/makefun-board.ts unchanged (it is the make.fun dossier library, keep it byte-identical).

WHAT TO BUILD

A radar that reads /input/snapshot.json (sealed DefiLlama snapshot; a local copy is at /workspace/kitdir5/token-radar-01-kit/input/snapshot.json — read it first to learn its shape) and produces:

1. main.ts at repo root (TypeScript that runs as-is under Node 22 with `node main.ts`, standard library only, no npm deps). It must:
   - read the snapshot (path /input/snapshot.json or --input <file|dir>; MAKEFUN_OUTPUT_DIR env or --output for /output),
   - score every pre-token protocol with the model in lib/model.ts and build a ranked board of 100-4000 rows,
   - write /output/board.json as {"rows": [...]}, and /output/data.js (a `window.RADAR = {...}` script) for the dashboard,
   - copy repo dashboard/ and screenshots/ into /output, then write /output/dossier.json with buildDossier from vendor/makefun-board.ts using {text_max_bytes: 65536, screenshots: {max: 4, max_bytes: 524288}, dashboard: {max_files: 400, max_bytes: 4194304}},
   - exit non-zero with a clear message if the board would fail the gate, and print a one-line summary.

2. lib/model.ts — the value model. Requirements:
   - implied_value_usd must be derived from the snapshot's own figures, NOT a hardcoded name list: use the protocol's tvl_usd, its change_7d (null-safe), and how long it has run with no token (age in days from listed_at, null-safe). State the formula in a comment and on the dashboard.
   - Board rows: {slug, name, rank, implied_value_usd, farm_steps, ...} — extra keys allowed (add tvl_usd, change_7d, age_days, category, chains, on_watchlist, a score breakdown, etc.). Ranks exactly 1..N once each; implied_value_usd must be non-increasing as rank ascends and strictly positive whole dollars; the board must NOT have all-equal implied values. Every slug must be a snapshot protocol slug, used once.
   - Coverage: ALL 40 watchlist slugs must appear among the rows; add more rows (early/lower-TVL protocols) to reach at least ~200 rows. Protocols whose mcap_usd is set already have a token: either exclude them from the board or clearly mark them as a separate "token live" set NOT ranked with the pre-token ones (a separate section is fine but rows must still satisfy the rank rules — simplest: rank only pre-token protocols, i.e. rows = protocols with mcap_usd null, sorted by score).
   - implied_value_usd cap: at most 100,000,000,000,000.
   - farm_steps: 3-12 strings per row, each 20-600 characters after trimming. Concrete, generated from the row's data (category, chains, TVL size band, growth sign): name the chains to use, give a deposit amount range scaled to TVL, a duration (e.g. "day 1", "week 2"), and what to watch for. No slogans like "use the protocol". Vary wording by category (DEX/lending/restaking/bridge/LST/infra...) so rows don't all read the same.
   - A robust boardIssue(board, snapshot) validator replicating the gate checks (slug known, ranks 1..N, monotone implied value, farm_steps shape), used by main.ts.

3. dashboard/ — index.html + at least one .css + one .js, no network, no http:// or https:// ANYWHERE in HTML attributes, <style> bodies, inline script imports, the CSS file, or JS import/require/dynamic-import specifiers (visible text and comments may mention URLs). The page loads data.js (window.RADAR) and renders:
   - a ranked board table: rank, protocol, TVL, 7d change, age-with-no-token, implied value, score; sortable by clicking column headers, searchable, and filterable (e.g. by category, by chain, watchlist-only toggle, growth filter),
   - a detail view per protocol (click a row): full score breakdown showing how the implied value was computed from that protocol's own numbers, its chains, category, watchlist status, and its farm steps as a numbered plan,
   - a methodology section explaining the model in plain language (addressed to a reader; this is read by a judge),
   - polished, custom visual design: chosen dark palette, consistent spacing, good typography, sticky table header, readable at a glance. NOT a framework pasted in. Keep the total dashboard source under ~55 KB so it fits whole in the dossier's 65,536-byte text cap.
   - The board must render correctly offline via file:// or a static server reading data.js.

4. Then run the build twice and refine: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /workspace/kitdir5/token-radar-01-kit/input/snapshot.json`. Verify with your own checks: rows >= 200, all 40 watchlist slugs covered, ranks monotone, farm_steps lengths in range, board.json under 8 MiB, data.js loads. Fix anything off and run again (this revision is required — the gate checks that files were written and revised across turns).

5. Add screenshots/ is NOT yours to make — leave it out; the human takes screenshots after. But do create the repo README.md: title "Token Launch Radar" plus one-sentence description of what your radar does, a "## Run it" block with the exact command `MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot>`, and note that the dashboard lives in dashboard/ reading out/data.js.

RULES REMINDERS
- Node 22 standard library only; TypeScript must run directly with node (erasable types only — no enums, no namespaces, no parameter properties).
- Do not fetch anything from the network in main.ts or the dashboard.
- Do not write any file outside this repository (except reading the starter and the snapshot).
- When done, print the board's top 10 rows and the file sizes of dashboard/index.html, dashboard/*.css, dashboard/*.js.
