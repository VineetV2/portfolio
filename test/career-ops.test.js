import { describe, it, expect, beforeEach } from 'vitest'
import worker from '../worker/index.js'
import {
  handleCareerOps, verifyAccess, parseTracker, summarizeScans, teamOrigin, resetAccessKeyCache
} from '../worker/career-ops.js'

const TEAM = 'https://vineet.cloudflareaccess.com'
const AUD = 'aud-123'
const EMAIL = 'vineet.vora123@gmail.com'
const NOW = 1_800_000_000_000

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64urlJson = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)))

const keyPair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true, ['sign', 'verify'])
const publicJwk = { ...(await crypto.subtle.exportKey('jwk', keyPair.publicKey)), kid: 'k1' }

async function sign(payload, { kid = 'k1', key = keyPair.privateKey } = {}) {
  const head = b64urlJson({ alg: 'RS256', kid })
  const body = b64urlJson(payload)
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + body))
  return `${head}.${body}.${b64url(sig)}`
}

const goodClaims = () => ({ iss: TEAM, aud: [AUD], email: EMAIL, exp: NOW / 1000 + 600, nbf: NOW / 1000 - 10 })

const ENV = {
  CAREER_OPS_ACCESS_TEAM: 'vineet',
  CAREER_OPS_ACCESS_AUD: AUD,
  CAREER_OPS_EMAIL: EMAIL,
  CAREER_OPS_GITHUB_TOKEN: 'ghp_test',
  ASSETS: { fetch: async req => new Response(`asset:${new URL(req.url).pathname}`, { headers: { 'content-type': 'text/html' } }) }
}

const TRACKER = `# Applications Tracker

| # | Date | Company | Role | Score | Status | PDF | Report | Notes |
|---|------|---------|------|-------|--------|-----|--------|-------|
| 1 | 2026-10-20 | Palantir | SWE, New Grad | 4.4/5 | Evaluated | ✅ | [001](../reports/001-palantir-2026-10-20.md) | Apply: good fit; posted: 2026-10-19 |
| 2 | 2026-10-20 | Legora | FDE | 3.2/5 | SKIP | ❌ | [004](../reports/004-legora-2026-10-20.md) | Skip: needs 2-3 yrs \\| senior |
`

const SCANS = [
  'url\tfirst_seen\tportal\ttitle\tcompany\tstatus\tlocation\tfingerprint\tposted_at',
  'https://a\t2026-10-20\tgh\tFDE\tAcme\tadded\tNYC\tx\t2026-10-19',
  'https://b\t2026-10-20\tgh\tSenior\tAcme\tskipped_title\tNYC\tx\t2026-10-19',
  'https://c\t2026-10-19\tgh\tSWE\tBeta\tadded\tSF\tx\t2026-10-18'
].join('\n')

function fakeFetch(calls = []) {
  return async (url, init) => {
    calls.push({ url: String(url), init })
    const u = String(url)
    if (u === `${TEAM}/cdn-cgi/access/certs`) return Response.json({ keys: [publicJwk] })
    if (u.endsWith('/contents/data/applications.md')) return new Response(TRACKER)
    if (u.endsWith('/contents/data/daily')) return Response.json([{ type: 'file', name: '2026-10-19.md' }, { type: 'file', name: '2026-10-20.md' }])
    if (u.endsWith('/contents/data/scan-history.tsv')) return new Response(SCANS)
    if (u.endsWith('/contents/output/cv.pdf')) return new Response('%PDF-1.7')
    return new Response('nope', { status: 404 })
  }
}

async function req(path, { token, cookie } = {}) {
  const headers = {}
  if (token) headers['cf-access-jwt-assertion'] = token
  if (cookie) headers.cookie = cookie
  return new Request('https://vineetvora.dev' + path, { headers })
}

beforeEach(() => resetAccessKeyCache())

