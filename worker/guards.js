export const MAX_QUESTION_CHARS = 500

const EMAIL = 'vineet.vora123@gmail.com'

/**
 * Deflection is deliberately over-eager. Sending an innocent question to
 * Vineet's inbox costs the visitor one click; letting a compensation question
 * through costs a negotiating position. False positives are acceptable here,
 * false negatives are not.
 *
 * These are matched before the model is called, so there is nothing to jailbreak.
 */
const DEFLECTIONS = [
  {
    topic: 'authorization',
    patterns: [
      /\bvisa\b/i, /\bsponsor(ship|ing|ed)?\b/i, /\bh-?1-?b\b/i, /\bopt\b/i,
      /\bcpt\b/i, /\bwork authoriz/i, /\bauthoriz(ed|ation) to work\b/i,
      /\bgreen card\b/i, /\bcitizen(ship)?\b/i, /\bright to work\b/i
    ],
    reply: `Work authorisation is best discussed directly with Vineet — ${EMAIL}.`
  },
  {
    topic: 'compensation',
    patterns: [
      /\bsalary\b/i, /\bcompensation\b/i, /\bhow much (does|would|will) he\b/i,
      /\bpay (range|expectation)/i, /\bexpected pay\b/i, /\brate\b/i, /\bctc\b/i
    ],
    reply: `Compensation is best discussed directly with Vineet — ${EMAIL}.`
  },
  {
    topic: 'fit',
    patterns: [
      /\bwould he be (good|great|a good fit)\b/i, /\bis he a good fit\b/i,
      /\bdo you think he\b/i, /\bshould (we|i) hire\b/i, /\bis he right for\b/i
    ],
    reply:
      "I won't give an opinion on fit — ask me what he's built and judge for yourself. " +
      'Try "what did the thesis achieve?" or "has he worked with distributed systems?"'
  }
]

export function checkInput(question) {
  if (typeof question !== 'string') return { ok: false, reason: 'not a string' }
  const trimmed = question.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }
  if (question.length > MAX_QUESTION_CHARS) return { ok: false, reason: 'too long' }
  return { ok: true, reason: null }
}

export function matchDeflection(question) {
  for (const d of DEFLECTIONS) {
    if (d.patterns.some(p => p.test(question))) {
      return { topic: d.topic, reply: d.reply }
    }
  }
  return null
}
