# § 00 Ask — an answering endpoint for vineetvora.dev

**Date:** 2026-08-07
**Status:** approved, ready for implementation planning

---

## 1. What this is

A question box on vineetvora.dev. A visitor asks something about Vineet; a grounded
answer comes back with links to where it came from.

Two audiences, in priority order:

1. **A recruiter or hiring manager** who wants one fact — the thesis result, whether
   he's used Kubernetes, when he graduates — without scrolling the page.
2. **A technical visitor** who reads the thing itself as evidence of engineering
   judgement.

Utility first. The second audience is served by doing the first well and being honest
about how.

## 2. The central decision: no retrieval

The corpus — site text, résumé, thesis detail, leadership record, availability — is
roughly 8,000 tokens. It fits in one context window several times over.

**So this does not retrieve.** The whole corpus goes in the system prompt on every call.

Retrieval exists to solve *"my corpus doesn't fit."* That problem does not exist here.
Adding a vector database would introduce the most common RAG failure mode — the right
answer sitting in a chunk that didn't get pulled — in exchange for nothing.

This is stated on the page, in the margin of § 00:

> Vineet's corpus is roughly 8,000 tokens — small enough to fit in one context window,
> so this doesn't retrieve. Retrieval would add failure modes and buy nothing at this size.

That sentence is the point of the feature as a portfolio artifact. Building a vector
database for 8,000 tokens demonstrates tutorial-following. Declining to, and saying why,
demonstrates the judgement that FDE interviews actually probe.

**The retrieval seam still exists.** `selectContext(question, corpus)` returns the blocks
to include and today returns all of them. If the corpus ever outgrows the window — blog
posts, case studies — that one function starts calling Vectorize and nothing else changes.

## 3. Architecture

```
Browser (§ 00 Ask)
  │  POST /api/ask  { question }
  ▼
Cloudflare Worker            ── same deployment as the static assets
  │  1. input guard          (length, empty)
  │  2. deflection match     (visa / salary / fit → fixed reply, no model call)
  │  3. selectContext()      (today: all blocks)
  │  4. build prompt         (system = rules + corpus; user = question)
  ▼
Workers AI  env.AI.run(...)  ── runtime binding, no API key exists
  │
  ▼  answer text + "SOURCES: id, id"
  │  5. validate citations against real block IDs
  │  6. NO_ANSWER sentinel → fixed reply
  ▼
Browser renders prose + source links
```

**Why Workers AI, beyond cost.** It is a runtime binding, not an HTTP credential. There
is no key to place in client JavaScript and no key to leak. On a static site with no
existing backend, that removes the single most common way this kind of feature goes wrong.

It is also consistent with the thesis pitch — open-source models, runs in your own
environment — which makes the choice legible rather than incidental.

### Files

| Path | Purpose |
|---|---|
| `corpus/facts.md` | Knowledge base. Hand-edited. Addressable blocks. |
| `corpus/eval.md` | Evaluation set. |
| `worker/index.js` | `/api/ask` handler. |
| `worker/prompt.js` | System rules, refusal policy, citation format. |
| `worker/corpus.js` | Parser, `selectContext`, citation validator. |
| `chat.js` | § 00 UI behaviour. |
| `index.html`, `style.css` | § 00 markup and styles. |
| `wrangler.jsonc` | Gains an `ai` binding and a Worker entry point. |

`wrangler.jsonc` currently declares assets only. The static site continues to deploy
exactly as it does now; the Worker handles `/api/*` and nothing else.

## 4. Corpus format

`corpus/facts.md`. Each `##` heading is a block; the heading slug is its ID.

```markdown
## thesis-accuracy
source: #s02 | Selected Work, Fig. 1
Reaches 70.2% execution accuracy on BIRD — 1,534 questions across 11 real-world
databases — using only open-source models and no proprietary API, so it can run
inside a customer's own environment.

## logistics-availability
source: #s06 | Contact
Graduating June 2027. Open to Forward Deployed Engineer roles.
Newark NJ, New York NY, or remote.
```

The `source:` line becomes the citation link and is optional; blocks without one render
uncited rather than breaking.

**Contents.** Everything on the site, plus three things that are not:

- Full thesis detail — pipeline stages, the constraint, what was cut and why
- VITOPIA and Beat The Heat — the $180,000, 450+ companies, team of 20
- Availability and logistics — graduation, target roles, locations

Maintained by hand. The cost is remembering to update it; the benefit is that the bot can
know things the page doesn't, and say them in Vineet's voice.

## 5. Grounding and refusal

**Strict.** The model answers only from corpus blocks. It cannot be argued into
speculating, and an unhelpful answer is always preferable to a false one — a bot that
invents experience to a recruiter costs an interview.

**Citations are validated server-side.** Block IDs the model emits that don't exist in the
corpus are stripped before rendering. A model can hallucinate a citation; it cannot
hallucinate one that survives the check. This is what makes "cites its sources" a
guarantee rather than decoration.

**Citation format is not JSON.** Open models are unreliable at strict JSON, and a parse
failure would break the whole answer. Instead the reply ends with one line:

