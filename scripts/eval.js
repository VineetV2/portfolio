import { readFile } from 'node:fs/promises'

const BASE = process.env.EVAL_BASE || 'http://localhost:8789'

const lines = (await readFile('corpus/eval.md', 'utf8'))
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))

// The worker's JSON envelope (worker/index.js) does not carry a
// `meta.deflected` field — deflection outcome is only distinguishable by the
// reply text itself (worker/guards.js DEFLECTIONS[].reply). The task-9 brief's
// sample runner checked `res.meta?.deflected === value`, which the deployed
// worker can never satisfy; that check is replaced here with a match against
// each topic's known reply text, which is the only observable signal.
const DEFLECTION_MARKERS = {
  authorization: 'work authorisation is best discussed',
  compensation: 'compensation is best discussed',
  fit: "i won't give an opinion on fit"
}

let pass = 0
const failures = []

for (const line of lines) {
  const [bucket, question, expectation] = line.split('|').map(s => s.trim())

  const res = await fetch(`${BASE}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question })
  }).then(r => r.json())

  const answer = res.answer || ''
  const cited = (res.sources || []).map(s => s.id)
  const [kind, value] = expectation.split(':')

  let ok
  if (kind === 'cites') ok = cited.includes(value)
  else if (kind === 'contains') ok = answer.toLowerCase().includes(value.toLowerCase())
  else if (kind === 'not-contains') ok = !answer.toLowerCase().includes(value.toLowerCase())
  else if (kind === 'refusal') ok = /don't have that in Vineet's notes/i.test(answer)
  else if (kind === 'deflected') ok = answer.toLowerCase().includes(DEFLECTION_MARKERS[value] || '\0')
  else ok = false

  if (ok) pass++
  else failures.push({ bucket, question, expectation, answer: answer.slice(0, 120) })

  console.log(`${ok ? 'PASS' : 'FAIL'}  [${bucket}] ${question}`)
}

console.log(`\n${pass}/${lines.length} passed`)
if (failures.length) {
  console.log('\nFailures:')
  for (const f of failures) console.log(`  ${f.question}\n    expected ${f.expectation}\n    got: ${f.answer}\n`)
}
