# Free Copy-Editing Block Starter Kit

A free directory of copy-editing boosts for stuck authors and journals: **40
copy-editing prompts**, **blank-outline heavy templates** (how-to, story,
nonfiction chapter, revision plan), **revision checklists**, and a
**per-project mood choice** — all plain static HTML that works offline, with a
printer-friendly section, JSON-driven rendering, and no accounts anywhere.

Published free by **Asdale Dynamics, LLC**. Companions in the free-tools
family: *write-sprint-timer-webapp* (timers) and *free-author-printables-pack*
(marketing assets).

## What is inside

| Section | What it does |
| --- | --- |
| Copy-Editing Prompts | 40 tiny one-edit prompts for stuck moments, each with a tip |
| Blank-Outline Templates | How-to guide, story frame, nonfiction chapter, revision plan sheet — every block is a writable blank |
| Revision Checklists | Copy-edit and revision-pass checklists with locally saved ticks |
| Per-project mood | Pick Gentle / Focused / Spark; the page adapts, the choice persists locally |
| Printer-friendly section | A `[Print View]` block prints the entire kit as compact text |

## How it renders

All content lives in `data/data.json`. `assets/site.js` renders the prompts,
templates, checklists, print view, and footer credit from that JSON. The page
first tries to fetch `data/data.json` (when served over http), and falls back
to the mirrored copy in `data/data.js` so opening `index.html` directly from
the file system still works.

## Run it

No build step, no install, no accounts:

```sh
# Option 1: just open it
open index.html            # or double-click it

# Option 2: serve it locally (optional)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tests

Offline Node tests, no dependencies, no network:

```sh
node tests/run-tests.js
```

They verify the data schema (exactly 40 prompts, templates, checklists,
moods), that `data/data.js` mirrors `data/data.json`, that the render
functions produce the expected sections, that the page wiring and
printer-friendly rules exist, and that no secrets or personal data are
committed.

## Privacy

No accounts, no tracking, no uploads. Mood choice and checklist ticks are
stored in your browser's localStorage only.

## License

MIT — Copyright (c) 2026 Asdale Dynamics, LLC. See [LICENSE](LICENSE).
