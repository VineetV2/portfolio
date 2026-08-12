# Project Demos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three static interactive demos under `vineetvora.dev/demos/*` — text-to-SQL replay (Appendix A), wildfire Canny+Hough live (Appendix B), face-attendance webcam live (Appendix C) — plus Fig. 6 and corpus/eval integration.

**Architecture:** Everything is static assets in the existing Cloudflare Workers project; no new Worker routes. Pure logic lives in ES modules unit-tested with vitest; browser/wasm/webcam behavior verified manually. Real thesis run artifacts are extracted once into a committed `traces.json`; the demo never depends on the research repo.

**Tech Stack:** Vanilla HTML/CSS/JS, vitest, OpenCV.js (self-hosted), face-api.js (self-hosted), Node ≥18 for the one-off extractor.

## Global Constraints

- Work on branch `demos` off `main`. Never push or deploy until the final task's user gate.
- `demos/` must NOT be added to `.assetsignore` (it is served). Every OTHER new top-level directory must be checked against `.assetsignore` entry by entry.
- All rendering uses `textContent`/`createElement` — never `innerHTML` with dynamic data. Same rule as `ask.js`.
- Demo pages follow the dossier aesthetic: reuse tokens from `style.css` (`--paper`, `--ink`, `--accent`, `--mono`, `--text`, `--display`), mono kickers, numbered headers "Appendix A/B/C".
- Copy rules (verbatim facts, do not embellish): thesis = "Qwen3-Coder-30B on a 2×A100 SLURM cluster; 70.2% execution accuracy on BIRD"; wildfire = the paper's PoC is Canny + Probabilistic Hough only, CNN/YOLO are future work; face demo = browser-sized stand-ins for YOLO + FaceNet, same detector + embedding-matcher architecture. Never invent metrics for the face project — its repo (`github.com/VineetV2/Face-Based-Attendance-Automation`) publishes none.
- Face demo: all processing client-side, zero persistence of face data (no localStorage/sessionStorage for descriptors), roster dies with the tab.
- Existing 78 tests stay green throughout. `npm test` after every task.
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run artifacts live at `/Users/vora/Documents/Master Project 700B/NewPipeline/runs/` (read-only; never modify).

## File Structure

```
demos/
  index.html                     hub (Task 1)
  demo.css                       shared appendix styling (Task 1)
  text-to-sql/
    index.html                   Appendix A (Task 3)
    replay.js                    UI controller (Task 3)
    view-model.js                pure trace→view transformation (Task 3, TDD)
    traces.json                  committed extraction output (Task 2)
  wildfire/
    index.html                   Appendix B (Task 4)
    wildfire.js                  UI + OpenCV pipeline calls (Task 4)
    params.js                    pure param clamp/validate module (Task 4, TDD)
    opencv.js                    vendored (Task 4)
    samples/                     user-supplied images (Task 4)
  face-attendance/
    index.html                   Appendix C (Task 5)
    attendance.js                UI + webcam + face-api calls (Task 5)
    roster.js                    pure matching/roster/CSV module (Task 5, TDD)
    face-api.min.js              vendored (Task 5)
    models/                      vendored weights (Task 5)
scripts/
  extract-traces.mjs             one-off extractor (Task 2; scripts/ is assetsignored)
test/
  traces.test.js                 traces.json schema validation (Task 2)
  view-model.test.js             Appendix A logic (Task 3)
  wildfire-params.test.js        Appendix B logic (Task 4)
  roster.test.js                 Appendix C logic (Task 5)
index.html                       Fig. 6 + demo links + colophon (Task 6)
corpus/facts.md                  new blocks (Task 7)
corpus/eval.md                   new cases (Task 7)
```

---

### Task 1: Branch, hub page, shared appendix styling

**Files:**
- Create: `demos/index.html`, `demos/demo.css`
- Verify (no change expected): `.assetsignore`

