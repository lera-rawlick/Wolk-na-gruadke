/* ============================================================
   «Волк на грядке» — вся логика сайта.
   Данные берутся из data/data.js (window.DATA), код их только показывает.
   Навигация — через #-адреса, чтобы работало и локально по двойному клику.
   ============================================================ */

(function () {
  'use strict';

  var D = window.DATA || { groups: [], sections: [], cards: [] };
  // Где лежат фотографии страниц блокнота. При публикации в интернет
  // подменяется на карту адресов (см. data/photos.js).
  var PHOTOS = window.PHOTO_URLS || null;
  var PHOTO_BASE = 'photos/';

  var app = document.getElementById('app');

  /* ---------- вспомогательное ---------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function photoSrc(name) {
    if (PHOTOS && PHOTOS[name]) return PHOTOS[name];
    return PHOTO_BASE + name;
  }

  function sectionById(id) {
    for (var i = 0; i < D.sections.length; i++) if (D.sections[i].id === id) return D.sections[i];
    return null;
  }
  function groupById(id) {
    for (var i = 0; i < D.groups.length; i++) if (D.groups[i].id === id) return D.groups[i];
    return null;
  }
  function cardById(id) {
    for (var i = 0; i < D.cards.length; i++) if (D.cards[i].id === id) return D.cards[i];
    return null;
  }
  function cardsOfSection(id) {
    return D.cards.filter(function (c) { return c.section === id; });
  }
  function sectionsOfGroup(id) {
    return D.sections.filter(function (s) { return s.group === id; });
  }

  /* Весь текст карточки одной строкой — нужен для поиска */
  function cardText(c) {
    var parts = [c.title, (c.tags || []).join(' ')];
    (c.blocks || []).forEach(function (b) {
      if (b.h) parts.push(b.h);
      if (b.text) parts.push(b.text);
      (b.items || []).forEach(function (it) { parts.push(it); });
    });
    (c.notes || []).forEach(function (n) { parts.push(n.text); });
    return parts.join(' ').toLowerCase();
  }

  /* ---------- кусочки разметки ---------- */

  function backBtn(href, label) {
    return '<a class="back" href="' + href + '">' +
      '<img src="assets/paw.svg" alt="" aria-hidden="true"> ' + esc(label) + '</a>';
  }

  function divider(label) {
    return '<div class="divider"><img src="assets/wolf.svg" alt="" aria-hidden="true">' +
      (label ? '<span>' + esc(label) + '</span>' : '') + '</div>';
  }

  function tile(href, emoji, title, sub, big) {
    return '<a class="tile' + (big ? ' tile--big' : '') + '" href="' + href + '">' +
      '<span class="tile__emoji" aria-hidden="true">' + esc(emoji || '🌿') + '</span>' +
      '<span class="tile__text"><span>' + esc(title) + '</span>' +
      (sub ? '<span class="tile__sub">' + esc(sub) + '</span>' : '') +
      '</span></a>';
  }

  function searchBox(value) {
    return '<div class="search">' +
      '<input class="search__input" id="q" type="search" inputmode="search" ' +
      'placeholder="Поиск: огурцы, тля, зола…" aria-label="Поиск по записям" value="' + esc(value || '') + '">' +
      '<button class="search__clear" id="qclear" type="button" title="Очистить" aria-label="Очистить поиск">✕</button>' +
      '</div>';
  }

  function photosBlock(names) {
    if (!names || !names.length) return '';
    var html = '<p class="photos__title">📷 Страницы блокнота — как написано от руки (' + names.length + ')</p>';
    html += '<div class="photos">';
    names.forEach(function (n) {
      html += '<a href="#" data-photo="' + esc(n) + '" title="Открыть во весь экран">' +
        '<img loading="lazy" src="' + esc(photoSrc(n)) + '" alt="Страница блокнота ' + esc(n) + '"></a>';
    });
    return html + '</div>';
  }

  function cardHTML(c, linkTitle) {
    var h = '<article class="card">';
    var sec = sectionById(c.section);
    if (sec) h += '<p class="crumb">' + esc(sec.emoji + ' ' + sec.title) + '</p>';
    h += '<h2>' + (linkTitle ? '<a href="#/c/' + esc(c.id) + '">' + esc(c.title) + '</a>' : esc(c.title)) + '</h2>';

    (c.blocks || []).forEach(function (b) {
      h += '<div class="card__block">';
      if (b.h) h += '<h3>' + esc(b.h) + '</h3>';
      if (b.text) h += '<p>' + esc(b.text) + '</p>';
      if (b.items && b.items.length) {
        h += '<ul>';
        b.items.forEach(function (it) { h += '<li>' + esc(it) + '</li>'; });
        h += '</ul>';
      }
      h += '</div>';
    });

    (c.notes || []).forEach(function (n) {
      h += '<div class="note' + (n.type === 'warn' ? ' note--warn' : '') + '">' +
        (n.type === 'warn' ? '⚠️ ' : '✍️ ') + esc(n.text) + '</div>';
    });

    h += photosBlock(c.photos);
    return h + '</article>';
  }

  /* ---------- экраны ---------- */

  function viewHome() {
    var h = '<h1>Мамин блокнот</h1>' +
      '<p class="crumb">Всё, что записано от руки — теперь печатными буквами. Записей: ' +
      D.cards.length + '</p>';
    h += searchBox('');
    h += '<div id="results"></div>';
    h += '<div class="tiles">';
    D.groups.forEach(function (g) {
      h += tile('#/g/' + g.id, g.emoji, g.title, g.sub, true);
    });
    h += '</div>';

    h += divider('Все разделы');
    h += '<div class="tiles">';
    D.sections.forEach(function (s) {
      h += tile('#/s/' + s.id, s.emoji, s.title, s.sub + ' · ' + cardsOfSection(s.id).length, false);
    });
    h += '</div>';
    return h;
  }

  function viewGroup(id) {
    var g = groupById(id);
    if (!g) return viewHome();
    var h = backBtn('#/', 'На главную');
    h += '<h1>' + esc(g.emoji + ' ' + g.title) + '</h1>';
    if (g.sub) h += '<p class="crumb">' + esc(g.sub) + '</p>';
    h += '<div class="tiles">';
    sectionsOfGroup(id).forEach(function (s) {
      h += tile('#/s/' + s.id, s.emoji, s.title, s.sub + ' · ' + cardsOfSection(s.id).length, false);
    });
    return h + '</div>';
  }

  function viewSection(id) {
    var s = sectionById(id);
    if (!s) return viewHome();
    var g = groupById(s.group);
    var h = backBtn(g ? '#/g/' + g.id : '#/', g ? 'Назад: ' + g.title : 'На главную');
    h += '<h1>' + esc(s.emoji + ' ' + s.title) + '</h1>';
    if (s.sub) h += '<p class="crumb">' + esc(s.sub) + '</p>';
    var list = cardsOfSection(id);
    if (!list.length) return h + '<p class="empty">Здесь пока пусто.</p>';
    h += '<div class="tiles">';
    list.forEach(function (c) {
      h += tile('#/c/' + c.id, c.emoji || s.emoji, c.title, (c.tags || []).join(', '), false);
    });
    return h + '</div>';
  }

  function viewCard(id) {
    var c = cardById(id);
    if (!c) return viewHome();
    var s = sectionById(c.section);
    var h = backBtn(s ? '#/s/' + s.id : '#/', s ? 'Назад: ' + s.title : 'На главную');
    h += cardHTML(c, false);

    // Соседние записи того же раздела — чтобы листать не возвращаясь
    if (s) {
      var sib = cardsOfSection(s.id).filter(function (x) { return x.id !== c.id; });
      if (sib.length) {
        h += divider('Рядом в разделе «' + s.title + '»');
        h += '<div class="tiles">';
        sib.forEach(function (x) { h += tile('#/c/' + x.id, x.emoji || s.emoji, x.title, '', false); });
        h += '</div>';
      }
    }
    return h;
  }

  /* ---------- поиск ---------- */

  function runSearch(q) {
    var box = document.getElementById('results');
    if (!box) return;
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = ''; return; }
    var found = D.cards.filter(function (c) { return cardText(c).indexOf(q) !== -1; });
    if (!found.length) {
      box.innerHTML = '<p class="empty">Ничего не нашлось. Попробуйте другое слово — например «зола» или «огурцы».</p>';
      return;
    }
    var h = '<p class="crumb">Нашлось записей: ' + found.length + '</p><div class="tiles">';
    found.slice(0, 40).forEach(function (c) {
      var s = sectionById(c.section);
      h += tile('#/c/' + c.id, c.emoji || (s ? s.emoji : '🌿'), c.title, s ? s.title : '', false);
    });
    box.innerHTML = h + '</div>';
  }

  /* ---------- фото во весь экран ---------- */

  function openPhoto(name) {
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<button class="lightbox__close" aria-label="Закрыть">✕</button>' +
      '<img src="' + esc(photoSrc(name)) + '" alt="Страница блокнота">';
    box.addEventListener('click', function () { box.remove(); });
    document.body.appendChild(box);
  }

  /* ---------- размер шрифта ---------- */

  function applyScale(v) {
    document.documentElement.style.setProperty('--s', v);
    try { localStorage.setItem('wolf-scale', v); } catch (e) { /* приватный режим */ }
    var btns = document.querySelectorAll('.fontsize__btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].dataset.scale === String(v) ? 'true' : 'false');
    }
  }

  function initScale() {
    var v = '1.22'; // по умолчанию сразу крупный — так маме удобнее
    try { v = localStorage.getItem('wolf-scale') || v; } catch (e) { /* ничего */ }
    applyScale(v);
    document.querySelector('.fontsize').addEventListener('click', function (e) {
      var b = e.target.closest('.fontsize__btn');
      if (b) applyScale(b.dataset.scale);
    });
  }

  /* ---------- маршрутизация ---------- */

  function render() {
    var hash = location.hash.replace(/^#/, '') || '/';
    var parts = hash.split('/').filter(Boolean);
    var html;
    if (parts[0] === 'g') html = viewGroup(parts[1]);
    else if (parts[0] === 's') html = viewSection(parts[1]);
    else if (parts[0] === 'c') html = viewCard(parts[1]);
    else html = viewHome();
    app.innerHTML = html;
    window.scrollTo(0, 0);

    var q = document.getElementById('q');
    if (q) {
      q.addEventListener('input', function () { runSearch(q.value); });
      document.getElementById('qclear').addEventListener('click', function () {
        q.value = ''; runSearch(''); q.focus();
      });
    }
  }

  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-photo]');
    if (p) { e.preventDefault(); openPhoto(p.dataset.photo); }
  });

  window.addEventListener('hashchange', render);
  initScale();
  render();
})();
