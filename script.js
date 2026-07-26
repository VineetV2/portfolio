/* ═══════════════════════════════════════════════════════════════════
   vineetvora.dev — v3 "Dossier"
   No dependencies. Everything works with JavaScript off.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── theme ─────────────────────────────────────────────────────── */
  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'night' ? 'paper' : 'night';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('v3theme', next); } catch (e) {}
    });
  }

  /* ── drawer ────────────────────────────────────────────────────── */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    var setDrawer = function (open) {
      drawer.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', function () {
      setDrawer(burger.getAttribute('aria-expanded') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setDrawer(false);
    });
  }

  /* ── reading progress ──────────────────────────────────────────── */
  var bar = document.getElementById('progress');
  if (bar) {
    var onScroll = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ── reveal on scroll, staggered within each section ───────────── */
  var groups = document.querySelectorAll('.cover .sheet, .sec .sheet');
  Array.prototype.forEach.call(groups, function (group) {
    var items = group.querySelectorAll(
      ':scope > .sec-head, :scope > .fig, :scope > .grid-2, :scope > table,' +
      ':scope > .sub-h, :scope > .certs, :scope > .contact-lede, :scope > .contact,' +
      ':scope > .cover-kicker, :scope > .cover-title, :scope > .cover-body, :scope > .cover-foot'
    );
    Array.prototype.forEach.call(items, function (el, n) {
      el.classList.add('rv');
      el.style.setProperty('--d', Math.min(n * 80, 400) + 'ms');
    });
  });

  var items = document.querySelectorAll('.rv');

  if (!('IntersectionObserver' in window) || reduced) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('on'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('on');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });

    // never make the cover wait for a scroll event
    requestAnimationFrame(function () {
      var cover = document.querySelectorAll('.cover .rv');
      Array.prototype.forEach.call(cover, function (el) { el.classList.add('on'); });
    });
  }

  /* ── masthead: mark the section being read ─────────────────────── */
  var sections = document.querySelectorAll('.sec[id]');
  var links = document.querySelectorAll('.mh-nav a[data-nav]');
  if (sections.length && links.length && 'IntersectionObserver' in window) {
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        Array.prototype.forEach.call(links, function (a) {
          a.classList.toggle('active', a.getAttribute('data-nav') === id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Array.prototype.forEach.call(sections, function (s) { navIo.observe(s); });
  }

})();