**Interfaces:**
- Produces: `demo.css` classes used by every appendix: `.apx-sheet` (page container), `.apx-head` (kicker + title block), `.apx-kicker`, `.apx-back` (link row to site + hub), `.apx-note` (disclaimer box), `.apx-card` (bordered content card). Every appendix page (Tasks 3–5) links `../demo.css` (hub links `demo.css`) and `<link rel="stylesheet" href="/style.css">` first for tokens.

- [ ] **Step 1: Branch**

```bash
cd /Users/vora/Documents/Resume_Website/portfolio
git checkout -b demos main
```

- [ ] **Step 2: Write `demos/demo.css`**

```css
/* Appendix pages — extends the site's dossier tokens from /style.css. */
body { background: var(--paper); color: var(--ink); font-family: var(--text); margin: 0; }
.apx-sheet { max-width: 880px; margin: 0 auto; padding: 3rem 1.4rem 5rem; }
.apx-back { display: flex; gap: 1.4rem; font-family: var(--mono); font-size: 0.78rem; }
.apx-back a { color: var(--ink-3); text-decoration: none; }
.apx-back a:hover { color: var(--accent); }
.apx-head { border-bottom: 2px solid var(--ink); margin: 1.6rem 0 1.4rem; padding-bottom: 1rem; }
.apx-kicker { font-family: var(--mono); font-size: 0.72rem; color: var(--accent);
  letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.5rem; }
.apx-head h1 { font-family: var(--display); font-size: clamp(1.6rem, 4vw, 2.4rem); margin: 0; }
.apx-note { border: 1px solid var(--rule); background: var(--paper-2); padding: 0.8rem 1rem;
  font-size: 0.92rem; line-height: 1.55; margin: 1.2rem 0; }
.apx-card { border: 1px solid var(--rule); padding: 1.1rem 1.2rem; margin-top: 1.1rem; }
.apx-card h2 { font-family: var(--mono); font-size: 0.8rem; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-2); margin: 0 0 0.7rem; }
.apx-btn { font-family: var(--mono); font-size: 0.85rem; color: var(--accent);
  background: none; border: 1px solid var(--accent); padding: 0.45rem 1rem; cursor: pointer; }
.apx-btn[disabled] { opacity: 0.4; cursor: default; }
.apx-err { font-family: var(--mono); font-size: 0.85rem; color: var(--accent); }
```

- [ ] **Step 3: Write `demos/index.html`** — hub listing three appendices as cards: A "Text-to-SQL pipeline replay", B "Power-line detection, live", C "Face attendance, live". Each card: kicker (`Appendix A` etc.), one-sentence description, link. Head block: `<title>Demos — Vineet Vora</title>`, links to `/style.css` then `demo.css`. `.apx-back` row: `← vineetvora.dev`. Use the theme-persistence snippet from the site's `index.html` line 50 (`v3theme` localStorage) so dark mode carries over.

- [ ] **Step 4: Confirm `.assetsignore` does not list `demos`** (read the file; expected: absent). Do not add it.

- [ ] **Step 5: Verify locally**

```bash
npx wrangler dev --port 8794
```
Open `http://localhost:8794/demos/` — hub renders with site fonts/colors in light and dark.

- [ ] **Step 6: Commit**

```bash
git add demos/ && git commit -m "Add demos hub and shared appendix styling"
```

---

### Task 2: Trace extraction and committed traces.json

**Files:**
- Create: `scripts/extract-traces.mjs`, `demos/text-to-sql/traces.json`, `test/traces.test.js`

**Interfaces:**
- Produces: `traces.json` — the contract every Appendix A module depends on:

