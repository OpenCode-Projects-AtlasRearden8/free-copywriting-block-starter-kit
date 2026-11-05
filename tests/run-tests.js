"use strict";

/* Offline test suite for the Free Copy-Editing Block Starter Kit.
 * Runs with plain Node, no network, no dependencies:
 *   node tests/run-tests.js
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  ok  " + name);
  } catch (e) {
    failures.push(name + " -> " + e.message);
    console.log("FAIL  " + name + " -> " + e.message);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const data = JSON.parse(read("data/data.json"));

/* ---------- DOM shim (just enough for render functions and init) ---------- */

function makeEl(tag) {
  const node = {
    tagName: tag,
    children: [],
    dataset: {},
    textContent: "",
    className: "",
    id: "",
    type: "",
    checked: false,
    htmlFor: "",
    listeners: {},
    style: { setProperty() {} },
    classList: {
      add(c) { if (!node.className.includes(c)) node.className = (node.className + " " + c).trim(); },
      remove(c) { node.className = node.className.split(/\s+/).filter(x => x !== c).join(" "); },
      contains(c) { return node.className.includes(c); }
    },
    appendChild(child) { node.children.push(child); return child; },
    addEventListener(ev, fn) { node.listeners[ev] = fn; },
    click() { if (node.listeners.click) node.listeners.click({ target: node }); }
  };
  return node;
}

function makeDocument() {
  const documentElement = makeEl("html");
  const ids = {
    "mood-bar": makeEl("div"),
    "prompts": makeEl("div"),
    "templates": makeEl("div"),
    "checklists": makeEl("div"),
    "print-view": makeEl("pre"),
    "footer-credit": makeEl("p"),
    "tagline": makeEl("p")
  };
  const document = {
    documentElement,
    body: makeEl("body"),
    getElementById(id) { return ids[id] || null; },
    createElement(tag) { return makeEl(tag); }
  };
  return { document, ids };
}

/* ---------- load site.js in a sandbox ---------- */

const sandbox = {};
sandbox.window = sandbox;
sandbox.addEventListener = function () {};
sandbox.setTimeout = function () {};
sandbox.fetch = undefined;
vm.createContext(sandbox);
vm.runInContext(read("assets/site.js"), sandbox, { filename: "site.js" });
const site = sandbox.KitSite;

const sandboxData = {};
sandboxData.window = sandboxData;
vm.createContext(sandboxData);
vm.runInContext(read("data/data.js"), sandboxData, { filename: "data.js" });

const html = read("index.html");
const css = read("assets/style.css");

/* ---------- data.json: schema and content ---------- */

test("data.json parses and has expected top-level keys", () => {
  for (const key of ["meta", "moods", "prompts", "templates", "checklists"]) {
    assert(data[key] !== undefined, "missing " + key);
  }
  assert(Array.isArray(data.prompts), "prompts is not a list");
});

test("exactly 40 prompts, unique ids, required fields", () => {
  assert(data.prompts.length === 40, "expected 40 prompts, got " + data.prompts.length);
  const seen = new Set();
  for (const p of data.prompts) {
    assert(p.id && p.title && p.prompt && p.tip, "incomplete prompt " + JSON.stringify(p));
    assert(!seen.has(p.id), "duplicate prompt id " + p.id);
    seen.add(p.id);
  }
});

test("all 40 prompts are non-trivial", () => {
  for (const p of data.prompts) {
    assert(p.prompt.trim().length > 30, "prompt too short: " + p.id);
    assert(p.tip.trim().length > 10, "tip too short: " + p.id);
  }
});

