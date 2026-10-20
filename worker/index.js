import { parseCorpus, selectContext } from './corpus.js'
import { parseSources, validateCitations, isRefusal } from './response.js'
import { checkInput, matchDeflection, sanitizeHistory } from './guards.js'
import { buildMessages, REFUSAL_REPLY, UNAVAILABLE_REPLY, INVALID_REPLY } from './prompt.js'
import FACTS from '../corpus/facts.md'
import { isCareerOpsPath, handleCareerOps } from './career-ops.js'

// Parsed once at module scope: a malformed corpus fails on cold start at deploy,
// not intermittently in front of a visitor.
const { blocks, stats } = parseCorpus(FACTS)

// @cf/meta/llama-3.1-8b-instruct is not available on this account (verified via
// `npx wrangler ai models`); substituted the fp8-quantized sibling, same model
// family and parameter count.
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })

/** Exported for testing: turns raw model output into the response payload. */
export function buildAnswer(raw, corpusBlocks) {
  if (isRefusal(raw)) return { answer: REFUSAL_REPLY, sources: [] }

  // "NOTES" is prompt-internal vocabulary. If it surfaces in an answer the
  // model is describing its own instructions ("no mention of X in the NOTES")
  // rather than answering — substitute the fixed refusal instead of leaking it.
  if (/\bNOTES\b/.test(raw)) return { answer: REFUSAL_REPLY, sources: [] }

  const { answer, ids } = parseSources(raw)
  const sources = validateCitations(ids, corpusBlocks)
    .map(b => ({ id: b.id, source: b.source, sourceLabel: b.sourceLabel }))

  if (!answer) return { answer: REFUSAL_REPLY, sources: [] }
  return { answer, sources }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (isCareerOpsPath(url.pathname)) return handleCareerOps(request, env)
    if (url.pathname !== '/api/ask') return env.ASSETS.fetch(request)
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

    let question, history
    try {
      ({ question, history } = await request.json())
    } catch {
      return json({ answer: INVALID_REPLY, sources: [], meta: meta() })
    }

    if (!checkInput(question).ok) {
      return json({ answer: INVALID_REPLY, sources: [], meta: meta() })
    }

    const deflection = matchDeflection(question)
    if (deflection) {
      log(env, ctx, question, `deflected:${deflection.topic}`)
      return json({ answer: deflection.reply, sources: [], meta: { ...meta(), deflected: deflection.topic } })
    }

    let raw
    try {
      const result = await env.AI.run(MODEL, {
        messages: buildMessages(question, selectContext(question, blocks), sanitizeHistory(history)),
        max_tokens: 400,
        temperature: 0.1
      })
      raw = (result.response ?? '').trim()
    } catch {
      log(env, ctx, question, 'unavailable')
      return json({ answer: UNAVAILABLE_REPLY, sources: [], meta: meta() })
    }

    const payload = buildAnswer(raw, blocks)
    log(env, ctx, question, payload.sources.length ? 'answered' : 'answered:uncited')
    return json({ ...payload, meta: meta() })
  }
}

const meta = () => ({ blockCount: stats.blockCount, approxTokens: stats.approxTokens })

/**
 * Question text and outcome only. No IP, no fingerprint, no identifiers.
 * Exported for testing. Logging must never break an otherwise successful
 * request: `writeDataPoint` can throw synchronously (e.g. a binding that
 * validates data-point shape or limits before returning a promise), so that
 * call is wrapped in its own try/catch rather than relying on `.catch()`,
 * which only handles a promise rejection, not a throw that happens before
 * the promise is ever created.
 */
export function log(env, ctx, question, outcome) {
  if (!env.ASK_LOG) return
  try {
    ctx.waitUntil(
      Promise.resolve(
        env.ASK_LOG.writeDataPoint({
          blobs: [question.slice(0, 200), outcome],
          indexes: [outcome]
        })
      ).catch(() => {})
    )
  } catch {
    // Synchronous throw from writeDataPoint (or waitUntil) — swallow it.
  }
}
