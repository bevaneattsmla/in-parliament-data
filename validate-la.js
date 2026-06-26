#!/usr/bin/env node
/* ============================================================
   IN PARLIAMENT :: LOWER-HOUSE LOOKUP VALIDATOR
   Run from the repo root:   node validate-la.js
   Exits 0 and prints PASS if both data files are clean.
   Exits 1 and lists every problem if not. Nothing is committed on a FAIL.
   Gate for: data/la-lookup.json  and  data/members-la.json
   ============================================================ */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const EXPECTED_DISTRICTS = 59;          // WA Legislative Assembly, 42nd Parliament
const EMDASH = '\u2014';
const PC_RE = /^\d{4}$/;
const URL_RE = /^https?:\/\//;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const errors = [];
const warns = [];
const err = m => errors.push(m);
const warn = m => warns.push(m);

function read(name){
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
  catch(e){ console.error(`FAIL: cannot read or parse data/${name}: ${e.message}`); process.exit(1); }
}

const lookup = read('la-lookup.json');
const mem = read('members-la.json');

/* ---------- members-la.json ---------- */
if (!mem || !Array.isArray(mem.members)) err('members-la.json: "members" must be an array');
const members = (mem && mem.members) || [];
const memberDistricts = new Set();

members.forEach((m, i) => {
  const at = `members[${i}]${m && m.district ? ' (' + m.district + ')' : ''}`;
  if (!m || typeof m !== 'object'){ err(`${at}: not an object`); return; }
  ['district','name','party'].forEach(f => {
    if (!m[f] || !String(m[f]).trim()) err(`${at}: "${f}" is empty (fill it from the Parliament list, do not guess)`);
  });
  ['district','name','party','url','email'].forEach(f => {
    if (m[f] && String(m[f]).includes(EMDASH)) err(`${at}: "${f}" contains an em-dash`);
  });
  if (m.url && String(m.url).trim() && !URL_RE.test(String(m.url).trim()))
    warn(`${at}: "url" does not look like a link`);
  if (!m.email || !String(m.email).trim())
    warn(`${at}: "email" is empty (the ask-your-member action will fall back to the Parliament page for this member)`);
  else if (!EMAIL_RE.test(String(m.email).trim()))
    err(`${at}: "email" is not a valid address: ${m.email}`);
  if (m.district){
    const d = String(m.district).trim();
    if (memberDistricts.has(d)) err(`${at}: district "${d}" appears more than once`);
    memberDistricts.add(d);
  }
});

if (members.length !== EXPECTED_DISTRICTS)
  err(`members-la.json: ${members.length} members, expected ${EXPECTED_DISTRICTS} (one per district)`);

/* ---------- la-lookup.json ---------- */
if (!lookup || typeof lookup !== 'object') err('la-lookup.json: not an object');
const byPostcode = (lookup && lookup.byPostcode) || {};
const byLocality = (lookup && lookup.byLocality) || {};
const districtList = (lookup && lookup.districts) || [];
const lookupDistricts = new Set();

if (!Array.isArray(districtList) || !districtList.length)
  err('la-lookup.json: "districts" must be a non-empty array');
districtList.forEach(d => { if (d) lookupDistricts.add(String(d).trim()); });

Object.keys(byPostcode).forEach(pc => {
  if (!PC_RE.test(pc)) err(`la-lookup.json: byPostcode key "${pc}" is not a 4-digit postcode`);
  const locs = byPostcode[pc];
  if (!locs || typeof locs !== 'object'){ err(`la-lookup.json: byPostcode["${pc}"] must map locality to districts`); return; }
  Object.keys(locs).forEach(loc => {
    const ds = locs[loc];
    if (!Array.isArray(ds) || !ds.length) err(`la-lookup.json: byPostcode["${pc}"]["${loc}"] must be a non-empty array`);
    (ds || []).forEach(d => lookupDistricts.add(String(d).trim()));
  });
});

Object.keys(byLocality).forEach(loc => {
  const ds = byLocality[loc];
  if (!Array.isArray(ds) || !ds.length) err(`la-lookup.json: byLocality["${loc}"] must be a non-empty array`);
  (ds || []).forEach(d => lookupDistricts.add(String(d).trim()));
});

/* ---------- cross-reference: every routable district must have a member ---------- */
lookupDistricts.forEach(d => {
  if (!memberDistricts.has(d))
    err(`district "${d}" is in la-lookup.json but has no member in members-la.json (a constituent would get no result). Check spelling and dashes match exactly.`);
});
memberDistricts.forEach(d => {
  if (lookupDistricts.size && !lookupDistricts.has(d))
    warn(`member district "${d}" never appears in la-lookup.json (likely a name or dash mismatch)`);
});

/* ---------- report ---------- */
if (warns.length){ console.log('WARNINGS:'); warns.forEach(w => console.log('  - ' + w)); console.log(''); }
if (errors.length){
  console.error('FAIL: ' + errors.length + ' problem(s):');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}
const withEmail = members.filter(m => m && m.email && EMAIL_RE.test(String(m.email).trim())).length;
console.log(`PASS: ${members.length} members (${withEmail} with verified email), ${Object.keys(byPostcode).length} postcodes, ${lookupDistricts.size} districts.`);
process.exit(0);
