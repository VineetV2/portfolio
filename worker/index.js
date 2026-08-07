import { checkInput, matchDeflection } from './guards.js'
import { INVALID_REPLY } from './prompt.js'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname !== '/api/ask') {
      return env.ASSETS.fetch(request)
    }

    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405)
    }

    let question
    try {
      ({ question } = await request.json())
    } catch {
      return json({ answer: INVALID_REPLY, sources: [], meta: {} })
    }

    const input = checkInput(question)
    if (!input.ok) return json({ answer: INVALID_REPLY, sources: [], meta: {} })

    const deflection = matchDeflection(question)
    if (deflection) {
      return json({ answer: deflection.reply, sources: [], meta: { deflected: deflection.topic } })
    }

    return json({ answer: 'STUB: routing works.', sources: [], meta: { stub: true } })
  }
}
