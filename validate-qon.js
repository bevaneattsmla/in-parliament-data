#!/usr/bin/env node
/*
  validate-qon.js  -  the gate for the IN-PARLIAMENT Questions on Notice page.

  WHAT IT CHECKS
    The Questions on Notice data, whether it lives as the repo file
    qon.json (a bare [ ... ] array) or inline in the page Code Block
    as  var PB_QON = [ ... ];  . Run it before every commit or paste.

  HOW TO USE
    GitHub flow (preferred):
      node validate-qon.js qon.json
    Code Block flow (legacy):
      Copy the line that begins  var PB_QON = [  through its closing  ];
      into a plain text file, then:
      node validate-qon.js qon-data.js
    Read the report. Fix every ERROR. Consider every WARNING.
    It must end with RESULT: PASS before the data goes live.

  This file has no dependencies. Node alone runs it.
  It does not run the page engine; it lifts the PB_QON array out of the
  text and reads it as data, so a paste that includes the engine is safe.
*/

"use strict";
var fs = require("fs");

function fail(msg){ console.error(msg); process.exit(2); }

var file = process.argv[2];
if(!file){ fail("Usage: node validate-qon.js <file>"); }

var raw;
try { raw = fs.readFileSync(file, "utf8"); }
catch(e){ fail("Cannot read file: " + file + "\n" + e.message); }

var EMDASH = "\u2014";

/* ---- lift the PB_QON array out of the text ----
   PB_QON is a single JSON array assigned in one statement. We find the
   first "[" after the token PB_QON, then walk forward honouring strings
   and escapes until the matching "]". No engine code is executed. */
function extractArray(text){
  var key = text.indexOf("PB_QON");
  if(key === -1) return null;
  var start = text.indexOf("[", key);
  if(start === -1) return null;
  var depth = 0, inStr = false, quote = "", esc = false;
  for(var i = start; i < text.length; i++){
    var ch = text[i];
    if(inStr){
      if(esc){ esc = false; }
      else if(ch === "\\"){ esc = true; }
      else if(ch === quote){ inStr = false; }
      continue;
    }
    if(ch === '"' || ch === "'"){ inStr = true; quote = ch; continue; }
    if(ch === "["){ depth++; }
    else if(ch === "]"){ depth--; if(depth === 0){ return text.slice(start, i + 1); } }
  }
  return null;
}

var arrText;
var trimmed = raw.replace(/^\uFEFF/, "").trimStart();
if(trimmed.charAt(0) === "["){
  /* a bare JSON array, as the repo file qon.json is */
  arrText = trimmed;
} else {
  /* a pasted Code Block: lift PB_QON out of it */
  arrText = extractArray(raw);
}
if(arrText === null){
  fail("Could not find QoN data in this file.\n" +
       "Point the gate at the repo file qon.json (a bare [ ... ] array),\n" +
       "or paste the line that begins  var PB_QON = [  through its closing  ];");
}

var QON;
try { QON = JSON.parse(arrText); }
catch(e){
  console.error("PARSE ERROR: the PB_QON array did not read as valid data.");
  console.error("Most likely a missing comma between two objects, or a missing");
  console.error("brace, bracket or quote. The keys and values must use double");
  console.error("quotes (\"). Node's message:");
  console.error("  " + e.message);
  process.exit(2);
}

if(!Array.isArray(QON)){ fail("PB_QON is not an array."); }
if(QON.length === 0){ fail("PB_QON is empty. Did you paste the data?"); }

/* ---- checks ---- */
var errors = [];
var warnings = [];
var seenIds = {};      // id -> index where first seen
var seenNums = {};     // QoN number -> first id that used it

var ISO = /^\d{4}-\d{2}-\d{2}$/;
var ID_RE = /^\d{4}-\d{2}-\d{2}_QON_\d+$/;
var STATUS_OK = ["Awaiting reply", "Answered", "No clear answer", "Resolved"];
var MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

