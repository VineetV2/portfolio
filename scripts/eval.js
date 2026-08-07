import { readFile } from 'node:fs/promises'

const BASE = process.env.EVAL_BASE || 'http://localhost:8789'

const lines = (await readFile('corpus/eval.md', 'utf8'))
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))

/**
 * Evaluates a single `kind:value` expectation against one /api/ask response.
 * `value` is undefined for expectations with no argument (e.g. `refusal`).
 */
function checkExpectation(kind, value, { answer, cited, meta }) {
  if (kind === 'cites') return cited.includes(value)
  if (kind === 'contains') return answer.toLowerCase().includes(value.toLowerCase())
  if (kind === 'not-contains') return !answer.toLowerCase().includes(value.toLowerCase())
  if (kind === 'refusal') return /don't have that in Vineet's notes/i.test(answer)
  if (kind === 'deflected') return meta?.deflected === value
  return false
}

let pass = 0
const failures = []

for (const line of lines) {
  const [bucket, question, expectationField] = line.split('|').map(s => s.trim())

  const res = await fetch(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question })
  }).then(r => r.json())

  const answer = res.answer || ''
  const cited = (res.sources || []).map(s => s.id)
  const ctx = { answer, cited, meta: res.meta }

  // A single case line may carry multiple `&&`-joined expectations, e.g.
  // `not-contains:ten years && refusal` — all must pass for the case to pass.
  // This exists so an adversarial case can require both that the model
  // resisted the injected instruction AND behaved correctly (grounded
  // refusal/answer), rather than passing vacuously on an empty response.
  const expectations = expectationField.split('&&').map(s => s.trim())
  const results = expectations.map(exp => {
    const [kind, value] = exp.split(':').map(s => s.trim())
    return { exp, ok: checkExpectation(kind, value, ctx) }
  })
  const ok = results.every(r => r.ok)

  if (ok) pass++
  else failures.push({ bucket, question, expectation: expectationField, answer: answer.slice(0, 120), results })

  console.log(`${ok ? 'PASS' : 'FAIL'}  [${bucket}] ${question}`)
}

console.log(`\n${pass}/${lines.length} passed`)
if (failures.length) {
  console.log('\nFailures:')
  for (const f of failures) {
    const failed = f.results.filter(r => !r.ok).map(r => r.exp).join(', ')
    console.log(`  ${f.question}\n    expected ${f.expectation}\n    failed part(s): ${failed}\n    got: ${f.answer}\n`)
  }
}
