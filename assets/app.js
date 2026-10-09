/* Funding Watch — renders data/opportunities.json. No build step, no framework. */
(() => {
  "use strict";

  // ---------- dates (always Amsterdam calendar days) ----------
  const TZ = "Europe/Amsterdam";
  const DAY = 86400000;
  const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const utc = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const daysUntil = (s) => Math.round((utc(s) - utc(TODAY)) / DAY);
  const addDays = (s, n) => new Date(utc(s) + n * DAY).toISOString().slice(0, 10);
  const fmt = (s, opts) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(utc(s)));
  const longDate = (s) => fmt(s, { day: "numeric", month: "short", year: "numeric" });
  const monday = (s) => { const d = new Date(utc(s)).getUTCDay(); return addDays(s, -((d + 6) % 7)); };

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https:\/\//.test(u) ? u : "#");
  const getJson = (path) => fetch(path, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  });
  const TO_EUR = { EUR: 1, GBP: 1.17, USD: 0.92, DKK: 0.134, CHF: 1.05, SEK: 0.088, NOK: 0.086 }; // sorting only

  function money(b) {
    if (!b || (!b.min && !b.max)) return null;
    const f = (n) => new Intl.NumberFormat("en-GB", {
      style: "currency", currency: b.currency, maximumFractionDigits: n >= 1e6 ? 1 : 0,
      notation: n >= 1e6 ? "compact" : "standard",
    }).format(n);
    if (b.min && b.max && b.min !== b.max) return `${f(b.min)}–${f(b.max)}`;
    if (b.max) return `up to ${f(b.max)}`;
    return `from ${f(b.min)}`;
  }

  // ---------- state ----------
  const GROUPS = ["status", "scope", "careerStages", "type", "centre", "themes", "diseaseAreas"];
  const TOGGLES = { soon: "Closing within 30 days", fresh: "Added in the last 14 days", noPartners: "No consortium or partner required" };
  const KEYS = { status: "st", scope: "sc", careerStages: "cs", type: "ty", centre: "ce", themes: "th", diseaseAreas: "di" };
  const state = { q: "", sort: "deadline", archive: false, week: null, soon: false, fresh: false, noPartners: false };
  GROUPS.forEach((g) => (state[g] = new Set()));

  let profile, meta = {}, active = [], archived = null;
  const CROSS = "Cross-cutting themes";

  // ---------- prepare items ----------
  function displayStatus(i) {
    if (i.status === "Closed") return "Closed";
    if (i.status === "Rolling") return "Rolling";
    if (i.deadline && i.deadline < TODAY) return "Closed";
    if (i.status === "Upcoming" && i.opens && i.opens <= TODAY) return "Open";
    if (i.status === "Upcoming" && !i.deadlineConfirmed) return "Expected";
    return i.status;
  }
  function prepare(raw) {
    // A rolling call whose listed cut-off has passed: hide the stale date until the weekly update sets the next one.
    const i = raw.status === "Rolling" && raw.deadline && raw.deadline < TODAY
      ? { ...raw, deadline: null, deadlineConfirmed: false } : raw;
    const centres = profile.centres.filter((c) => i.themes.some((t) => c.themes.includes(t))).map((c) => c.name);
    if (i.themes.includes("Open (any discipline)")) profile.centres.forEach((c) => centres.includes(c.name) || centres.push(c.name));
    if (!centres.length) centres.push(CROSS);
    const status = displayStatus(i);
    const days = i.deadline ? daysUntil(i.deadline) : null;
    return {
      ...i,
      _status: status,
      _days: days,
      _centre: centres,
      _new: daysUntil(i.added) >= -14,
      _eur: i.budget ? (i.budget.max || i.budget.min || 0) * (TO_EUR[i.budget.currency] || 1) : 0,
      _text: [i.name, i.funder, i.summary, i.type, i.scope, i.funderType, i.partnersNote, ...i.themes, ...i.diseaseAreas, ...i.careerStages]
        .join(" ").toLowerCase(),
    };
  }

  // ---------- filtering ----------
  const valuesOf = (i, g) => {
    switch (g) {
      case "status": return [i._status];
      case "centre": return i._centre;
      case "careerStages": case "themes": case "diseaseAreas": return i[g];
      default: return [i[g]];
    }
  };
  const pool = () => (state.archive && archived ? active.concat(archived) : active);
  const weekRange = () => {
    if (state.week === null) return null;
    const start = addDays(monday(TODAY), state.week * 7);
    return [start, addDays(start, 6)];
  };

  function matches(i, skipGroup, skipWeek) {
    if (!state.archive && i._status === "Closed") return false;
    if (state.q) {
      const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.every((w) => i._text.includes(w))) return false;
    }
    for (const g of GROUPS) {
      if (g === skipGroup || !state[g].size) continue;
      if (!valuesOf(i, g).some((v) => state[g].has(v))) return false;
    }
    if (state.soon && !(i._days !== null && i._days >= 0 && i._days <= 30 && i._status !== "Closed")) return false;
    if (state.fresh && !i._new) return false;
    if (state.noPartners && i.partnersRequired) return false;
    if (!skipWeek) {
      const r = weekRange();
      if (r && !(i.deadline && i.deadline >= r[0] && i.deadline <= r[1] && i._status !== "Closed")) return false;
    }
    return true;
  }

  const SORTS = {
    deadline: (a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || a.name.localeCompare(b.name),
    added: (a, b) => b.added.localeCompare(a.added) || SORTS.deadline(a, b),
    budget: (a, b) => b._eur - a._eur || SORTS.deadline(a, b),
    funder: (a, b) => a.funder.localeCompare(b.funder) || SORTS.deadline(a, b),
  };

  // ---------- filter panel ----------
  function groupDefs() {
    const V = profile.vocabularies;
    const status = ["Open", "Upcoming", "Expected", "Rolling"];
    if (state.archive) status.push("Closed");
    return [
      { key: "status", label: "Status", options: status,
        help: "Expected: a new round is likely but dates are not announced yet." },
      { key: "scope", label: "Funder level", options: V.scope, titles: V.scopeHelp },
      { key: "careerStages", label: "Career stage", options: V.careerStages },
      { key: "type", label: "Type of funding", options: V.type },
      { key: "centre", label: "Centre", options: profile.centres.map((c) => c.name).concat(CROSS) },
      { key: "themes", label: "Theme", options: V.themes, fold: 8 },
      { key: "diseaseAreas", label: "Disease area", options: V.diseaseAreas, fold: 0 },
    ];
  }

  function buildFilters() {
    const html = groupDefs().map((d) => {
      const opts = d.options.map((o) => {
        const title = d.titles && d.titles[o] ? ` title="${esc(d.titles[o])}"` : "";
        return `<label class="opt"${title}><input type="checkbox" data-g="${d.key}" value="${esc(o)}"${state[d.key].has(o) ? " checked" : ""}><span>${esc(o)}</span><span class="opt__n" data-n="${d.key}|${esc(o)}"></span></label>`;
      });
      let body = opts.join("");
      if (d.fold !== undefined && opts.length > d.fold) {
        const anyHidden = d.options.slice(d.fold).some((o) => state[d.key].has(o));
        body = opts.slice(0, d.fold).join("") +
          `<details${anyHidden ? " open" : ""}><summary>${d.fold === 0 ? `Show ${opts.length} disease areas` : `Show ${opts.length - d.fold} more`}</summary>${opts.slice(d.fold).join("")}</details>`;
      }
      const help = d.help ? `<p class="fgroup__help">${esc(d.help)}</p>` : "";
      return `<fieldset class="fgroup"><legend>${esc(d.label)}</legend>${help}${body}</fieldset>`;
    });
    const toggles = Object.entries(TOGGLES).map(([k, label]) =>
      `<label class="opt"><input type="checkbox" data-t="${k}"${state[k] ? " checked" : ""}><span>${esc(label)}</span></label>`).join("");
    $("filter-groups").innerHTML = `<fieldset class="fgroup"><legend>Quick filters</legend>${toggles}</fieldset>` + html.join("");
  }

  function updateCounts() {
    for (const d of groupDefs()) {
      const base = pool().filter((i) => matches(i, d.key, false));
      for (const o of d.options) {
        const el = document.querySelector(`[data-n="${CSS.escape(d.key + "|" + o)}"]`);
        if (!el) continue;
        const n = base.filter((i) => valuesOf(i, d.key).includes(o)).length;
        el.textContent = n;
        el.closest(".opt").classList.toggle("opt--zero", n === 0 && !state[d.key].has(o));
      }
    }
  }

  // ---------- runway ----------
  function renderRunway() {
    const start = monday(TODAY);
    const items = pool().filter((i) => matches(i, null, true) && i.deadline && i._status !== "Closed");
    const cols = [];
    for (let w = 0; w < 12; w++) {
      const from = addDays(start, w * 7), to = addDays(from, 6);
      const inWeek = items.filter((i) => i.deadline >= from && i.deadline <= to).sort(SORTS.deadline);
      const dots = inWeek.map((i) => {
        const cls = ["dot"];
        if (!i.deadlineConfirmed) cls.push("dot--expected");
        if (i._days !== null && i._days <= 14) cls.push("dot--urgent");
        return `<span class="${cls.join(" ")}" title="${esc(`${fmt(i.deadline, { day: "numeric", month: "short" })}: ${i.name}`)}"></span>`;
      }).join("");
      const n = inWeek.length;
      const label = `Week of ${fmt(from, { day: "numeric", month: "long" })}: ${n} deadline${n === 1 ? "" : "s"}`;
      cols.push(`<button type="button" class="week${w === 0 ? " week--now" : ""}" role="listitem" data-week="${w}" aria-pressed="${state.week === w}" aria-label="${esc(label)}">
        <span class="week__label"><strong>${fmt(from, { day: "numeric", month: "short" })}</strong>${n ? `${n} deadline${n === 1 ? "" : "s"}` : "none"}</span>
        <span class="week__dots" aria-hidden="true">${dots}</span>
      </button>`);
    }
    $("runway").innerHTML = cols.join("");
  }

  // ---------- list ----------
  function dateBlock(i) {
    if (i._status === "Rolling") {
      const next = i.deadline && i._days >= 0 ? `next cut-off ${fmt(i.deadline, { day: "numeric", month: "short" })}` : "apply any time";
      return `<div class="date date--rolling"><div class="date__word">Rolling</div><div class="date__left">${next}</div></div>`;
    }
    if (!i.deadline) return `<div class="date date--none"><div class="date__word">No date</div></div>`;
    if (!i.deadlineConfirmed && i._status !== "Closed") {
      return `<div class="date date--expected"><div class="date__word">${fmt(i.deadline, { month: "short" })}</div><div class="date__month">${fmt(i.deadline, { year: "numeric" })}</div><div class="date__left">expected, not yet announced</div></div>`;
    }
    const d = i._days;
    let left;
    if (i._status === "Closed") left = "closed";
    else if (d === 0) left = "today";
    else if (d === 1) left = "tomorrow";
    else left = `in ${d} days`;
    const urgent = i._status !== "Closed" && d <= 14;
    return `<div class="date${urgent ? " date--urgent" : ""}"><div class="date__day">${fmt(i.deadline, { day: "numeric" })}</div><div class="date__month">${fmt(i.deadline, { month: "short", year: "numeric" })}</div><div class="date__left">${left}</div></div>`;
  }

  function itemHtml(i) {
    const url = safeUrl(i.url);
    const budget = money(i.budget);
    const facts = [
      `<li><span class="status status--${i._status}">${i._status}</span></li>`,
      `<li>${esc(i.type)}</li>`,
      `<li>${esc(i.scope)}</li>`,
      i.deadline && i.deadlineStage !== "No fixed deadline" ? `<li><b>Deadline for:</b> ${esc(i.deadlineStage.toLowerCase())}</li>` : "",
      budget ? `<li><b>Budget:</b> ${esc(budget)}</li>` : "",
      i.partnersRequired ? `<li><b>Partners required</b></li>` : "",
    ].join("");
    const rows = [
      ["Who can apply", i.careerStages.join(", ")],
      ["Partners", i.partnersRequired ? `Required${i.partnersNote ? ": " + i.partnersNote : ""}` : (i.partnersNote || "Not required")],
      ["Procedure", i.phases === "Unknown" ? "Not known" : i.phases],
      i.opens ? ["Opens", longDate(i.opens)] : null,
      i.deadline ? [i.deadlineConfirmed ? "Deadline" : "Expected deadline", `${longDate(i.deadline)}${i.deadlineConfirmed ? "" : " (estimate based on previous round)"}`] : null,
      ["Recurs", i.recurrence],
      ["Funder type", i.funderType],
      ["Last checked", i.lastVerified ? longDate(i.lastVerified) : "Not re-checked since the move to this page"],
    ].filter(Boolean).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
    const tags = i.themes.concat(i.diseaseAreas).map((t) => `<li>${esc(t)}</li>`).join("");
    return `<li class="item${i._status === "Closed" ? " item--closed" : ""}" id="call-${i.id}">
      ${dateBlock(i)}
      <div>
        <h3 class="item__title"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(i.name)}</a>${i._new ? `<span class="new">New</span>` : ""}</h3>
        <div class="item__funder">${esc(i.funder)}</div>
        <ul class="facts">${facts}</ul>
        <details class="more"><summary>Details</summary>
          <div class="more__body">
            <p>${esc(i.summary)}</p>
            <dl class="more__grid">${rows}</dl>
            <ul class="tags" aria-label="Themes">${tags}</ul>
            <a class="go" href="${esc(url)}" target="_blank" rel="noopener">Open the call page</a>
          </div>
        </details>
      </div>
    </li>`;
  }

  function render() {
    const list = pool().filter((i) => matches(i)).sort(SORTS[state.sort]);
    $("list").innerHTML = list.map(itemHtml).join("");
    $("empty").hidden = list.length > 0;
    $("results-title").textContent = `${list.length} call${list.length === 1 ? "" : "s"}`;
    const r = weekRange();
    const aw = $("active-week");
    if (r) {
      aw.hidden = false;
      aw.innerHTML = `<span>Showing calls closing ${esc(fmt(r[0], { day: "numeric", month: "short" }))} – ${esc(fmt(r[1], { day: "numeric", month: "short" }))}</span><button type="button" class="linkbtn" id="clear-week">Show all weeks</button>`;
    } else aw.hidden = true;
    renderRunway();
    updateCounts();
    writeHash();
  }

  // ---------- URL state (shareable links) ----------
  function writeHash() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    for (const g of GROUPS) if (state[g].size) p.set(KEYS[g], [...state[g]].join("|"));
    for (const t of Object.keys(TOGGLES)) if (state[t]) p.set(t, "1");
    if (state.archive) p.set("archive", "1");
    if (state.sort !== "deadline") p.set("sort", state.sort);
    if (state.week !== null) p.set("week", String(state.week));
    const h = p.toString();
    history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    state.q = p.get("q") || "";
    for (const g of GROUPS) state[g] = new Set((p.get(KEYS[g]) || "").split("|").filter(Boolean));
    for (const t of Object.keys(TOGGLES)) state[t] = p.get(t) === "1";
    state.archive = p.get("archive") === "1";
    state.sort = SORTS[p.get("sort")] ? p.get("sort") : "deadline";
    const w = parseInt(p.get("week"), 10);
    state.week = w >= 0 && w < 12 ? w : null;
  }

  // ---------- events ----------
  async function ensureArchive() {
    if (archived) return;
    const a = await getJson("data/archive.json");
    archived = a.items.map(prepare);
  }

  function wire() {
    let t;
    $("q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 150); });
    $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
    $("show-archive").addEventListener("change", async (e) => {
      state.archive = e.target.checked;
      if (state.archive) await ensureArchive(); else state.status.delete("Closed");
      buildFilters(); render();
    });
    $("filter-groups").addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.g) { el.checked ? state[el.dataset.g].add(el.value) : state[el.dataset.g].delete(el.value); }
      if (el.dataset.t) state[el.dataset.t] = el.checked;
      render();
    });
    $("reset").addEventListener("click", () => {
      GROUPS.forEach((g) => state[g].clear());
      Object.keys(TOGGLES).forEach((k) => (state[k] = false));
      state.q = ""; state.week = null; $("q").value = "";
      buildFilters(); render();
    });
    $("runway").addEventListener("click", (e) => {
      const b = e.target.closest(".week");
      if (!b) return;
      const w = +b.dataset.week;
      state.week = state.week === w ? null : w;
      render();
      if (state.week !== null) $("results").focus({ preventScroll: false });
    });
    $("active-week").addEventListener("click", (e) => { if (e.target.id === "clear-week") { state.week = null; render(); } });
    $("filters-toggle").addEventListener("click", (e) => {
      const open = $("filters").classList.toggle("is-open");
      e.currentTarget.setAttribute("aria-expanded", String(open));
    });
  }

  function fillChrome() {
    const updated = meta.lastRun || meta.lastBuild;
    if (updated) {
      const d = new Date(updated);
      $("fact-updated").textContent = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
      $("foot-build").textContent = `Data last updated ${new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "long", timeStyle: "short" }).format(d)}.`;
    }
    const open = active.filter((i) => i._status !== "Closed");
    $("fact-active").textContent = open.length;
    $("fact-soon").textContent = open.filter((i) => i._days !== null && i._days >= 0 && i._days <= 30).length;
    $("ics-input").value = new URL("deadlines.ics", location.href).href;
    if (profile.repoUrl) {
      $("changelog-link").href = `${profile.repoUrl}/tree/main/updates`;
      $("suggest-github").href = `${profile.repoUrl}/issues/new?template=suggest-a-call.yml`;
    }
    if (profile.contactEmail) {
      const mail = (subject, body) => `mailto:${profile.contactEmail}?subject=${encodeURIComponent(subject)}${body ? "&body=" + encodeURIComponent(body) : ""}`;
      document.querySelectorAll("[data-contact]").forEach((a) => (a.href = mail("Funding Watch")));
      document.querySelectorAll("[data-contact-email]").forEach((el) => (el.textContent = profile.contactEmail));
      document.querySelectorAll("[data-suggest-mail]").forEach((a) => (a.href = mail("Funding Watch: suggested call",
        "Link to the call page:\n\nWhy it is relevant (optional):\n")));
    }
    if (profile.contactName) document.querySelectorAll("[data-contact-name]").forEach((el) => (el.textContent = profile.contactName));
  }

  // ---------- header panels (calendar, suggest, about) ----------
  function wirePanels() {
    const buttons = [...document.querySelectorAll(".bar button[aria-controls]")];
    const close = (except) => buttons.forEach((b) => {
      if (b === except) return;
      b.setAttribute("aria-expanded", "false");
      $(b.getAttribute("aria-controls")).hidden = true;
    });
    buttons.forEach((b) => b.addEventListener("click", () => {
      const panel = $(b.getAttribute("aria-controls"));
      const open = b.getAttribute("aria-expanded") !== "true";
      close(b);
      b.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    }));
    document.addEventListener("keydown", (e) => {
      const openBtn = buttons.find((b) => b.getAttribute("aria-expanded") === "true");
      if (e.key === "Escape" && openBtn) { close(); openBtn.focus(); }
    });
    $("ics-copy").addEventListener("click", async () => {
      const input = $("ics-input");
      try { await navigator.clipboard.writeText(input.value); }
      catch { input.select(); document.execCommand && document.execCommand("copy"); }
      $("ics-done").textContent = "Link copied. Paste it in your calendar app.";
    });
  }

  async function init() {
    wirePanels();
    readHash();
    try {
      const [p, data, m] = await Promise.all([
        getJson("config/profile.json"), getJson("data/opportunities.json"), getJson("data/meta.json").catch(() => ({})),
      ]);
      profile = p; meta = m;
      active = data.items.map(prepare);
      if (state.archive) await ensureArchive();
    } catch (err) {
      $("results-title").textContent = "The list could not be loaded";
      $("empty").hidden = false;
      $("empty").textContent = `Reload the page. If that does not help, the data file may be broken (${err.message}).`;
      return;
    }
    $("q").value = state.q;
    $("sort").value = state.sort;
    $("show-archive").checked = state.archive;
    fillChrome();
    buildFilters();
    wire();
    render();
    window.addEventListener("hashchange", () => { readHash(); buildFilters(); render(); });
  }

  init();
})();