```
SOURCES: thesis-accuracy, logistics-availability
```

Parsed by regex. If the line is missing the answer still renders, just uncited. Degrades
instead of breaking.

**Refusal is a sentinel.** When nothing in the corpus answers the question the model emits
exactly `NO_ANSWER`. The Worker substitutes fixed copy — *"I don't have that in Vineet's
notes. Email him at vineet.vora123@gmail.com."* The refusal text is ours, so the model
cannot be talked into apologising its way into a guess.

**Three topics never reach the model at all**, matched by keyword first:

| Topic | Response |
|---|---|
| Work authorisation, visa, sponsorship | "Best discussed directly — vineet.vora123@gmail.com" |
| Salary, compensation | Same |
| "Would he be good at X?" | States relevant evidence from the corpus, offers no opinion on fit |

Handling these before the model runs means there is nothing to jailbreak.

## 6. Abuse, cost, failure

**Rate limiting: a Cloudflare dashboard rule** on `/api/ask`, ~8 requests per minute per
IP. The free tier includes one rule and this is the right use of it. Doing it in-Worker
with KV was considered and rejected — KV free tier is ~1,000 writes/day, so the limiter
would hit its own ceiling before the AI did.

**Input cap:** questions over 500 characters rejected before the model is called.

**Prompt injection.** The question goes in the `user` role; corpus and rules stay in
`system`. The defences that matter are structural, not textual:

- Output rendered as plain text — never HTML, never executed
- Citations validated against real block IDs, so injected sources die
- Deflection topics matched before the model runs

There is no key to leak, no data to reach, nothing to execute. Worst realistic case is the
bot saying something odd.

**Quota exhaustion.** A Workers AI error — which is what exhaustion looks like — returns
fixed copy: *"The assistant is unavailable right now. Everything it knows is on this page,
and Vineet's email is at the bottom."* The site stays fully functional. A dead chat box on
a portfolio is worse than no chat box.

**Latency.** An 8k-token prompt on an open model is realistically 2–5 seconds. No
streaming. The UI shows an honest pending line — *"reading the dossier…"* — rather than a
spinner that reads as broken.

**Logging.** Question text and timestamp to Workers Analytics Engine. No IP, no
fingerprint. This reveals what recruiters actually ask, which is useful signal for the
corpus and arguably for the résumé.

## 7. The § 00 Ask section

Placed after the cover, before § 01 Abstract. Numbered **00** so it reads as front matter
and slots into the existing `§ 01`–`§ 06` scheme without renumbering.

Uses the existing rail-plus-column grid so it inherits the page's rhythm. The rail carries
corpus stats and the no-retrieval note; the column carries the input and the answer.

Answers render as document prose in Newsreader with a `.src` citation line beneath —
matching how each figure already cites its repo. It should read as the document answering,
not a chat window bolted on.

**Starter questions**, the single biggest lever on whether anyone uses it:

- What did the thesis actually achieve?
- Has he worked with distributed systems?
- What has he cut from a project, and why?
- Is he available, and where?

The third surfaces his strongest interview material unprompted.

A discreet `00 Ask` entry joins the masthead nav and drawer.

**Accessibility**, consistent with the rest of the site: real `<form>` with a labelled
input, answer in `aria-live="polite"`, full keyboard operation, and graceful degradation
to the contact email without JavaScript rather than a dead input.

## 8. Testing

**Unit tests (Vitest, in CI, no model calls).** This covers most of the real risk surface:

| Under test | Cases |
|---|---|
| Corpus parser | IDs unique, `source:` parses, malformed blocks fail loudly |
| Citation validator | unknown IDs stripped, known preserved, empty handled |
| `SOURCES:` parser | present / missing / malformed / duplicated |
| Deflection matcher | visa, salary, fit — all matched before any model call |
| Input guard | over-length, empty, whitespace-only |
| `NO_ANSWER` | maps to fixed response, never passed through raw |
| AI failure | thrown error → fixed fallback, never a 500 |

**Evaluation set (`corpus/eval.md`, ~20 pairs, run manually).** Four buckets:

- **Answerable** — correct answer *and* correct citation
- **Absent** — genuinely not in corpus, must return `NO_ANSWER`
- **Deflected** — visa, salary, fit opinions
- **Adversarial** — instruction-override attempts

Not in CI: it costs quota and is non-deterministic, so a red build would mean nothing. It
exists so corpus edits can be judged rather than guessed at.

**Manual before shipping:** keyboard-only, screen reader announcement, both themes,
mobile, no-JavaScript degradation.

## 9. Known consequence

Vitest means a `package.json` and dev dependencies in a repo whose README says *"no
framework, no build step."* The site keeps that property — nothing compiles, it still
deploys as static assets plus a Worker. The README sentence needs amending to "no build
step for the site; dev dependencies for testing the Worker." Better to adjust the claim
than to skip the tests or quietly contradict it.

## 10. Explicitly out of scope

- Vector database or embeddings (§ 2)
- Streaming responses
- Multi-turn conversation — each question is independent
- A retrieval-inspection panel
- Any authentication
