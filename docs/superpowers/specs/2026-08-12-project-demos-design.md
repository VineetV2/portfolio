# Project Demos — Design

**Date:** 2026-08-12
**Status:** Approved (brainstorm 2026-08-11 → 08-12)
**Goal:** Three interactive demos under `vineetvora.dev/demos/*` so a recruiter or engineer can *see* what Vineet built, not just read about it. Plus the face-attendance project joins the portfolio as Fig. 6.

## Decisions already made (with user)

- Projects: **thesis text-to-SQL** (replay of real runs), **wildfire paper** (live in-browser), **face attendance** (live webcam). Surya and Hadoop demos explicitly out of scope.
- Thesis demo is a **replay**, not a live toy — no model runs at demo time.
- Hosting: existing Cloudflare Workers project, `demos/` as static assets. No GitHub Pages, no new infra, no new Worker routes.
- Styling: the site's dossier aesthetic; each demo is a numbered **Appendix** (A/B/C).
- Face attendance also becomes **Fig. 6** on the portfolio + corpus blocks for the Ask bot.

## Architecture

```
portfolio/
  demos/
    index.html            hub — lists the three appendices, links back to the site
    demo.css              shared appendix styling (extends site tokens; may import style.css)
    text-to-sql/
      index.html          Appendix A — replay player
      replay.js           stepper UI (ES module)
      traces.json         ~10 real BIRD questions with per-stage artifacts
    wildfire/
      index.html          Appendix B — live Canny + Hough
      wildfire.js
      opencv.js           self-hosted OpenCV.js build (~8 MB, lazy-loaded)
      samples/            3–4 power-line images (rights-safe)
    face-attendance/
      index.html          Appendix C — live webcam attendance
      attendance.js
      face-api.min.js     self-hosted (~700 KB)
      models/             tiny_face_detector + landmark + recognition weights (~7 MB)
```

- Everything is static; served by the existing ASSETS binding. `demos/` therefore must **not** appear in `.assetsignore`. Any extraction tooling lives in `scripts/` (which *is* ignored).
- Deploy unchanged: `git push` + `npx wrangler deploy`.
- Pure logic (trace rendering, descriptor matching, CSV export) written as importable ES modules so vitest can unit-test them in Node.

## Appendix A — text-to-SQL replay

**Data.** `traces.json`, built once by `scripts/extract-traces.mjs` from real run artifacts in `Master Project 700B/NewPipeline/runs/` (verified present: `analysis_perq_all.jsonl` — 15 labeled candidates per question; `gen/*.jsonl` pre-repair candidates; `ieg/*_repaired.jsonl` repair outputs; linking runs in `link_fresh/`). Curate ~10 questions: mix of simple/moderate/hard, including 1–2 the system got wrong. Each trace: question, database, schema-linking selection (tables/columns), candidate SQLs with correct/incorrect labels, repair before→after when fired, vote tally, final SQL, small result-vs-gold table, ✓/✗.
The extractor is a one-off dev script; `traces.json` is committed, so the demo has no dependency on the research repo.

**UI.** Question picker → stage stepper (Linking → Candidates → Repair → Vote → Result). Each stage a card in dossier style. Candidates shown as tabs with labels. Repair shown as before/after diff. Result stage shows returned rows next to gold rows and the verdict. Header disclaimer: "Replay of the real system — Qwen3-Coder-30B on a 2×A100 SLURM cluster; 70.2% execution accuracy on BIRD. Nothing runs live on this page."

## Appendix B — wildfire live

OpenCV.js (self-hosted, lazy-loaded behind a "Load the pipeline (~8 MB)" button with progress state). Pipeline mirrors the paper's proof of concept: grayscale → Canny → Probabilistic Hough. Sliders: Canny low/high thresholds, Hough threshold / minLineLength / maxLineGap; detected segments overlaid on canvas. 3–4 bundled sample images plus "use your own image" via file input — processed entirely client-side, never uploaded. Copy stays modest: this is the paper's PoC, running in the browser; CNN/YOLO named in the paper are future work, and the page says so.

**Open item (user):** supply the paper's sample images or approve rights-safe substitutes before ship.

## Appendix C — face attendance live

face-api.js with self-hosted small models: webcam preview with live detection boxes → "Enroll" captures a 128-d descriptor + typed name into an in-memory roster → matching descriptor (Euclidean distance below threshold, default 0.6) marks that person Present with a timestamp → "Export CSV" mirrors the real system's Excel export.
Privacy is a feature of the page: banner states all processing is in-browser, nothing is uploaded, roster dies with the tab. No storage of any kind (no localStorage for face data).
Honest framing in the copy: the original system used YOLO face detection + FaceNet embeddings; this demo swaps in browser-sized equivalents of the same architecture (detector + embedding matcher).

## Portfolio integration

- **Fig. 6** in §02: face attendance system — YOLO + FaceNet, live camera to Excel attendance export, GitHub repo link, `Live demo →` to Appendix C. (Exact metrics/dates to be confirmed with the user from the repo during implementation — do not invent numbers.)
- Fig. 1 (thesis) gains `Live demo →` → Appendix A. §04 Ref. 1 (wildfire) gains `Live demo →` → Appendix B.
- Hub `/demos/` linked from each appendix header and from the site colophon.
- **Corpus:** new blocks — `face-attendance-overview` (and `face-attendance-results` if real numbers exist), `live-demos` (what the three demos are, their URLs). Margin-note stats will drift; the corpus invariant test forces the update. Two new eval cases (face attendance question; "can I see a demo?").

## Error handling

- Webcam denied / absent (Appendix C): inline message, page still explains the system and links the repo. Same degradation if face-api models fail to load.
- OpenCV.js load failure (Appendix B): message with retry, never a blank page.
- `traces.json` fetch failure (Appendix A): message.
- `<noscript>` notice on all three pages.
- No new server surface: nothing to rate-limit, the Ask endpoint is untouched.

## Testing

- **Unit (vitest, TDD):** trace-to-view-model transformation, descriptor-distance matching + threshold, CSV export formatting, plus existing corpus invariants extending to the new blocks. Existing 78 tests stay green.
- **Browser verification:** each appendix exercised in the in-app browser (screenshots), including error paths that can be simulated (denied camera via permissions, missing traces.json in a scratch copy).
- **Live checklist after deploy:** all three pages load on vineetvora.dev, wildfire processes a sample, face demo degrades gracefully without camera permission, Ask bot answers a demo question with citation.

## Out of scope

Surya and Hadoop demos, a live text-to-SQL toy, demo analytics/telemetry, streaming, any server-side compute for demos, mobile apps.