```json
{
  "meta": { "model": "Qwen3-Coder-30B", "accuracy": "70.2% execution accuracy on BIRD (1,534 questions)" },
  "traces": [{
    "id": 0,
    "question": "…natural-language question…",
    "db": "california_schools",
    "difficulty": "simple|moderate|challenging",
    "linking": { "tables": ["frpm", "schools"], "columns": ["frpm.CDSCode", "…"] },
    "candidates": [{ "sql": "SELECT …", "label": "correct" }, { "sql": "…", "label": "wrong/join_table_mismatch" }],
    "repair": null,
    "vote": { "winnerSql": "SELECT …", "tally": [{ "sql": "…", "votes": 9 }] },
    "result": { "rows": [["…"]], "goldRows": [["…"]], "correct": true }
  }]
}
```
`repair` is either `null` or `{ "before": "SELECT …", "after": "SELECT …" }`. `rows`/`goldRows` capped at 5 rows × 4 columns by the extractor.

- [ ] **Step 1: Write the failing schema test** `test/traces.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync('demos/text-to-sql/traces.json', 'utf8'))

describe('traces.json contract', () => {
  it('has meta with the exact copy-rule strings', () => {
    expect(data.meta.model).toBe('Qwen3-Coder-30B')
    expect(data.meta.accuracy).toContain('70.2%')
  })
  it('has 8-12 traces, each structurally complete', () => {
    expect(data.traces.length).toBeGreaterThanOrEqual(8)
    expect(data.traces.length).toBeLessThanOrEqual(12)
    for (const t of data.traces) {
      expect(typeof t.question).toBe('string')
      expect(t.question.length).toBeGreaterThan(10)
      expect(Array.isArray(t.linking.tables)).toBe(true)
      expect(t.candidates.length).toBeGreaterThanOrEqual(2)
      for (const c of t.candidates) expect(typeof c.sql).toBe('string')
      expect(t.repair === null || (typeof t.repair.before === 'string' && typeof t.repair.after === 'string')).toBe(true)
      expect(typeof t.vote.winnerSql).toBe('string')
      expect(typeof t.result.correct).toBe('boolean')
      expect(t.result.rows.length).toBeLessThanOrEqual(5)
    }
  })
  it('includes at least one incorrect outcome (honesty requirement)', () => {
    expect(data.traces.some(t => t.result.correct === false)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it — must fail** (`npx vitest run test/traces.test.js`; expected: cannot read traces.json)

- [ ] **Step 3: Write `scripts/extract-traces.mjs`**

Inputs (read-only), base `RUNS=/Users/vora/Documents/Master Project 700B/NewPipeline/runs`:
- `${RUNS}/A/analysis_perq_all.jsonl` — `{qid, diff, n_correct, labels}` per question → pick ~10 qids: aim 4 simple / 4 moderate / 2 with `n_correct` low or 0 (failures).
- `${RUNS}/A/gen/aw_prerepair.jsonl` — `{cand, db_id, question_id, raw, sql}` → candidates per qid (cap 5 per trace, keep label diversity).
- `${RUNS}/A/ieg/ieg_repshard*_repaired.jsonl` — `{question_id, sql}` → when a repaired sql differs from its pre-repair candidate, emit `repair: {before, after}`.
- `${RUNS}/link_fresh/linked_direct.jsonl` — linking output per qid (tables/columns fields; the script prints the first line's keys and maps whatever field names it finds — `tables`/`columns` or `linked_tables`/`linked_columns`).
- BIRD question text + gold SQL: `${RUNS}/A/gold_official_minidev.json` if it contains `question`/`SQL` fields; otherwise the script exits with a clear message naming the missing field and the implementer locates the minidev questions JSON in the same runs tree (`grep -rl '"question"' --include='*.json' ${RUNS} | head`).
- Result rows: execute final + gold SQL against local BIRD SQLite databases IF present (script takes `--db-root` arg); otherwise emit `rows: []`, `goldRows: []` and set `result.correct` from the analysis labels. The schema test does not require non-empty rows.

The script assembles the contract JSON above, truncates candidate SQL to 600 chars, writes `demos/text-to-sql/traces.json` pretty-printed, and prints a per-trace summary table for manual curation. Iterate qid selection until the mix reads well.

- [ ] **Step 4: Run extractor, curate, re-run schema test — must pass**

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-traces.mjs demos/text-to-sql/traces.json test/traces.test.js
git commit -m "Extract real BIRD pipeline traces for the replay demo"
```

