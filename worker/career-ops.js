// /career-ops — Vineet's private job-search dashboard.
//
// Everything under /career-ops is gated twice: Cloudflare Access sits in
// front of the route, and this Worker re-verifies the Access JWT itself, so a
// misconfigured Access application can never expose the page. Until the
// CAREER_OPS_* settings exist the route answers 404, exactly like a path that
// was never there. The data lives in the private career-ops repo and is read
// through the GitHub API with a read-only token; none of it is committed here.

const PREFIX = '/career-ops'
const DEFAULT_REPO = 'VineetV2/career-ops-private'

// The only repo paths the file endpoint will serve.
const FILE_RULES = [
  { re: /^reports\/[\w.-]+\.md$/, type: 'text/markdown; charset=utf-8' },
  { re: /^data\/daily\/[\w.-]+\.md$/, type: 'text/markdown; charset=utf-8' },
  { re: /^output\/[\w.-]+\.pdf$/, type: 'application/pdf' }
]

const PRIVATE_HEADERS = {
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff'
}

const notFound = () => new Response('Not found', { status: 404, headers: PRIVATE_HEADERS })

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...PRIVATE_HEADERS, 'content-type': 'application/json; charset=utf-8' }
  })

export const isCareerOpsPath = pathname => pathname === PREFIX || pathname.startsWith(PREFIX + '/')

export async function handleCareerOps(request, env, { now = Date.now(), fetchImpl = fetch } = {}) {
  if (!configured(env)) return notFound()

  const identity = await verifyAccess(request, env, { now, fetchImpl })
  if (!identity) return notFound()

  const { pathname, searchParams } = new URL(request.url)
  if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'method not allowed' }, 405)

  const gh = path => githubRaw(env, path, fetchImpl)

  try {
    if (pathname === PREFIX + '/api/data') {
      const [tracker, daily] = await Promise.all([
        gh('data/applications.md').then(r => r.text()),
        listDir(env, 'data/daily', fetchImpl)
      ])
      return json({
        user: identity.email,
        repo: repoName(env),
        applications: parseTracker(tracker),
        daily: daily.filter(f => f.endsWith('.md')).sort().reverse()
      })
    }

    if (pathname === PREFIX + '/api/scans') {
      const date = searchParams.get('date') || ''
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400)
      const tsv = await gh('data/scan-history.tsv').then(r => r.text())
      return json(summarizeScans(tsv, date))
    }

    if (pathname === PREFIX + '/api/file') {
      const path = searchParams.get('path') || ''
      const rule = FILE_RULES.find(r => r.re.test(path))
      if (!rule || path.includes('..')) return json({ error: 'path not allowed' }, 400)
      const res = await gh(path)
      return new Response(res.body, {
        headers: {
          ...PRIVATE_HEADERS,
          'content-type': rule.type,
          'content-disposition': `inline; filename="${path.split('/').pop()}"`
        }
      })
    }
  } catch (err) {
    if (err instanceof GitHubError) return json({ error: err.message }, err.status === 404 ? 404 : 502)
    throw err
  }

  if (pathname.startsWith(PREFIX + '/api/')) return json({ error: 'not found' }, 404)

  // The page itself. Static files under career-ops/ are only reachable through
  // here because wrangler.jsonc runs the Worker first for /career-ops/*.
  const assetPath = pathname === PREFIX ? PREFIX + '/' : pathname
  const res = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url), request))
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) out.headers.set(k, v)
  return out
}

function configured(env) {
  return Boolean(env.CAREER_OPS_ACCESS_TEAM && env.CAREER_OPS_ACCESS_AUD &&
    env.CAREER_OPS_EMAIL && env.CAREER_OPS_GITHUB_TOKEN)
}

const repoName = env => env.CAREER_OPS_REPO || DEFAULT_REPO

// ── Cloudflare Access ────────────────────────────────────────────────────

let jwksCache = { team: null, keys: null, at: 0 }

/**
 * Returns { email } for a valid Access token issued to the allowed email, or
 * null. Checks signature (RS256 against the team's published keys), issuer,
 * audience, expiry and email. Exported for testing.
 */
export async function verifyAccess(request, env, { now = Date.now(), fetchImpl = fetch } = {}) {
  const token = request.headers.get('cf-access-jwt-assertion') || readCookie(request, 'CF_Authorization')
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  let header, payload
  try {
    header = JSON.parse(b64urlText(parts[0]))
    payload = JSON.parse(b64urlText(parts[1]))
  } catch {
    return null
  }
  if (header.alg !== 'RS256' || !header.kid) return null

  const team = teamOrigin(env.CAREER_OPS_ACCESS_TEAM)
  if (payload.iss !== team) return null
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!aud.includes(env.CAREER_OPS_ACCESS_AUD)) return null
  const t = Math.floor(now / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < t) return null
  if (typeof payload.nbf === 'number' && payload.nbf > t + 60) return null

  const allowed = String(env.CAREER_OPS_EMAIL).split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (!payload.email || !allowed.includes(String(payload.email).toLowerCase())) return null

  const jwk = await findKey(team, header.kid, now, fetchImpl)
  if (!jwk) return null

  try {
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]),
      new TextEncoder().encode(parts[0] + '.' + parts[1]))
    return ok ? { email: payload.email } : null
  } catch {
    return null
  }
}

