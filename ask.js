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
  var voiceBtn = document.getElementById('askwVoice')
  var micBtn = document.getElementById('askMic')

  var pending = false
  var history = []                  // this conversation, oldest first
  var HISTORY_SENT = 6              // how many turns ride along per request

  /* ── transcript rendering (textContent only, always) ───────────── */

  function addTurn(nodes, who) {
    var wrap = document.createElement('div')
    wrap.className = 'ask-turn' + (who ? ' ask-' + who : '')
    nodes.forEach(function (n) { wrap.appendChild(n) })
    out.appendChild(wrap)
    out.scrollTop = out.scrollHeight
    return wrap
  }

  function para(text, cls) {
    var p = document.createElement('p')
    if (cls) p.className = cls
    p.textContent = text            // never innerHTML
    return p
  }

  /* Linkify ONLY Vineet's own destinations inside answer text. The answer is
     model output, so generic URL linkification would let an injected reply
     render a clickable link to anywhere. Every pattern is anchored to a known
     host, and the href is rebuilt from the anchored match — text that doesn't
     match an allowlisted shape stays plain text. Still no innerHTML. */
  var LINKABLE = [
    { re: /vineet\.vora123@gmail\.com/,
      href: function () { return 'mailto:vineet.vora123@gmail.com' }, ext: false },
    { re: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/vineetv2\/?/,
      href: function () { return 'https://www.linkedin.com/in/vineetv2' }, ext: true },
    { re: /(?:https?:\/\/)?github\.com\/VineetV2(?:\/[A-Za-z0-9._-]+)?/,
      href: function (m) { return 'https://' + m.replace(/^https?:\/\//, '') }, ext: true },
    { re: /(?:https?:\/\/)?ieeexplore\.ieee\.org\/document\/11380637/,
      href: function () { return 'https://ieeexplore.ieee.org/document/11380637' }, ext: true },
    { re: /(?:https?:\/\/)?vineetvora\.dev(?:\/[A-Za-z0-9._-]*)?/,
      href: function (m) { return 'https://' + m.replace(/^https?:\/\//, '') }, ext: true }
  ]

  function answerPara(text) {
    var p = document.createElement('p')
    var rest = text
    while (rest.length) {
      var best = null
      for (var i = 0; i < LINKABLE.length; i++) {
        var m = rest.match(LINKABLE[i].re)
        if (m && (best === null || m.index < best.index)) {
          best = { index: m.index, text: m[0], rule: LINKABLE[i] }
        }
      }
      if (!best) {
        p.appendChild(document.createTextNode(rest))
        break
      }
      if (best.index > 0) {
        p.appendChild(document.createTextNode(rest.slice(0, best.index)))
      }
      var a = document.createElement('a')
      a.href = best.rule.href(best.text)
      a.textContent = best.text
      if (best.rule.ext) { a.target = '_blank'; a.rel = 'noopener' }
      p.appendChild(a)
      rest = rest.slice(best.index + best.text.length)
    }
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

  function ask(question) {
    if (!question.trim()) return
    if (pending) return
    pending = true
    button.disabled = true
    starters.hidden = true
    input.value = ''

    addTurn([para(question, 'ask-q')], 'user')
    var pendingTurn = addTurn([para('reading the dossier…', 'ask-pending')], 'bot')

    function fallback() {
      pendingTurn.remove()
      addTurn([para('Could not reach the assistant. Vineet\'s email is in § 06.')], 'bot')
    }

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: question, history: history.slice(-HISTORY_SENT) })
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
        pendingTurn.remove()
        var nodes = [answerPara(data.answer)]
        if (data.sources && data.sources.length) nodes.push(sourceLine(data.sources))
        addTurn(nodes, 'bot')
        history.push({ role: 'user', content: question })
        history.push({ role: 'assistant', content: data.answer })
        speak(data.answer)
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
    stopSpeaking()
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

  /* ── entrance: rocket flies the avatar in once, then docks ─────── */

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!reducedMotion) {
    launcher.classList.add('askw-fly')
    launcher.addEventListener('animationend', function onFly(e) {
      if (e.animationName !== 'askw-flight') return
      launcher.classList.remove('askw-fly')
      launcher.removeEventListener('animationend', onFly)
    })
  }

  /* ── voice out: browser speech synthesis, off by default ───────── */

  var canSpeak = 'speechSynthesis' in window
  var speakOn = canSpeak && recall('askwSpeak') === '1'

  function reflectVoice() {
    voiceBtn.setAttribute('aria-pressed', speakOn ? 'true' : 'false')
  }

  function stopSpeaking() {
    if (canSpeak) { try { speechSynthesis.cancel() } catch (e) {} }
  }

  function speak(text) {
    if (!speakOn || !canSpeak) return
    try {
      speechSynthesis.cancel()
      var u = new SpeechSynthesisUtterance(text)
      u.rate = 1
      speechSynthesis.speak(u)
    } catch (e) {}
  }

  if (!canSpeak) {
    voiceBtn.hidden = true
  } else {
    reflectVoice()
    voiceBtn.addEventListener('click', function () {
      speakOn = !speakOn
      remember('askwSpeak', speakOn ? '1' : '0')
      if (!speakOn) stopSpeaking()
      reflectVoice()
    })
  }

  /* ── voice in: browser speech recognition where it exists ──────── */

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition
  var rec = null
  var listening = false

  function resetMic() {
    listening = false
    micBtn.setAttribute('aria-pressed', 'false')
  }

  if (SR) {
    micBtn.hidden = false
    micBtn.addEventListener('click', function () {
      if (listening) {
        try { rec.stop() } catch (e) {}
        resetMic()
        return
      }
      rec = new SR()
      rec.lang = 'en-US'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onresult = function (e) {
        var t = e.results[0][0].transcript
        input.value = t
        ask(t)
      }
      rec.onend = resetMic
      rec.onerror = resetMic
      listening = true
      micBtn.setAttribute('aria-pressed', 'true')
      try { rec.start() } catch (e) { resetMic() }
    })
  }

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
