// Career Ops dashboard. Reads /career-ops/api/* (gated by Cloudflare Access)
// and talks to the Apply helper running on Vineet's Mac at 127.0.0.1. The
// helper opens `/career-ops apply <url>`, which fills the form in a visible
// browser and stops before Submit. Nothing here ever submits an application.
(function () {
  'use strict';

  var API = '/career-ops/api';
  var HELPER = 'http://127.0.0.1:47321';
  var TOKEN_KEY = 'copsHelperToken';
  var SKIP = /^(skip|discarded|rejected|closed|no aplicar)$/i;
  var APPLIED = /^(applied|interview|offer|responded)$/i;

  var state = {
    apps: [],
    daily: [],
    reports: {},       // report path -> { md, url, pdf }
    helper: { ok: false, reason: 'checking', jobs: [] },
    selected: new Set(),
    current: null
  };

  var $ = function (id) { return document.getElementById(id); };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }

  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }

  function api(path) {
    return fetch(API + path, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' → ' + r.status);
      return r;
    });
  }

  function renderMd(target, md) {
    // Reports quote job descriptions, so markdown is only rendered when the
    // sanitizer loaded; otherwise show it as plain text.
    if (!window.marked || !window.DOMPurify) {
      target.replaceChildren(el('pre', { class: 'plain', text: md }));
      return;
    }
    target.innerHTML = window.DOMPurify.sanitize(window.marked.parse(md));
    target.querySelectorAll('a[href]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  }

  // ── report metadata (URL + tailored PDF live in each report's header) ──

  function loadReport(path) {
    if (state.reports[path]) return Promise.resolve(state.reports[path]);
    return api('/file?path=' + encodeURIComponent(path)).then(function (r) { return r.text(); }).then(function (md) {
      var url = (md.match(/^\*\*URL:\*\*\s*(\S+)/m) || [])[1] || null;
      var pdf = (md.match(/^\*\*PDF:\*\*\s*(output\/[\w.-]+\.pdf)/m) || [])[1] || null;
      if (url && !/^https:\/\//.test(url)) url = null;
      return (state.reports[path] = { md: md, url: url, pdf: pdf });
    });
  }

  // ── Mac helper ──────────────────────────────────────────────────────

  function helperFetch(path, opts) {
    opts = opts || {};
    var headers = { 'x-helper-token': getToken() };
    if (opts.body) headers['content-type'] = 'application/json';
    return fetch(HELPER + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      targetAddressSpace: 'loopback'
    }).then(function (r) {
      if (r.status === 401) { var e = new Error('token'); e.code = 'token'; throw e; }
      if (!r.ok) throw new Error('helper ' + r.status);
      return r.json();
    });
  }

  function pollHelper() {
    if (!getToken()) {
      state.helper = { ok: false, reason: 'token', jobs: [] };
      paintHelper();
      return;
    }
    helperFetch('/status').then(function (s) {
      state.helper = { ok: true, reason: '', jobs: s.jobs || [], max: s.maxOpen };
    }).catch(function (e) {
      state.helper = { ok: false, reason: e.code === 'token' ? 'token' : 'offline', jobs: [] };
    }).then(function () { paintHelper(); paintLists(); });
  }

  function paintHelper() {
    var b = $('helper'), h = state.helper;
    b.className = 'chip ' + (h.ok ? 'ok' : 'bad');
    b.textContent = h.ok ? 'Mac helper: connected'
      : h.reason === 'token' ? 'Mac helper: connect'
      : h.reason === 'checking' ? 'Mac helper: checking…'
      : 'Mac helper: not reachable';
    b.title = h.ok ? 'Apply opens on this Mac'
      : 'Apply needs the helper running on your Mac (see scripts/apply-helper/README.md)';
    $('applySelected').disabled = !h.ok || state.selected.size === 0;
    $('dApply').disabled = !h.ok;
  }

  function jobState(url) {
    if (!url) return null;
    for (var i = state.helper.jobs.length - 1; i >= 0; i--) if (state.helper.jobs[i].url === url) return state.helper.jobs[i];
    return null;
  }

  var STATE_LABEL = {
    queued: 'queued',
    open: 'open on Mac, review & submit',
    closed: 'session closed',
    failed: 'failed to start'
  };

  function apply(rows) {
    if (!state.helper.ok) { openToken(); return Promise.resolve(); }
    var note = $('applyNote');
    note.textContent = 'Looking up ' + rows.length + ' posting' + (rows.length === 1 ? '' : 's') + '…';
    return Promise.all(rows.map(function (r) {
      return loadReport(r.report).then(function (meta) {
        return meta.url ? { url: meta.url, company: r.company, role: r.role, report: r.report } : null;
      }).catch(function () { return null; });
    })).then(function (jobs) {
      var ok = jobs.filter(Boolean);
      var missing = jobs.length - ok.length;
      if (!ok.length) { note.textContent = 'No posting URL found in those reports.'; return; }
      return helperFetch('/apply', { method: 'POST', body: { jobs: ok } }).then(function (res) {
        note.textContent = 'Sent ' + res.accepted + ' to your Mac' + (missing ? ' (' + missing + ' had no posting URL)' : '') +
          '. Each opens in its own Terminal + browser window and stops before Submit.';
        pollHelper();
      });
    }).catch(function (e) {
      note.textContent = 'Could not reach the Mac helper: ' + e.message;
      pollHelper();
    });
  }

  // ── lists ───────────────────────────────────────────────────────────

  function isPick(r) { return r.score != null && r.score >= 4 && !SKIP.test(r.status); }

  function row(r, opts) {
    var meta = r.report && state.reports[r.report];
    var js = meta && jobState(meta.url);
    var check = opts.check ? el('input', {
      type: 'checkbox', 'aria-label': 'Select ' + r.company,
      checked: state.selected.has(r.report) ? 'checked' : false,
      onchange: function (e) {
        if (e.target.checked) state.selected.add(r.report); else state.selected.delete(r.report);
        paintHelper();
      }
    }) : null;
    var open = function () { showDetail(r); };
    return el('div', { class: 'row' + (opts.check ? '' : ' nocheck') }, [
      check,
      el('div', { class: 'score' + (r.score >= 4 ? ' hi' : ''), text: r.score != null ? r.score.toFixed(1) : '–' }),
      el('div', { class: 'who', onclick: open, title: r.notes }, [
        el('b', { text: r.company }),
        el('span', { class: 'role', text: r.role }),
        el('span', { class: 'note', text: r.notes.replace(/;\s*posted:.*$/, '') })
      ]),
      el('div', { class: 'acts' }, [
        js ? el('span', { class: 'state ' + js.state, text: STATE_LABEL[js.state] || js.state, title: js.error || '' }) : null,
        el('span', { class: 'mono dim', text: r.status }),
        el('button', { class: 'btn', type: 'button', onclick: open, text: 'Report' }),
        r.report ? el('button', {
          class: 'btn primary', type: 'button', text: 'Apply',
          disabled: state.helper.ok ? false : 'disabled',
          onclick: function () { apply([r]); }
        }) : null
      ])
    ]);
  }

  function paintLists() {
    var picks = state.apps.filter(isPick).sort(function (a, b) { return b.score - a.score; });
    var pl = $('picks');
    pl.replaceChildren.apply(pl, picks.length ? picks.map(function (r) { return row(r, { check: true }); })
      : [el('p', { class: 'empty', text: 'No picks yet. The daily run adds jobs that score 4.0 or higher.' })]);

    var q = ($('filter').value || '').toLowerCase();
    var all = state.apps.filter(function (r) {
      return !q || [r.company, r.role, r.status, r.notes].join(' ').toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.score || 0) - (a.score || 0); });
    var al = $('all');
    al.replaceChildren.apply(al, all.length ? all.map(function (r) { return row(r, { check: false }); })
      : [el('p', { class: 'empty', text: 'Nothing matches.' })]);
  }

  function paintSummary() {
    var picks = state.apps.filter(isPick);
    var applied = state.apps.filter(function (r) { return APPLIED.test(r.status); });
    var latest = state.daily[0] ? state.daily[0].replace(/\.md$/, '') : '—';
    var s = $('summary');
    s.replaceChildren(
      stat(state.apps.length, 'evaluated'),
      stat(picks.length, 'picks (4.0+)'),
      stat(applied.length, 'applied'),
      stat(latest, 'last daily run')
    );
    function stat(v, label) { return el('div', { class: 'stat' }, [el('b', { text: String(v) }), el('span', { text: label })]); }
  }

  // ── scans + daily ───────────────────────────────────────────────────

  function loadScans(date) {
    return api('/scans' + (date ? '?date=' + date : '')).then(function (r) { return r.json(); }).then(function (s) {
      var sel = $('scanDate');
      if (!sel.options.length) s.dates.forEach(function (d) { sel.append(el('option', { value: d, text: d })); });
      sel.value = s.date || '';
      var total = 0;
      for (var k in s.counts) total += s.counts[k];
      var c = $('scanCounts');
      c.replaceChildren.apply(c, [el('span', { text: total + ' postings scanned' })].concat(
        Object.keys(s.counts).sort().map(function (k) { return el('span', { text: k.replace(/_/g, ' ') + ': ' + s.counts[k] }); })));
      var l = $('scans');
      l.replaceChildren.apply(l, s.added.length ? s.added.map(function (p) {
        return el('div', { class: 'row nocheck' }, [
          el('div', { class: 'mono dim', text: (p.posted || '').slice(5) }),
          el('div', { class: 'who' }, [el('b', { text: p.company }), el('span', { class: 'role', text: p.title }), el('span', { class: 'note', text: p.location })]),
          el('div', { class: 'acts' }, [el('a', { class: 'btn', href: p.url, target: '_blank', rel: 'noopener noreferrer', text: 'Posting ↗' })])
        ]);
      }) : [el('p', { class: 'empty', text: 'No postings passed the filters on this date.' })]);
    });
  }

  function loadDaily(name) {
    return api('/file?path=' + encodeURIComponent('data/daily/' + name)).then(function (r) { return r.text(); })
      .then(function (md) { renderMd($('daily'), md); });
  }

  // ── detail panel ────────────────────────────────────────────────────

  function showDetail(r) {
    state.current = r;
    var d = $('detail');
    d.hidden = false;
    $('dTitle').textContent = r.company + ' — ' + r.role;
    $('dMeta').textContent = [r.date, r.score != null ? r.score + '/5' : null, r.status].filter(Boolean).join(' · ');
    $('dReport').textContent = 'Loading report…';
    $('dPdf').replaceChildren();
    $('dPosting').removeAttribute('href');
    detailTab('report');
    if (!r.report) { $('dReport').textContent = 'No report linked in the tracker.'; return; }
    loadReport(r.report).then(function (meta) {
      if (state.current !== r) return;
      renderMd($('dReport'), meta.md);
      if (meta.url) $('dPosting').href = meta.url;
      var pdf = $('dPdf');
      pdf.replaceChildren(meta.pdf
        ? el('iframe', { src: API + '/file?path=' + encodeURIComponent(meta.pdf), title: 'Tailored resume' })
        : el('p', { class: 'empty', text: 'No tailored resume for this job (only jobs at 4.0+ get one).' }));
      paintLists();
    }).catch(function (e) { $('dReport').textContent = 'Could not load the report: ' + e.message; });
  }

  function detailTab(which) {
    document.querySelectorAll('.detail-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.d === which)); });
    $('dReport').hidden = which !== 'report';
    $('dPdf').hidden = which !== 'pdf';
  }

  // ── wiring ──────────────────────────────────────────────────────────

  function openToken() {
    $('tokenIn').value = '';
    $('tokenDlg').showModal();
  }

  function init() {
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
        document.querySelectorAll('.tab').forEach(function (t) { t.hidden = t.id !== 'tab-' + b.dataset.tab; });
        if (b.dataset.tab === 'scans' && !$('scanDate').options.length) loadScans().catch(showError);
        if (b.dataset.tab === 'daily' && !$('daily').childNodes.length && state.daily[0]) loadDaily(state.daily[0]).catch(showError);
      });
    });
    document.querySelectorAll('.detail-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { detailTab(b.dataset.d); });
    });
    $('dClose').addEventListener('click', function () { $('detail').hidden = true; state.current = null; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('dClose').click(); });
    $('dApply').addEventListener('click', function () { if (state.current) apply([state.current]); });
    $('applySelected').addEventListener('click', function () {
      apply(state.apps.filter(function (r) { return state.selected.has(r.report); }));
    });
    $('pickAll').addEventListener('change', function (e) {
      state.apps.filter(isPick).forEach(function (r) {
        if (!r.report || APPLIED.test(r.status)) return;
        if (e.target.checked) state.selected.add(r.report); else state.selected.delete(r.report);
      });
      paintLists(); paintHelper();
    });
    $('filter').addEventListener('input', paintLists);
    $('scanDate').addEventListener('change', function (e) { loadScans(e.target.value).catch(showError); });
    $('dailyPick').addEventListener('change', function (e) { loadDaily(e.target.value).catch(showError); });
    $('helper').addEventListener('click', function () { if (!state.helper.ok) openToken(); else pollHelper(); });
    $('tokenDlg').addEventListener('close', function () {
      if ($('tokenDlg').returnValue === 'ok' && $('tokenIn').value.trim()) { setToken($('tokenIn').value.trim()); pollHelper(); }
    });
    $('theme').addEventListener('click', function () {
      var root = document.documentElement;
      var next = root.getAttribute('data-theme') === 'night' ? 'paper' : 'night';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('v3theme', next); } catch (e) {}
    });

    api('/data').then(function (r) { return r.json(); }).then(function (d) {
      state.apps = d.applications || [];
      state.daily = d.daily || [];
      $('who').textContent = d.user || '';
      var dp = $('dailyPick');
      state.daily.forEach(function (f) { dp.append(el('option', { value: f, text: f.replace(/\.md$/, '') })); });
      paintSummary();
      paintLists();
      // Prefetch pick reports so Apply state and posting links are ready.
      state.apps.filter(isPick).forEach(function (r) { if (r.report) loadReport(r.report).then(paintLists).catch(function () {}); });
    }).catch(showError);

    pollHelper();
    setInterval(pollHelper, 5000);
  }

  function showError(e) {
    $('summary').replaceChildren(el('p', { class: 'empty', text: 'Could not load career-ops data: ' + e.message }));
  }

  init();
})();
