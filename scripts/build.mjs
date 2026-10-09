#!/usr/bin/env node
// Funding Watch build: housekeeping, validation and generated files.
//
//   node scripts/build.mjs           archive passed deadlines, validate, write meta/ics/csv
//   node scripts/build.mjs --check   validate only, change nothing (used in CI)
//
// Exits with code 1 when validation fails. Nothing is written in that case.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const p = (...parts) => join(ROOT, ...parts);
const readJson = (f) => JSON.parse(readFileSync(p(f), "utf8"));

const profile = readJson("config/profile.json");
const active = readJson("data/opportunities.json");
const archive = readJson("data/archive.json");
let meta = {};
try { meta = readJson("data/meta.json"); } catch { /* first run */ }

// "Today" in Amsterdam, as YYYY-MM-DD
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());

// ---------- housekeeping: move passed deadlines to the archive ----------
const moved = [];
if (!CHECK_ONLY) {
  const keep = [];
  for (const item of active.items) {
    if (item.status !== "Rolling" && item.deadline && item.deadline < today) {
      archive.items.push({ ...item, status: "Closed" });
      moved.push(item);
    } else if (item.status === "Closed") {
      archive.items.push(item);
      moved.push(item);
    } else {
      keep.push(item);
    }
  }
  active.items = keep;
}

// ---------- validation ----------
const V = profile.vocabularies;
const errors = [];
const warnings = [];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS = ["id", "name", "funder", "scope", "funderType", "type", "careerStages", "themes", "diseaseAreas",
  "summary", "budget", "status", "opens", "deadline", "deadlineConfirmed", "deadlineStage", "phases",
  "partnersRequired", "partnersNote", "recurrence", "url", "added", "lastVerified"];