---

### Task 3: Appendix A — replay player

**Files:**
- Create: `demos/text-to-sql/view-model.js`, `demos/text-to-sql/replay.js`, `demos/text-to-sql/index.html`, `test/view-model.test.js`

**Interfaces:**
- Consumes: `traces.json` contract from Task 2; `demo.css` classes from Task 1.
- Produces: `stagesFor(trace)` in `view-model.js` — returns `[{ key: 'linking'|'candidates'|'repair'|'vote'|'result', title: string, present: boolean }]`; `repair.present === false` when `trace.repair === null`.

- [ ] **Step 1: Failing tests** `test/view-model.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { stagesFor } from '../demos/text-to-sql/view-model.js'

const base = { linking: { tables: ['t'], columns: [] }, candidates: [{ sql: 'A', label: 'correct' }],
  repair: null, vote: { winnerSql: 'A', tally: [] }, result: { rows: [], goldRows: [], correct: true } }

describe('stagesFor', () => {
  it('returns the five stages in pipeline order', () => {
    expect(stagesFor(base).map(s => s.key)).toEqual(['linking', 'candidates', 'repair', 'vote', 'result'])
  })
  it('marks repair absent when trace.repair is null', () => {
    expect(stagesFor(base).find(s => s.key === 'repair').present).toBe(false)
    const withRepair = { ...base, repair: { before: 'A', after: 'B' } }
    expect(stagesFor(withRepair).find(s => s.key === 'repair').present).toBe(true)
  })
})
```

- [ ] **Step 2: Run — fail.** **Step 3: Implement `view-model.js`** (pure module, ~20 lines: fixed stage list, titles `Schema linking / Candidate generation / Self-repair / Consensus vote / Result`, `present:false` only for null repair). **Step 4: Run — pass.**

- [ ] **Step 5: Build `index.html` + `replay.js`**

Page: `.apx-back` (← site · hub), kicker `Appendix A · Fig. 1 companion`, h1 `Text-to-SQL pipeline, replayed`, `.apx-note` disclaimer with `meta.model`/`meta.accuracy` from traces.json ("Nothing runs live on this page."). Question picker: one `.apx-btn`-styled button per trace (question text + difficulty chip + ✓/✗). Selecting renders stage cards via `stagesFor()`: linking card lists tables/columns as mono chips; candidates card renders tabs (SQL in `<pre>`, label chip, correct=accent border); repair card shows before/after `<pre>` blocks (skipped stage renders "no repair needed" line); vote card shows tally bars (width ∝ votes, `textContent` labels); result card shows rows vs goldRows as two small tables + verdict line. All DOM via `createElement`/`textContent`. `traces.json` loaded with `fetch('./traces.json')`; on failure render `.apx-err` "Could not load the replay data — the code is at github.com/VineetV2." `<noscript>` notice.

- [ ] **Step 6: Verify in browser** (`npx wrangler dev --port 8794`, open `/demos/text-to-sql/`) — click through 3 traces incl. one failure; screenshot. **Step 7: `npm test` all green. Commit** `"Appendix A: text-to-SQL pipeline replay"`.

---

### Task 4: Appendix B — wildfire live

**Files:**
- Create: `demos/wildfire/params.js`, `demos/wildfire/wildfire.js`, `demos/wildfire/index.html`, `demos/wildfire/opencv.js` (vendored), `demos/wildfire/samples/*.jpg`, `test/wildfire-params.test.js`

**Interfaces:**
- Consumes: `demo.css` from Task 1.
- Produces: `clampParams(p)` in `params.js` — takes `{cannyLow, cannyHigh, houghThreshold, minLineLength, maxLineGap}`, returns clamped copy: ranges 0–255 / 0–255 / 1–200 / 1–500 / 0–100, and enforces `cannyHigh >= cannyLow` (raises high to low).

