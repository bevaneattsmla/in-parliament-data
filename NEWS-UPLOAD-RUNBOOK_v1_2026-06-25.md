# NEWS UPLOAD RUNBOOK

**IN-PARLIAMENT, bevaneatts.com.au, the News page. Version 1, 2026-06-25 (Perth).**

This document exists so that anyone in the office can add a press release, an op-ed, or a piece of outside coverage to the News page correctly, with no prior context and without breaking the page. If you have never touched this before, read Sections 1 and 2, then follow Section 4 step by step. Everything else here is reference.

This is the sister document to the CARD UPLOAD RUNBOOK. The News page works on the same idea as the cards (one shared pool, many views), so if you know the cards, you already half know this. The big difference: the News data does not live in a GitHub year file. It lives inside the News page's own Code Block, in two short lists.

This runbook obeys its own rules: there is not a single em-dash in it.

---

## 1. THE ONE MENTAL MODEL (read this first)

The News page is one page with a toggle: **Press releases** and **In the news**. Behind it sit **two lists** inside one Code Block:

- **`PR_RELEASES`**, the press releases pool. It holds two things: the office's own media releases, and Bevan's opinion pieces (op-eds). An op-ed is just a release with one extra word on it (`kind:"opinion"`), which changes only the badge.
- **`PR_MEDIA`**, the "in the news" pool. It holds outside coverage: newspaper articles, online articles, print clippings, and TV or radio interviews.

Three facts that never change:

1. **Each item is one object in one of the two lists.** You add an item by adding it to the right list once. The toggle, the month grouping, the issue chips and the search all take care of themselves.
2. **Every item has a unique id, forever.** The id is the date plus a short slug, like `2026-06-04_dont-make-wa-wine-the-next-casualty`. You never create two items with the same id, and you never reuse one.
3. **To fix an item, you edit it where it already is.** You do not add a second copy. There is no "re-upload to replace."

If you remember nothing else: *new item = add once to the right list; fix an item = edit it in place; never duplicate an id.*

---

## 2. BEFORE YOU START: which of the three is it?

Everything on this page is one of three kinds. Decide first, because it tells you which list to use and which template.

