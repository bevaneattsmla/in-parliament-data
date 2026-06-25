#!/usr/bin/env node
/* ============================================================
   IN PARLIAMENT :: CARD VALIDATOR
   Run from the repo root:   node validate-cards.js
   Exits 0 and prints PASS if the whole pool is clean.
   Exits 1 and lists every problem if not. Nothing is committed on a FAIL.
   This is the gate. It runs locally before you push, and in CI on every push.
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

// 1. Load manifest and every listed card file. Each must parse.
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(DATA_DIR,'manifest.json'),'utf8')); }
catch(e){ console.error('FAIL: cannot read or parse data/manifest.json:', e.message); process.exit(1); }

let cards = [];
for (const fn of (manifest.cards||[])){
  const fp = path.join(DATA_DIR, fn);
  let arr;
  try { arr = JSON.parse(fs.readFileSync(fp,'utf8')); }
  catch(e){ err(`${fn}: does not parse as JSON (${e.message})`); continue; }
  if (!Array.isArray(arr)){ err(`${fn}: top level is not an array`); continue; }
  arr.forEach((c,i)=> cards.push({c, where:`${fn}[${i}]`}));
}

// 2. Per-card checks.
const seen = new Map();
for (const {c, where} of cards){
  const id = c && c.id;
  const at = id ? `${id}` : where;

  if (!id){ err(`${where}: missing id`); continue; }
  if (!ID_RE.test(id)) err(`${at}: id does not match the canonical pattern`);
  if (seen.has(id)) err(`${at}: DUPLICATE id (also at ${seen.get(id)})`); else seen.set(id, where);

  if (!c.iso || !ISO_RE.test(c.iso)) err(`${at}: iso missing or not YYYY-MM-DD`);
  if (id && c.iso && !id.startsWith(c.iso)) warn(`${at}: id date does not match iso (${c.iso})`);

  if (STATUS_OK.indexOf(c.status==null?'':c.status) === -1) err(`${at}: status "${c.status}" is not one of the four values (or empty)`);

  if (!Array.isArray(c.topics)) err(`${at}: topics is not an array`);
  if (!Array.isArray(c.portfolios)) err(`${at}: portfolios is not an array`);

  // Shape: exactly one of statement (quote/outcome) or Q&A (ask/answer/finding).
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
const total = cards.length;
if (errors.length){
  console.error(`\nFAIL: ${errors.length} error(s) across ${total} card(s). Nothing should be committed until these are fixed.\n`);
  errors.forEach(e=> console.error('  x ' + e));
  if (warns.length){ console.error(`\n  ${warns.length} warning(s):`); warns.forEach(w=> console.error('  ! ' + w)); }
  process.exit(1);
}
console.log(`\nPASS: ${total} cards across ${(manifest.cards||[]).length} file(s). No duplicate ids, all shapes and statuses valid, no em-dashes.`);
if (warns.length){ console.log(`\n${warns.length} warning(s) (not blocking):`); warns.forEach(w=> console.log('  ! ' + w)); }
process.exit(0);
