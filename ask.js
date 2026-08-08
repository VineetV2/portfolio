(function () {
  'use strict'

  var form = document.getElementById('askForm')
  if (!form) return

  var input = document.getElementById('askInput')
  var button = form.querySelector('.ask-send')
  var out = document.getElementById('askAnswer')
  var starters = document.getElementById('askStarters')
  var statsEl = document.getElementById('askStats')

  var panel = document.getElementById('askwPanel')
  var launcher = document.getElementById('askwLauncher')
  var closeBtn = document.getElementById('askwClose')
  var teaser = document.getElementById('askwTeaser')
  var teaserText = document.getElementById('askwTeaserText')
  var teaserClose = document.getElementById('askwTeaserClose')

  var pending = false

  /* ── answer rendering (unchanged pipeline: textContent only) ───── */

  function render(nodes) {
    out.textContent = ''
    nodes.forEach(function (n) { out.appendChild(n) })
  }

  function para(text, cls) {
    var p = document.createElement('p')
    if (cls) p.className = cls
    p.textContent = text            // never innerHTML
    return p
  }

  function sourceLine(sources) {
    var p = document.createElement('p')
    p.className = 'ask-src'
    p.appendChild(document.createTextNode('Sources: '))
    sources.forEach(function (s, i) {
      if (i) p.appendChild(document.createTextNode(' · '))
      var isAnchor = typeof s.source === 'string' && /^#/.test(s.source)
      var isHttp = typeof s.source === 'string' && /^https?:\/\//.test(s.source)
      if (isAnchor || isHttp) {
        var a = document.createElement('a')
        a.href = s.source
        a.textContent = s.sourceLabel || s.id
        if (isHttp) { a.target = '_blank'; a.rel = 'noopener' }
        p.appendChild(a)
      } else {
        p.appendChild(document.createTextNode(s.sourceLabel || s.id))
      }
    })
    return p
  }

  function fallback() {
    render([para('Could not reach the assistant. Vineet\'s email is in § 06.')])
  }

  function ask(question) {
    if (!question.trim()) return
    if (pending) return
    pending = true
    button.disabled = true
    render([para('reading the dossier…', 'ask-pending')])

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: question })
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data }
        })
      })
      .then(function (result) {
        var data = result.data
        if (!result.ok || !data || typeof data.answer !== 'string') {
          fallback()
          return
        }
        if (data.meta && statsEl && typeof data.meta.blockCount === 'number' &&
            typeof data.meta.approxTokens === 'number') {
          statsEl.textContent =
            data.meta.blockCount + ' blocks · ~' +
            data.meta.approxTokens.toLocaleString() + ' tokens'
        }
        var nodes = [para(data.answer)]
        if (data.sources && data.sources.length) nodes.push(sourceLine(data.sources))
        render(nodes)
      })
      .catch(function () {
        fallback()
      })
      .finally(function () {
        pending = false
        button.disabled = false
      })
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault()
    ask(input.value)
  })

  starters.addEventListener('click', function (e) {
    var b = e.target.closest('button')
    if (!b) return
    input.value = b.textContent
    ask(b.textContent)
  })

  /* ── session memory (best-effort; private mode must not break us) ─ */

  function remember(key, value) {
    try { sessionStorage.setItem(key, value) } catch (e) {}
  }
  function recall(key) {
    try { return sessionStorage.getItem(key) } catch (e) { return null }
  }

  /* ── panel open / close ────────────────────────────────────────── */

  function openPanel() {
    hideTeaser()
    muteTeasers()                   // once they've found the panel, stop nudging
    panel.hidden = false
    launcher.setAttribute('aria-expanded', 'true')
    input.focus()
  }

  function closePanel() {
    panel.hidden = true
    launcher.setAttribute('aria-expanded', 'false')
    launcher.focus()
  }

  launcher.addEventListener('click', function () {
    if (panel.hidden) openPanel()
    else closePanel()
  })

  closeBtn.addEventListener('click', closePanel)

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) closePanel()
  })

  /* ── proactive teasers ─────────────────────────────────────────────
     A small nudge tied to what the visitor is reading. Deliberately shy:
     at most TEASER_CAP per visit, one at a time, auto-hides, and goes
     quiet permanently (for the session) once dismissed or once the panel
     has been opened. An assistant that keeps tapping your shoulder is
     worse than none. */

  var TEASERS = {
    s01: 'Want the short version? I can answer questions about Vineet.',
    s02: 'Curious about the thesis? Ask me what it actually achieved.',
    s04: 'I can tell you more about the wildfire paper — just ask.',
    s06: 'Anything unanswered? Ask here, or use the email below.'
  }
  var TEASER_CAP = 2
  var FIRST_TEASER_DELAY = 5000
  var TEASER_LIFETIME = 9000

  var teaserTimer = null
  var shownCount = 0
  var pageLoadedAt = Date.now()

  function teasersMuted() { return recall('askwMuted') === '1' }
  function muteTeasers() { remember('askwMuted', '1') }

  function hideTeaser() {
    teaser.hidden = true
    if (teaserTimer) { clearTimeout(teaserTimer); teaserTimer = null }
  }

  function showTeaser(text) {
    if (teasersMuted() || !panel.hidden) return
    if (shownCount >= TEASER_CAP) return
    if (Date.now() - pageLoadedAt < FIRST_TEASER_DELAY) return
    shownCount += 1
    teaserText.textContent = text   // never innerHTML
    teaser.hidden = false
    teaserTimer = setTimeout(hideTeaser, TEASER_LIFETIME)
  }

  teaser.addEventListener('click', function (e) {
    if (e.target.closest('#askwTeaserClose')) {
      hideTeaser()
      muteTeasers()
      return
    }
    openPanel()
  })

  if ('IntersectionObserver' in window) {
    var seen = {}
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return
        var id = entry.target.id
        if (seen[id] || !TEASERS[id]) return
        seen[id] = true
        showTeaser(TEASERS[id])
      })
    }, { rootMargin: '0px 0px -40% 0px', threshold: 0.2 })

    Object.keys(TEASERS).forEach(function (id) {
      var el = document.getElementById(id)
      if (el) io.observe(el)
    })
  }
})()
