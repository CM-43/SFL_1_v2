/* ==========================================================================
   SUSTAINABLE FUTURES LAB — THE SCREENS (v2)

   Draws everything and handles every click and drag. It decides no score:
   all marking is in js/marking.js. It hard-codes no content: every word and
   number comes from the content file (data/<name>/content.js).

   ONE STATE OBJECT. Everything the screen shows is drawn from `state`.
   A change updates `state`, then calls render(). The only things painted
   without a full render are the clock (every second) and the item being
   dragged, so a drag or a timer tick never loses what is under the pointer.

   Parts marked "KEPT FROM V1" are the v1 code moved across unchanged
   (login, clock, fullscreen, window size, dragging, percentile card,
   results blocks, CSV file, start-up).
   ========================================================================== */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var state = null;
  var M = MARKING;
  var IDK = M.IDK;
  var TUTORIAL = ['welcome', 'timer', 'notes', 'help', 'complete'];

  /* ====================================================================== *
   * SMALL HELPERS
   * ====================================================================== */
  function byId(id) { return document.getElementById(id); }
  function esc(text) {
    return String(text === null || text === undefined ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* Content text on screen: made safe first, then line breaks kept. */
  function textToHtml(text) { return esc(text).replace(/\n/g, '<br>'); }
  /* Longer text (the project brief) can also use simple layout marks, written
     in the content file the way the old SFL brief was:
       a blank line        starts a new paragraph
       **Heading**         on a line of its own is a heading
       - item              lines starting with "- " become a bullet list
       **words**           inside a sentence are bold                          */
  function richTextToHtml(text) {
    function inline(line) { return esc(line).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
    var html = '';
    String(text || '').split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split('\n'), para = [], list = [];
      function flushPara() { if (para.length) html += '<p>' + para.join('<br>') + '</p>'; para = []; }
      function flushList() { if (list.length) html += '<ul>' + list.join('') + '</ul>'; list = []; }
      lines.forEach(function (raw) {
        var line = raw.trim();
        if (!line) return;
        var head = /^\*\*(.+)\*\*$/.exec(line);
        if (head && head[1].indexOf('**') < 0) { flushPara(); flushList(); html += '<h3>' + esc(head[1]) + '</h3>'; }
        else if (/^- /.test(line)) { flushPara(); list.push('<li>' + inline(line.slice(2)) + '</li>'); }
        else { flushList(); para.push(inline(line)); }
      });
      flushPara(); flushList();
    });
    return html;
  }
  function fill(text, vars) {
    return String(text || '').replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] !== undefined ? vars[k] : m;
    });
  }
  /* A customer-facing word from the content file, with a fallback. */
  function L(key, vars, fallback) {
    var labels = state && state.content && state.content.labels;
    var t = labels && typeof labels[key] === 'string' ? labels[key] : (fallback !== undefined ? fallback : key);
    return fill(t, vars);
  }
  function content() { return state.content; }
  function rules() { return state.content.rules; }
  function showScore(n) {
    if (typeof n !== 'number') return String(n);
    return (Math.round(n * 10) / 10 === Math.round(n)) ? String(Math.round(n))
                                                       : (Math.round(n * 10) / 10).toFixed(1);
  }
  function initials(name) {
    var parts = String(name || '').split(/\s+/).filter(Boolean);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  var AVATAR_TONES = ['tone-a', 'tone-b', 'tone-c', 'tone-d', 'tone-e'];
  /* Paragraphs: a blank line in the content starts a new paragraph. */
  function paras(text) {
    return String(text || '').split(/\n\s*\n/).map(function (p) { return '<p>' + textToHtml(p.trim()) + '</p>'; }).join('');
  }

  /* ====================================================================== *
   * THE RUN
   * ====================================================================== */
  function freshRun(c) {
    var days = c.days.map(function () {
      return { asked: [], assignment: {}, reasons: {}, reasonTo: {}, support: {}, reflect: {}, late: {} };
    });
    return {
      content: c,
      phase: 'start',           /* login | start | game | results */
      loggedIn: false,
      /* step: { kind:'tutorial', index }
               { kind:'onboarding', screen:'intro'|'rank'|'brief' }
               { kind:'day', day, phase, screen:'goal'|'intro'|'stage'|'done' } */
      step: null,
      ui: { loginError: '', loginUser: '',
            modal: null,        /* a card over the map: ask, reason, request, question */
            dialog: null,       /* a house popup over everything: restart, finish */
            panel: null,        /* 'notes' | 'help' */
            notesTab: 'people', notesPick: {}, selected: null, hint: '',
            warningsShown: {}, warningOpen: null, openBlocks: { onboarding: true } },
      timer: { total: c.time_limit_minutes * 60, left: c.time_limit_minutes * 60,
               running: false, everStarted: false, startedAt: 0 },
      run: {
        onboarding: { order: c.onboarding.questions.map(function () { return null; }) },
        days: days,
        late: {}
      },
      result: null
    };
  }

  function currentDay() { return state.step && state.step.kind === 'day' ? content().days[state.step.day] : null; }
  function currentDayRun() { return state.step && state.step.kind === 'day' ? state.run.days[state.step.day] : null; }
  function timeIsUp() { return state.timer.everStarted && state.timer.left <= 0; }
  function personById(id) { return M.byId(content().people, id); }
  function stationById(id) { return M.byId(content().stations, id); }
  function toneOf(personId) {
    var i = content().people.map(function (p) { return p.id; }).indexOf(personId);
    return AVATAR_TONES[(i < 0 ? 0 : i) % AVATAR_TONES.length];
  }
  function onStage() { return state.step && state.step.kind === 'day' && state.step.screen === 'stage'; }

  /* ====================================================================== *
   * THE CLOCK
   * ====================================================================== */
  var RING_R = 27, RING_C = 2 * Math.PI * RING_R;
  function startTimer() {
    state.timer.running = true;
    state.timer.everStarted = true;
    state.timer.startedAt = Date.now();
  }
  setInterval(function () {
    if (!state || !state.timer.running) return;
    var elapsed = (Date.now() - state.timer.startedAt) / 1000;
    state.timer.left = Math.max(0, state.timer.total - elapsed);
    paintTimer();
  }, 1000);

  function ringOffset() {
    var t = state.timer, frac = t.total ? t.left / t.total : 1;
    return (RING_C * (1 - frac)).toFixed(2);
  }
  function timerHTML() {
    return '<div class="ring-timer' + (timeIsUp() ? ' is-up' : '') + '" id="ring-timer">' +
      '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<circle class="ring-track" cx="32" cy="32" r="' + RING_R + '"></circle>' +
        '<circle class="ring-fill" id="ring-fill" cx="32" cy="32" r="' + RING_R + '" ' +
          'stroke-dasharray="' + RING_C.toFixed(2) + '" stroke-dashoffset="' + ringOffset() + '" transform="rotate(-90 32 32)"></circle>' +
      '</svg>' +
      '<div class="ring-text" id="ring-text"></div>' +
      '<div class="timer-paused" id="timer-paused">' + esc(L('timer_paused')) + '</div>' +
    '</div>';
  }
  function paintTimer() {
    var t = state.timer;
    var fillEl = byId('ring-fill'), textEl = byId('ring-text'), pausedEl = byId('timer-paused');
    if (!fillEl || !textEl) return;
    fillEl.setAttribute('stroke-dashoffset', ringOffset());
    if (timeIsUp()) {
      textEl.innerHTML = '<span class="ring-up">' + esc(L('timer_up')) + '</span>';
      byId('ring-timer').classList.add('is-up');
    } else {
      textEl.innerHTML = '<b>' + Math.ceil(t.left / 60) + '</b><span>' + esc(L('timer_min')) + '</span>';
    }
    if (pausedEl) pausedEl.classList.toggle('is-visible', !t.running && !timeIsUp());
  }

  /* ====================================================================== *
   * FULLSCREEN AND WINDOW SIZE (house behaviour)
   * ====================================================================== */
  function fullscreenAvailable() {
    try { return !!(document.fullscreenEnabled && document.documentElement.requestFullscreen); }
    catch (e) { return false; }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(function () {});
  }
  document.addEventListener('fullscreenchange', function () { if (state && !drag) render(); });

  function checkSize() {
    var small = window.innerWidth < 900 || window.innerHeight < 540;
    byId('too-small').hidden = !small;
  }
  window.addEventListener('resize', checkSize);
  /* Time warnings (VERIFIED [p61]): rules.time_warning_minutes is a list,
     e.g. [10, 5, 4, 3, 2, 1]. Each toast is shown once, when its number of
     minutes is left, and can be closed. A newer toast replaces an open one.
     If several minutes pass at once, only the latest one is shown.
     Checked after every clock tick. */
  var renderAfterDrag = false;
  function checkTimeWarning() {
    if (!state || !state.timer.running || state.timer.left <= 0) return;
    var due = null;
    (rules().time_warning_minutes || []).forEach(function (m) {
      if (state.ui.warningsShown[m] || state.timer.left > m * 60) return;
      state.ui.warningsShown[m] = true;
      if (due === null || m < due) due = m;
    });
    if (due === null) return;
    state.ui.warningOpen = due;
    if (drag) renderAfterDrag = true; else render();
  }
  setInterval(checkTimeWarning, 1000);

  /* ====================================================================== *
   * RENDER
   * ====================================================================== */
  function render() {
    if (!state) return;
    document.body.classList.toggle('scrolls', state.phase === 'results');
    /* Every click redraws the whole screen. Anything that is only being
       redrawn must not play its opening animation again, or the screen
       appears to flash and cards look as though they close and reopen.
       This is decided BEFORE the screen is drawn, so the very first redraw
       after a card opens is already steady. */
    var key = modalKey(state.ui.modal);
    steadyModal = !!key && key === lastModalKey;
    lastModalKey = key;
    var dkey = modalKey(state.ui.dialog);
    steadyDialog = !!dkey && dkey === lastDialogKey;
    lastDialogKey = dkey;
    var ckey = state.phase === 'game' ? cardScreenKey() : null;
    steadyCard = !!ckey && ckey === lastCardKey;
    lastCardKey = ckey;
    var tkey = state.ui.warningOpen || null;
    steadyToast = tkey !== null && tkey === lastToastKey;
    lastToastKey = tkey;
    var html;
    if (state.phase === 'login') html = loginHTML();
    else if (state.phase === 'start') html = startHTML();
    else if (state.phase === 'game') html = gameHTML();
    else html = resultsHTML();
    html += dialogHTML();
    app.innerHTML = html;
    /* Two screens hold themselves at a fixed height, worked out from what is
       on them, so that nothing resizes as the candidate works. Both are done
       here, before the browser paints, so nothing is ever seen to jump. */
    applySeriesHeight();
    sizeRankCards();
    paintTimer();
    if (state.phase === 'login') {
      var u = byId('u');
      if (u && !u.value) u.focus(); else if (byId('p')) byId('p').focus();
    }
  }

  var lastModalKey = null, steadyModal = false, lastDialogKey = null, steadyDialog = false;
  var lastCardKey = null, steadyCard = false, lastToastKey = null, steadyToast = false;
  function modalKey(m) {
    if (!m) return null;
    return [m.type, m.target || '', m.id || '', m.person || '', m.item || ''].join('|');
  }
  /* Which card screen is showing. It changes only when the candidate moves
     to another screen, never when the same screen is redrawn. */
  function cardScreenKey() {
    var s = state.step;
    if (!s) return null;
    if (s.kind === 'tutorial') return 'tutorial|' + s.index;
    if (s.kind === 'onboarding') return 'onboarding|' + s.screen;
    if (s.kind === 'day') return 'day|' + s.day + '|' + s.phase + '|' + s.screen;
    return null;
  }

  /* ---- LOGIN — Sea Wolf's markup, copied (D16). Only the heading words come
     from the content. Redrock's behaviour: the username stays after a wrong
     password, and the password is checked against a SHA-256 fingerprint. */
  function loginHTML() {
    return '<div class="centre-screen"><div class="panel">' +
      '<h1>' + esc(content().title) + '</h1>' +
      '<p class="lede">' + esc(L('login_lede')) + '</p>' +
      '<form id="login-form">' +
      '<div class="field"><label for="u">Username</label>' +
      '<input id="u" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" value="' + esc(state.ui.loginUser) + '"></div>' +
      '<div class="field"><label for="p">Password</label>' +
      '<input id="p" type="password" autocomplete="current-password"></div>' +
      '<div class="form-error">' + esc(state.ui.loginError) + '</div>' +
      '<button class="btn" type="submit" style="width:100%">Log in</button>' +
      '</form>' +
      '</div></div>';
  }
  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) { return ('00' + b.toString(16)).slice(-2); }).join('');
  }
  function attemptLogin(username, password) {
    state.ui.loginUser = username;
    if (username !== CONFIG.username) {
      state.ui.loginError = 'That username and password do not match.';
      render(); return;
    }
    if (!window.crypto || !window.crypto.subtle) {
      state.ui.loginError = 'Login needs the page to be opened over https.';
      render(); return;
    }
    window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password)).then(function (digest) {
      if (toHex(digest) === String(CONFIG.passcodeHash).toLowerCase()) {
        state.loggedIn = true; state.ui.loginError = ''; state.phase = 'start';
      } else {
        state.ui.loginError = 'That username and password do not match.';
      }
      render();
    }).catch(function () {
      state.ui.loginError = 'Login needs the page to be opened over https.';
      render();
    });
  }
  document.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'login-form') return;
    e.preventDefault();
    attemptLogin(byId('u').value.trim(), byId('p').value);
  });

  /* ---- START ------------------------------------------------------------- */
  function startHTML() {
    var c = content();
    return '<div class="centre-screen"><div class="panel wide start-panel">' +
      '<h1>' + esc(c.start.heading) + '</h1>' +
      '<p class="start-body">' + textToHtml(fill(c.start.body, { minutes: c.time_limit_minutes })) + '</p>' +
      '<div class="start-actions"><button class="btn" data-act="start">' + esc(L('start_button')) + '</button></div>' +
    '</div></div>';
  }

  /* ====================================================================== *
   * THE GAME FRAME
   *
   *   [ timer ] [   Tutorial · Onboarding · Day 1 · Day 2 · Day 3   ] [ Restart ⛶ ]
   *   [ left  ] [ map: coins top-right · Notes/Help bottom-left · button bottom-right ]
   *
   * Card screens (tutorial, onboarding, day goal, stage intros) use the
   * whole width below the top row, over a dimmed map.
   * ====================================================================== */
  function gameHTML() {
    var onMap = onStage();
    return '<div class="game' + (onMap ? ' is-stage' : ' is-cards') + '">' +
      '<div class="g-timer">' + timerHTML() + '</div>' +
      '<div class="g-top">' + progressHTML() + toolsHTML() + '</div>' +
      (onMap
        ? '<aside class="g-left">' + leftHTML() + '</aside><main class="g-stage">' + stageHTML() + '</main>'
        : '<main class="g-body' + (steadyCard ? ' is-steady' : '') + '">' + mapBackdropHTML() + cardScreenHTML() + '</main>') +
      /* Explore and Reflect draw the toast inside the stage themselves. */
      (onMap && (state.step.phase === 'explore' || state.step.phase === 'reflect') ? '' : warningHTML()) +
    '</div>';
  }

  /* Progress line [p1]: Tutorial · Onboarding · Day 1 · Day 2 · Day 3 */
  function progressHTML() {
    var s = state.step, c = content(), steps = [];
    if (rules().show_tutorial) steps.push({ label: L('progress_tutorial'), key: 'tutorial' });
    steps.push({ label: L('progress_onboarding'), key: 'onboarding' });
    c.days.forEach(function (d, i) { steps.push({ label: d.name, key: 'day' + i }); });
    var nowKey = s.kind === 'day' ? 'day' + s.day : s.kind;
    var nowIdx = 0;
    steps.forEach(function (st, i) { if (st.key === nowKey) nowIdx = i; });
    return '<ol class="progress" aria-label="' + esc(L('stage')) + '">' + steps.map(function (st, i) {
      return '<li class="pg-step ' + (i < nowIdx ? 'is-done' : i === nowIdx ? 'is-now' : '') + '"' + (i === nowIdx ? ' aria-current="step"' : '') + '>' +
        '<span class="pg-dot" aria-hidden="true"></span><span class="pg-label">' + esc(st.label) + '</span></li>';
    }).join('') + '</ol>';
  }

  function toolsHTML() {
    var isBig = !!document.fullscreenElement;
    return '<div class="g-tools">' +
      '<button class="btn-quiet" data-act="restart">' + esc(L('restart')) + '</button>' +
      (fullscreenAvailable()
        ? '<button class="btn-fullscreen" data-act="fullscreen" title="' + esc(isBig ? L('exit_fullscreen') : L('fullscreen')) + '">' +
          (isBig ? shrinkIconSVG() : '⛶') + '</button>' : '') +
    '</div>';
  }

  /* Left column [p12, p19, p37]: the day's goal, then the stage list with the
     current stage's instructions under it. */
  function leftHTML() {
    var day = currentDay(), s = state.step, idx = day.phases.indexOf(s.phase);
    var html = '<div class="lc-box">' + esc(L('day_goal', { day: s.day + 1, n: s.day + 1 })) + '</div>' +
      '<p class="lc-goal">' + textToHtml(day.goal) + '</p>' +
      '<div class="lc-box">' + esc(L('stage')) + '</div><ul class="lc-stages">';
    day.phases.forEach(function (ph, i) {
      var cls = i < idx ? 'is-done' : i === idx ? 'is-now' : '';
      html += '<li class="lc-stage ' + cls + '"><div class="lc-row"><span class="lc-mark" aria-hidden="true"></span>' +
        '<span class="lc-name">' + esc(L('phase_' + ph)) + '</span></div>' +
        (i === idx ? '<div class="lc-instr">' + paras(day.instructions[ph]) + '</div>' : '') + '</li>';
    });
    return html + '</ul>';
  }

  /* On Explore the toast sits inside the map, just under the Explore Requests
     counter, so the coins stay visible while it is open ('in-stage'). */
  function warningHTML(where) {
    var n = state.ui.warningOpen;
    if (!n) return '';
    return '<div class="toast' + (where ? ' ' + where : '') + (steadyToast ? ' is-steady' : '') + '" role="status">' + infoIconSVG() +
      '<div class="toast-text"><b>' + esc(L('time_warning_title')) + '</b><span>' +
      esc(L(n === 1 ? 'time_warning_body_one' : 'time_warning_body', { n: n })) + '</span></div>' +
      '<button class="toast-x" data-act="warning-close" aria-label="' + esc(L('close')) + '">×</button></div>';
  }

  /* ====================================================================== *
   * PICTURES — all our own, drawn in SVG. Content may give image files instead.
   * ====================================================================== */
  var ICONS = {
    bird: '<path d="M3 13c3 0 5-2 7-5 1 3 3 5 7 5l4-3-1 5c-2 3-5 5-9 5s-7-3-8-7Z"/><circle cx="16.5" cy="10.5" r=".6"/>',
    leaf: '<path d="M5 20c0-8 5-13 14-14 1 9-4 14-11 14"/><path d="M5 20c3-4 6-6 10-7"/>',
    drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12.5h5"/>',
    signal: '<path d="M12 13v8"/><circle cx="12" cy="11" r="1.6"/><path d="M8.5 7.5a5 5 0 0 0 0 7M15.5 7.5a5 5 0 0 1 0 7"/><path d="M5.5 4.5a9.5 9.5 0 0 0 0 13M18.5 4.5a9.5 9.5 0 0 1 0 13"/>',
    sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z"/><path d="M12 14c0-4 3-7 7-7 0 4-3 7-7 7Z"/><path d="M7 21h10"/>',
    wrench: '<path d="M14.5 5.5a4 4 0 0 0 4.9 5L20 11l-9 9a2.1 2.1 0 0 1-3-3l9-9 .5.6a4 4 0 0 0-3-3.1Z"/>',
    paw: '<path d="M12 14c-3 0-5 2-5 4s2 3 5 3 5-1 5-3-2-4-5-4Z"/><circle cx="6" cy="10" r="2"/><circle cx="10" cy="6.5" r="2"/><circle cx="14" cy="6.5" r="2"/><circle cx="18" cy="10" r="2"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    boat: '<path d="M3 16h18l-3 4H6Z"/><path d="M12 4v12"/><path d="M12 5l6 9h-6"/>',
    document: '<path d="M7 3h7l4 4v14H7Z"/><path d="M14 3v4h4"/><path d="M10 12h5M10 15.5h5"/>'
  };
  function iconSVG(name, cls) {
    return '<svg class="' + (cls || 'st-icon') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.leaf) + '</svg>';
  }
  function coinSVG(spent) {
    return spent
      ? '<svg class="coin is-spent" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/></svg>'
      : '<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5"/><circle class="coin-in" cx="10" cy="10" r="5"/></svg>';
  }
  /* Leaving full screen: two arrows pointing inward (item 18). An "X" read
     as "close the simulation". */
  function shrinkIconSVG() {
    return '<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>';
  }
  function infoIconSVG() {
    return '<svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.5"/></svg>';
  }
  function notesIconSVG() {
    return '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6Z"/><path d="M9 10h6M9 13.5h6M9 17h4"/></svg>';
  }
  function helpIconSVG() {
    return '<svg class="pill-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7"/><path d="M12 17v.4"/></svg>';
  }

  function islandSVG() {
    return '<svg class="map-bg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><radialGradient id="sea" cx="50%" cy="45%" r="75%"><stop offset="0%" stop-color="#2f4a63"/><stop offset="100%" stop-color="#24374b"/></radialGradient>' +
      '<linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4b6b55"/><stop offset="100%" stop-color="#3d5847"/></linearGradient></defs>' +
      '<rect width="1000" height="560" fill="url(#sea)"/>' +
      '<g fill="none" stroke="#9fb8cf" stroke-width="1.4" opacity=".18">' +
        '<path d="M40 60q60-18 120 0t120 0"/><path d="M720 520q60-18 120 0t120 0"/><path d="M860 40q50-14 100 0"/><path d="M30 500q50-14 100 0"/></g>' +
      '<path d="M90 90 Q300 20 520 50 Q760 20 900 110 Q975 200 940 320 Q960 450 820 505 Q640 555 480 525 Q280 550 150 480 Q50 400 70 270 Q40 160 90 90 Z" fill="url(#land)" stroke="#8fae8f" stroke-width="3"/>' +
      '<path d="M150 480 Q280 550 480 525 Q640 555 820 505" fill="none" stroke="#d9c89a" stroke-width="10" opacity=".35" stroke-linecap="round"/>' +
      '<path d="M420 90 Q480 180 450 260 Q420 350 520 410 Q580 450 620 530" stroke="#7fa7c7" stroke-width="6" fill="none" opacity=".4" stroke-linecap="round"/>' +
      '<g fill="#5b7d64" opacity=".6"><circle cx="250" cy="140" r="20"/><circle cx="276" cy="126" r="13"/><circle cx="880" cy="250" r="16"/><circle cx="600" cy="120" r="14"/><circle cx="120" cy="330" r="15"/><circle cx="700" cy="330" r="12"/></g>' +
      '<g fill="#6e8a74" opacity=".5"><path d="M330 60 l26 -26 l26 26 Z"/><path d="M366 64 l20 -20 l20 20 Z"/></g>' +
    '</svg>';
  }
  function mapBackdropHTML() {
    var m = content().map;
    return '<div class="map-backdrop" aria-hidden="true">' +
      (m && m.image ? '<img class="map-img" src="' + esc(m.image) + '" alt="" draggable="false">' : islandSVG()) + '</div>';
  }
  function buildingSVG(colour) {
    return '<svg class="st-building colour-' + esc(colour) + '" viewBox="0 0 80 44" aria-hidden="true">' +
      '<path class="b-roof" d="M6 20 L40 4 L74 20 Z"/>' +
      '<rect class="b-wall" x="12" y="20" width="56" height="22" rx="2"/>' +
      '<rect class="b-door" x="35" y="28" width="10" height="14"/>' +
      '<rect class="b-win" x="18" y="25" width="10" height="8"/><rect class="b-win" x="52" y="25" width="10" height="8"/></svg>';
  }
  function hutSVG() {
    return '<svg class="hut-svg" viewBox="0 0 120 50" aria-hidden="true">' +
      '<path class="b-roof hut-roof" d="M4 22 Q60 -4 116 22 Z"/><rect class="b-wall hut-wall" x="14" y="22" width="92" height="26" rx="3"/>' +
      '<rect class="b-door" x="54" y="30" width="12" height="18"/><rect class="b-win" x="24" y="28" width="14" height="9"/><rect class="b-win" x="82" y="28" width="14" height="9"/></svg>';
  }

  /* An avatar: the house initials circle, or the content's picture. */
  function avatarHTML(p, size, badge) {
    var inner = p.image ? '<img src="' + esc(p.image) + '" alt="" draggable="false">' : esc(initials(p.name));
    return '<span class="avatar ' + (size || '') + ' ' + toneOf(p.id) + (p.image ? ' has-img' : '') + '">' + inner + (badge || '') + '</span>';
  }
  /* A Workstation's round icon, in its colour (or its picture). */
  function stationDiscHTML(st, size) {
    return '<span class="st-disc ' + (size || '') + ' colour-' + esc(st.colour) + '">' +
      (st.image ? '<img src="' + esc(st.image) + '" alt="" draggable="false">' : iconSVG(st.icon, 'disc-icon')) + '</span>';
  }
  function stationBadge(stationId) {
    var st = stationById(stationId);
    return st ? '<span class="badge badge-station colour-' + esc(st.colour) + '">' + iconSVG(st.icon, 'badge-icon') + '</span>' : '';
  }
  var BADGE_COIN = '<span class="badge badge-coin" aria-hidden="true"></span>';
  var BADGE_ALERT = '<span class="badge badge-alert" aria-hidden="true">i</span>';

  /* ====================================================================== *
   * CARD SCREENS — tutorial, onboarding, day goal, stage intros, Assign done
   * ====================================================================== */
  function tutorialCardInner(index) {
    var c = content(), key = TUTORIAL[index], t = c.tutorial[key];
    var last = index === TUTORIAL.length - 1;
    return '<section class="gcard is-tutorial">' +
      '<div class="tut-grid"><div class="tut-text"><h1>' + esc(t.heading) + '</h1><div class="gc-body">' + paras(t.body) + '</div></div>' +
      '<div class="tut-art">' + tutorialArt(key) + '</div></div>' +
      '<div class="gc-actions is-right"><button class="btn" data-act="card-next">' + esc(L(last ? 'start_project' : 'continue')) + '</button></div>' +
    '</section>';
  }
  function cardScreenHTML() {
    var s = state.step, c = content();
    if (s.kind === 'tutorial') {
      return '<div class="card-wrap">' + tutorialCardInner(s.index) + '</div>';
    }
    if (s.kind === 'onboarding') {
      var ob = c.onboarding;
      if (s.screen === 'intro') {
        return simpleCard('', ob.intro_heading, ob.intro, L('start'));
      }
      if (s.screen === 'rank') return rankHTML();
      var items = state.run.onboarding.order.map(function (qid, i) {
        var q = M.byId(ob.questions, qid);
        return '<div class="brief-item"><div class="brief-q"><span class="brief-n">' + (i + 1) + '</span>' + textToHtml(q.text) + '</div>' +
          '<div class="brief-a">' + textToHtml(q.answer) + '</div></div>';
      }).join('');
      return '<div class="card-wrap is-tall"><section class="gcard is-wide">' +
        '<div class="gc-scroll"><h1>' + esc(ob.brief_heading) + '</h1><div class="brief-grid">' + items + '</div></div>' +
        '<div class="gc-actions is-right"><button class="btn" data-act="card-next">' + esc(L('understood')) + '</button></div></section></div>';
    }
    var day = currentDay(), n = s.day + 1;
    if (s.screen === 'goal') return simpleCard('', day.goal_heading, day.goal, L('start_day', { n: n, day: n }));
    if (s.screen === 'intro') return simpleCard(L('kicker_day', { n: n, day: n }), L('phase_' + s.phase), day.intros[s.phase], L('start_' + s.phase));
    return simpleCard(L('kicker_day', { n: n, day: n }), L('assign_complete_title'), L('assign_complete_body'), L('continue'));
  }
  function simpleCardInner(kicker, heading, body, button) {
    var parts = String(body || '').split(/\n\s*\n/), words = String(body || '').trim().split(/\s+/).length;
    var short = parts.length === 1 && words <= 20;
    return '<section class="gcard' + (short ? ' is-short' : '') + '">' +
      (kicker ? '<div class="gc-kicker">' + esc(kicker) + '</div>' : '') +
      '<h1>' + esc(heading) + '</h1><div class="gc-body">' + paras(body) + '</div>' +
      '<div class="gc-actions"><button class="btn" data-act="card-next">' + esc(button) + '</button></div></section>';
  }
  function simpleCard(kicker, heading, body, button) {
    return '<div class="card-wrap">' + simpleCardInner(kicker, heading, body, button) + '</div>';
  }

  /* A box off the side of the page, the same width as the place being
     measured, used to find out how tall something would be before it is
     drawn. It hangs off <body>, not off the screen it belongs to: a card
     that is still playing its opening animation is very slightly scaled,
     and anything measured inside it would come out about 1.5% too small.
     Opening animations are switched off inside the box (css/app.css). */
  function measureHost(width, html) {
    var host = document.createElement('div');
    host.className = 'measure-host';
    host.setAttribute('aria-hidden', 'true');
    host.style.width = width + 'px';
    host.innerHTML = html;
    document.body.appendChild(host);
    return host;
  }

  /* ---- ITEM 9: ONE HEIGHT FOR A SERIES OF CARDS ------------------------
     The five tutorial cards, and a day's four stage-intro cards, are read
     one after another. Each used to be exactly as tall as its own words, so
     the card nudged up or down on every Continue. Every card in a series is
     now held at the height of the tallest card in that series, measured for
     the window as it is now. The Day Goal card and the Assign Complete card
     are screens of their own and keep their own heights. */
  function seriesCards() {
    var s = state.step;
    if (!s) return [];
    if (s.kind === 'tutorial') {
      return TUTORIAL.map(function (key, i) { return tutorialCardInner(i); });
    }
    if (s.kind === 'day' && s.screen === 'intro') {
      var day = currentDay(), n = s.day + 1;
      return day.phases.map(function (ph) {
        return simpleCardInner(L('kicker_day', { n: n, day: n }), L('phase_' + ph), day.intros[ph], L('start_' + ph));
      });
    }
    return [];
  }
  function applySeriesHeight() {
    if (state.phase !== 'game') return;
    var wrap = app.querySelector('.card-wrap');
    if (!wrap) return;
    var card = wrap.querySelector('.gcard');
    if (!card) return;
    var list = seriesCards();
    if (list.length < 2) return;
    var cs = window.getComputedStyle(wrap);
    var innerW = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var innerH = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(innerW > 0) || !(innerH > 0)) return;
    var host = measureHost(innerW, list.join(''));
    var tallest = 0;
    Array.prototype.forEach.call(host.querySelectorAll('.gcard'), function (el) {
      tallest = Math.max(tallest, el.getBoundingClientRect().height);
    });
    host.parentNode.removeChild(host);
    if (tallest > 0) card.style.minHeight = Math.min(Math.ceil(tallest), Math.floor(innerH)) + 'px';
  }

  /* An arrow from (x1, y1) to the tip (x2, y2): the line stops short of the
     tip so the round line cap never pokes through the head, and the head is
     a triangle whose base is square to the line, whatever the angle. */
  function artArrow(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len, px = -uy, py = ux;
    var headLen = 11, headHalf = 5.5;
    var bx = x2 - ux * headLen, by = y2 - uy * headLen;          // centre of the head's base
    var lx = x2 - ux * (headLen - 1), ly = y2 - uy * (headLen - 1); // where the line stops
    var f = function (n) { return Math.round(n * 10) / 10; };
    return '<path class="art-arrow" d="M' + f(x1) + ' ' + f(y1) + ' L' + f(lx) + ' ' + f(ly) + '"/>' +
      '<path class="art-arrow-head" d="M' + f(x2) + ' ' + f(y2) + ' L' + f(bx + px * headHalf) + ' ' + f(by + py * headHalf) +
      ' L' + f(bx - px * headHalf) + ' ' + f(by - py * headHalf) + ' Z"/>';
  }

  /* Small illustrations for the tutorial [p2–p5]: a grey mock screen with an
     arrow to the feature being described. */
  function tutorialArt(key) {
    if (key === 'welcome' || key === 'complete') {
      var houses = '';
      [[18, 46], [58, 30], [98, 50], [138, 34]].forEach(function (h) {
        houses += '<g transform="translate(' + h[0] + ' ' + h[1] + ')"><path d="M0 18 L16 6 L32 18 Z"/><rect x="4" y="18" width="24" height="18"/><rect x="13" y="25" width="6" height="11"/></g>';
      });
      return '<svg class="art" viewBox="0 0 190 120" aria-hidden="true">' +
        (key === 'welcome' ? '<path class="art-land" d="M10 95 Q40 60 95 70 Q150 55 180 95 Q150 115 95 110 Q40 118 10 95 Z"/>' : '<path class="art-ground" d="M6 100 H184"/>') +
        '<g class="art-lines">' + houses + '</g></svg>';
    }
    var arrow, spot;
    if (key === 'timer') { spot = '<circle class="art-hi" cx="26" cy="22" r="10"/>'; arrow = artArrow(100, 70, 44, 30); }
    else if (key === 'notes') { spot = '<rect class="art-hi" x="14" y="100" width="34" height="12" rx="6"/><rect class="art-pill" x="54" y="100" width="28" height="12" rx="6"/>'; arrow = artArrow(110, 60, 42, 96); }
    else { spot = '<rect class="art-pill" x="14" y="100" width="34" height="12" rx="6"/><rect class="art-hi" x="54" y="100" width="28" height="12" rx="6"/>'; arrow = artArrow(130, 60, 74, 96); }
    return '<svg class="art" viewBox="0 0 190 124" aria-hidden="true">' +
      '<rect class="art-screen" x="4" y="4" width="182" height="116" rx="8"/>' +
      '<rect class="art-block" x="44" y="14" width="102" height="8" rx="4"/>' +
      '<rect class="art-block" x="14" y="40" width="40" height="52" rx="4"/>' +
      '<rect class="art-block" x="62" y="40" width="114" height="52" rx="4"/>' +
      (key === 'timer' ? '' : '<circle class="art-block" cx="26" cy="22" r="10"/>') +
      spot + arrow + '</svg>';
  }

  /* ---- ONBOARDING: put the questions into the slots [p7–p8] ------------- */
  /* One question card. slot === null draws it as it sits in the pool;
     a number draws it in that slot, with the up and down arrows. */
  function rankCardHTML(q, slot, sel, last) {
    return '<div class="rank-card' + (sel === q.id ? ' is-selected' : '') + '" data-drag="rank" data-act="rank-pick" data-id="' + esc(q.id) + '">' +
      '<span class="rank-grip" aria-hidden="true"></span><span class="rank-text">' + textToHtml(q.text) + '</span>' +
      (slot === null ? '' : '<span class="rank-arrows">' +
        '<button class="arrow-btn" data-act="rank-up" data-id="' + slot + '" title="' + esc(L('move_up')) + '" aria-label="' + esc(L('move_up')) + '"' + (slot === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button class="arrow-btn" data-act="rank-down" data-id="' + slot + '" title="' + esc(L('move_down')) + '" aria-label="' + esc(L('move_down')) + '"' + (slot === last ? ' disabled' : '') + '>▼</button>' +
      '</span>') + '</div>';
  }
  /* ITEM 7: the card must not change by a pixel from the first drag to
     Confirm Order. The tallest question is measured once per draw at the
     width a card has in the pool, and again at the width it has in a slot;
     every card, ghost and empty slot is then held at that height. Both are
     measured away from the screen, so what the candidate sees never moves. */
  function measureRankHeight(width, slot) {
    var host = measureHost(width, content().onboarding.questions.map(function (q) {
      return rankCardHTML(q, slot, null, 99);
    }).join(''));
    var h = 0;
    Array.prototype.forEach.call(host.querySelectorAll('.rank-card'), function (el) {
      h = Math.max(h, el.getBoundingClientRect().height);
    });
    host.parentNode.removeChild(host);
    return Math.ceil(h);
  }
  function sizeRankCards() {
    if (state.phase !== 'game') return;
    var layout = app.querySelector('.rank-layout');
    if (!layout) return;
    var poolCard = layout.querySelector('.rank-pool .rank-card');
    var slotCell = layout.querySelector('.rank-slot .rank-card, .rank-slot .slot-empty');
    if (!poolCard || !slotCell) return;
    var poolW = poolCard.getBoundingClientRect().width;
    var slotW = slotCell.getBoundingClientRect().width;
    if (!(poolW > 0) || !(slotW > 0)) return;
    layout.style.setProperty('--rk-pool-h', measureRankHeight(poolW, null) + 'px');
    layout.style.setProperty('--rk-slot-h', measureRankHeight(slotW, 1) + 'px');
  }

  function rankHTML() {
    var ob = content().onboarding, order = state.run.onboarding.order, sel = state.ui.selected;
    function card(q, slot) { return rankCardHTML(q, slot, sel, order.length - 1); }
    var pool = ob.questions.map(function (q) {
      return order.indexOf(q.id) >= 0 ? '<div class="rank-card is-ghost" aria-hidden="true"></div>' : card(q, null);
    }).join('');
    var slots = order.map(function (qid, i) {
      var q = qid ? M.byId(ob.questions, qid) : null;
      return '<div class="rank-slot' + (q ? ' is-filled' : '') + (sel && !q ? ' is-target' : '') + '" data-rank-slot="' + i + '" data-act="rank-slot" data-id="' + i + '">' +
        '<span class="slot-label">' + esc(L('slot_' + (i + 1))) + '</span>' +
        (q ? card(q, i) : '<span class="slot-empty"></span>') + '</div>';
    }).join('');
    var complete = order.every(function (x) { return !!x; });
    return '<div class="card-wrap is-tall"><section class="gcard is-wide">' +
      '<div class="gc-scroll"><h1>' + esc(ob.rank_heading) + '</h1>' +
      '<p class="gc-lede">' + textToHtml(ob.rank_instruction) + '</p>' +
      '<div class="rank-layout"><div class="rank-side"><div class="rank-pool" data-rank-pool="1" data-act="rank-pool">' + pool + '</div>' +
      '<p class="rank-hint muted">' + esc(L('drag_hint')) + '</p></div>' +
      '<div class="rank-slots">' + slots + '</div></div></div>' +
      '<div class="gc-actions is-split">' + helpPillHTML() +
        '<button class="btn" data-act="card-next"' + (complete ? '' : ' disabled') + '>' + esc(L('confirm_order')) + '</button></div>' +
    '</section>' + (state.ui.panel === 'help' ? rankHelpHTML() : '') + '</div>';
  }

  /* ====================================================================== *
   * THE STAGE AREA (Explore, Assign, Support, Reflect)
   * ====================================================================== */
  function stageHTML() {
    var ph = state.step.phase;
    var notesOk = ph !== 'reflect' || rules().notes_in_reflect;
    var pills = '<div class="stage-pills">' +
      (notesOk ? '<button class="pill-btn' + (state.ui.panel === 'notes' ? ' is-on' : '') + '" data-act="panel" data-id="notes">' + notesIconSVG() + esc(L('notes')) + '</button>' : '') +
      helpPillHTML() + '</div>';
    return '<div class="stage-area' + (ph === 'reflect' ? ' is-reflect' : '') +
      (state.ui.modal ? ' has-card' : '') + '" id="stage">' +
      (ph === 'reflect' ? mapBackdropHTML() + reflectHTML() : mapHTML()) +
      (ph === 'explore' ? coinsHTML() + warningHTML('in-stage') : '') +
      (ph === 'reflect' ? warningHTML('in-reflect') : '') +
      pills + stageButtonHTML() + panelHTML() +
      (state.ui.hint ? '<div class="map-hint" role="status">' + esc(state.ui.hint) + '</div>' : '') +
      mapCardHTML() +
    '</div>';
  }

  function helpPillHTML() {
    return '<button class="pill-btn' + (state.ui.panel === 'help' ? ' is-on' : '') + '" data-act="panel" data-id="help">' + helpIconSVG() + esc(L('help')) + '</button>';
  }
  /* Help on the onboarding ranking screen [p7]: the ranking instructions and the key terms. */
  function rankHelpHTML() {
    var ob = content().onboarding;
    return '<div class="side-panel is-rank" role="dialog" aria-label="' + esc(L('help')) + '"><div class="sp-head"><b>' + esc(L('help')) + '</b>' +
      '<button class="sp-close" data-act="panel-close" aria-label="' + esc(L('close')) + '">×</button></div>' +
      '<div class="sp-body"><h3 class="sp-h">' + esc(L('help_instructions')) + ': ' + esc(L('phase_onboarding')) + '</h3>' +
      '<div class="sp-text">' + paras(ob.rank_instruction) + paras(L('drag_hint')) + '</div>' +
      '<h3 class="sp-h">' + esc(L('help_definitions')) + '</h3><dl class="sp-defs">' + definitionsHTML() + '</dl></div></div>';
  }
  function definitionsHTML() {
    return (content().help.definitions || []).map(function (d) {
      return '<dt>' + esc(d.term) + '</dt><dd>' + textToHtml(d.meaning) + '</dd>';
    }).join('');
  }

  function stageButtonHTML() {
    var ph = state.step.phase, key, ok;
    if (ph === 'explore') { key = 'continue'; ok = exploreCanContinue(); }
    else if (ph === 'assign') { key = 'confirm_assignments'; ok = true; }
    else if (ph === 'support') { key = 'continue'; ok = supportAllDone(); }
    else { key = 'complete_reflect'; ok = reflectComplete(); }
    return '<button class="btn stage-go" data-act="stage-done"' + (ok ? '' : ' disabled') + '>' + esc(L(key)) + '</button>';
  }

  /* Where things stand on the map, in % of the map's width and height.
     Row one has room on the right for the team hut. */
  var LAYOUTS = {
    2: [[20, 44], [44, 70]],
    3: [[16, 40], [42, 38], [40, 70]],
    4: [[16, 40], [42, 38], [30, 70], [62, 70]],
    5: [[15, 38], [40, 38], [16, 70], [44, 70], [72, 70]]
  };
  var HUT_AT = [76, 27];

  function mapHTML() {
    var c = content(), day = currentDay(), dr = currentDayRun(), ph = state.step.phase;
    var layout = LAYOUTS[c.stations.length] || LAYOUTS[4];
    var html = '<div class="map' + (c.stations.length > 4 ? ' is-crowded' : '') + '" id="map">' +
      (c.map && c.map.image ? '<img class="map-img" src="' + esc(c.map.image) + '" alt="" draggable="false">' : islandSVG());

    /* The team hut: during Explore everyone stands in front of it [p12]. */
    var crowd = '';
    if (ph === 'explore') {
      c.people.forEach(function (p) { crowd += tokenHTML(p, canAsk('person', p.id) ? 'askable' : 'dim'); });
    }
    html += '<div class="hut" style="left:' + HUT_AT[0] + '%;top:' + HUT_AT[1] + '%">' + hutSVG() +
      (crowd ? '<div class="hut-crowd">' + crowd + '</div>' : '') + '</div>';

    c.stations.forEach(function (st, i) {
      var pos = layout[i] || [50, 50];
      var cls = 'station', attrs = '';
      var askable = ph === 'explore' && canAsk('station', st.id);
      if (ph === 'explore') {
        if (askable) { cls += ' is-askable'; attrs = ' data-act="ask" data-target="station" data-id="' + esc(st.id) + '" role="button" tabindex="0"'; }
        else cls += ' is-dim';
      }
      if (ph === 'assign') {
        attrs = ' data-station="' + esc(st.id) + '" data-act="place-station" data-id="' + esc(st.id) + '"';
        if (state.ui.selected) cls += ' is-target';
      }
      var slots = '';
      if (ph !== 'explore') {
        var here = M.peopleAt(c, day, dr, st.id);
        here.forEach(function (p) {
          var mode = ph === 'assign' ? 'drag' : (pendingFor(p.id) ? 'alert' : 'plain');
          slots += tokenHTML(p, mode);
        });
        for (var k = here.length; k < rules().station_capacity; k++) slots += '<span class="slot-open" aria-hidden="true"></span>';
        slots = '<div class="st-slots">' + slots + '</div>';
      }
      html += '<div class="' + cls + '" style="left:' + pos[0] + '%;top:' + pos[1] + '%"' + attrs + '>' +
        '<div class="st-sign colour-' + esc(st.colour) + (askable ? ' has-coin' : '') + '">' + iconSVG(st.icon) + '<span>' + esc(st.short) + '</span>' + (askable ? BADGE_COIN : '') + '</div>' +
        (st.image ? '<img class="st-img" src="' + esc(st.image) + '" alt="" draggable="false">' : buildingSVG(st.colour)) +
        slots + '</div>';
    });
    return html + '</div>';
  }

  /* One person on the map. mode: askable | dim | drag | alert | plain */
  function tokenHTML(p, mode) {
    var attrs = '', badge = '';
    if (mode === 'askable') { attrs = ' data-act="ask" data-target="person" data-id="' + esc(p.id) + '" role="button" tabindex="0"'; badge = BADGE_COIN; }
    if (mode === 'drag') attrs = ' data-drag="person" data-act="select-person" data-id="' + esc(p.id) + '"';
    if (mode === 'alert') { attrs = ' data-act="support-open" data-id="' + esc(p.id) + '" role="button" tabindex="0"'; badge = BADGE_ALERT; }
    var sel = mode === 'drag' && state.ui.selected === p.id ? ' is-selected' : '';
    return '<div class="token is-' + mode + sel + '"' + attrs + '>' + avatarHTML(p, 'md', badge) +
      '<span class="token-name">' + esc(p.name) + '</span></div>';
  }

  function coinsHTML() {
    var day = currentDay(), left = pointsLeft(), total = day.explore_points || 0, coins = '';
    for (var i = 0; i < total; i++) coins += coinSVG(i >= left);
    return '<div class="coins" aria-label="' + esc(L('explore_requests')) + ': ' + left + '"><span>' + esc(L('explore_requests')) + '</span>' + coins + '</div>';
  }

  /* ---- EXPLORE ----------------------------------------------------------- */
  function pointsLeft() {
    var day = currentDay(), dr = currentDayRun();
    return Math.max(0, (day.explore_points || 0) - dr.asked.length);
  }
  function isAvailable(target, id) {
    var a = currentDay().available || {};
    return ((target === 'person' ? a.people : a.stations) || []).indexOf(id) >= 0;
  }
  function canAsk(target, id) {
    return isAvailable(target, id) && M.askedCount(currentDayRun(), target, id) < rules().questions_per_target_per_day;
  }
  function anyAskable() {
    var c = content();
    return c.people.some(function (p) { return canAsk('person', p.id); }) ||
           c.stations.some(function (s) { return canAsk('station', s.id); });
  }
  function exploreCanContinue() {
    return rules().can_skip_explore_points || pointsLeft() === 0 || !anyAskable();
  }

  /* ---- SUPPORT: requests come in groups ---------------------------------- */
  function currentGroup() {
    var day = currentDay(), dr = currentDayRun(), groups = day.support_groups || [];
    for (var i = 0; i < groups.length; i++) {
      for (var j = 0; j < groups[i].length; j++) if (!dr.support[groups[i][j]]) return groups[i];
    }
    return [];
  }
  function pendingFor(personId) {
    if (!onStage() || state.step.phase !== 'support') return null;
    var day = currentDay(), dr = currentDayRun(), group = currentGroup();
    for (var i = 0; i < group.length; i++) {
      var it = M.byId(day.support, group[i]);
      if (it && it.person === personId && !dr.support[it.id]) return it;
    }
    return null;
  }
  function supportAllDone() {
    var day = currentDay(), dr = currentDayRun();
    return (day.support || []).every(function (it) { return !!dr.support[it.id]; });
  }

  /* ---- REFLECT: one table [p37, p53] ------------------------------------- */
  function reflectComplete() {
    var dr = currentDayRun();
    return content().people.every(function (p) { return !!dr.reflect[p.id]; });
  }
  function reflectHTML() {
    var day = currentDay(), dr = currentDayRun(), rf = day.reflect;
    var cols = rf.options.map(function (o) { return { id: o.id, label: o.label }; }).concat([{ id: IDK, label: L('idk'), idk: true }]);
    var head = '<tr><th scope="col"><span class="sr-only">' + esc(L('notes_researchers')) + '</span></th>' + cols.map(function (col) {
      return '<th scope="col"' + (col.idk ? ' class="is-idk"' : '') + '>' + esc(col.label) + '</th>';
    }).join('') + '</tr>';
    var body = content().people.map(function (p) {
      return '<tr><th scope="row"><span class="rf-person">' + avatarHTML(p, 'sm') + esc(p.name) + '</span></th>' + cols.map(function (col) {
        var on = dr.reflect[p.id] === col.id;
        return '<td' + (col.idk ? ' class="is-idk"' : '') + '><button class="radio-cell' + (on ? ' is-on' : '') + '" data-act="reflect-pick" data-person="' + esc(p.id) + '" data-id="' + esc(col.id) + '" role="radio" aria-checked="' + on + '" aria-label="' + esc(p.name + ': ' + col.label) + '"><span class="radio"></span></button></td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="reflect-panel"><div class="reflect-inner">' +
      '<h2>' + esc(rf.heading) + '</h2><p class="reflect-prompt">' + esc(rf.prompt) + '</p>' +
      '<table class="reflect-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div></div>';
  }

  /* ---- NOTES AND HELP (bottom-left) [p21–p28, p45] ----------------------- */
  function panelHTML() {
    var which = state.ui.panel;
    if (!which) return '';
    var title = L(which === 'notes' ? 'notes' : 'help');
    return '<div class="side-panel" role="dialog" aria-label="' + esc(title) + '"><div class="sp-head"><b>' + esc(title) + '</b>' +
      '<button class="sp-close" data-act="panel-close" aria-label="' + esc(L('close')) + '">×</button></div>' +
      '<div class="sp-body">' + (which === 'notes' ? notesHTML() : helpHTML()) + '</div></div>';
  }
  function helpHTML() {
    var day = currentDay();
    var defs = definitionsHTML();
    return '<h3 class="sp-h">' + esc(L('help_instructions')) + ': ' + esc(L('phase_' + state.step.phase)) + '</h3>' +
      '<div class="sp-text">' + paras(day.instructions[state.step.phase]) + '</div>' +
      '<h3 class="sp-h">' + esc(L('help_definitions')) + '</h3><dl class="sp-defs">' + defs + '</dl>';
  }
  function notesHTML() {
    var c = content(), dr = currentDayRun(), tab = state.ui.notesTab;
    var tabs = [['people', 'notes_researchers'], ['stations', 'notes_workstations']];
    if (rules().notes_include_onboarding) tabs.push(['project', 'notes_project']);
    var html = '<div class="sp-tabs" role="tablist">' + tabs.map(function (t) {
      return '<button class="sp-tab' + (tab === t[0] ? ' is-on' : '') + '" data-act="notes-tab" data-id="' + t[0] + '" role="tab" aria-selected="' + (tab === t[0]) + '">' + esc(L(t[1])) + '</button>';
    }).join('') + '</div>';
    if (tab === 'project') {
      return html + c.onboarding.questions.map(function (q) {
        return '<div class="np-item"><div class="np-q">' + textToHtml(q.text) + '</div><div class="np-a">' + textToHtml(q.answer) + '</div></div>';
      }).join('');
    }
    var isP = tab === 'people', list = isP ? c.people : c.stations;
    var pick = state.ui.notesPick[tab] || list[0].id;
    html += '<div class="sp-picks">' + list.map(function (x) {
      return '<button class="sp-pick' + (x.id === pick ? ' is-on' : '') + '" data-act="notes-pick" data-id="' + esc(x.id) + '" aria-pressed="' + (x.id === pick) + '">' +
        (isP ? avatarHTML(x, 'sm') : stationDiscHTML(x, 'sm')) + '<span>' + esc(isP ? x.name : x.short) + '</span></button>';
    }).join('') + '</div>';
    var who = M.byId(list, pick);
    var target = isP ? 'person' : 'station';
    var qlist = isP ? rules().person_questions : rules().station_questions;
    var history = '';
    dr.asked.forEach(function (a) {
      if (a.target !== target || a.id !== pick) return;
      var q = M.byId(qlist, a.q), ans = M.answerFor(currentDay(), a.target, a.id, a.q);
      history += '<div class="np-pair"><div class="np-label">' + esc(L('i_asked')) + '</div><div class="np-q">' + esc(q ? q.label : a.q) + '</div>' +
        '<div class="np-label">' + esc(L('response')) + '</div><div class="np-a">' + textToHtml(ans ? ans.text : '') + '</div></div>';
    });
    return html + '<div class="np-who"><b>' + esc(who.name) + '</b>' + (isP ? '<span class="np-role">' + esc(who.role) + '</span>' : '') +
      '<p>' + textToHtml(who.description) + '</p></div><hr class="np-rule">' +
      '<h3 class="sp-h">' + esc(L('conversation_history')) + '</h3>' +
      (history || '<p class="np-none">' + esc(L('no_history')) + '</p>');
  }

  /* ====================================================================== *
   * CARDS OVER THE MAP — the map dims; the left column stays visible [p54]
   * ====================================================================== */
  function pill(act, id, inner, opts) {
    opts = opts || {};
    return '<button class="opt-pill' + (opts.quiet ? ' is-quiet' : '') + (opts.centre ? ' is-centre' : '') + '" data-act="' + act + '"' +
      (id !== null && id !== undefined ? ' data-id="' + esc(id) + '"' : '') + (opts.disabled ? ' disabled' : '') + '>' + inner + '</button>';
  }
  function mapCardHTML() {
    var m = state.ui.modal;
    if (!m) return '';
    var day = currentDay(), dr = currentDayRun(), inner = '', cls = 'qcard';

    if (m.type === 'ask') {
      var isP = m.target === 'person';
      var who = isP ? personById(m.id) : stationById(m.id);
      var qlist = isP ? rules().person_questions : rules().station_questions;
      var left = pointsLeft(), text, pills = '';
      if (m.answered) {
        var ans = M.answerFor(day, m.target, m.id, m.answered);
        text = textToHtml(ans ? ans.text : '');
        pills = pill('card-close', null, esc(L('continue_pill')), { centre: true });
      } else {
        text = isP ? esc(L('ask_person_greeting')) : textToHtml(who.description);
        qlist.forEach(function (q) {
          if (M.hasAsked(dr, m.target, m.id, [q.id])) return;
          pills += pill('ask-q', q.id, coinSVG(false) + '<span>' + esc(q.label) + '</span>', { disabled: left <= 0 });
        });
        if (left <= 0) pills += '<p class="qc-note">' + esc(L('ask_no_points')) + '</p>';
        /* Both ask cards close with the same pill (item 19). */
        pills += pill('card-close', null, esc(L('never_mind')), { quiet: true });
      }
      inner = '<div class="qc-who">' + (isP ? avatarHTML(who, 'xl') : stationDiscHTML(who, 'xl')) +
        '<h2>' + esc(who.name) + '</h2><p class="qc-text">' + text + '</p></div>' +
        '<div class="qc-pills">' + pills + '</div>';
    }

    if (m.type === 'reason') {
      var p = personById(m.person), to = stationById(m.to);
      var reasons = rules().reasons.map(function (r) { return pill('reason', r.id, esc(r.label)); }).join('');
      cls += ' is-reason';
      inner = '<h2 class="qc-title">' + esc(L('assign_title', { name: p.name, station: to.name })) + '</h2>' +
        '<div class="qc-move">' + avatarHTML(p, 'lg', m.from ? stationBadge(m.from) : '') +
          '<svg class="qc-arrow" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8h32M28 2l6 6-6 6"/></svg>' + stationDiscHTML(to, 'lg') + '</div>' +
        '<div class="qc-pills"><p class="qc-sub">' + esc(L('assign_reason_sub')) + '</p>' + reasons +
          pill('reason-cancel', null, esc(L('cancel_pill')), { quiet: true }) + '</div>';
    }

    if (m.type === 'request') {
      var item = M.byId(day.support, m.item), rp = personById(item.person);
      cls += ' is-small';
      inner = '<h2>' + esc(L('support_request_title')) + '</h2>' + avatarHTML(rp, 'lg', BADGE_ALERT) +
        '<p class="qc-text">' + esc(L('support_request_body', { name: rp.name })) + '</p>' +
        '<div class="qc-buttons"><button class="btn" data-act="request-answer">' + esc(L('answer_request')) + '</button>' +
        '<button class="btn-quiet on-light" data-act="card-close">' + esc(L('make_another_selection')) + '</button></div>';
    }

    if (m.type === 'question') {
      var qi = M.byId(day.support, m.item), qp = personById(qi.person);
      var right;
      if (m.chosen) {
        var chosen = M.byId(qi.options, m.chosen);
        right = '<h3 class="qc-sub">' + esc(L('support_outcome_title')) + '</h3><p class="qc-text">' + textToHtml(chosen.outcome) + '</p>' +
          '<button class="btn" data-act="card-close">' + esc(L('support_close')) + '</button>';
      } else {
        right = qi.options.map(function (o) { return pill('support-choose', o.id, textToHtml(o.text)); }).join('');
      }
      cls += ' is-question' + (qi.options.length === 2 ? ' is-two' : '');
      inner = '<div class="qc-who">' + avatarHTML(qp, 'xl', stationBadge(M.currentStation(day, dr, qp.id))) +
        '<h2>' + esc(qp.name) + '</h2><div class="qc-text">' + paras(qi.message) + '</div></div>' +
        '<div class="qc-pills">' + right + '</div>';
    }
    return '<div class="card-layer' + (steadyModal ? ' is-steady' : '') + '"><div class="' + cls + '" role="dialog">' + inner + '</div></div>';
  }

  /* House popups over everything (v1 markup). */
  function dialogHTML() {
    var d = state.ui.dialog;
    if (!d) return '';
    if (d.type === 'restart') {
      return backdrop('<div class="modal"><div class="modal-body"><h2>' + esc(L('restart_title')) + '</h2>' +
        '<p>' + esc(L('restart_body')) + '</p></div><div class="modal-actions">' +
        '<button class="btn btn-quiet on-light" data-act="restart-cancel">' + esc(L('cancel')) + '</button>' +
        '<button class="btn" data-act="restart-confirm">' + esc(L('restart')) + '</button></div></div>');
    }
    if (d.type === 'finish') {
      return backdrop('<div class="modal"><div class="modal-body"><h2>' + esc(L('finish_title')) + '</h2></div>' +
        '<div class="modal-actions"><button class="btn" data-act="see-results">' + esc(L('finish_button')) + '</button></div></div>');
    }
    return '';
  }
  function backdrop(inner) { return '<div class="modal-backdrop' + (steadyDialog ? ' is-steady' : '') + '">' + inner + '</div>'; }

  /* ====================================================================== *
   * MOVING THROUGH THE GAME
   * ====================================================================== */
  function markLate(dr, key) {
    if (!timeIsUp()) return;
    if (dr) dr.late[key] = true; else state.run.late[key] = true;
  }

  function clearScreenUi() {
    state.ui.modal = null;
    state.ui.panel = null;
    state.ui.selected = null;
    state.ui.hint = '';
  }

  function beginRun() {
    state.phase = 'game';
    if (rules().show_tutorial) {
      state.step = { kind: 'tutorial', index: 0 };
    } else {
      startTimer();
      state.step = { kind: 'onboarding', screen: 'intro' };
    }
  }

  function goToDay(index) {
    clearScreenUi();
    state.ui.notesPick = {};
    state.ui.notesTab = 'people';
    state.step = { kind: 'day', day: index, phase: content().days[index].phases[0], screen: 'goal' };
  }

  function enterStage() {
    var c = content(), day = currentDay(), dr = currentDayRun(), ph = state.step.phase;
    clearScreenUi();
    if ((ph === 'assign' || ph === 'support') && !Object.keys(dr.assignment).length) {
      c.people.forEach(function (p) { dr.assignment[p.id] = M.startStation(day, p.id); });
    }
    if (ph === 'reflect' && rules().reflect_default !== null && rules().reflect_default !== undefined) {
      c.people.forEach(function (p) { if (!dr.reflect[p.id]) dr.reflect[p.id] = rules().reflect_default; });
    }
    state.step.screen = 'stage';
  }

  function nextPhase() {
    var s = state.step, day = currentDay();
    clearScreenUi();
    var next = day.phases.indexOf(s.phase) + 1;
    if (next < day.phases.length) {
      s.phase = day.phases[next];
      s.screen = 'intro';
    } else if (s.day + 1 < content().days.length) {
      goToDay(s.day + 1);
    } else {
      state.timer.running = false;
      state.ui.dialog = { type: 'finish' };
    }
  }

  /* The button on a card screen. */
  function cardNext() {
    var s = state.step;
    if (s.kind === 'tutorial') {
      if (s.index + 1 < TUTORIAL.length) s.index++;
      else { startTimer(); state.step = { kind: 'onboarding', screen: 'intro' }; }
      return;
    }
    if (s.kind === 'onboarding') {
      if (s.screen === 'intro') s.screen = 'rank';
      else if (s.screen === 'rank') {
        if (!state.run.onboarding.order.every(function (x) { return !!x; })) return;
        markLate(null, 'onboarding');
        state.ui.selected = null;
        state.ui.panel = null;
        s.screen = 'brief';
      } else goToDay(0);
      return;
    }
    if (s.screen === 'goal') { s.screen = 'intro'; return; }
    if (s.screen === 'intro') { enterStage(); return; }
    if (s.screen === 'done') nextPhase();
  }

  /* The button at the bottom-right of a stage screen. */
  function stageDone() {
    var ph = state.step.phase, day = currentDay(), dr = currentDayRun();
    if (ph === 'explore') { if (exploreCanContinue()) nextPhase(); return; }
    if (ph === 'support') { if (supportAllDone()) nextPhase(); return; }
    if (ph === 'reflect') {
      if (!reflectComplete()) return;
      markLate(dr, 'reflect');
      nextPhase();
      return;
    }
    /* Assign */
    if (rules().ask_reason_for_unmoved && !state.ui.unmovedAsked) {
      var queue = content().people.filter(function (p) { return !dr.reasons[p.id]; }).map(function (p) { return p.id; });
      if (queue.length) {
        state.ui.unmovedAsked = true;
        openUnmovedReason(queue);
        return;
      }
    }
    finishAssign();
  }
  function finishAssign() {
    state.ui.unmovedAsked = false;
    markLate(currentDayRun(), 'assign');
    clearScreenUi();
    state.step.screen = 'done';
  }
  function openUnmovedReason(queue) {
    var day = currentDay(), dr = currentDayRun();
    var pid = queue.shift();
    var st = M.currentStation(day, dr, pid);
    if (!st) { if (queue.length) openUnmovedReason(queue); else { state.ui.modal = null; finishAssign(); } return; }
    state.ui.modal = { type: 'reason', person: pid, from: st, to: st, unmoved: true, queue: queue };
  }
  function afterReason(m) {
    if (m.unmoved) {
      if (m.queue.length) openUnmovedReason(m.queue);
      else { state.ui.modal = null; finishAssign(); }
    } else {
      state.ui.modal = null;
    }
  }

  /* ---- Onboarding slots ---- */
  function placeRank(qid, slot) {
    var order = state.run.onboarding.order;
    state.ui.selected = null;
    if (slot < 0 || slot >= order.length) return;
    var from = order.indexOf(qid), occupant = order[slot];
    if (from === slot) return;
    order[slot] = qid;
    if (from >= 0) order[from] = occupant;   /* two placed cards swap */
    /* a card taken from the pool sends the slot's old card back to the pool */
  }
  function unplaceRank(qid) {
    var order = state.run.onboarding.order, i = order.indexOf(qid);
    state.ui.selected = null;
    if (i >= 0) order[i] = null;
  }
  function swapSlots(a, b) {
    var order = state.run.onboarding.order;
    if (b < 0 || b >= order.length) return;
    var t = order[a]; order[a] = order[b]; order[b] = t;
  }

  /* ---- Assign: a drop on a Workstation ----
     Up to station_capacity people; a drop on a full Workstation is refused
     with a short hint (no swap, no bump). Every move asks for a reason;
     Cancel puts the person back and records nothing. */
  function placePerson(personId, stationId) {
    var c = content(), day = currentDay(), dr = currentDayRun();
    var from = M.currentStation(day, dr, personId);
    state.ui.selected = null;
    if (!stationById(stationId) || from === stationId) { render(); return; }
    var others = M.peopleAt(c, day, dr, stationId).filter(function (p) { return p.id !== personId; });
    if (others.length >= rules().station_capacity) { showHint(L('station_full')); return; }
    dr.assignment[personId] = stationId;
    state.ui.modal = { type: 'reason', person: personId, from: from, to: stationId };
    render();
  }

  var hintTimer = null;
  function showHint(text) {
    state.ui.hint = text;
    render();
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      if (!state || !state.ui.hint) return;
      state.ui.hint = '';
      if (drag) renderAfterDrag = true; else render();
    }, 2600);
  }

  function restartRun() {
    var c = state.content, loggedIn = state.loggedIn;
    state = freshRun(c);
    state.loggedIn = loggedIn;
    state.phase = 'start';
    render();
  }
  /* ====================================================================== *
   * CLICKS
   * ====================================================================== */
  var suppressClick = false;
  document.addEventListener('click', function (e) {
    if (suppressClick) { suppressClick = false; e.preventDefault(); return; }
    var el = e.target.closest('[data-act]');
    if (!el || !state || el.disabled) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    var day = currentDay(), dr = currentDayRun(), m = state.ui.modal;
    var sel = state.ui.selected, order = state.run.onboarding.order;

    switch (act) {
      case 'start': beginRun(); break;
      case 'card-next': cardNext(); break;
      case 'stage-done': stageDone(); break;
      case 'restart': state.ui.dialog = { type: 'restart' }; break;
      case 'restart-cancel': state.ui.dialog = null; break;
      case 'restart-confirm': state.ui.dialog = null; restartRun(); return;
      case 'fullscreen': toggleFullscreen(); return;
      case 'warning-close': state.ui.warningOpen = null; break;
      case 'see-results':
        state.ui.dialog = null;
        state.result = M.markRun(content(), state.run);
        state.phase = 'results';
        window.scrollTo(0, 0);
        break;

      /* Onboarding slots */
      case 'rank-pick': {
        var at = order.indexOf(id);
        if (sel && sel !== id && at >= 0) { placeRank(sel, at); break; }
        state.ui.selected = sel === id ? null : id;
        break;
      }
      case 'rank-slot': if (sel) placeRank(sel, parseInt(id, 10)); else return; break;
      case 'rank-pool': if (sel && order.indexOf(sel) >= 0) unplaceRank(sel); else return; break;
      case 'rank-up': swapSlots(parseInt(id, 10), parseInt(id, 10) - 1); break;
      case 'rank-down': swapSlots(parseInt(id, 10), parseInt(id, 10) + 1); break;

      /* Notes and Help */
      case 'panel': state.ui.panel = state.ui.panel === id ? null : id; break;
      case 'panel-close': state.ui.panel = null; break;
      case 'notes-tab': state.ui.notesTab = id; break;
      case 'notes-pick': state.ui.notesPick[state.ui.notesTab] = id; break;

      /* Explore */
      case 'ask': {
        var target = el.getAttribute('data-target');
        if (!onStage() || state.step.phase !== 'explore' || !canAsk(target, id)) return;
        state.ui.panel = null;
        state.ui.modal = { type: 'ask', target: target, id: id, answered: null };
        break;
      }
      case 'ask-q':
        if (m && m.type === 'ask' && !m.answered && pointsLeft() > 0 && !M.hasAsked(dr, m.target, m.id, [id])) {
          dr.asked.push({ target: m.target, id: m.id, q: id });
          markLate(dr, 'explore-' + (dr.asked.length - 1));
          m.answered = id;
        }
        break;
      case 'card-close': state.ui.modal = null; break;

      /* Assign */
      case 'select-person':
        if (!onStage() || state.step.phase !== 'assign') return;
        if (sel && sel !== id) { placePerson(sel, M.currentStation(day, dr, id)); return; }
        state.ui.selected = sel === id ? null : id;
        break;
      case 'place-station':
        if (onStage() && state.step.phase === 'assign' && sel) { placePerson(sel, id); return; }
        return;
      case 'reason':
        if (m && m.type === 'reason') {
          dr.reasons[m.person] = id;
          dr.reasonTo[m.person] = m.to;
          afterReason(m);
        }
        break;
      case 'reason-cancel':
        if (m && m.type === 'reason') {
          if (!m.unmoved) dr.assignment[m.person] = m.from;
          afterReason(m);
        }
        break;

      /* Support */
      case 'support-open': {
        var item = pendingFor(id);
        if (!item) return;
        state.ui.panel = null;
        state.ui.modal = { type: 'request', item: item.id };
        break;
      }
      case 'request-answer':
        if (m && m.type === 'request') state.ui.modal = { type: 'question', item: m.item, chosen: null };
        break;
      case 'support-choose':
        if (m && m.type === 'question' && !m.chosen && !dr.support[m.item]) {
          dr.support[m.item] = id;
          markLate(dr, 'support-' + m.item);
          if (rules().show_support_outcomes) m.chosen = id; else state.ui.modal = null;
        }
        break;

      /* Reflect */
      case 'reflect-pick': dr.reflect[el.getAttribute('data-person')] = id; break;

      /* Results */
      case 'toggle-block': state.ui.openBlocks[id] = !state.ui.openBlocks[id]; break;
      case 'print': window.print(); return;
      case 'csv': downloadCsv(); return;
      default: return;
    }
    render();
  });
  /* Keyboard: Enter or Space on a map person or Workstation acts like a click. */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    if (el && el.getAttribute && el.getAttribute('role') === 'button' && el.hasAttribute('data-act')) { e.preventDefault(); el.click(); }
  });

  /* ====================================================================== *
   * DRAGGING — pointer events (mouse, pen and touch alike). A press that
   * does not move is left to the click handler, which is the
   * click-to-select-then-click-to-place fallback.
   * ====================================================================== */
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    if (!state || state.ui.modal || state.ui.dialog || e.button > 0) return;
    var el = e.target.closest('[data-drag]');
    if (!el || e.target.closest('button')) return;
    var kind = el.getAttribute('data-drag');
    if (kind === 'person' && !(onStage() && state.step.phase === 'assign')) return;
    drag = { kind: kind, id: el.getAttribute('data-id'), el: el, x: e.clientX, y: e.clientY, moved: false, ghost: null, over: null };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      drag.moved = true;
      var r = drag.el.getBoundingClientRect();
      drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
      drag.ghost = drag.el.cloneNode(true);
      drag.ghost.classList.add('drag-ghost');
      drag.ghost.style.width = r.width + 'px';
      document.body.appendChild(drag.ghost);
      drag.el.classList.add('is-dragging');
    }
    e.preventDefault();
    drag.ghost.style.left = (e.clientX - drag.dx) + 'px';
    drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
    var under = document.elementFromPoint(e.clientX, e.clientY);
    var target = under ? (drag.kind === 'person' ? under.closest('[data-station]') : (under.closest('[data-rank-slot]') || under.closest('[data-rank-pool]'))) : null;
    if (drag.over && drag.over !== target) drag.over.classList.remove('is-over');
    if (target) target.classList.add('is-over');
    drag.over = target;
  }, { passive: false });
  function endDrag(e, cancelled) {
    if (!drag) return;
    var d = drag; drag = null;
    if (!d.moved) { if (renderAfterDrag) { renderAfterDrag = false; render(); } return; }
    renderAfterDrag = false;
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 0);
    if (d.ghost) d.ghost.remove();
    if (d.over) d.over.classList.remove('is-over');
    if (cancelled || !d.over) { render(); return; }
    if (d.kind === 'person') placePerson(d.id, d.over.getAttribute('data-station'));
    else {
      if (d.over.hasAttribute('data-rank-slot')) placeRank(d.id, parseInt(d.over.getAttribute('data-rank-slot'), 10));
      else unplaceRank(d.id);
      render();
    }
  }
  document.addEventListener('pointerup', function (e) { endDrag(e, false); });
  document.addEventListener('pointercancel', function (e) { endDrag(e, true); });

  /* ====================================================================== *
   * RESULTS
   * ====================================================================== */
  var LOCK_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';

  function ordinal(n) {
    var tens = n % 100, ones = n % 10;
    if (tens >= 11 && tens <= 13) return 'th';
    return ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th';
  }
  function zoneTone(index, count) {
    if (index === 0) return 'grey';
    var fromTop = count - 1 - index;
    return fromTop === 0 ? 'green' : fromTop === 1 ? 'lightgreen' : 'amber';
  }

  /* THE "WHERE YOU STAND" CARD — copied from Sea Wolf / Redrock (identical on
     every product). Every figure is worked out in marking.js. */
  function standingHTML() {
    var r = state.result;
    var bench = content().benchmark;
    if (!bench || r.percentile === null || r.percentile === undefined) return '';
    var zones = bench.zones || [];
    var p = r.percentile;
    var tone = r.zone ? zoneTone(r.zone.index, zones.length) : 'grey';

    var cells = '', nums = '';
    for (var d = 1; d <= 10; d++) {
      var z = M.zoneOf((d - 1) * 10, zones);
      cells += '<span class="band-cell tone-' + (z ? zoneTone(z.index, zones.length) : 'grey') + '"></span>';
      nums += '<span>' + d + '</span>';
    }
    var cellIndex = Math.min(9, Math.floor(p / 10));
    var left = 'calc((100% - 36px) * ' + (p / 100) + ' + ' + (cellIndex * 4) + 'px)';

    var legend = '';
    for (var i = 0; i < zones.length; i++) {
      var range = i === 0 ? ''
                : (i === zones.length - 1 ? zones[i].from + '+'
                                          : zones[i].from + '–' + (zones[i + 1].from - 1)) + ' · ';
      legend += '<span class="legend-item"><i class="tone-' + zoneTone(i, zones.length) + '"></i>' +
                esc(range) + textToHtml(zones[i].label) + '</span>';
    }

    return '<section class="standing tone-' + tone + '" aria-label="Where you stand">' +
      '<div class="standing-main">' +
        '<div class="standing-left">' +
          '<div class="standing-figure">' +
            '<span class="standing-number">' + p + '</span>' +
            '<span class="standing-ordinal">' + ordinal(p) + '</span>' +
            '<span class="standing-word">percentile</span>' +
          '</div>' +
          '<div class="standing-pill">Decile ' + r.decile + ' · ' + r.topShare + '% scored better</div>' +
          '<p class="standing-sentence">Estimated: your weighted score of <b>' +
            showScore(r.weighted) + ' / 100</b> beats about <b>' + p + ' in 100</b> candidates ' +
            'who practised this simulation.</p>' +
        '</div>' +
        '<div class="standing-right">' +
          '<div class="band" role="img" aria-label="Decile band, you are at the ' + p + ordinal(p) +
            ' percentile">' +
            '<div class="band-marker" style="left:' + left + '">' +
              '<span class="marker-label">You · ' + p + ordinal(p) + '</span>' +
              '<span class="marker-arrow"></span>' +
              '<span class="marker-line"></span>' +
            '</div>' +
            '<div class="band-cells">' + cells + '</div>' +
            '<div class="band-nums">' + nums + '</div>' +
          '</div>' +
          '<div class="band-legend">' + legend + '</div>' +
        '</div>' +
      '</div>' +
      (bench.note ? '<p class="standing-note">' + textToHtml(bench.note) + '</p>' : '') +
    '</section>';
  }

  function markIcon(points, of) {
    if (of > 0 && points >= of) return '<span class="mark-icon ok">✓</span>';
    if (points > 0) return '<span class="mark-icon part">◐</span>';
    return '<span class="mark-icon bad">✗</span>';
  }
  function rowClass(points, of) { return of > 0 && points >= of ? 'is-right' : points > 0 ? 'is-partial' : 'is-wrong'; }
  function lateTag(late) { return late ? ' <span class="late-tag">' + esc(L('late')) + '</span>' : ''; }
  function pts(points, of) { return '<span class="row-points">' + showScore(points) + ' / ' + showScore(of) + '</span>'; }

  function resultsHTML() {
    var c = content(), r = state.result, demo = c.results_mode === 'demo';
    var totals = r.phaseTotals, tiles = '';
    M.PHASES.forEach(function (ph) {
      var t = totals[ph];
      if (!t || !(t.of > 0)) return;
      tiles += '<div class="tile' + (t.score >= t.of ? ' is-best' : '') + '"><div class="tile-name">' + esc(L('tile_' + ph)) + '</div>' +
        '<div class="tile-score">' + showScore(t.score) + '</div><div class="tile-best">' + esc(L('out_of', { n: showScore(t.of) })) + '</div></div>';
    });
    var summary = '<div class="summary-line">' + esc(L('weighted_line', { n: showScore(r.weighted) })) +
      '<span class="sep">·</span>' +
      (state.timer.left > 0 ? esc(L('time_left_line', { n: Math.floor(state.timer.left / 60) })) : esc(L('time_up_line'))) + '</div>';

    var blocks = '';
    if (demo) {
      blocks = '<div class="demo-note"><span class="lock">' + LOCK_ICON + '</span>' + esc(L('demo_note')) + '</div>';
      blocks += lockedBlock(L('onboarding'), r.onboarding);
      c.days.forEach(function (d, i) { blocks += lockedBlock(d.name, dayTotal(r.days[i])); });
    } else {
      blocks += block('onboarding', L('onboarding'), r.onboarding, onboardingRows(r.onboarding));
      c.days.forEach(function (d, i) { blocks += block(d.id, d.name, dayTotal(r.days[i]), dayRows(d, i, r.days[i])); });
    }

    return '<div class="results' + (demo ? ' is-demo' : '') + '"><div class="results-inner">' +
      '<div class="results-top"><h1>' + esc(L('results_title')) + '</h1><div class="results-actions">' +
        (demo ? '' : '<button class="btn-quiet on-light" data-act="print">' + esc(L('print')) + '</button>' +
                     '<button class="btn-quiet on-light" data-act="csv">' + esc(L('csv')) + '</button>') +
        '<button class="btn" data-act="restart-confirm">' + esc(L('restart')) + '</button>' +
      '</div></div>' +
      standingHTML() +
      '<div class="tiles">' + tiles + '</div>' + summary + blocks +
    '</div></div>';
  }
  function dayTotal(dayResult) {
    var s = 0, o = 0;
    ['explore', 'assign', 'support', 'reflect'].forEach(function (k) { if (dayResult[k]) { s += dayResult[k].score; o += dayResult[k].of; } });
    return { score: Math.round(s * 100) / 100, of: Math.round(o * 100) / 100 };
  }
  function block(key, title, total, body) {
    var open = !!state.ui.openBlocks[key];
    return '<section class="r-block' + (open ? ' is-open' : '') + '">' +
      '<button class="r-block-head" data-act="toggle-block" data-id="' + esc(key) + '" aria-expanded="' + open + '">' +
        '<span class="r-caret" aria-hidden="true">▸</span><span class="r-title">' + esc(title) + '</span>' +
        '<span class="r-score">' + showScore(total.score) + ' / ' + showScore(total.of) + '</span></button>' +
      (open ? '<div class="r-block-body">' + body + '</div>' : '') + '</section>';
  }
  function lockedBlock(title, total) {
    return '<section class="r-block is-locked"><div class="r-block-head"><span class="lock" aria-hidden="true">' + LOCK_ICON + '</span>' +
      '<span class="r-title">' + esc(title) + '</span><span class="r-score">' + showScore(total.score) + ' / ' + showScore(total.of) + '</span></div></section>';
  }
  function row(points, of, main, detail, why, late) {
    return '<div class="mark-row ' + rowClass(points, of) + '">' + markIcon(points, of) +
      '<div class="row-text"><div class="row-main">' + main + lateTag(late) + '</div>' +
      (detail ? '<div class="row-detail">' + detail + '</div>' : '') +
      (why ? '<div class="mark-reason">' + why + '</div>' : '') + '</div>' + pts(points, of) + '</div>';
  }
  function sub(title, phaseResult) {
    return '<div class="r-sub"><span>' + esc(title) + '</span><span class="r-sub-score">' + showScore(phaseResult.score) + ' / ' + showScore(phaseResult.of) + '</span></div>';
  }

  function onboardingRows(res) {
    var html = '';
    res.items.slice().sort(function (a, b) { return a.recommended - b.recommended; }).forEach(function (it) {
      html += row(it.points, it.of, textToHtml(it.question.text),
        esc(L('your_answer')) + ': <b>' + (it.yourPosition || '—') + '</b> · ' + esc(L('our_view')) + ': <b>' + it.recommended + '</b>',
        textToHtml(it.question.why), it.late);
    });
    return html;
  }
  function names(ids) {
    return ids.map(function (pid) { var p = personById(pid); return p ? p.name : pid; }).join(' / ');
  }
  function stationNames(ids) {
    return ids.map(function (sid) { var s = stationById(sid); return s ? s.short : sid; }).join(' / ');
  }
  function moodLabel(day, id) {
    if (!id) return L('not_answered');
    if (id === IDK) return L('idk');
    var o = M.byId(day.reflect.options, id);
    return o ? o.label : id;
  }
  function cueText(it) {
    var n = { name: it.person.name };
    if (!it.cues.length) return L('cue_none', n);
    return it.cues.map(function (cue) { return L(cue === 'asked' ? 'cue_asked' : 'cue_support', n); }).join(' ');
  }

  function dayRows(day, di, dres) {
    var c = content(), html = '';
    if (dres.explore) {
      html += sub(L('phase_explore'), dres.explore);
      if (!dres.explore.items.length) html += row(0, dres.explore.of, esc(L('nothing_asked')), '', '', false);
      dres.explore.items.forEach(function (it) {
        html += row(it.points, it.of, esc(it.who ? it.who.name : '') + ': “' + esc(it.question ? it.question.label : it.asked.q) + '”',
          (it.answer ? textToHtml(it.answer.text) : '') + ' <span class="muted">(' + esc(L(it.useful ? 'useful_yes' : 'useful_no')) + ')</span>',
          it.answer ? textToHtml(it.answer.why) : '', it.late);
      });
      if (dres.explore.unspent) html += '<div class="r-note">' + esc(L('unused_points', { n: dres.explore.unspent })) + '</div>';
    }
    if (dres.assign) {
      html += sub(L('phase_assign'), dres.assign);
      dres.assign.items.forEach(function (it) {
        var reasonText = it.reason
          ? esc(it.reason.label) + (it.honest ? '' : ' <span class="flag">(' + esc(L('reason_flag')) + ')</span>')
          : '<span class="muted">' + esc(L('reason_none')) + '</span>';
        /* No pairing line on a day that does not score pairs (score_pairs: false):
           the candidate could not have known the pairing, so nothing is said about it. */
        var pair = (it.pairsScored !== false && it.pairWith.length)
          ? ' · ' + (it.paired ? esc(L('paired_yes', { name: names(it.partners) })) : '<span class="flag">' + esc(L('paired_no', { name: names(it.pairWith) })) + '</span>')
          : '';
        /* Where a day moves someone's best fit, the explanation depends on whether
           today's Explore revealed the change (see marking.js > overrideApplies). */
        var placementWhy = it.person.placement_why;
        if (it.hasOverride) {
          placementWhy = (it.overrideApplied
            ? (day.placement_why_override || {})[it.person.id]
            : (day.placement_why_unrevealed || {})[it.person.id]) || placementWhy;
        } else if ((day.placement_why_override || {})[it.person.id]) {
          placementWhy = day.placement_why_override[it.person.id];
        }
        html += row(it.points, it.of, esc(it.person.name) + ' → ' + esc(it.station ? it.station.name : L('not_placed')),
          esc(L('your_answer')) + ': ' + reasonText + ' · ' + esc(L('our_view')) + ': <b>' + esc(stationNames(it.goodStations)) + '</b>' + pair,
          textToHtml(placementWhy), it.late);
      });
    }
    if (dres.support) {
      html += sub(L('phase_support'), dres.support);
      dres.support.items.forEach(function (it) {
        var chosenText = it.chosen ? textToHtml(it.chosen.text) : esc(L('not_answered'));
        var detail = esc(L('your_answer')) + ': ' + chosenText +
          (it.chosen && it.chosen.id !== it.recommended.id
            ? '<br>' + esc(L('recommended_label')) + ': ' + textToHtml(it.recommended.text) : '');
        var why = (it.chosen ? textToHtml(it.chosen.why) : '') +
          (!it.chosen || it.chosen.id !== it.recommended.id ? ' ' + textToHtml(it.recommended.why) : '');
        html += row(it.points, it.of, '<span class="q-short">' + esc(it.person ? it.person.name : '') + ': ' + textToHtml(it.item.message) + '</span>', detail, why, it.late);
      });
    }
    if (dres.reflect) {
      html += sub(L('phase_reflect'), dres.reflect);
      dres.reflect.items.forEach(function (it) {
        html += row(it.points, it.of, esc(it.person.name),
          esc(L('your_answer')) + ': <b>' + esc(moodLabel(day, it.chosenId)) + '</b> · ' + esc(L('our_view')) + ': <b>' + esc(moodLabel(day, it.expectedId)) + '</b>',
          esc(cueText(it)) + (it.cues.length ? ' ' + textToHtml(it.why) : ''), it.late);
      });
    }
    return html;
  }

  /* ---- CSV: the same rows, as a file named from the title (never a version) */
  function csvFileName(title) {
    var slug = String(title || 'simulation').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (slug || 'simulation') + '-results.csv';
  }
  function downloadCsv() {
    var c = content(), r = state.result, yes = L('csv_yes');
    var rows = [[L('csv_section'), L('csv_item'), L('csv_your_answer'), L('csv_our_view'), L('csv_points'), L('csv_out_of'), L('csv_late')]];
    r.onboarding.items.forEach(function (it) {
      rows.push([L('onboarding'), it.question.text, it.yourPosition, it.recommended, it.points, it.of, it.late ? yes : '']);
    });
    c.days.forEach(function (day, di) {
      var d = r.days[di];
      if (d.explore) d.explore.items.forEach(function (it) {
        rows.push([day.name + ' ' + L('phase_explore'), (it.who ? it.who.name : '') + ': ' + (it.question ? it.question.label : it.asked.q),
          it.answer ? it.answer.text : '', L(it.useful ? 'useful_yes' : 'useful_no'), it.points, it.of, it.late ? yes : '']);
      });
      if (d.assign) d.assign.items.forEach(function (it) {
        rows.push([day.name + ' ' + L('phase_assign'), it.person.name,
          (it.station ? it.station.name : L('not_placed')) + (it.reason ? ' (' + it.reason.label + (it.honest ? '' : '; ' + L('reason_flag')) + ')' : ''),
          stationNames(it.goodStations) + ((it.pairsScored !== false && it.pairWith.length) ? ' + ' + names(it.pairWith) : ''), it.points, it.of, it.late ? yes : '']);
      });
      if (d.support) d.support.items.forEach(function (it) {
        rows.push([day.name + ' ' + L('phase_support'), (it.person ? it.person.name + ': ' : '') + it.item.message, it.chosen ? it.chosen.text : '', it.recommended.text, it.points, it.of, it.late ? yes : '']);
      });
      if (d.reflect) d.reflect.items.forEach(function (it) {
        rows.push([day.name + ' ' + L('phase_reflect'), it.person.name, moodLabel(day, it.chosenId), moodLabel(day, it.expectedId), it.points, it.of, it.late ? yes : '']);
      });
    });
    rows.push([L('csv_total'), L('csv_weighted'), r.weighted, '', '', 100, '']);
    rows.push([L('csv_total'), L('csv_percentile'), r.percentile, '', '', '', '']);
    var csv = rows.map(function (row) {
      return row.map(function (v) { var s = String(v === null || v === undefined ? '' : v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csvFileName(c.title);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  /* ====================================================================== *
   * START-UP
   * ====================================================================== */
  function showMessage(title, lines) {
    app.innerHTML = '<div class="centre-screen"><div class="panel wide"><h1>' + esc(title) + '</h1>' +
      '<ul class="error-list">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div></div>';
  }

  function boot() {
    checkSize();
    app.innerHTML = '<div class="centre-screen"><div class="panel"><h1>Loading…</h1></div></div>';
    var name = CONTENT.nameFromUrl(window.location.search, CONFIG.content);
    CONTENT.load(name).then(function (loaded) {
      if (!loaded.ok) { showMessage('This simulation’s content could not be used', loaded.errors); return; }
      if (loaded.warnings && loaded.warnings.length && window.console) console.warn('Content warnings:\n' + loaded.warnings.join('\n'));
      state = freshRun(loaded.content);
      state.phase = CONFIG.requireLogin ? 'login' : 'start';
      state.loggedIn = !CONFIG.requireLogin;
      document.title = loaded.content.title;
      render();
    });
  }

  /* Test hook: lets an automated check read the state. Not used by the page. */
  window.__sfl = { getState: function () { return state; } };

  boot();
})();
