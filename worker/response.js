const SOURCES_LINE = /^\s*sources:\s*(.*)$/gim
const SOURCES_MARKER = 'SOURCES:'

/**
 * Normalises a raw ids fragment into clean block ids.
 *
 * Models reliably get the *content* right (the id) but are inconsistent about
 * the wrapping: brackets, quotes, a trailing period, or a newline-separated
 * bullet list instead of a comma-separated line. None of that changes what
 * the id IS, so strip it rather than trying to anticipate every shape up
 * front in the marker-detection regexes above (which are deliberately kept
 * strict — see parseSources).
 */
const idsFrom = str => [
  ...new Set(
    str
      .split(/[,\n]/)
      .map(s => s.trim())
      .map(s => s.replace(/^[-\s*]+/, ''))
      .map(s => s.replace(/^["'[]+|["'\].]+$/g, ''))
      .map(s => s.trim())
      .filter(Boolean)
  )
]

/**
 * The model occasionally wraps the marker in markdown emphasis
 * ("**SOURCES:**"), which breaks the line-start anchor below and falls
 * through to the case-sensitive substring fallback. That fallback slices
 * the answer off right before the marker, leaving a dangling "**" on the
 * end of otherwise-clean prose. Strip it after the fact rather than
 * teaching the marker search about markdown — the search's strictness is
 * what keeps it from firing on ordinary prose.
 */
const stripBoldTail = str => str.replace(/\*\*\s*$/, '').trimEnd()

/**
 * The model ends its reply with "SOURCES: id, id".
 * Deliberately not JSON — open models are unreliable at strict JSON and a
 * parse failure would break the whole answer. A missing line costs citations,
 * not the response.
 *
 * Uses the LAST line-anchored "sources:" match, not the first: prose can
 * contain an early line that happens to start with "Sources" (e.g. "Sources
 * are limited for this claim."), and a non-global first-match search would
 * treat that as the citation line, blanking the real answer.
 *
 * Small instruct models don't reliably put the marker on its own line —
 * observed in production, the model sometimes appends "SOURCES: id" to the
 * same line as the final sentence. When the anchored search finds nothing,
 * fall back to the last occurrence of the literal, case-SENSITIVE substring
 * "SOURCES:" and take everything up to end-of-line as the ids. Case
 * sensitivity is the point: the model is instructed to emit that exact
 * uppercase token, so this fallback will not fire on ordinary prose like
 * "Sources are limited for this claim." — the same false positive the
 * anchored regex above was built to avoid.
 */
export function parseSources(text) {
  const matches = [...text.matchAll(SOURCES_LINE)]
  const match = matches[matches.length - 1]
  if (match) {
    return { answer: stripBoldTail(text.slice(0, match.index).trim()), ids: idsFrom(match[1]) }
  }

  const markerIndex = text.lastIndexOf(SOURCES_MARKER)
  if (markerIndex === -1) return { answer: text.trim(), ids: [] }

  const afterMarker = text.slice(markerIndex + SOURCES_MARKER.length)
  const eol = afterMarker.indexOf('\n')
  const idsPart = eol === -1 ? afterMarker : afterMarker.slice(0, eol)

  return { answer: stripBoldTail(text.slice(0, markerIndex).trim()), ids: idsFrom(idsPart) }
}

/** A model can hallucinate a citation; it cannot hallucinate one that exists. */
export function validateCitations(ids, blocks) {
  const byId = new Map(blocks.map(b => [b.id, b]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

/**
 * Primarily anchored at the start (the model is instructed to reply with
 * exactly NO_ANSWER and nothing else), case-insensitively so minor casing
 * drift still counts as a refusal.
 *
 * Also catches the sentinel appearing anywhere as its own token — e.g.
 * "I could not find that. NO_ANSWER" — so a prose-prefixed refusal never
 * renders the raw sentinel to the visitor. That secondary check is
 * case-SENSITIVE and word-bounded (not a bare substring match) so it can't
 * be tripped by an answer that happens to discuss the string in passing.
 */
export function isRefusal(text) {
  if (/^\s*NO_ANSWER\b/i.test(text)) return true
  return /\bNO_ANSWER\b/.test(text)
}
