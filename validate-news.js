#!/usr/bin/env node
/*
  validate-news.js  -  the gate for the IN-PARLIAMENT News page.

  WHAT IT CHECKS
    The two data lists for the News page, PR_RELEASES and PR_MEDIA.
    Run it before anything goes live. Nothing is pasted into the live
    Code Block until this passes clean.

  HOW TO USE
    1. In the News Code Block, copy ONLY the two data blocks: the one
       that fills PR_RELEASES and the one that fills PR_MEDIA. Do not
       copy the engine or the styles.
    2. Paste them into a plain text file, for example news-data.js.
       The <script> tags and the comment banners are fine; this strips
       them before reading.
    3. Run:  node validate-news.js news-data.js
    4. Read the report. Fix every ERROR. Consider every WARNING.
       It must end with RESULT: PASS before you paste to the live page.

  This file has no dependencies. Node alone runs it.
*/

"use strict";
var fs = require("fs");
var vm = require("vm");

function fail(msg){ console.error(msg); process.exit(2); }

var file = process.argv[2];
if(!file){ fail("Usage: node validate-news.js <file>"); }

var raw;
try { raw = fs.readFileSync(file, "utf8"); }
catch(e){ fail("Cannot read file: " + file + "\n" + e.message); }

/* ---- em-dash scan on the raw text, before anything else ---- */
var emdashErrors = [];
raw.split(/\r?\n/).forEach(function(line, i){
  if(line.indexOf("\u2014") !== -1){
    emdashErrors.push("  line " + (i + 1) + ": " + line.trim());
  }
});

/* ---- strip HTML so the JS can run in Node ---- */
var code = raw
  .replace(/<!--[\s\S]*?-->/g, "")     // HTML comment banners
  .replace(/<script\b[^>]*>/gi, "")    // opening <script> tags
  .replace(/<\/script>/gi, "");        // closing </script> tags

/* ---- run it in a sandbox with a fake window ---- */
var sandbox = { window: {} };
vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { filename: file, timeout: 4000 });
} catch(e){
  console.error("PARSE/RUN ERROR: the data did not run.");
  if(/document|getElementById|querySelector|addEventListener/.test(e.message)){
    console.error("HINT: it looks like you included the engine or style code.");
    console.error("Copy ONLY the two data blocks (PR_RELEASES and PR_MEDIA).");
  } else {
    console.error("Most likely a missing comma between objects, or a missing");
    console.error("brace, bracket or quote.");
  }
  console.error("Node's message:");
  console.error("  " + e.message);
  process.exit(2);
}

var releases = sandbox.window.PR_RELEASES || [];
var media    = sandbox.window.PR_MEDIA    || [];

if(releases.length === 0 && media.length === 0){
  fail("Found no PR_RELEASES and no PR_MEDIA items. Did you paste the data blocks?");
}

var errors = [];
var warnings = [];
var seenIds = {};   // id -> where first seen

var ISO = /^\d{4}-\d{2}-\d{2}$/;

function realDate(iso){
  if(!ISO.test(iso)) return false;
  var p = iso.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] &&
         (d.getUTCMonth() + 1) === p[1] &&
         d.getUTCDate() === p[2];
}
function isArr(x){ return Array.isArray(x); }
function has(v){ return v !== undefined && v !== null && String(v).trim() !== ""; }

function checkCommon(r, where){
  if(!has(r.id)){ errors.push(where + ": an item is missing its id"); return false; }
  if(typeof r.id !== "string"){ errors.push(where + " (" + r.id + "): id must be a string"); }

  if(Object.prototype.hasOwnProperty.call(seenIds, r.id)){
    errors.push("DUPLICATE id \"" + r.id + "\": in " + seenIds[r.id] + " and " + where);
  } else {
    seenIds[r.id] = where;
  }

  if(!has(r.iso)){
    errors.push(where + " (" + r.id + "): missing iso");
  } else if(!realDate(r.iso)){
    errors.push(where + " (" + r.id + "): iso \"" + r.iso + "\" is not a real YYYY-MM-DD date");
  }

  if(has(r.iso) && ISO.test(r.iso) && r.id.indexOf(r.iso + "_") !== 0){
    errors.push(where + " (" + r.id + "): id should start with the iso date and an underscore (\"" + r.iso + "_...\")");
  }

  if(!has(r.title)){ errors.push(where + " (" + r.id + "): missing title"); }

  if(r.portfolios !== undefined && !isArr(r.portfolios)){
    errors.push(where + " (" + r.id + "): portfolios must be an array, for example [] or [\"Aged Care\"]");
  } else if(r.portfolios === undefined){
    warnings.push(where + " (" + r.id + "): no portfolios; use [] if intentional, or add issue tags so it appears under a filter chip");
  }
  return true;
}

