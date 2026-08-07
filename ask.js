(function () {
  'use strict'

  var form = document.getElementById('askForm')
  if (!form) return

  var input = document.getElementById('askInput')
  var button = form.querySelector('.ask-send')
  var out = document.getElementById('askAnswer')
  var starters = document.getElementById('askStarters')
  var statsEl = document.getElementById('askStats')
  var pending = false

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
})()