function validDate(s) {
  if (!DATE.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function check(item, where) {
  const tag = `${where} id ${item.id ?? "?"}`;
  const err = (m) => errors.push(`${tag}: ${m}`);
  for (const f of FIELDS) if (!(f in item)) err(`missing field "${f}"`);
  for (const f of Object.keys(item)) if (!FIELDS.includes(f)) err(`unknown field "${f}"`);
  if (!Number.isInteger(item.id)) err("id must be an integer");
  for (const f of ["name", "funder", "summary", "url"]) {
    if (typeof item[f] !== "string" || !item[f].trim()) err(`"${f}" must be a non-empty string`);
  }
  const one = (f, list) => { if (!list.includes(item[f])) err(`${f} "${item[f]}" not in vocabulary`); };
  const many = (f, list, allowEmpty) => {
    if (!Array.isArray(item[f])) return err(`${f} must be an array`);
    if (!allowEmpty && item[f].length === 0) err(`${f} must not be empty`);
    for (const v of item[f]) if (!list.includes(v)) err(`${f} value "${v}" not in vocabulary`);
  };
  one("scope", V.scope); one("funderType", V.funderType); one("type", V.type);
  one("status", V.status); one("deadlineStage", V.deadlineStage); one("phases", V.phases); one("recurrence", V.recurrence);
  many("careerStages", V.careerStages); many("themes", V.themes); many("diseaseAreas", V.diseaseAreas, true);
  if (typeof item.deadlineConfirmed !== "boolean") err("deadlineConfirmed must be true/false");
  if (typeof item.partnersRequired !== "boolean") err("partnersRequired must be true/false");
  if (typeof item.partnersNote !== "string") err("partnersNote must be a string");
  for (const f of ["deadline", "opens", "lastVerified"]) {
    if (item[f] !== null && !validDate(item[f])) err(`${f} must be YYYY-MM-DD or null`);
  }
  if (!validDate(item.added)) err("added must be YYYY-MM-DD");
  if (item.deadline === null && item.status !== "Rolling" && item.status !== "Closed") {
    err('deadline may only be null for status "Rolling"');
  }
  if (item.deadline === null && item.deadlineConfirmed) err("deadlineConfirmed is true but there is no deadline");
  if (typeof item.url === "string" && !/^https:\/\/[^\s]+$/.test(item.url)) err("url must start with https:// and contain no spaces");
  if (item.budget !== null) {
    const b = item.budget;
    if (typeof b !== "object") err("budget must be an object or null");
    else {
      for (const k of ["min", "max"]) if (b[k] !== null && !(typeof b[k] === "number" && b[k] >= 0)) err(`budget.${k} must be a number or null`);
      if (!V.currency.includes(b.currency)) err(`budget.currency "${b.currency}" not in vocabulary`);
      if (b.min && b.max && b.min > b.max) err("budget.min is larger than budget.max");
    }
  }
  if (where === "active" && item.deadline && item.deadline < today && item.status !== "Rolling") {
    err(`deadline ${item.deadline} has passed; it belongs in the archive`);
  }
}

active.items.forEach((i) => check(i, "active"));
archive.items.forEach((i) => check(i, "archive"));

const seen = new Map();
for (const [where, list] of [["active", active.items], ["archive", archive.items]]) {
  for (const i of list) {
    if (seen.has(i.id)) errors.push(`duplicate id ${i.id} (${seen.get(i.id)} and ${where})`);
    else seen.set(i.id, where);
  }
}
const names = new Map();
for (const i of active.items) {
  const key = (i.funder + "|" + i.name).toLowerCase();
  if (names.has(key)) errors.push(`active id ${i.id}: same funder and name as id ${names.get(key)}`);
  names.set(key, i.id);
}
const pastCutoff = active.items.filter((i) => i.status === "Rolling" && i.deadline && i.deadline < today).map((i) => i.id);
if (pastCutoff.length) warnings.push(`rolling entries with a passed next cut-off (update or set to null): ${pastCutoff.join(", ")}`);
const stale = active.items.filter((i) => i.lastVerified === null).length;
if (stale) warnings.push(`${stale} active entries have never been verified (lastVerified is null)`);

if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
for (const w of warnings) console.warn("warning: " + w);
console.log(`OK: ${active.items.length} active, ${archive.items.length} archived.`);
if (CHECK_ONLY) process.exit(0);

// ---------- write data back (sorted, stable formatting) ----------
const byDeadline = (a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999") || a.id - b.id;
active.items.sort(byDeadline);
archive.items.sort((a, b) => (b.deadline ?? "").localeCompare(a.deadline ?? "") || b.id - a.id);
const dump = (o) => JSON.stringify(o, null, 1) + "\n";
writeFileSync(p("data/opportunities.json"), dump(active));
writeFileSync(p("data/archive.json"), dump(archive));
if (moved.length) console.log(`Archived ${moved.length}: ${moved.map((m) => m.id).join(", ")}`);

// ---------- meta ----------
const count = (f) => active.items.reduce((m, i) => ((m[i[f]] = (m[i[f]] || 0) + 1), m), {});
meta = {
  ...meta,
  lastBuild: new Date().toISOString(),
  activeCount: active.items.length,
  archiveCount: archive.items.length,
  byStatus: count("status"),
  byScope: count("scope"),
  maxId: Math.max(...active.items.map((i) => i.id), ...archive.items.map((i) => i.id)),
};
writeFileSync(p("data/meta.json"), JSON.stringify(meta, null, 1) + "\n");

// ---------- iCalendar feed (confirmed deadlines only) ----------
const icsEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line) => {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 74) {
    let cut = 74;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 74) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
};
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Funding Watch//UU PE&CP//EN", "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH", "X-WR-CALNAME:Funding Watch deadlines", "X-WR-TIMEZONE:Europe/Amsterdam"];
for (const i of active.items) {
  if (!i.deadline || !i.deadlineConfirmed || i.deadline < today) continue;
  const d = i.deadline.replace(/-/g, "");
  const next = new Date(i.deadline + "T00:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const dEnd = next.toISOString().slice(0, 10).replace(/-/g, "");
  ics.push("BEGIN:VEVENT", `UID:funding-watch-${i.id}-${d}@robheerdink-collab.github.io`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${dEnd}`,
    fold(`SUMMARY:${icsEscape(`${i.deadlineStage} deadline: ${i.name}`)}`),
    fold(`DESCRIPTION:${icsEscape(`${i.funder}. ${i.summary}\n\n${i.url}`)}`),
    fold(`URL:${i.url}`), "TRANSP:TRANSPARENT", "END:VEVENT");
}
ics.push("END:VCALENDAR");
writeFileSync(p("deadlines.ics"), ics.join("\r\n") + "\r\n");

// ---------- CSV export ----------
const csvCell = (v) => {
  const s = Array.isArray(v) ? v.join("; ") : v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cols = ["id", "name", "funder", "scope", "funderType", "type", "status", "opens", "deadline", "deadlineConfirmed",
  "deadlineStage", "budgetMin", "budgetMax", "currency", "careerStages", "themes", "diseaseAreas", "phases",
  "partnersRequired", "partnersNote", "recurrence", "summary", "url", "added", "lastVerified"];
const rows = [cols.join(",")];
for (const i of active.items) {
  const r = { ...i, budgetMin: i.budget?.min ?? "", budgetMax: i.budget?.max ?? "", currency: i.budget?.currency ?? "" };
  rows.push(cols.map((c) => csvCell(r[c])).join(","));
}
writeFileSync(p("opportunities.csv"), "\uFEFF" + rows.join("\r\n") + "\r\n");
console.log("Wrote data/meta.json, deadlines.ics, opportunities.csv");
