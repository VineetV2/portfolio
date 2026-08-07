import { describe, it, expect } from 'vitest'
import { parseCorpus, selectContext } from '../worker/corpus.js'

const SAMPLE = `## thesis-accuracy
source: #s02 | Selected Work, Fig. 1
Reaches 70.2% execution accuracy on BIRD.

## logistics-availability
Graduating June 2027. Open to Forward Deployed Engineer roles.
`

describe('parseCorpus', () => {
  it('splits on ## headings and uses the slug as id', () => {
    const { blocks } = parseCorpus(SAMPLE)
    expect(blocks.map(b => b.id)).toEqual(['thesis-accuracy', 'logistics-availability'])
  })

  it('extracts the source href and label', () => {
    const { blocks } = parseCorpus(SAMPLE)
    expect(blocks[0].source).toBe('#s02')
    expect(blocks[0].sourceLabel).toBe('Selected Work, Fig. 1')
  })

  it('leaves source null when the line is absent', () => {
    const { blocks } = parseCorpus(SAMPLE)
    expect(blocks[1].source).toBeNull()
    expect(blocks[1].sourceLabel).toBeNull()
  })

  it('keeps the body without the source line', () => {
    const { blocks } = parseCorpus(SAMPLE)
    expect(blocks[0].body).toBe('Reaches 70.2% execution accuracy on BIRD.')
  })

  it('reports stats', () => {
    const { stats } = parseCorpus(SAMPLE)
    expect(stats.blockCount).toBe(2)
    expect(stats.chars).toBeGreaterThan(0)
    expect(stats.approxTokens).toBe(Math.round(stats.chars / 4))
  })

  it('throws on duplicate ids', () => {
    expect(() => parseCorpus('## a\nbody\n\n## a\nbody\n')).toThrow(/duplicate/i)
  })

  it('throws on an empty block body', () => {
    expect(() => parseCorpus('## a\nsource: #x | X\n')).toThrow(/empty/i)
  })
})

describe('selectContext', () => {
  const blocks = [
    { id: 'a', source: null, sourceLabel: null, body: 'one' },
    { id: 'b', source: null, sourceLabel: null, body: 'two' }
  ]

  it('returns every block — the corpus fits in context, so there is no retrieval', () => {
    expect(selectContext('anything at all', blocks)).toEqual(blocks)
  })

  it('is unaffected by the question', () => {
    expect(selectContext('', blocks)).toEqual(selectContext('xyz', blocks))
  })
})