- **A media release** (the office wrote and issued it). Goes in `PR_RELEASES`. No `kind`. It needs a PDF of the release.
- **An op-ed** (Bevan's byline, published in an outlet). Goes in `PR_RELEASES` with `kind:"opinion"`. It also needs a PDF or a link.
- **Outside coverage** (someone else wrote it or aired it, about Bevan or the electorate). Goes in `PR_MEDIA`. This includes **TV and radio interviews**: an interview is coverage, so it goes here, and its link (the YouTube link, or the outlet's page) goes in the `url` field and opens in a new tab like any article.

Two honesty gates, same spirit as the cards:

- **Provenance honesty.** Link to the real thing, or cite it. For coverage you do not own, you never paste the outlet's article text into the page. You write your own one-line overview and, at most, one or two short verbatim Bevan quotes. If you cannot link it and cannot lawfully host it, it is a print-only citation (see Section 5).
- **Right pool.** A release the office issued is not "in the news"; it is a press release. A journalist's article is not a press release; it is coverage. When in doubt, ask: who wrote or aired it? If it was us, it is a release. If it was them, it is coverage.

---

## 3. WHAT YOU NEED (prerequisites)

- **A laptop or desktop.** The Squarespace Code Block cannot be edited from the phone app. Card upload is desktop only, and so is this.
- **Squarespace admin access**, then the News page, then **Edit** on the Code Block that holds the News engine.
- **The destination ready before you start.**
  - For a release or op-ed: the **PDF must already exist**, either uploaded to your own domain (the `/s/...pdf` links you already use) or as a Google Drive share link.
  - For coverage: the **article or interview link**, or a hosted clipping, or nothing if it is print only.
- **The item content drafted** in the office voice. Writing the overview and choosing the quotes is done with the writing system, separately, before this runbook. This runbook is the *upload*, not the *writing*.
- **Node.js installed**, if you are running the automated gate in Section 6. If Node is not installed, use the manual checklist in Section 6 instead, and tell whoever maintains the site that the validator should be set up.

---

## 4. THE PROCESS, STEP BY STEP

### Step 1. Confirm which of the three it is

Run Section 2. You now know the list (`PR_RELEASES` or `PR_MEDIA`) and whether it needs `kind:"opinion"`.

### Step 2. Build the id

The id is always the **publish date, then an underscore, then a short slug** made from the title:

- Release: `2026-06-04_dont-make-wa-wine-the-next-casualty`
- Op-ed: `2026-03-30_shifting-the-burden-environmental-outcomes`
- Coverage: `2026-05-19_ministers-dismiss-fdv-refuge-claim`

Rules for the slug: lowercase, words joined by hyphens, short (a handful of words is plenty), letters and numbers only. The id must begin with the iso date and an underscore. The gate checks this.

Now check the id is not already in the Code Block. Search the block for it. If it is there, this is a correction, not a new item. Go to Section 7.

### Step 3. Get the destination ready

- Release or op-ed: confirm the PDF link opens and is the right document.
- Coverage: confirm the article or interview link opens, or that you have the Drive clipping link, or that it is genuinely print only.

### Step 4. Draft the object

Copy the matching template from Section 5 and fill every field it lists. Use the exact field names. Put empty arrays as `[]`. For coverage that has no online link, leave `url` as `""`.

### Step 5. Validate (the gate). Do not skip this.

Run Section 6 against your draft. Nothing goes into the live Code Block until it passes. A stray missing comma here can break the whole News page, because it is all one block.

### Step 6. Paste into the right list

In the News Code Block:

1. Find the correct list. The releases list begins `(window.PR_RELEASES = window.PR_RELEASES || []).push(`. The coverage list begins `(window.PR_MEDIA = window.PR_MEDIA || []).push(`.
2. Add a comma after the previously last object in that list, then paste your object. Order inside the list does not matter; the page sorts by date for you. Putting it at the top of the list, next to the newest, just makes it easy to find later.
3. Click **Save**.

### Step 7. Verify on the live page

Do not trust the save. Open the live News page and confirm:

1. The item is under the right toggle (Press releases for a release or op-ed, In the news for coverage).
2. The badge is right (Media Release, Opinion Piece, or the outlet name).
3. It sits in the correct month group, newest first.
4. The link opens, and opens in a **new tab**. For a TV or radio interview, confirm the YouTube link plays.
5. It looks right on a phone as well as desktop.

### Step 8. Back up the block

The live Code Block is the source. Keep a copy of the whole block in the `IN-PARLIAMENT LIVE CODE` Drive folder, by manual upload, the same way the cards are mirrored. If the backup and the live page ever disagree, the live page wins, and you re-export to fix the backup.

Done.

---

## 5. THE TEMPLATES

Fill the fields each template lists. Use `[]` for an empty array. No em-dashes anywhere in the text. En-dashes only in proper names like Warren–Blackwood and in ranges.

### 5.1 Media release

```js
{ id:"2026-06-04_dont-make-wa-wine-the-next-casualty", iso:"2026-06-04",
  title:"Don't make WA wine the next casualty of rising costs.",
  url:"/s/2026-06-04-dont-make-wa-wine-next-casualty.pdf",
  portfolios:["Environment","Regional WA"] }
```

For the PDF you may use `url` (a link on your own domain) **or** `drive` (a Google Drive share link or file id), not both. A release with neither will show as plain text with no link, which is almost always a mistake.

### 5.2 Op-ed (opinion piece)

Identical to a release, plus `kind:"opinion"`. That is the only difference, and it changes only the badge.

```js
{ id:"2026-03-30_shifting-the-burden-environmental-outcomes", iso:"2026-03-30",
  title:"Shifting the burden: are we really improving environmental outcomes?",
  url:"/s/2026-03-30-are-we-really-improving-environmental-outcomes.pdf",
  portfolios:["Forestry","Environment"], kind:"opinion" }
```

### 5.3 Outside coverage (article, online, or interview)

```js
{ id:"2026-05-19_ministers-dismiss-fdv-refuge-claim", iso:"2026-05-19",
  outlet:"Albany Advertiser", author:"Oliver Lane",
  title:"Ministers dismiss MP's claim that region lacks FDV refuges.",
  url:"https://...",
  portfolios:["Community Safety","Regional WA"],
  overview:"One line, your words, naming the question the piece raises.",
  quotes:["A short verbatim Bevan quote.","An optional second one."] }
```

For a **TV or radio interview**, the only change is that `url` is the YouTube link (or the broadcaster's page) and `outlet` is the broadcaster, for example `outlet:"ABC South West"`. The interviewer can go in `author`, or leave `author:""`. It opens in a new tab like any article.

### 5.4 Coverage destination: choose one

The coverage object reaches its source in one of three ways:

- **`url`**: the live article, or the interview link. Opens in a new tab. Use this for anything online, including YouTube.
- **`clip`**: a Google Drive link to a hosted PDF of a print clipping. Use this **only if your Copyright Agency licence permits public republishing.**
- **neither**: leave `url:""` and add no `clip`. The entry then shows an "In print" label and no link. Use this for a print-only citation you cannot lawfully host.

---

## 6. THE VALIDATION GATE

Nothing reaches the live Code Block until it passes. Two ways to run it.

### 6.1 Automated (preferred)

The validator is `validate-news.js`. It reads the two data lists, not the engine.

1. In the News Code Block, copy **only the two data blocks**: the one that fills `PR_RELEASES` and the one that fills `PR_MEDIA`. Do not copy the engine or the styles.
2. Paste them into a plain text file, for example `news-data.js`. It is fine to include the `<script>` tags and the comment banners; the validator strips them.
3. Run:

```
node validate-news.js news-data.js
```

4. Read the report. Fix every ERROR. Consider every WARNING. It must end with `RESULT: PASS` before you paste to the live page.

If it reports a parse error mentioning `document`, you accidentally included the engine code. Copy only the two data blocks and try again.

### 6.2 Manual content checklist (always, in addition)

Tick every box:

- [ ] The `id` is unique. It does not already exist anywhere in the block.
- [ ] The `id` begins with the iso date and an underscore, and the `iso` is a real `YYYY-MM-DD` date.
- [ ] It is in the right list: a release or op-ed in `PR_RELEASES`, coverage in `PR_MEDIA`.
- [ ] An op-ed has `kind:"opinion"`. A media release has no `kind`.
- [ ] `portfolios` is an array, even if empty (`[]`).
- [ ] A release or op-ed has a working `url` or `drive` PDF link.
- [ ] Coverage has a real `url`, a licensed `clip`, or neither (print only). A wrong field silently disappears.
- [ ] For coverage, the `overview` is in your own words, and any `quotes` are short and verbatim Bevan. No outlet article text is pasted in.
- [ ] There are no em-dashes in any text field.

If any box fails, fix it before Step 6. Never paste to the live page to "test" it.

---

## 7. CORRECTIONS (fixing an existing item)

A correction is different from an upload. You are not adding anything.

1. Search the Code Block for the item's `id`.
2. Edit the field values of that existing object in place. Fix the typo, swap a broken link, add a quote.
3. **Do not add a second object with the same id.** Editing in place is the whole rule.
4. If you must change the slug as well, change it in place on the same object; do not create a new one. Nothing else in the site points at a News id, so a re-slug is low risk, but still do it in place.
5. Run the gate (Section 6), Save, verify (Step 7), back up (Step 8).

---

## 8. THINGS THAT TRIP PEOPLE UP

- **It is all one block.** Unlike the cards, the News data is not split into sections. Both lists live in one Code Block. A syntax error anywhere in that block can blank the whole page, which is exactly why the gate exists. Always validate before you paste.
- **The page paginates, it does not section.** The page shows 20 items at a time with a "Load more" button. That is display only. You never start a "new section"; you just keep adding to the right list.
- **The toggle is a view, not a place.** There is no third tab for op-eds. An op-ed lives in the releases list and is told apart only by its badge.
- **Interviews are coverage, not releases.** A TV or radio interview is something an outlet aired, so it goes in `PR_MEDIA`, with the link in `url`.
- **Quotes are Bevan's, kept short.** The quotes on a coverage entry are Bevan's own words, one or two, short. The page shows at most two. Do not quote the journalist, and do not paste the article.

---

## 9. IF YOU ARE NEW AND IT IS YOUR FIRST DAY

Start here.

- The page is "two lists, one view." You only ever edit one of the two lists. The toggle, months, chips and search take care of themselves.
- Your job is narrow and safe if you follow Section 4: decide which of the three it is, build a unique id, get the link ready, fill a template, validate, paste once into the right list, save, verify, back up.
- The two ways to cause damage are a syntax error in the block, which the gate catches, and a duplicate id, which the gate also catches. Respect the gate and you will not break the page.
- When unsure, do less. Leave `quotes` to one short line rather than guessing a second. Use `[]` rather than inventing a portfolio tag.
- The block is desktop only and lives on one page. Always work on a laptop. Always Save. Always check the live page afterwards, including on a phone.

---

## 10. GLOSSARY

- `PR_RELEASES`: the list of media releases and op-eds. This is what you append a release to.
- `PR_MEDIA`: the list of outside coverage, including interviews. This is what you append coverage to.
- `kind:"opinion"`: the one word that turns a release into an op-ed badge. Absent means a media release.
- `url`: a link that opens in a new tab. A PDF on your domain for a release, or the article or interview link for coverage.
- `drive`: a Google Drive link to a release PDF. An alternative to `url` for releases.
- `clip`: a Google Drive link to a hosted print clipping, for coverage, licence permitting.
- `overview`: your one-line, own-words framing of a coverage piece. Never the outlet's text.
- `iso`: the `YYYY-MM-DD` publish date the page sorts and groups on.
- The gate: `validate-news.js`, the check that must pass before any paste.
- The backup: the manual Drive copy of the live Code Block.

---

*End of runbook, v1. When the process changes, update this document the same day.*