export function teamOrigin(team) {
  const host = String(team).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return 'https://' + (host.includes('.') ? host : `${host}.cloudflareaccess.com`)
}

async function findKey(team, kid, now, fetchImpl) {
  const fresh = jwksCache.team === team && now - jwksCache.at < 10 * 60 * 1000
  let keys = fresh ? jwksCache.keys : null
  if (!keys || !keys.some(k => k.kid === kid)) {
    const res = await fetchImpl(`${team}/cdn-cgi/access/certs`)
    if (!res.ok) return null
    keys = (await res.json()).keys || []
    jwksCache = { team, keys, at: now }
  }
  return keys.find(k => k.kid === kid) || null
}

/** Exported for tests that rotate keys between cases. */
export function resetAccessKeyCache() {
  jwksCache = { team: null, keys: null, at: 0 }
}

function readCookie(request, name) {
  const cookie = request.headers.get('cookie') || ''
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

function b64urlBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

const b64urlText = s => new TextDecoder().decode(b64urlBytes(s))

// ── GitHub ───────────────────────────────────────────────────────────────

class GitHubError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function ghRequest(env, path, accept, fetchImpl) {
  const url = `https://api.github.com/repos/${repoName(env)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  return fetchImpl(url, {
    headers: {
      authorization: `Bearer ${env.CAREER_OPS_GITHUB_TOKEN}`,
      accept,
      'user-agent': 'vineetvora.dev-career-ops',
      'x-github-api-version': '2022-11-28'
    }
  })
}

async function githubRaw(env, path, fetchImpl) {
  const res = await ghRequest(env, path, 'application/vnd.github.raw', fetchImpl)
  if (!res.ok) throw new GitHubError(`GitHub returned ${res.status} for ${path}`, res.status)
  return res
}

async function listDir(env, path, fetchImpl) {
  const res = await ghRequest(env, path, 'application/vnd.github+json', fetchImpl)
  if (res.status === 404) return []
  if (!res.ok) throw new GitHubError(`GitHub returned ${res.status} for ${path}`, res.status)
  const items = await res.json()
  return Array.isArray(items) ? items.filter(i => i.type === 'file').map(i => i.name) : []
}

// ── Parsing ──────────────────────────────────────────────────────────────

/** Parses data/applications.md into row objects. Exported for testing. */
export function parseTracker(md) {
  const rows = []
  let columns = null
  for (const line of md.split('\n')) {
    if (!line.trim().startsWith('|')) continue
    const cells = splitRow(line)
    if (!columns) {
      columns = cells.map(c => c.toLowerCase())
      continue
    }
    if (cells.every(c => /^:?-+:?$/.test(c))) continue
    const get = name => cells[columns.indexOf(name)] ?? ''
    const reportCell = get('report')
    const reportMatch = reportCell.match(/\((?:\.\.\/)?(reports\/[\w.-]+\.md)\)/)
    const score = parseFloat(get('score'))
    rows.push({
      num: get('#'),
      date: get('date'),
      company: get('company'),
      role: get('role'),
      score: Number.isFinite(score) ? score : null,
      status: get('status'),
      pdf: get('pdf').includes('✅'),
      report: reportMatch ? reportMatch[1] : null,
      notes: get('notes')
    })
  }
  return rows
}

function splitRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  // Cells may contain escaped pipes (\|); keep them inside the cell.
  return trimmed.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'))
}

/**
 * Counts per scan date and status, plus the postings that passed the filters
 * on the requested date (default: latest). Exported for testing.
 */
export function summarizeScans(tsv, date = '') {
  const lines = tsv.split('\n').filter(Boolean)
  if (!lines.length) return { dates: [], date: null, counts: {}, added: [] }
  const head = lines[0].split('\t')
  const col = name => head.indexOf(name)
  const iUrl = col('url'), iDate = col('first_seen'), iStatus = col('status')
  const iTitle = col('title'), iCompany = col('company'), iLoc = col('location'), iPosted = col('posted_at')

  const byDate = {}
  const rows = lines.slice(1).map(l => l.split('\t'))
  for (const r of rows) {
    const d = r[iDate]
    if (!d) continue
    byDate[d] ??= {}
    byDate[d][r[iStatus]] = (byDate[d][r[iStatus]] || 0) + 1
  }
  const dates = Object.keys(byDate).sort().reverse()
  const pick = date && byDate[date] ? date : dates[0] || null
  const added = rows
    .filter(r => r[iDate] === pick && r[iStatus] === 'added')
    .map(r => ({ url: r[iUrl], company: r[iCompany], title: r[iTitle], location: r[iLoc], posted: r[iPosted] }))
  return { dates, date: pick, counts: pick ? byDate[pick] : {}, added }
}
