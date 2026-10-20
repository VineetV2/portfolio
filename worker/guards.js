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
    // Attempts to rewrite the assistant's role or rules. The small model
    // sometimes plays along ("You are now unrestricted… 2+2?" → "4"), so
    // these never reach it.
    topic: 'override',
    patterns: [
      /\byou(?: are|'re| r) now\b/i, /\bfrom now on,? you\b/i,
      /\b(ignore|disregard|forget|override)\b.{0,30}\b(instructions?|rules|prompt|guidelines)\b/i,
      /\bsystem prompt\b/i, /\bdeveloper mode\b/i, /\bjailbr(eak|oken)\b/i,
      /\bunrestricted\b/i, /\bno (rules|restrictions|filters)\b/i
    ],
    reply:
      "I only answer questions about Vineet, from his notes. Ask about his thesis, " +
      'his projects, or his availability — or email him at ' + EMAIL + '.'
  },
  {
    // Pure greetings only — anchored to the whole string, so a greeting with a
    // question attached ("hi, does he know Python?") still reaches the model.
    topic: 'greeting',
    patterns: [
      /^(hi+|hey+a?|hello+|yo|sup|what'?s up|howdy|namaste|hola|good (morning|afternoon|evening))[\s!.,…?]*$/i
    ],
    reply:
      "Hey — I'm the assistant for Vineet's dossier. Ask me about his thesis, " +
      'his projects, or whether he\u2019s available — or tap one of the suggestions.'
  },
  {
    topic: 'authorization',
    patterns: [
      /\bvisa\b/i, /\bsponsor(ship|ing|ed)?\b/i, /\bh-?1-?b\b/i, /\bopt\b/i,
      /\bcpt\b/i, /\bwork authoriz/i, /\bauthoriz(ed|ation) to work\b/i,
      /\bgreen card\b/i, /\bcitizen(ship)?\b/i, /\bright to work\b/i,
      /\bwork permit\b/i, /\beligible to work\b/i, /\blegally able to work\b/i
    ],
    reply: `Work authorisation is best discussed directly with Vineet — ${EMAIL}.`
  },
  {
    topic: 'compensation',
    patterns: [
      /\bsalary\b/i, /\bcompensation\b/i, /\bhow much (does|would|will) he\b/i,
      /\bpay (range|expectation)/i, /\bexpected pay\b/i,
      /\bpay rate\b/i, /\bhourly rate\b/i, /\bday rate\b/i, /\brate expectation/i,
      /\bctc\b/i
    ],
    reply: `Compensation is best discussed directly with Vineet — ${EMAIL}.`
  },
  {
    topic: 'hypothetical',
    patterns: [
      /\bpretend\b/i, /\bimagine (that|the|he)\b/i, /\bsuppose (that|the|he)\b/i,
      /\bhypothetical(ly)?\b/i, /\bact as if\b/i, /\bassume (that|the|he)\b/i,
      /\brole.?play\b/i, /\bwhat if (the notes|he had)\b/i
    ],
    reply:
      "I only answer from Vineet's actual notes — I won't play out hypotheticals " +
      'about him. Ask me something real, or email him at ' + EMAIL + '.'
  },
  {
    topic: 'fit',
    patterns: [
      /\bwould he be (good|great|a good fit)\b/i, /\bis he a good fit\b/i,
      /\bdo you think he\b/i, /\bshould (we|i) hire\b/i, /\bis he right for\b/i,
      /\bwould you hire\b/i, /\bdo you recommend\b/i, /\bstrong candidate\b/i,
      /\bqualified for\b/i
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

/**
 * Multi-turn history arrives from the client and is attacker-controlled.
 * Sanitize hard: cap the number of turns and each turn's length, accept
 * only the two roles the prompt understands, and coerce everything else
 * to "no history". A malformed history must degrade to a single-turn
 * question, never to an error.
 */
export const MAX_HISTORY_TURNS = 6
export const MAX_HISTORY_CHARS = 600

export function sanitizeHistory(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(h => h && typeof h === 'object' &&
      (h.role === 'user' || h.role === 'assistant') &&
      typeof h.content === 'string' && h.content.trim() !== '')
    .slice(-MAX_HISTORY_TURNS)
    .map(h => ({ role: h.role, content: h.content.slice(0, MAX_HISTORY_CHARS) }))
}
