# vineetvora.dev

Personal site for **Vineet Vora** — software engineer, AI systems. MS in Artificial
Intelligence at NJIT.

**Live:** [vineetvora.dev](https://vineetvora.dev) · deployed on Cloudflare Workers (static assets + one Worker) from `main`.

## Concept

The page is a technical document rather than a website — a dossier. Sections are numbered
(`§ 01`–`§ 07`), projects are plated figures (`Fig. 1`–`Fig. 5`) with their metadata set in
the margin, results are typeset tables rather than metric cards, the publication is `Ref. 1`,
and the footer is a colophon.

## Stack

- Vanilla HTML, CSS and JavaScript. No framework, no build step for the site itself.
  The repo carries dev dependencies (vitest, wrangler) only to test and run the Ask
  endpoint's Worker — the pages ship as static assets.
- **Bricolage Grotesque** (display) · **Newsreader** (prose) · **DM Mono** (annotations)
- One accent colour — vermillion `#BC3517`, inverted to `#FF7A55` in the night edition.

## Files

```
index.html        structure and content
style.css         tokens, layout, both themes, responsive
script.js         theme toggle, drawer, reading progress, scroll reveal, section tracking
ask.js            the floating Ask assistant (panel, chat, voice, teasers)
worker/           /api/ask — Workers AI endpoint, guards, prompt, citations
corpus/           facts.md (the assistant's only knowledge) and eval.md
test/             vitest suite for the Worker
scripts/          eval runner (node scripts/eval.js against a dev server)
vineet.jpeg       portrait
Vineet_Vora.pdf   CV
wrangler.jsonc    Cloudflare Workers config (assets + AI + analytics bindings)
```

## Accessibility

- Every ink and accent token meets WCAG AA against its background in both the paper and
  night editions. Floor 4.79:1.
- One `<h1>`, no heading-level skips, all tables captioned with scoped row headers,
  decorative marks are `aria-hidden`.
- Works with JavaScript disabled — scroll reveals are progressive enhancement.
- `prefers-reduced-motion` disables reveals and transitions.

## Local

```bash
npm install
npx wrangler dev --remote   # site + /api/ask (remote gives the Worker real Workers AI)
npm test                    # worker unit tests
```

## History

The previous version of this site — dark, amber, canvas particle network — is preserved on
the [`v1-original`](https://github.com/VineetV2/portfolio/tree/v1-original) branch.