- [ ] **Step 1: Failing tests** `test/wildfire-params.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { clampParams, DEFAULTS } from '../demos/wildfire/params.js'

describe('clampParams', () => {
  it('clamps out-of-range values', () => {
    const p = clampParams({ cannyLow: -5, cannyHigh: 999, houghThreshold: 0, minLineLength: 0, maxLineGap: 999 })
    expect(p).toEqual({ cannyLow: 0, cannyHigh: 255, houghThreshold: 1, minLineLength: 1, maxLineGap: 100 })
  })
  it('keeps cannyHigh >= cannyLow', () => {
    expect(clampParams({ ...DEFAULTS, cannyLow: 200, cannyHigh: 100 }).cannyHigh).toBe(200)
  })
  it('exports sane defaults', () => {
    expect(DEFAULTS).toEqual({ cannyLow: 50, cannyHigh: 150, houghThreshold: 50, minLineLength: 50, maxLineGap: 10 })
  })
})
```

- [ ] **Step 2: Run — fail. Step 3: Implement `params.js`. Step 4: Run — pass.**

- [ ] **Step 5: Vendor OpenCV.js** from the official release (`https://docs.opencv.org/4.10.0/opencv.js`) into `demos/wildfire/opencv.js`. Record the version + source URL in a comment at the top of `wildfire.js`. Confirm the file is < 25 MiB (Workers per-asset limit).

- [ ] **Step 6: Samples.** Ask the user for the paper's images. Until supplied, add 2 placeholder photos of overhead lines the user takes/owns, or proceed with only the file-input path and an empty `samples/` note. Ship gate in Task 8 requires at least 2 rights-safe samples.

- [ ] **Step 7: Build `index.html` + `wildfire.js`**

Page: kicker `Appendix B · Ref. 1 companion`, h1 `Power-line detection, live`, `.apx-note`: "This is the paper's proof of concept — grayscale → Canny edge detection → Probabilistic Hough Transform — running in your browser. The CNN and YOLO models named in the paper are future work and are not run here." Load flow: `.apx-btn` "Load the pipeline (~8 MB)" → injects `<script src="opencv.js">`, progress text, `cv.onRuntimeInitialized` enables UI; failure → `.apx-err` + retry button. UI: sample thumbnails + `<input type="file" accept="image/*">` (drawn to canvas client-side only, page states "your image never leaves the browser"), five `<input type="range">` sliders bound through `clampParams`, output canvas: original image with detected segments stroked in `--accent`. Processing: `cv.cvtColor → cv.Canny(low, high) → cv.HoughLinesP(1, Math.PI/180, threshold, minLineLength, maxLineGap)`; always `.delete()` Mats after each run (wrap in try/finally). Re-run debounced 150 ms on slider input. `<noscript>` notice.

- [ ] **Step 8: Verify in browser** — load pipeline, adjust sliders on a sample, upload a file; screenshot each. **Step 9: `npm test`. Commit** `"Appendix B: the wildfire paper's pipeline, live in the browser"`.

---

### Task 5: Appendix C — face attendance live

**Files:**
- Create: `demos/face-attendance/roster.js`, `demos/face-attendance/attendance.js`, `demos/face-attendance/index.html`, vendored `demos/face-attendance/face-api.min.js` + `demos/face-attendance/models/`, `test/roster.test.js`

**Interfaces:**
- Consumes: `demo.css` from Task 1.
- Produces (`roster.js`, pure, no face-api import): `euclidean(a, b)` (arrays → number); `bestMatch(descriptor, roster, threshold = 0.6)` → `{ name, distance }` or `null` (roster entries `{ name, descriptor }`); `markPresent(attendance, name, now)` → new array, adds `{ name, time: now }` once per name; `toCsv(attendance)` → `"Name,Time\n…"` with quotes around names containing commas/quotes.

- [ ] **Step 1: Failing tests** `test/roster.test.js`

