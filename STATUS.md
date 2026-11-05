# STATUS.md — Free Copy-Editing Block Starter Kit

Last updated: 2026-11-05

## What was built

A free, static-HTML directory of copy-editing boosts for stuck authors and
journals, published by Asdale Dynamics, LLC:

- **40 copy-editing blocking prompts** (`data/data.json` → `prompts`), each with
  a title, a one-edit prompt, and a tip. Rendered as numbered cards.
- **4 blank-outline heavy templates**: How-To Guide Outline, Story Outline
  Frame, Nonfiction Chapter Outline, and a Revision Plan Sheet. Every block is
  a writable blank; a "Copy plain-text outline" button exports each as text.
- **2 revision checklists**: Copy-Edit Checklist and Revision Pass Checklist,
  with checkboxes that persist in localStorage (per project, browser-local).
- **Per-project mood choice**: Gentle / Focused / Spark buttons. The chosen
  mood adapts the accent color, shows a matching "mood nudge" line on the
  prompts section, and persists locally. No accounts anywhere.
- **Printer-friendly section**: a `[Print View]` block (hidden on screen,
  shown when printing) that outputs the entire kit — all 40 prompts, every
  blank outline, both checklists — as compact printer-friendly text.
- JSON-driven render: `assets/site.js` renders everything from
  `data/data.json`; `data/data.js` mirrors it so opening `index.html` directly
  from the file system (file://) still works.
- Distinct positioning: this kit is prompts/templates/checklists only — the
  sibling projects are `write-sprint-timer-webapp` (timers) and
  `free-author-printables-pack` (marketing assets).

## Layout

```
index.html            static page shell (mood bar, sections, [Print View])
assets/site.js        JSON renderer + mood/checklist logic (browser + testable)
assets/style.css      screen styling + @media print rules
data/data.json        single source of truth for all content
data/data.js          mirrors data.json (file:// fallback), verified by tests
tests/run-tests.js    offline test suite (plain Node, zero dependencies)
README.md, LICENSE    MIT, Copyright (c) 2026 Asdale Dynamics, LLC
```

## How to run it

No build step, no dependencies:

```sh
open index.html                  # just open the file
# or
python3 -m http.server 8000      # optional local server
```

## How to verify

```sh
node tests/run-tests.js
```

## Verification results

- `node tests/run-tests.js` → **24 passed, 0 failed** (data schema counts,
  data.js/data.json sync check, render functions, init wiring, mood-switch
  re-render, checkbox persistence wiring, print copy coverage, page/CSS
  wiring, no-secrets/no-personal-data scans).
- `node --check` on `assets/site.js`, `data/data.js`, `tests/run-tests.js` → clean.
- CSS brace balance verified programmatically.
- Browser bootstrap verified in a VM sandbox for both paths: fetch of
  `data/data.json` over http, and the `data/data.js` fallback for file://.
- LICENSE contains the exact line `Copyright (c) 2026 Asdale Dynamics, LLC`;
  README credits Asdale Dynamics, LLC.
- Git initialized with a single clean commit; no push, no remote, no publish.

## Known gaps

- No rich-text editor integration; "Copy outline" uses the clipboard API with
  a prompt() fallback for very old browsers.
- The mood choice is one global value (localStorage), not per-URL project
  slots yet — "per-project" means each visit/patient pick, not multiple saved
  profiles.
- No automated screenshot/print-PDF test; print rules are covered by tests
  asserting the @media print implementation, not by rendering.
- `data/data.js` is a generated mirror; edit `data/data.json`, then regenerate
  (a Regenerate command will land with the next polish pass).
- Everything is English-only; i18n not started.
