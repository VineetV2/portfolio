import { describe, it, expect } from 'vitest'
import { checkInput, matchDeflection, MAX_QUESTION_CHARS } from '../worker/guards.js'

describe('checkInput', () => {
  it('accepts a normal question', () => {
    expect(checkInput('What did the thesis achieve?').ok).toBe(true)
  })

  it('rejects empty and whitespace-only', () => {
    expect(checkInput('').ok).toBe(false)
    expect(checkInput('   \n  ').ok).toBe(false)
  })

  it('rejects a non-string', () => {
    expect(checkInput(undefined).ok).toBe(false)
    expect(checkInput(42).ok).toBe(false)
  })

  it('rejects anything over the cap', () => {
    expect(checkInput('x'.repeat(MAX_QUESTION_CHARS + 1)).ok).toBe(false)
  })

  it('accepts exactly the cap', () => {
    expect(checkInput('x'.repeat(MAX_QUESTION_CHARS)).ok).toBe(true)
  })
})

describe('matchDeflection', () => {
  it('catches work authorisation questions', () => {
    expect(matchDeflection('does he need visa sponsorship?').topic).toBe('authorization')
    expect(matchDeflection('Is he authorized to work in the US?').topic).toBe('authorization')
    expect(matchDeflection('what about OPT?').topic).toBe('authorization')
  })

  it('catches compensation questions', () => {
    expect(matchDeflection('what salary is he looking for?').topic).toBe('compensation')
    expect(matchDeflection('How much does he expect?').topic).toBe('compensation')
  })

  it('catches requests for an opinion on fit', () => {
    expect(matchDeflection('would he be good at a backend role?').topic).toBe('fit')
    expect(matchDeflection('should we hire him?').topic).toBe('fit')
  })

  it('returns null for ordinary questions', () => {
    expect(matchDeflection('What did the thesis achieve?')).toBeNull()
    expect(matchDeflection('Has he used Hadoop?')).toBeNull()
  })

  it('always returns a non-empty reply when it matches', () => {
    for (const q of ['visa?', 'salary?', 'should we hire him?']) {
      expect(matchDeflection(q).reply.length).toBeGreaterThan(0)
    }
  })
})