```javascript
import { describe, it, expect } from 'vitest'
import { euclidean, bestMatch, markPresent, toCsv } from '../demos/face-attendance/roster.js'

describe('roster', () => {
  it('euclidean distance', () => { expect(euclidean([0, 0], [3, 4])).toBe(5) })
  it('bestMatch returns closest under threshold, else null', () => {
    const roster = [{ name: 'A', descriptor: [0, 0] }, { name: 'B', descriptor: [1, 0] }]
    expect(bestMatch([0.9, 0], roster).name).toBe('B')
    expect(bestMatch([9, 9], roster)).toBeNull()
  })
  it('markPresent is idempotent per name and non-mutating', () => {
    const a1 = markPresent([], 'A', '10:00')
    const a2 = markPresent(a1, 'A', '10:05')
    expect(a2).toEqual([{ name: 'A', time: '10:00' }])
    expect(a1).not.toBe(a2)
  })
  it('toCsv escapes and headers', () => {
    expect(toCsv([{ name: 'Do,e "V"', time: '10:00' }])).toBe('Name,Time\n"Do,e ""V""",10:00')
  })
})
```

- [ ] **Step 2: Run — fail. Step 3: Implement `roster.js`. Step 4: Run — pass.**

- [ ] **Step 5: Vendor face-api.js** — `face-api.min.js` plus weight files for `tiny_face_detector`, `face_landmark_68_tiny`, `face_recognition` from the official `justadudewhohacks/face-api.js` repo (`weights/` directory) into `models/`. Record source + commit hash in a comment in `attendance.js`.

- [ ] **Step 6: Build `index.html` + `attendance.js`**

Page: kicker `Appendix C · Fig. 6 companion`, h1 `Face attendance, live`, privacy `.apx-note` FIRST: "Everything on this page runs in your browser. No image, video frame, or face data is uploaded anywhere, nothing is stored, and the roster disappears when you close the tab." + honesty line re YOLO+FaceNet stand-ins. Flow: `.apx-btn` "Start camera" → `getUserMedia({ video: true })`; denial/absence → `.apx-err` "Camera unavailable or permission denied — the demo needs it, but the write-up above and the repo (github.com/VineetV2/Face-Based-Attendance-Automation) tell the story." Detection loop (~5 fps via `setInterval` 200 ms): `faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true).withFaceDescriptors()`; boxes drawn on overlay canvas. Enroll: name `<input>` + button captures current single-face descriptor into in-memory roster (JS array only). Each loop tick: `bestMatch(descriptor, roster)` → label box with name, `markPresent` with `HH:MM:SS`. Attendance table (`textContent`) + "Export CSV" button → Blob download `attendance.csv` via `toCsv`. Stop-camera button stops all tracks. `<noscript>` notice.

- [ ] **Step 7: Verify in browser** — camera on, enroll self, box labels, table row appears, CSV downloads; deny permission in a fresh context and confirm the error path; screenshots. **Step 8: `npm test`. Commit** `"Appendix C: face attendance running live in the browser"`.

---

### Task 6: Portfolio integration — Fig. 6 and demo links

**Files:**
- Modify: `index.html` (§02 figure list, §04 Ref. 1 block, colophon)

**Interfaces:**
- Consumes: demo URLs `/demos/text-to-sql/`, `/demos/wildfire/`, `/demos/face-attendance/`, `/demos/`.

- [ ] **Step 1: Fig. 6.** Copy the exact plate/figure markup pattern of Fig. 5 in §02 (same classes, margin metadata structure). Content — name: `Face-based attendance automation`; date: `Jan 2025`; stack: `Python · OpenCV · YOLO · FaceNet`; body (qualitative only, no invented numbers): live classroom camera feed → YOLO face detection → FaceNet identity matching → attendance logged to Excel with no manual roll call; links: repo `https://github.com/VineetV2/Face-Based-Attendance-Automation` + `Live demo →` `/demos/face-attendance/`.
- [ ] **Step 2: Demo links.** Fig. 1 gains `Live demo →` `/demos/text-to-sql/`; §04 Ref. 1 gains `Live demo →` `/demos/wildfire/`. Match each block's existing link markup exactly.
- [ ] **Step 3: Colophon** gains one line: `Demos: /demos/ — three of the systems above, live or replayed.` (link).
- [ ] **Step 4: Verify in browser** — Fig. 6 renders like Figs 1–5 in both themes; all four links navigate. `npm test` (78+13 green; index.html margin-note untouched by this task). **Step 5: Commit** `"Add Fig. 6 (face attendance) and live-demo links"`.

