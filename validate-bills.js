#!/usr/bin/env node
/* ============================================================
   IN PARLIAMENT :: BILL VALIDATOR
   Run from the repo root:   node validate-bills.js
   Exits 0 and prints PASS if the whole bill pool is clean.
   Exits 1 and lists every problem if not. Nothing is committed on a FAIL.
   This is the gate. It runs locally before you push, and in CI on every push.

   It reads data/bills-manifest.json and every bill file that manifest lists.
   Each bill file is a top level JSON array of bill objects, the same shape
   as the card files. The schema is documented in BILLS-SCHEMA_v1.md.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const ORIGIN = ['LA', 'LC'];
const PROGRESS = [
  'introduced-la', 'introduced-lc',
  'second-la', 'second-lc',
  'detail-la', 'committee-lc',
  'passed-la', 'passed-lc',
  'between-houses', 'awaiting-assent', 'assented',
  'lapsed', 'withdrawn', 'discharged', 'negatived'
];
const VOTE = ['', 'for', 'against', 'abstain', 'absent', 'na'];
const AMEND_OUTCOME = ['', 'agreed', 'negatived', 'withdrawn', 'pending'];

const ID_RE  = /^wa\d{2}_[a-z0-9-]+$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMDASH = '\u2014';

const errors = [];
const warns = [];
function err(m){ errors.push(m); }
function warn(m){ warns.push(m); }

function scanEmdash(at, label, val){
  if (typeof val === 'string' && val.indexOf(EMDASH) !== -1){
    err(`${at}: em-dash in "${label}" (use a comma, semicolon, or full stop)`);
  }
}

// 1. Load the bills manifest and every listed bill file. Each must parse.
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bills-manifest.json'), 'utf8')); }
catch(e){ console.error('FAIL: cannot read or parse data/bills-manifest.json:', e.message); process.exit(1); }

if (typeof manifest.version !== 'number' || !Number.isInteger(manifest.version)){
  warn('manifest version is not an integer; bump it on every change so the page cache-busts');
}

let bills = [];
for (const fn of (manifest.bills || [])){
  const fp = path.join(DATA_DIR, fn);
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch(e){ err(`${fn}: does not parse as JSON (${e.message})`); continue; }
  if (!Array.isArray(arr)){ err(`${fn}: top level is not an array`); continue; }
  arr.forEach((b, i) => bills.push({ b, where: `${fn}[${i}]` }));
}

// 2. Per-bill checks.
const seen = new Map();
for (const { b, where } of bills){
  const id = b && b.id;
  const at = id ? `${id}` : where;

  if (!id){ err(`${where}: missing id`); continue; }
  if (!ID_RE.test(id)) err(`${at}: id does not match the canonical pattern wa<NN>_<slug>`);
  if (seen.has(id)) err(`${at}: DUPLICATE id (also at ${seen.get(id)})`); else seen.set(id, where);

  // Identity.
  if (typeof b.shortTitle !== 'string' || b.shortTitle.trim() === '') err(`${at}: shortTitle missing or empty`);
  if (ORIGIN.indexOf(b.originHouse) === -1) err(`${at}: originHouse "${b.originHouse}" is not LA or LC`);
  if (!Array.isArray(b.topics)) err(`${at}: topics is not an array`);
  if (typeof b.watching !== 'boolean') err(`${at}: watching must be true or false`);

  // Progress flag (the coarse, human-maintained status; Parliament holds the detail).
  if (PROGRESS.indexOf(b.progress) === -1) err(`${at}: progress "${b.progress}" is not a known stage`);

  // Bevan's position. He sits in the Assembly, so this is the LA-side vote.
  if (typeof b.bevanVote !== 'object' || b.bevanVote === null){
    err(`${at}: bevanVote must be an object with position and rationale`);
  } else {
    if (VOTE.indexOf(b.bevanVote.position) === -1) err(`${at}: bevanVote.position "${b.bevanVote.position}" is not a known value`);
    if (typeof b.bevanVote.rationale !== 'string') err(`${at}: bevanVote.rationale must be a string (empty until a position is taken)`);
    if (b.bevanVote.position && b.bevanVote.position !== 'na' && b.bevanVote.rationale.trim() === ''){
      warn(`${at}: a position is recorded but the rationale is empty`);
    }
    scanEmdash(at, 'bevanVote.rationale', b.bevanVote.rationale);
  }

  // Amendments of note (optional; Parliament holds the full list).
  if (!Array.isArray(b.amendments)){
    err(`${at}: amendments is not an array (use [] if none of note)`);
  } else {
    b.amendments.forEach((a, j) => {
      const aat = `${at} amendments[${j}]`;
      if (ORIGIN.indexOf(a.house) === -1) err(`${aat}: house "${a.house}" is not LA or LC`);
      if (typeof a.desc !== 'string' || a.desc.trim() === '') err(`${aat}: desc missing or empty`);
      if (AMEND_OUTCOME.indexOf(a.outcome) === -1) err(`${aat}: outcome "${a.outcome}" is not a known value`);
      scanEmdash(aat, 'desc', a.desc);
      scanEmdash(aat, 'movedBy', a.movedBy);
      scanEmdash(aat, 'bevanPosition', a.bevanPosition);
    });
  }

  // Links. Parliament's core document page is the live source of truth.
  if (typeof b.links !== 'object' || b.links === null){
    err(`${at}: links must be an object with parliament, em, hansard`);
  } else {
    if (typeof b.links.parliament !== 'string') err(`${at}: links.parliament must be a string`);
    else if (b.links.parliament.trim() === '') warn(`${at}: no Parliament link yet; the page needs it for live status`);
    if (b.links.em != null && typeof b.links.em !== 'string') err(`${at}: links.em must be a string`);
    if (b.links.hansard != null && !Array.isArray(b.links.hansard)) err(`${at}: links.hansard must be an array`);
  }

  // Dates.
  if (b.lastUpdated && !ISO_RE.test(b.lastUpdated)) err(`${at}: lastUpdated is not YYYY-MM-DD`);
  if (b.lastChecked && !ISO_RE.test(b.lastChecked)) err(`${at}: lastChecked is not YYYY-MM-DD`);
  if (!b.lastChecked) warn(`${at}: no lastChecked date; set it when you reconcile against Parliament`);

  // Em-dash scan across the visible text.
  scanEmdash(at, 'shortTitle', b.shortTitle);
  scanEmdash(at, 'fullTitle', b.fullTitle);
  scanEmdash(at, 'portfolio', b.portfolio);
  scanEmdash(at, 'summary', b.summary);
  scanEmdash(at, 'whyItMatters', b.whyItMatters);
}

// 3. Report.
const total = bills.length;
if (errors.length){
  console.error(`\nFAIL: ${errors.length} error(s) across ${total} bill(s). Nothing should be committed until these are fixed.\n`);
  errors.forEach(e => console.error('  x ' + e));
  if (warns.length){ console.error(`\n  ${warns.length} warning(s):`); warns.forEach(w => console.error('  ! ' + w)); }
  process.exit(1);
}
console.log(`\nPASS: ${total} bills across ${(manifest.bills || []).length} file(s). No duplicate ids, all stages, votes and shapes valid, no em-dashes.`);
if (warns.length){ console.log(`\n${warns.length} warning(s) (not blocking):`); warns.forEach(w => console.log('  ! ' + w)); }
process.exit(0);
