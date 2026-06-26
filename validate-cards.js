#!/usr/bin/env node
/* ============================================================
   IN PARLIAMENT :: CARD VALIDATOR
   Run from the repo root:   node validate-cards.js
   Exits 0 and prints PASS if the whole pool is clean.
   Exits 1 and lists every problem if not. Nothing is committed on a FAIL.
   This is the gate. It runs locally before you push, and in CI on every push.

   v2 (2026-06-26): now also validates data/qon.json (the Questions on Notice
   pool, listed under the manifest "qon" key). QoN records are checked for id,
   iso, status, topics, shape and em-dashes exactly like cards, plus a required
   url, and are exempted only from the portfolios check, which QoN does not use.
   Card validation is unchanged.
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STATUS_OK = ['', 'Awaiting reply', 'Answered', 'No clear answer', 'Resolved'];
const ID_RE = /^\d{4}-\d{2}-\d{2}_(LA|EST-A|EST-B|QON)_\d+(?:_[a-z])?(?:_t\d{2})?$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMDASH = '\u2014';
const TEXT_FIELDS = ['title','summary','quote','outcome','ask','answer','finding'];

const errors = [];
const warns = [];
function err(m){ errors.push(m); }
function warn(m){ warns.push(m); }

// 1. Load manifest, every listed card file, and the QoN file. Each must parse.
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR,'manifest.json'),'utf8')); }
catch(e){ console.error('FAIL: cannot read or parse data/manifest.json:', e.message); process.exit(1); }

const records = [];

// Card pool: every file in manifest.cards. Pool tag 'cards'.
for (const fn of (manifest.cards||[])){
  const fp = path.join(DATA_DIR, fn);
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp,'utf8')); }
  catch(e){ err(`${fn}: does not parse as JSON (${e.message})`); continue; }
  if (!Array.isArray(arr)){ err(`${fn}: top level is not an array`); continue; }
  arr.forEach((c,i)=> records.push({c, where:`${fn}[${i}]`, pool:'cards'}));
}

// QoN pool: the single file under manifest.qon. Pool tag 'qon'.
let cardCount = records.length;
if (manifest.qon){
  const fp = path.join(DATA_DIR, manifest.qon);
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp,'utf8'));
    if (!Array.isArray(arr)){ err(`${manifest.qon}: top level is not an array`); }
    else arr.forEach((c,i)=> records.push({c, where:`${manifest.qon}[${i}]`, pool:'qon'}));
  }
  catch(e){ err(`${manifest.qon}: does not parse as JSON (${e.message})`); }
}
const qonCount = records.length - cardCount;

// 2. Per-record checks. Shared rules apply to both pools; portfolios is cards
//    only, url is required on QoN only.
const seen = new Map();
for (const {c, where, pool} of records){
  const id = c && c.id;
  const at = id ? `${id}` : where;

  if (!id){ err(`${where}: missing id`); continue; }
  if (!ID_RE.test(id)) err(`${at}: id does not match the canonical pattern`);
  if (seen.has(id)) err(`${at}: DUPLICATE id (also at ${seen.get(id)})`); else seen.set(id, where);

  if (!c.iso || !ISO_RE.test(c.iso)) err(`${at}: iso missing or not YYYY-MM-DD`);
  if (id && c.iso && !id.startsWith(c.iso)) warn(`${at}: id date does not match iso (${c.iso})`);

  if (STATUS_OK.indexOf(c.status==null?'':c.status) === -1) err(`${at}: status "${c.status}" is not one of the four values (or empty)`);

  if (!Array.isArray(c.topics)) err(`${at}: topics is not an array`);

  // portfolios is a card-pool field. QoN does not carry it.
  if (pool === 'cards' && !Array.isArray(c.portfolios)) err(`${at}: portfolios is not an array`);

  // QoN must carry a real url to the parliament question page.
  if (pool === 'qon' && (typeof c.url !== 'string' || c.url.trim() === '')) err(`${at}: QoN record has no url`);

  // Shape: exactly one of statement (quote/outcome) or Q&A (ask/answer/finding).
  // QoN records are Q&A by nature and pass this unchanged.
  const isStatement = !!(c.quote || c.outcome);
  const isQA = !!(c.ask || c.answer || c.finding);
  if (isStatement && isQA) err(`${at}: mixed shape (has both statement and Q&A fields)`);
  if (!isStatement && !isQA) err(`${at}: no shape (missing both quote/outcome and ask/answer/finding)`);

  // Em-dash scan across visible text.
  for (const f of TEXT_FIELDS){
    if (typeof c[f] === 'string' && c[f].indexOf(EMDASH) !== -1) err(`${at}: em-dash in "${f}" (use a comma, semicolon, or full stop)`);
  }
}

// 3. Report.
const total = records.length;
if (errors.length){
  console.error(`\nFAIL: ${errors.length} error(s) across ${total} record(s). Nothing should be committed until these are fixed.\n`);
  errors.forEach(e=> console.error('  x ' + e));
  if (warns.length){ console.error(`\n  ${warns.length} warning(s):`); warns.forEach(w=> console.error('  ! ' + w)); }
  process.exit(1);
}
console.log(`\nPASS: ${cardCount} cards across ${(manifest.cards||[]).length} file(s) and ${qonCount} QoN records. No duplicate ids, all shapes and statuses valid, no em-dashes.`);
if (warns.length){ console.log(`\n${warns.length} warning(s) (not blocking):`); warns.forEach(w=> console.log('  ! ' + w)); }
process.exit(0);