describe('career-ops gate', () => {
  it('404s when the CAREER_OPS settings are missing, even with a valid token', async () => {
    const r = await handleCareerOps(await req('/career-ops/', { token: await sign(goodClaims()) }),
      { ASSETS: ENV.ASSETS }, { now: NOW, fetchImpl: fakeFetch() })
    expect(r.status).toBe(404)
  })

  it('404s without an Access token', async () => {
    const r = await handleCareerOps(await req('/career-ops/'), ENV, { now: NOW, fetchImpl: fakeFetch() })
    expect(r.status).toBe(404)
  })

  it('serves the page for a valid token and marks it private', async () => {
    const r = await handleCareerOps(await req('/career-ops', { token: await sign(goodClaims()) }), ENV, { now: NOW, fetchImpl: fakeFetch() })
    expect(r.status).toBe(200)
    expect(await r.text()).toBe('asset:/career-ops/')
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('x-robots-tag')).toContain('noindex')
  })

  it('accepts the token from the CF_Authorization cookie', async () => {
    const token = await sign(goodClaims())
    const r = await handleCareerOps(await req('/career-ops/', { cookie: `a=b; CF_Authorization=${token}` }), ENV, { now: NOW, fetchImpl: fakeFetch() })
    expect(r.status).toBe(200)
  })

  it.each([
    ['wrong email', { email: 'someone@else.com' }],
    ['wrong audience', { aud: ['other'] }],
    ['wrong issuer', { iss: 'https://evil.cloudflareaccess.com' }],
    ['expired', { exp: NOW / 1000 - 1 }]
  ])('rejects a token with %s', async (_, override) => {
    const ok = await verifyAccess(await req('/career-ops/', { token: await sign({ ...goodClaims(), ...override }) }), ENV, { now: NOW, fetchImpl: fakeFetch() })
    expect(ok).toBeNull()
  })

  it('rejects a token signed by a different key', async () => {
    const other = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign'])
    const token = await sign(goodClaims(), { key: other.privateKey })
    expect(await verifyAccess(await req('/x', { token }), ENV, { now: NOW, fetchImpl: fakeFetch() })).toBeNull()
  })

  it('rejects alg=none tokens', async () => {
    const token = `${b64urlJson({ alg: 'none', kid: 'k1' })}.${b64urlJson(goodClaims())}.`
    expect(await verifyAccess(await req('/x', { token }), ENV, { now: NOW, fetchImpl: fakeFetch() })).toBeNull()
  })

  it('routes /career-ops through the main worker', async () => {
    const r = await worker.fetch(await req('/career-ops/'), ENV, {})
    expect(r.status).toBe(404)
  })
})

describe('career-ops api', () => {
  it('returns parsed tracker rows and daily files newest first', async () => {
    const calls = []
    const r = await handleCareerOps(await req('/career-ops/api/data', { token: await sign(goodClaims()) }), ENV, { now: NOW, fetchImpl: fakeFetch(calls) })
    const body = await r.json()
    expect(body.applications).toHaveLength(2)
    expect(body.daily).toEqual(['2026-10-20.md', '2026-10-19.md'])
    const gh = calls.find(c => c.url.includes('applications.md'))
    expect(gh.url).toBe('https://api.github.com/repos/VineetV2/career-ops-private/contents/data/applications.md')
    expect(gh.init.headers.authorization).toBe('Bearer ghp_test')
  })

  it('serves an allowed PDF inline', async () => {
    const r = await handleCareerOps(await req('/career-ops/api/file?path=output/cv.pdf', { token: await sign(goodClaims()) }), ENV, { now: NOW, fetchImpl: fakeFetch() })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('application/pdf')
  })

  it.each(['cv.md', 'config/profile.yml', 'reports/../cv.md', 'data/applications.md', 'output/x.html'])(
    'refuses to serve %s', async path => {
      const r = await handleCareerOps(await req('/career-ops/api/file?path=' + encodeURIComponent(path), { token: await sign(goodClaims()) }), ENV, { now: NOW, fetchImpl: fakeFetch() })
      expect(r.status).toBe(400)
    })

  it('summarizes scans for a date', async () => {
    const r = await handleCareerOps(await req('/career-ops/api/scans?date=2026-10-19', { token: await sign(goodClaims()) }), ENV, { now: NOW, fetchImpl: fakeFetch() })
    const body = await r.json()
    expect(body.date).toBe('2026-10-19')
    expect(body.added.map(a => a.company)).toEqual(['Beta'])
  })
})

describe('parsers', () => {
  it('parses tracker rows, report links and escaped pipes', () => {
    const [a, b] = parseTracker(TRACKER)
    expect(a).toMatchObject({ company: 'Palantir', score: 4.4, status: 'Evaluated', pdf: true, report: 'reports/001-palantir-2026-10-20.md' })
    expect(b).toMatchObject({ company: 'Legora', pdf: false, notes: 'Skip: needs 2-3 yrs | senior' })
  })

  it('defaults scan summary to the latest date', () => {
    const s = summarizeScans(SCANS)
    expect(s.dates).toEqual(['2026-10-20', '2026-10-19'])
    expect(s.counts).toEqual({ added: 1, skipped_title: 1 })
    expect(s.added).toEqual([{ url: 'https://a', company: 'Acme', title: 'FDE', location: 'NYC', posted: '2026-10-19' }])
  })

  it('normalizes the Access team name', () => {
    expect(teamOrigin('vineet')).toBe(TEAM)
    expect(teamOrigin('https://vineet.cloudflareaccess.com/')).toBe(TEAM)
  })
})