/* ---- releases: media releases and op-eds ---- */
releases.forEach(function(r){
  var where = "PR_RELEASES";
  if(!checkCommon(r, where)) return;

  if(r.kind !== undefined && r.kind !== "opinion"){
    errors.push(where + " (" + r.id + "): kind may only be \"opinion\" (omit it for a media release)");
  }

  if(!has(r.url) && !has(r.drive)){
    warnings.push(where + " (" + r.id + "): no url and no drive; the headline will not be clickable (a release with no PDF is usually a mistake)");
  }

  ["outlet", "author", "quotes", "overview", "clip"].forEach(function(f){
    if(r[f] !== undefined){
      warnings.push(where + " (" + r.id + "): has a media field \"" + f + "\"; did this belong in PR_MEDIA?");
    }
  });
});

/* ---- media: outside coverage, including TV and radio interviews ---- */
media.forEach(function(r){
  var where = "PR_MEDIA";
  if(!checkCommon(r, where)) return;

  if(!has(r.outlet)){
    warnings.push(where + " (" + r.id + "): no outlet; the badge falls back to \"Coverage\". Name the outlet or broadcaster.");
  }
  if(!has(r.author)){
    warnings.push(where + " (" + r.id + "): no author; the byline shows only the date. Add the journalist, or the interviewer for a broadcast.");
  }
  if(!has(r.overview) && !has(r.excerpt)){
    warnings.push(where + " (" + r.id + "): no overview; add one line, in your words, naming the question the piece raises.");
  }

  if(r.quotes !== undefined){
    if(!isArr(r.quotes)){
      errors.push(where + " (" + r.id + "): quotes must be an array of short strings");
    } else {
      if(r.quotes.length === 0){
        warnings.push(where + " (" + r.id + "): quotes is empty; add 1 or 2 short verbatim Bevan quotes, or remove the field");
      }
      if(r.quotes.length > 2){
        warnings.push(where + " (" + r.id + "): " + r.quotes.length + " quotes; the page shows only the first 2");
      }
      r.quotes.forEach(function(q, i){
        if(typeof q !== "string"){
          errors.push(where + " (" + r.id + "): quote " + (i + 1) + " is not a string");
        } else if(q.trim().split(/\s+/).length > 25){
          warnings.push(where + " (" + r.id + "): quote " + (i + 1) + " is long; keep media quotes short and verbatim");
        }
      });
    }
  } else {
    warnings.push(where + " (" + r.id + "): no quotes; 1 or 2 short Bevan quotes make the entry land harder");
  }

  if(has(r.url) && r.url !== "#" && !/^https?:\/\//i.test(r.url)){
    warnings.push(where + " (" + r.id + "): url \"" + r.url + "\" does not start with http; an outside article or interview should be a full link");
  }

  if(r.kind === "opinion"){
    warnings.push(where + " (" + r.id + "): kind \"opinion\" belongs on a release in PR_RELEASES, not on outside coverage");
  }
  if(has(r.drive)){
    warnings.push(where + " (" + r.id + "): has \"drive\"; for coverage the hosted clipping field is \"clip\", and only if your licence permits republishing");
  }
});

/* ---- fold the em-dash scan in as errors ---- */
if(emdashErrors.length){
  errors.push("EM-DASH found (use commas or rewrite). Lines:");
  emdashErrors.forEach(function(l){ errors.push(l); });
}

/* ---- report ---- */
var uniqueCount = Object.keys(seenIds).length;
console.log("");
console.log("IN-PARLIAMENT News gate");
console.log("  PR_RELEASES: " + releases.length);
console.log("  PR_MEDIA:    " + media.length);
console.log("  total items: " + (releases.length + media.length));
console.log("  unique ids:  " + uniqueCount);
console.log("");

if(warnings.length){
  console.log("WARNINGS (" + warnings.length + "): review, not blocking");
  warnings.forEach(function(w){ console.log("  - " + w); });
  console.log("");
}

if(errors.length){
  console.log("ERRORS (" + errors.length + "): fix before pasting to the live page");
  errors.forEach(function(e){ console.log("  - " + e); });
  console.log("");
  console.log("RESULT: FAIL");
  process.exit(1);
}

console.log("RESULT: PASS. Safe to paste into the News Code Block.");
process.exit(0);