---

### Task 7: Corpus and eval

**Files:**
- Modify: `corpus/facts.md`, `corpus/eval.md`, `index.html` (margin-note stats string only)

**Interfaces:**
- Consumes: corpus block format (`## id` / `source:` line / body); the corpus invariant tests (no body line starting `SOURCES:`, no bare `NO_ANSWER`).

- [ ] **Step 1: Add blocks to `corpus/facts.md`:**

```markdown
## face-attendance-overview
source: #s02 | Selected Work, Fig. 6
In January 2025, Vineet built a face-based attendance automation system: a live
classroom camera feed runs YOLO face detection and FaceNet identity matching, and
attendance is logged to an Excel sheet with no manual roll call. Built with Python
and OpenCV. Code is at github.com/VineetV2/Face-Based-Attendance-Automation.

## live-demos
source: https://vineetvora.dev/demos/ | Demos
Three of Vineet's projects have live demos at vineetvora.dev/demos: a replay of his
thesis text-to-SQL pipeline on real BIRD questions, the wildfire paper's Canny and
Hough detection pipeline running live in the browser, and the face-attendance system
running live on the visitor's own camera, entirely client-side.
```

- [ ] **Step 2: Update margin-note stats.** Run `npm test`; the corpus invariant test prints the expected `N blocks · ~X tokens` string — update `index.html`'s `#askStats` span to match exactly. Re-run: green.
- [ ] **Step 3: Eval cases** appended to `corpus/eval.md`:

```
answerable | What is the face attendance project? | cites:face-attendance-overview && contains:FaceNet
answerable | Can I see a live demo of his work? | cites:live-demos && contains:demos
```

- [ ] **Step 4:** `npm test` all green. **Step 5: Commit** `"Corpus: face attendance and live demos, so the assistant can answer"`.

---

### Task 8: Ship (user-gated)

**Files:** none new. Merge + deploy + verify.

- [ ] **Step 1:** Full local pass: `npm test`; `npx wrangler dev --remote`, walk all three demos + site Fig. 6 links + ask the bot "Can I see a live demo of his work?" (needs remote AI). Fix anything found.
- [ ] **Step 2: USER GATE — stop.** Hand to the user for their own test pass (their stated preference). Confirm the two user inputs landed: wildfire sample images approved; Fig. 6 wording approved.
- [ ] **Step 3 (after user approval):** run the 24-case eval against the dev server (`node scripts/eval.js`) — all pass or triage.
- [ ] **Step 4:** Merge and ship:

```bash
git checkout main && git merge demos --no-edit
npm test && git push origin main && npx wrangler deploy
```

- [ ] **Step 5: Live checklist:** `/demos/` + all three appendices load on vineetvora.dev; wildfire processes a sample; face page degrades without camera; `curl -s -X POST https://vineetvora.dev/api/ask … '{"question":"Can I see a live demo of his work?"}'` cites `live-demos`; site Fig. 6 visible. Screenshot the hub.

---

## Self-review notes

- Spec coverage: hub+styling (T1), traces (T2), Appendix A (T3), B (T4), C (T5), Fig. 6 + links + colophon (T6), corpus/eval (T7), error paths (in T3–T5 pages), ship+checklist (T8). Gaps: none found.
- The two user-input items (wildfire images, Fig. 6 wording) are explicit steps (T4 S6, T8 S2), not silent assumptions.
- Type consistency: `stagesFor`, `clampParams`/`DEFAULTS`, `euclidean`/`bestMatch`/`markPresent`/`toCsv`, traces.json contract — each defined once, consumed by name.
