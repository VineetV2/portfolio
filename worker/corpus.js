/**
 * Parses the hand-edited corpus into addressable blocks.
 * Runs once at Worker module scope, so a malformed corpus fails at deploy
 * rather than intermittently in front of a visitor.
 */

const SOURCE_LINE = /^source:\s*(\S+)\s*\|\s*(.+)$/

export function parseCorpus(text) {
  const blocks = []
  const seen = new Set()

  const sections = text.split(/^##\s+/m).slice(1)

  for (const section of sections) {
    const lines = section.split('\n')
    const id = lines[0].trim()

    if (!id) throw new Error('corpus: block with an empty id')
    if (seen.has(id)) throw new Error(`corpus: duplicate block id "${id}"`)
    seen.add(id)

    let source = null
    let sourceLabel = null
    let rest = lines.slice(1)

    const first = rest.find(l => l.trim() !== '')
    if (first) {
      const m = first.match(SOURCE_LINE)
      if (m) {
        source = m[1]
        sourceLabel = m[2].trim()
        rest = rest.slice(rest.indexOf(first) + 1)
      }
    }

    const body = rest.join('\n').trim()
    if (!body) throw new Error(`corpus: block "${id}" has an empty body`)

    blocks.push({ id, source, sourceLabel, body })
  }

  const chars = blocks.reduce((n, b) => n + b.body.length, 0)

  return {
    blocks,
    stats: {
      blockCount: blocks.length,
      chars,
      approxTokens: Math.round(chars / 4)
    }
  }
}

/**
 * The retrieval seam.
 *
 * The corpus fits in one context window, so today this returns everything and
 * the system never retrieves. That removes the most common RAG failure mode —
 * the right answer sitting in a chunk that was not pulled.
 *
 * If the corpus ever outgrows the window, this is the only function that changes.
 */
export function selectContext(question, blocks) {
  return blocks
}