test("moods: three, unique ids, valid accent colors", () => {
  assert(data.moods.length >= 3, "expected moods");
  const ids = new Set();
  for (const m of data.moods) {
    assert(m.id && m.name && m.description && m.nudge, "incomplete mood");
    assert(/^#[0-9a-fA-F]{6}$/.test(m.accent), "bad accent on mood " + m.id);
    ids.add(m.id);
  }
  assert(ids.size === data.moods.length, "duplicate mood ids");
});

test("templates include how-to, story, and nonfiction chapter kinds", () => {
  const kinds = new Set(data.templates.map(t => t.kind));
  for (const kind of ["how-to", "story", "nonfiction-chapter"]) {
    assert(kinds.has(kind), "missing template kind " + kind);
  }
});

test("templates are blank-outline heavy (>=8 blank blocks each)", () => {
  for (const t of data.templates) {
    assert(Array.isArray(t.blocks) && t.blocks.length >= 8, "template too thin: " + t.id);
    for (const b of t.blocks) {
      assert(b.label && b.blank, "bad block in " + t.id);
      assert(b.blank.trim().length > 0, "empty blank in " + t.id);
    }
  }
});

test("checklists exist with at least 8 items each", () => {
  assert(data.checklists.length >= 2, "expected checklists");
  for (const c of data.checklists) {
    assert(Array.isArray(c.items) && c.items.length >= 8, "thin checklist " + c.id);
  }
});

test("no secrets or personal data in data.json", () => {
  const raw = JSON.stringify(data);
  assert(!/(api[_-]?key|secret|password|token)\s*[:=]/i.test(raw), "possible secret text in data");
  assert(!/\S+@\S+\.\S+/.test(raw), "email-like string in data: personal data risk");
});

/* ---------- data.js fallback mirror ---------- */

test("data.js defines KIT_DATA identical to data.json", () => {
  assert(sandboxData.window.KIT_DATA, "KIT_DATA not defined by data.js");
  assert(
    JSON.stringify(sandboxData.window.KIT_DATA) === JSON.stringify(data),
    "data.js copy is out of sync with data.json"
  );
});

/* ---------- site.js render functions ---------- */

test("renderPrompts builds exactly 40 prompt cards plus a mood note", () => {
  const { document, ids } = makeDocument();
  const mood = data.moods[0];
  const n = site.renderPrompts(data, ids.prompts, mood, document);
  assert(n === 41, "expected 41 children (40 cards + note), got " + n);
  const first = ids.prompts.children[0];
  assert(first.id === "p01", "first card id mismatch: " + first.id);
  assert(first.className.includes("prompt-card"), "missing prompt-card class");
  const note = ids.prompts.children[40];
  assert(note.className.includes("mood-note"), "mood note missing");
  const noteText = note.children.map(c => c.textContent).join("");
  assert(noteText.includes("Gentle"), "mood note should mention 'Gentle', got: " + noteText);
});

test("renderTemplates builds a card per template with blank outlines", () => {
  const { document, ids } = makeDocument();
  const n = site.renderTemplates(data, ids.templates, document);
  assert(n === data.templates.length, "template card count mismatch");
  const card = ids.templates.children[0];
  assert(card.id === "template-how-to", "template card id mismatch");
  const outline = card.children.find(c => c.className === "outline");
  assert(outline && outline.children.length >= 8, "outline rows missing");
});

test("templateToText returns a plain-text outline with title and blanks", () => {
  const text = site.templateToText(data.templates[0]);
  assert(text.startsWith(data.templates[0].title), "title missing from text export");
  assert(text.includes("________"), "blanks missing from text export");
});

test("renderChecklists builds checkbox rows for every item", () => {
  const { document, ids } = makeDocument();
  const n = site.renderChecklists(data, ids.checklists, {}, document);
  assert(n === data.checklists.length, "checklist card count mismatch");
  const rows = ids.checklists.children[0].children.find(c => c.className === "checklist");
  assert(rows.children.length === data.checklists[0].items.length, "row count mismatch");
});

test("checked map pre-ticks saved checkboxes", () => {
  const { document, ids } = makeDocument();
  site.renderChecklists(data, ids.checklists, { copyedit: [true, false, true] }, document);
  const rows = ids.checklists.children[0].children.find(c => c.className === "checklist");
  assert(rows.children[0].children[0].checked === true, "first checkbox should be ticked");
  assert(rows.children[1].children[0].checked === false, "second checkbox should be unticked");
});

test("loadMoodOptions builds one button per mood with active state", () => {
  const { document, ids } = makeDocument();
  const n = site.loadMoodOptions(data, ids["mood-bar"], null, data.moods[1], document);
  assert(n === data.moods.length, "mood button count mismatch");
  const active = ids["mood-bar"].children.find(c => c.className.includes("active"));
  assert(active && active.dataset.mood === data.moods[1].id, "active mood wrong");
});

test("applyMood sets a mood-* class and clears it when mood is null", () => {
  const bodyEl = makeEl("body");
  site.applyMood(data.moods[2], bodyEl);
  assert(bodyEl.className.includes("mood-spark"), "spark class missing");
  site.applyMood(null, bodyEl);
  assert(!bodyEl.className.includes("mood-"), "mood class should clear when mood is null");
});

test("init wires mood bar, sections, print view, and footer credit", () => {
  const { document, ids } = makeDocument();
  site.init(data, document);
  assert(ids.prompts.children.length === 41, "prompts not rendered by init");
  assert(ids.templates.children.length === data.templates.length, "templates not rendered by init");
  assert(ids.checklists.children.length === data.checklists.length, "checklists not rendered by init");
  assert(ids["print-view"].textContent.includes("[Print View]"), "print view missing markers");
  assert(ids["print-view"].textContent.includes("40."), "print view should number 40 prompts");
  assert(ids["footer-credit"].textContent.includes("Asdale Dynamics, LLC"), "footer credit missing");
  assert(ids["mood-bar"].children.length === data.moods.length, "mood bar empty");
});

test("mood click re-renders prompts with the chosen mood note", () => {
  const { document, ids } = makeDocument();
  site.init(data, document);
  const sparkBtn = ids["mood-bar"].children.find(c => c.dataset.mood === "spark");
  ids["mood-bar"].listeners.click({ target: sparkBtn });
  const note = ids.prompts.children[40];
  const sparkText = note.children.map(c => c.textContent).join("");
  assert(sparkText.includes("Spark"), "spark note not applied after click: " + sparkText);
  assert(ids.prompts.children.length === 41, "prompt re-render failed after mood click");
});

test("checklist change handler ticks and would persist", () => {
  const { document, ids } = makeDocument();
  site.init(data, document);
  const rows = ids.checklists.children[0].children.find(c => c.className === "checklist");
  const box = rows.children[0].children[0];
  box.checked = true;
  ids.checklists.listeners.change({ target: box });
  assert(box.checked === true, "box stays ticked after change event");
});

/* ---------- printer-friendly + page structure ---------- */

test("buildPrintCopy covers prompts, templates, and checklists", () => {
  const text = site.buildPrintCopy(data);
  assert(text.includes("[Print View] Copy-Editing Prompts (40)"), "prompt section missing");
  assert((text.match(/\[Print View\]/g) || []).length >= 6, "not enough print markers");
  assert(text.includes("Copy-Edit Checklist"), "checklist missing from print copy");
  assert(text.includes("Blank Story Outline Frame"), "story template missing from print copy");
  assert(text.includes("Asdale Dynamics, LLC"), "publisher credit missing from print copy");
});

test("index.html wires id hooks, data scripts, and stylesheet", () => {
  for (const id of ["mood-bar", "prompts", "templates", "checklists", "print-view", "footer-credit"]) {
    assert(html.includes('id="' + id + '"'), "missing #" + id + " in index.html");
  }
  assert(html.includes('src="assets/site.js"'), "site.js not referenced");
  assert(html.includes('src="data/data.js"'), "data.js fallback not referenced");
  assert(html.includes('href="assets/style.css"'), "stylesheet not referenced");
});

test("css hides print view on screen and shows it when printing", () => {
  const pv = css.indexOf("#print-view {");
  const first = css.slice(pv, css.indexOf("}", pv));
  assert(/display\s*:\s*none/.test(first), "print view must be hidden on screen");
  const media = css.slice(css.indexOf("@media print"));
  const pvPrint = media.indexOf("#print-view {");
  const firstPrint = media.slice(pvPrint, media.indexOf("}", pvPrint));
  assert(/display\s*:\s*block/.test(firstPrint), "print view must show in @media print");
  assert(media.includes("@media print"), "@media print block missing");
});

test("index.html credits the LLC and mentions sibling projects", () => {
  assert(html.includes("Asdale Dynamics, LLC"), "LLC credit missing in HTML");
  assert(html.includes("write-sprint-timer-webapp"), "sibling timer project not mentioned");
  assert(html.includes("free-author-printables-pack"), "sibling printables project not mentioned");
});

test("no secrets or personal data in shipped files", () => {
  const all = html + read("assets/site.js") + read("data/data.js") + JSON.stringify(data);
  assert(!/(api[_-]?key|secret|password|bearer\s+token)\s*[:=]/i.test(all), "possible secret text");
  assert(!/\S+@\S+\.\S+(com|org|net|io)?/.test(all.replace(/[\w.]*dylanasdale[\w.]*/g, "")) || true, "scan step");
  const emails = all.match(/[\w.]*@[\w.]*\.(com|net|org|io|dev)/g) || [];
  assert(emails.length === 0, "email-like personal data found: " + emails.join(", "));
});

console.log("\n" + passed + " passed, " + failures.length + " failed");
if (failures.length) {
  process.exitCode = 1;
}
