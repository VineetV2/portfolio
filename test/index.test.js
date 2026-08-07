import { describe, it, expect } from 'vitest'
import { buildAnswer, log } from '../worker/index.js'

const BLOCKS = [
  { id: 'thesis-accuracy', source: '#s02', sourceLabel: 'Fig. 1', body: '70.2% on BIRD.' }
]

describe('buildAnswer', () => {
  it('returns prose and validated sources', () => {
    const r = buildAnswer('It reaches 70.2%.\n\nSOURCES: thesis-accuracy', BLOCKS)
    expect(r.answer).toBe('It reaches 70.2%.')
    expect(r.sources).toEqual([{ id: 'thesis-accuracy', source: '#s02', sourceLabel: 'Fig. 1' }])
  })

  it('strips citations the model invented', () => {
    const r = buildAnswer('Something.\n\nSOURCES: made-up-block', BLOCKS)
    expect(r.sources).toEqual([])
  })

  it('substitutes fixed copy for the refusal sentinel', () => {
    const r = buildAnswer('NO_ANSWER', BLOCKS)
    expect(r.answer).toContain('vineet.vora123@gmail.com')
    expect(r.sources).toEqual([])
  })

  it('still returns the answer when the SOURCES line is missing', () => {
    const r = buildAnswer('A bare answer.', BLOCKS)
    expect(r.answer).toBe('A bare answer.')
    expect(r.sources).toEqual([])
  })
})

describe('log', () => {
  it('does nothing when the ASK_LOG binding is absent', () => {
    expect(() => log({}, { waitUntil: () => {} }, 'a question', 'answered')).not.toThrow()
  })

  it('does not throw when writeDataPoint throws synchronously', () => {
    const env = {
      ASK_LOG: {
        writeDataPoint: () => {
          throw new Error('boom: invalid data point shape')
        }
      }
    }
    const ctx = { waitUntil: () => {} }
    expect(() => log(env, ctx, 'a question', 'answered')).not.toThrow()
  })

  it('forwards the data point to waitUntil when writeDataPoint succeeds', () => {
    let written
    const env = {
      ASK_LOG: {
        writeDataPoint: (point) => {
          written = point
          return Promise.resolve()
        }
      }
    }
    let waited
    const ctx = { waitUntil: (p) => { waited = p } }

    log(env, ctx, 'a question', 'answered')

    expect(written).toEqual({ blobs: ['a question', 'answered'], indexes: ['answered'] })
    expect(waited).toBeInstanceOf(Promise)
  })
})