function has(v){ return v !== undefined && v !== null && String(v).trim() !== ""; }
function isArr(x){ return Array.isArray(x); }

function realDate(iso){
  if(!ISO.test(iso)) return false;
  var p = iso.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] &&
         (d.getUTCMonth() + 1) === p[1] &&
         d.getUTCDate() === p[2];
}

/* "12 May 2026" -> {y,m,d} or null */
function parseHumanDate(s){
  if(!has(s)) return null;
  var m = String(s).trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if(!m) return null;
  var mon = MONTHS[m[2].slice(0,1).toUpperCase() + m[2].slice(1,3).toLowerCase()];
  if(!mon) return null;
  return { y: Number(m[3]), m: mon, d: Number(m[1]) };
}

QON.forEach(function(c, idx){
  var at = (c && has(c.id)) ? c.id : "PB_QON[" + idx + "]";

  /* id */
  if(!has(c.id)){ errors.push(at + ": missing id"); }
  else if(typeof c.id !== "string"){ errors.push(at + ": id must be a string"); }
  else {
    if(!ID_RE.test(c.id)){
      errors.push(at + ": id is not in the form YYYY-MM-DD_QON_<number> (for example 2025-08-21_QON_516)");
    }
    if(Object.prototype.hasOwnProperty.call(seenIds, c.id)){
      errors.push("DUPLICATE id \"" + c.id + "\": at PB_QON[" + seenIds[c.id] + "] and PB_QON[" + idx + "]");
    } else {
      seenIds[c.id] = idx;
    }
  }

  /* iso */
  if(!has(c.iso)){
    errors.push(at + ": missing iso");
  } else if(!realDate(c.iso)){
    errors.push(at + ": iso \"" + c.iso + "\" is not a real YYYY-MM-DD date");
  }

  /* id begins with iso */
  if(has(c.id) && has(c.iso) && ISO.test(c.iso) && c.id.indexOf(c.iso + "_QON_") !== 0){
    errors.push(at + ": id should begin with the iso date (\"" + c.iso + "_QON_...\")");
  }

  /* QoN number reused across entries */
  if(has(c.id) && ID_RE.test(c.id)){
    var num = c.id.split("_QON_")[1];
    if(Object.prototype.hasOwnProperty.call(seenNums, num)){
      warnings.push(at + ": QoN number " + num + " is also used by " + seenNums[num] + "; each tabled question has its own number, so check this is not a copy");
    } else {
      seenNums[num] = c.id;
    }
  }

  /* human date vs iso */
  var hd = parseHumanDate(c.date);
  if(!has(c.date)){
    warnings.push(at + ": missing date (the human label, for example \"21 Aug 2025\"); the tile and modal show it");
  } else if(hd === null){
    warnings.push(at + ": date \"" + c.date + "\" is not in the form \"DD Mon YYYY\" (for example \"21 Aug 2025\")");
  } else if(has(c.iso) && ISO.test(c.iso)){
    var p = c.iso.split("-").map(Number);
    if(hd.y !== p[0] || hd.m !== p[1] || hd.d !== p[2]){
      warnings.push(at + ": date \"" + c.date + "\" does not match iso " + c.iso + "; one of them is wrong");
    }
  }

  /* type */
  if(!has(c.type)){
    warnings.push(at + ": missing type; the dark badge expects \"QUESTION ON NOTICE\"");
  } else if(c.type !== "QUESTION ON NOTICE"){
    warnings.push(at + ": type is \"" + c.type + "\"; on this page it is normally \"QUESTION ON NOTICE\"");
  }

  /* loc */
  if(!has(c.loc)){
    errors.push(at + ": missing loc; the location badge and the Location filter both need it (use \"ALL\" for a state-wide question)");
  }

  /* title */
  if(!has(c.title)){ errors.push(at + ": missing title"); }

  /* topics */
  if(c.topics === undefined){
    errors.push(at + ": missing topics; use an array, for example [\"FORESTRY\",\"REGIONAL WA\"]");
  } else if(!isArr(c.topics)){
    errors.push(at + ": topics must be an array");
  } else if(c.topics.length === 0){
    warnings.push(at + ": topics is empty; the question will not appear under any Topic filter chip");
  }

  /* status */
  if(!has(c.status)){
    errors.push(at + ": missing status; one of " + STATUS_OK.join(", "));
  } else if(STATUS_OK.indexOf(c.status) === -1){
    errors.push(at + ": status \"" + c.status + "\" is not one of: " + STATUS_OK.join(", "));
  }

  /* the three Q&A fields the modal always shows */
  ["ask", "answer", "finding"].forEach(function(f){
    if(!has(c[f])){
      errors.push(at + ": missing " + f + "; the modal shows a labelled section for it and would render blank");
    }
  });

  /* an awaiting-reply question should still carry a placeholder answer,
     and should not be claiming a real answer */
  if(c.status === "Awaiting reply" && has(c.answer) && !/not yet answered/i.test(c.answer)){
    warnings.push(at + ": status is \"Awaiting reply\" but answer does not read as a not-yet-answered placeholder; confirm the status");
  }

  /* summary */
  if(!has(c.summary)){
    warnings.push(at + ": missing summary; the tile and the top of the modal show it");
  }

  /* url */
  if(!has(c.url)){
    warnings.push(at + ": no url; the \"View question & answer\" button will not appear. Every QoN should link to its page on parliament.wa.gov.au");
  } else if(!/^https?:\/\//i.test(c.url)){
    errors.push(at + ": url \"" + c.url + "\" does not start with http; it must be the full link to the question");
  } else if(c.url.indexOf("parliament.wa.gov.au") === -1){
    warnings.push(at + ": url does not point to parliament.wa.gov.au; confirm it is the official question page");
  }

  /* em-dash scan across every visible text field */
  ["title", "summary", "ask", "answer", "finding", "loc", "type"].forEach(function(f){
    if(typeof c[f] === "string" && c[f].indexOf(EMDASH) !== -1){
      errors.push(at + ": em-dash in \"" + f + "\" (use a comma, semicolon, or full stop; en-dashes in names like Warren\u2013Blackwood are fine)");
    }
  });
  if(isArr(c.topics)){
    c.topics.forEach(function(t){
      if(typeof t === "string" && t.indexOf(EMDASH) !== -1){
        errors.push(at + ": em-dash in a topic (\"" + t + "\")");
      }
    });
  }
});

/* ---- status breakdown for the report ---- */
var breakdown = {};
QON.forEach(function(c){
  var s = has(c.status) ? c.status : "(none)";
  breakdown[s] = (breakdown[s] || 0) + 1;
});

/* ---- report ---- */
var uniqueCount = Object.keys(seenIds).length;
console.log("");
console.log("IN-PARLIAMENT Questions on Notice gate");
console.log("  PB_QON entries: " + QON.length);
console.log("  unique ids:     " + uniqueCount);
Object.keys(breakdown).sort().forEach(function(s){
  console.log("    " + s + ": " + breakdown[s]);
});
console.log("");

if(warnings.length){
  console.log("WARNINGS (" + warnings.length + "): review, not blocking");
  warnings.forEach(function(w){ console.log("  ! " + w); });
  console.log("");
}

if(errors.length){
  console.log("ERRORS (" + errors.length + "): fix before pasting to the live page");
  errors.forEach(function(e){ console.log("  x " + e); });
  console.log("");
  console.log("RESULT: FAIL");
  process.exit(1);
}

console.log("RESULT: PASS. " + QON.length + " questions, no duplicate ids, all shapes and statuses valid, no em-dashes. Safe to commit (or paste into the QoN Code Block).");
process.exit(0);
