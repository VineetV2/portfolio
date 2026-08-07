const SOURCES_LINE = /^\s*sources:\s*(.*)$/im

/**
 * The model ends its reply with "SOURCES: id, id".
 * Deliberately not JSON — open models are unreliable at strict JSON and a
 * parse failure would break the whole answer. A missing line costs citations,
 * not the response.
 */
export function parseSources(text) {
  const match = text.match(SOURCES_LINE)
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
