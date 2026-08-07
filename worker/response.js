const SOURCES_LINE = /^\s*sources:\s*(.*)$/gim
const SOURCES_MARKER = 'SOURCES:'

const idsFrom = str => [...new Set(str.split(',').map(s => s.trim()).filter(Boolean))]

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
    return { answer: text.slice(0, match.index).trim(), ids: idsFrom(match[1]) }
  }

  const markerIndex = text.lastIndexOf(SOURCES_MARKER)
  if (markerIndex === -1) return { answer: text.trim(), ids: [] }

  const afterMarker = text.slice(markerIndex + SOURCES_MARKER.length)
  const eol = afterMarker.indexOf('\n')
  const idsPart = eol === -1 ? afterMarker : afterMarker.slice(0, eol)

  return { answer: text.slice(0, markerIndex).trim(), ids: idsFrom(idsPart) }
}

/** A model can hallucinate a citation; it cannot hallucinate one that exists. */
export function validateCitations(ids, blocks) {
  const byId = new Map(blocks.map(b => [b.id, b]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

export function isRefusal(text) {
  return /^\s*NO_ANSWER\b/i.test(text)
}
