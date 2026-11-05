(function (global) {
  "use strict";

  var STORE_PREFIX = "kit:";

  function storeGet(key, fallback) {
    try {
      var v = global.localStorage.getItem(STORE_PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }

  function storeSet(key, value) {
    try {
      global.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      /* offline, no storage: data stays in the page only */
    }
  }

  function clear(node) {
    node.children.length = 0;
    /* real DOM: replacing textContent drops existing children */
    if (node.textContent !== undefined) node.textContent = "";
  }

  function el(tag, className, text, doc) {
    var node = (doc || global.document).createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderPrompts(data, container, mood, doc) {
    clear(container);
    data.prompts.forEach(function (p, i) {
      var card = el("article", "card prompt-card", null, doc);
      card.id = p.id;
      card.appendChild(el("span", "card-num", ("0" + (i + 1)).slice(-2), doc));
      var body = el("div", "card-body", null, doc);
      body.appendChild(el("h3", "card-title", p.title, doc));
      body.appendChild(el("p", "card-prompt", p.prompt, doc));
      body.appendChild(el("p", "card-tip", "Tip: " + p.tip, doc));
      card.appendChild(body);
      container.appendChild(card);
    });
    container.appendChild(buildMoodNote(mood, doc));
    return container.children.length;
  }

  function buildMoodNote(mood, doc) {
    var note = el("p", "mood-note", null, doc);
    if (mood) {
      note.appendChild(el("strong", null, mood.name + " mode: ", doc));
      note.appendChild(el("span", null, mood.nudge, doc));
    }
    return note;
  }

  function renderTemplates(data, container, doc) {
    clear(container);
    data.templates.forEach(function (t) {
      var card = el("article", "card template-card", null, doc);
      card.id = "template-" + t.id;
      var head = el("div", "card-head", null, doc);
      var h = el("h3", "card-title", t.title, doc);
      h.id = "template-" + t.id + "-title";
      head.appendChild(h);
      var btn = el("button", "copy-btn", null, doc);
      btn.type = "button";
      btn.dataset.target = t.id;
      btn.textContent = "Copy plain-text outline";
      head.appendChild(btn);
      card.appendChild(head);
      card.appendChild(el("p", "card-desc", t.description, doc));
      var list = el("ul", "outline", null, doc);
      t.blocks.forEach(function (b) {
        var li = el("li", "outline-row", null, doc);
        if (b.blank.length > 40) li.classList.add("wide");
        li.appendChild(el("span", "outline-label", b.label + ":", doc));
        li.appendChild(el("span", "outline-blank", b.blank, doc));
        list.appendChild(li);
      });
      card.appendChild(list);
      container.appendChild(card);
    });
    return container.children.length;
  }

  function templateToText(t) {
    var lines = [t.title, "=".repeat(40), ""];
    t.blocks.forEach(function (b) {
      lines.push(b.label + ":");
      lines.push("    " + b.blank);
      lines.push("");
    });
    return lines.join("\n").trimEnd() + "\n";
  }

  function renderChecklists(data, container, checkedMap, doc) {
    clear(container);
    data.checklists.forEach(function (c) {
      var card = el("article", "card checklist-card", null, doc);
      card.id = "checklist-" + c.id;
      card.appendChild(el("h3", "card-title", c.title, doc));
      var list = el("ul", "checklist", null, doc);
      (checkedMap[c.id] || []).length; /* touch */
      c.items.forEach(function (item, i) {
        var li = el("li", "check-row", null, doc);
        var box = el("input", "check-box", null, doc);
        box.type = "checkbox";
        box.dataset.list = c.id;
        box.dataset.index = String(i);
        box.checked = Boolean((checkedMap[c.id] || [])[i]);
        var label = el("label", "check-label", null, doc);
        label.htmlFor = "check-" + c.id + "-" + i;
        label.textContent = item;
        box.id = "check-" + c.id + "-" + i;
        li.appendChild(box);
        li.appendChild(label);
        list.appendChild(li);
      });
      card.appendChild(list);
      container.appendChild(card);
    });
    return container.children.length;
  }

  function applyMood(mood, root, doc) {
    ["gentle", "focused", "spark"].forEach(function (m) {
      root.classList.remove("mood-" + m);
    });
    if (mood) root.classList.add("mood-" + mood.id);
    var docEl = doc && doc.documentElement;
    if (docEl && docEl.style) {
      docEl.style.setProperty("--accent", mood ? mood.accent : "#4c7a9b");
    }
  }

  function loadMoodOptions(data, bar, onSelect, current, doc) {
    clear(bar);
    data.moods.forEach(function (m) {
      var btn = el("button", "mood-btn", null, doc);
      btn.type = "button";
      btn.dataset.mood = m.id;
      btn.title = m.description;
      btn.textContent = m.name;
      if (current && current.id === m.id) btn.classList.add("active");
      bar.appendChild(btn);
    });
    return bar.children.length;
  }

  function buildPrintCopy(data) {
    var lines = [];
    lines.push(data.meta.name + " — " + data.meta.tagline);
    lines.push("Published by " + data.meta.publisher + ". Free, offline, no accounts. MIT licensed.");
    lines.push("");
    lines.push("[Print View] Copy-Editing Prompts (40)");
    lines.push("");
    data.prompts.forEach(function (p, i) {
      lines.push((i + 1) + ". " + p.title);
      lines.push("   " + p.prompt);
      lines.push("   Tip: " + p.tip);
      lines.push("");
    });
    data.templates.forEach(function (t) {
      lines.push("[Print View] " + t.title);
      lines.push("");
      t.blocks.forEach(function (b) {
        lines.push("  " + b.label + ":");
        lines.push("      " + b.blank);
        lines.push("");
      });
    });
    data.checklists.forEach(function (c) {
      lines.push("[Print View] " + c.title);
      lines.push("");
      c.items.forEach(function (item) {
        lines.push("  [ ] " + item);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function init(data, doc) {
    doc = doc || global.document;
    var root = doc.body;
    var state = { moodId: storeGet("mood", "gentle") };

    var mood = data.moods.filter(function (m) { return m.id === state.moodId; })[0] || data.moods[0];
    applyMood(mood, root, doc);

    var bar = doc.getElementById("mood-bar");
    var promptsEl = doc.getElementById("prompts");
    var templatesEl = doc.getElementById("templates");
    var checklistsEl = doc.getElementById("checklists");
    var printEl = doc.getElementById("print-view");

    var checkedMap = storeGet("checks", {});

    function selectMood(id) {
      state.moodId = id;
      mood = data.moods.filter(function (m) { return m.id === id; })[0];
      storeSet("mood", id);
      applyMood(mood, root, doc);
      loadMoodOptions(data, bar, null, mood, doc);
      renderPrompts(data, promptsEl, mood, doc);
    }

    loadMoodOptions(data, bar, null, mood, doc);
    bar.addEventListener("click", function (ev) {
      var id = ev.target && ev.target.dataset ? ev.target.dataset.mood : null;
      if (id) selectMood(id);
    });

    renderPrompts(data, promptsEl, mood, doc);
    renderTemplates(data, templatesEl, doc);
    renderChecklists(data, checklistsEl, checkedMap, doc);
    if (printEl) printEl.textContent = buildPrintCopy(data);

    templatesEl.addEventListener("click", function (ev) {
      if (!ev.target.classList.contains("copy-btn")) return;
      var t = data.templates.filter(function (x) { return x.id === ev.target.dataset.target; })[0];
      if (!t) return;
      var text = templateToText(t);
      if (global.navigator && global.navigator.clipboard) {
        global.navigator.clipboard.writeText(text);
      } else {
        global.prompt("Copy this outline:", text);
      }
      ev.target.textContent = "Copied!";
      global.setTimeout(function () { ev.target.textContent = "Copy plain-text outline"; }, 1500);
    });

    checklistsEl.addEventListener("change", function (ev) {
      if (!ev.target.classList.contains("check-box")) return;
      var id = ev.target.dataset.list;
      var idx = Number(ev.target.dataset.index);
      var list = checkedMap[id] || [];
      list[idx] = ev.target.checked;
      checkedMap[id] = list;
      storeSet("checks", checkedMap);
    });

    var footer = doc.getElementById("footer-credit");
    if (footer) footer.textContent = "Free starter kit published by " + data.meta.publisher + " · MIT licensed · Works offline, no accounts";

    return { state: state };
  }

  var api = {
    renderPrompts: renderPrompts,
    renderTemplates: renderTemplates,
    renderChecklists: renderChecklists,
    templateToText: templateToText,
    buildPrintCopy: buildPrintCopy,
    loadMoodOptions: loadMoodOptions,
    applyMood: applyMood,
    init: init
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.KitSite = api;
    /* browser entry: try the live JSON file first, fall back to the
       embedded copy in data/data.js so plain file:// use still works */
    global.addEventListener("DOMContentLoaded", function () {
      fetch("data/data.json")
        .then(function (r) { return r.json(); })
        .then(function (d) { api.init(d); })
        .catch(function () { api.init(global.KIT_DATA); });
    });
  }

})(typeof window !== "undefined" ? window : globalThis);
