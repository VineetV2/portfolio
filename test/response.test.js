import { describe, it, expect } from 'vitest'
import { parseSources, validateCitations, isRefusal } from '../worker/response.js'

const BLOCKS = [
  { id: 'thesis-accuracy', source: '#s02', sourceLabel: 'Fig. 1', body: 'x' },
  { id: 'logistics-availability', source: null, sourceLabel: null, body: 'y' }
]

describe('parseSources', () => {
  it('splits the answer from the SOURCES line', () => {
    const r = parseSources('The answer.\n\nSOURCES: thesis-accuracy, logistics-availability')
    expect(r.answer).toBe('The answer.')
    expect(r.ids).toEqual(['thesis-accuracy', 'logistics-availability'])
  })

  it('returns the whole text and no ids when the line is missing', () => {
    const r = parseSources('Just an answer.')
    expect(r.answer).toBe('Just an answer.')
    expect(r.ids).toEqual([])
  })

  it('deduplicates ids', () => {
    const r = parseSources('A.\nSOURCES: a, a, b')
    expect(r.ids).toEqual(['a', 'b'])
  })

  it('tolerates missing space and odd casing', () => {
    const r = parseSources('A.\nsources:a,b')
    expect(r.ids).toEqual(['a', 'b'])
  })

  it('ignores an early prose line that starts with "Sources" and uses the trailing SOURCES line', () => {
    const r = parseSources('Sources: are limited for this claim.\n\nSOURCES: thesis-accuracy')
    expect(r.answer).toBe('Sources: are limited for this claim.')
    expect(r.ids).toEqual(['thesis-accuracy'])
  })

  it('uses the last SOURCES line when the model emits it twice', () => {
    const r = parseSources('A.\nSOURCES: a\n\nSOURCES: b')
    expect(r.ids).toEqual(['b'])
  })

  it('falls back to a same-line SOURCES: marker when the anchored search finds nothing', () => {
    const r = parseSources("Vineet's thesis reached 70.2% accuracy on BIRD. SOURCES: thesis-accuracy")
    expect(r.answer).toBe("Vineet's thesis reached 70.2% accuracy on BIRD.")
    expect(r.ids).toEqual(['thesis-accuracy'])
  })

  it('does not let the fallback fire on ordinary prose mentioning "sources" with no uppercase marker', () => {
    const r = parseSources('Sources are limited for this claim.')
    expect(r.answer).toBe('Sources are limited for this claim.')
    expect(r.ids).toEqual([])
  })
})

describe('validateCitations', () => {
  it('keeps ids that exist in the corpus', () => {
    expect(validateCitations(['thesis-accuracy'], BLOCKS).map(b => b.id))
      .toEqual(['thesis-accuracy'])
  })

  it('strips ids that do not exist', () => {
    expect(validateCitations(['invented-block'], BLOCKS)).toEqual([])
  })

  it('handles an empty list', () => {
    expect(validateCitations([], BLOCKS)).toEqual([])
  })
})

describe('isRefusal', () => {
  it('detects the sentinel', () => {
    expect(isRefusal('NO_ANSWER')).toBe(true)
    expect(isRefusal('  NO_ANSWER  ')).toBe(true)
  })

  it('detects the sentinel even when the model adds padding', () => {
    expect(isRefusal('NO_ANSWER\n\nSOURCES:')).toBe(true)
  })

  it('does not fire on a normal answer', () => {
    expect(isRefusal('He has no answer to that in the notes.')).toBe(false)
  })
})
