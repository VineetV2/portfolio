const SOURCES_LINE = /^\s*sources:\s*(.*)$/gim

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
 */
export function parseSources(text) {
  const matches = [...text.matchAll(SOURCES_LINE)]
  const match = matches[matches.length - 1]
  if (!match) return { answer: text.trim(), ids: [] }

  const ids = [...new Set(
    match[1].split(',').map(s => s.trim()).filter(Boolean)
  )]

  const answer = text.slice(0, match.index).trim()
  return { answer, ids }
}

/** A model can hallucinate a citation; it cannot hallucinate one that exists. */
export function validateCitations(ids, blocks) {
  const byId = new Map(blocks.map(b => [b.id, b]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

export function isRefusal(text) {
  return /^\s*NO_ANSWER\b/i.test(text)
}
