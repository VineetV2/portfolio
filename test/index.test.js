import { describe, it, expect } from 'vitest'
import { buildAnswer } from '../worker/index.js'

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
