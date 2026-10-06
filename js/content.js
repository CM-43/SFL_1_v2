/* ==========================================================================
   LOADING AND CHECKING THE CONTENT FILE

   The content lives in data/<name>/content.js as one object, SFL_CONTENT.
   This file loads it and checks it BEFORE the simulation starts. If anything
   is wrong, the simulation does not start: it shows a plain-English list of
   what to fix instead. A half-working simulation in front of a customer is
   worse than a clear error in front of us.
   ========================================================================== */
var CONTENT = (function () {

  var syntaxErrors = [];
  window.addEventListener('error', function (e) {
    if (e && e.filename && /\/data\/[^\/]+\/content\.js/.test(e.filename)) {
      syntaxErrors.push({ line: e.lineno, message: e.message });
    } else if (e && e.message === 'Script error.' && window.__sflLoadingContent) {
      /* Opened straight from the computer (file://): the browser hides the
         line number for security reasons. */
      syntaxErrors.push({ line: 0, message: '' });
    }
  });

  function nameFromUrl(search, fallback) {
    var m = /[?&]content=([a-z0-9-]+)/i.exec(search || '');
    return m ? m[1] : fallback;
  }

  function load(name) {
    return new Promise(function (resolve) {
      var path = 'data/' + name + '/content.js';
      syntaxErrors = [];
      try { delete window.SFL_CONTENT; } catch (e) { window.SFL_CONTENT = undefined; }
      window.__sflLoadingContent = true;
      var s = document.createElement('script');
      s.src = path;
      s.onload = function () {
        window.__sflLoadingContent = false;
        if (syntaxErrors.length) {
          var se = syntaxErrors[0];
          resolve({ ok: false, errors: [
            se.line
              ? 'There is a typing mistake in ' + path + ' near line ' + se.line + ' (' + se.message + '). ' +
                'Usually it is a missing comma at the end of the line before, a missing quote mark, or a missing bracket.'
              : 'There is a typing mistake in ' + path + '. The browser will not say which line when the page is opened ' +
                'straight from your computer. Open it from the GitHub Pages address to see the line number, or undo your last change.'
          ] });
          return;
        }
        if (!window.SFL_CONTENT || typeof window.SFL_CONTENT !== 'object') {
          resolve({ ok: false, errors: [path + ' loaded, but it does not start with "window.SFL_CONTENT = {". Check the first lines of the file.'] });
          return;
        }
        var result = validate(window.SFL_CONTENT);
        resolve({ ok: result.errors.length === 0, errors: result.errors, warnings: result.warnings, content: window.SFL_CONTENT });
      };
      s.onerror = function () {
        window.__sflLoadingContent = false;
        resolve({ ok: false, errors: ['The content file ' + path + ' could not be found. Check the "content" name in config.js and that the folder was uploaded.'] });
      };
      document.head.appendChild(s);
    });
  }

  /* ---- The checks ---------------------------------------------------------
     Every message names WHERE the problem is in words a non-programmer can
     find in the file: "Day 2 > support > d2-s3 > options". */

  /* Every button and fixed screen word the screens use. Each must exist in
     the content file's labels section. */
  var REQUIRED_LABELS = [
    'login_lede', 'start_button', 'continue', 'start', 'start_project', 'start_day',
    'start_explore', 'start_assign', 'start_support', 'start_reflect',
    'confirm_order', 'understood', 'confirm_assignments', 'complete_reflect',
    'explore_requests', 'never_mind', 'cancel', 'cancel_pill', 'continue_pill', 'ask_person_greeting', 'ask_no_points',
    'assign_title', 'assign_reason_sub', 'station_full', 'assign_complete_title', 'assign_complete_body',
    'support_request_title', 'support_request_body', 'answer_request', 'make_another_selection',
    'support_outcome_title', 'support_close',
    'notes', 'help', 'close', 'notes_researchers', 'notes_workstations', 'conversation_history', 'no_history',
    'i_asked', 'response', 'day_goal', 'stage', 'idk', 'help_instructions', 'help_definitions',
    'progress_tutorial', 'progress_onboarding', 'kicker_day', 'move_up', 'move_down', 'drag_hint',
    'time_warning_title', 'time_warning_body', 'time_warning_body_one', 'timer_min', 'timer_up', 'timer_paused',
    'onboarding', 'restart', 'restart_title', 'restart_body', 'fullscreen', 'exit_fullscreen',
    'phase_explore', 'phase_assign', 'phase_support', 'phase_reflect', 'phase_onboarding',
    'finish_title', 'finish_button', 'results_title', 'print', 'csv',
    'tile_onboarding', 'tile_explore', 'tile_assign', 'tile_support', 'tile_reflect',
    'out_of', 'late', 'weighted_line', 'time_left_line', 'time_up_line', 'your_answer', 'our_view',
    'not_answered', 'recommended_label', 'reason_flag', 'reason_none', 'unused_points', 'nothing_asked',
    'useful_yes', 'useful_no', 'paired_yes', 'paired_no', 'not_placed',
    'cue_asked', 'cue_support', 'cue_none', 'demo_note',
    'csv_section', 'csv_item', 'csv_your_answer', 'csv_our_view', 'csv_points', 'csv_out_of', 'csv_late',
    'csv_total', 'csv_weighted', 'csv_percentile', 'csv_yes'
  ];
  var TUTORIAL_KEYS = ['welcome', 'timer', 'notes', 'help', 'complete'];
  var KNOWN_PHASES = ['explore', 'assign', 'support', 'reflect'];
  var KNOWN_ICONS = ['leaf', 'drop', 'signal', 'paw', 'bird', 'sprout', 'wrench', 'chart', 'boat', 'document', 'chat'];
  var KNOWN_COLOURS = ['green', 'blue', 'amber', 'orange', 'purple'];
  var IDK = 'idk';   /* the id the screens give the "I don't know" column */

  function validate(c) {
    var errors = [], warnings = [];
    function err(msg) { errors.push(msg); }
    function warn(msg) { warnings.push(msg); }
    function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function isArr(v) { return Object.prototype.toString.call(v) === '[object Array]'; }
    function isObj(v) { return !!v && typeof v === 'object' && !isArr(v); }
    function need(obj, key, where, type) {
      var v = obj ? obj[key] : undefined;
      var ok = type === 'string' ? isStr(v) : type === 'number' ? isNum(v) : type === 'array' ? isArr(v) :
               type === 'object' ? isObj(v) : type === 'boolean' ? typeof v === 'boolean' : v !== undefined;
      if (!ok) err(where + ' > "' + key + '" is missing or is not ' +
        (type === 'string' ? 'some text in quote marks' : type === 'number' ? 'a number' : type === 'array' ? 'a list in [ ]' :
         type === 'boolean' ? 'true or false (no quote marks)' : 'a group in { }') + '.');
      return ok;
    }
    /* Ids must be different across the whole file, not only inside one list,
       because the results and the CSV name things by id. */
    var allIds = {};
    function uniqueIds(list, where, global) {
      var seen = {};
      (list || []).forEach(function (x, i) {
        if (!x || !isStr(x.id)) { err(where + ' > item ' + (i + 1) + ' has no "id".'); return; }
        if (x.id === IDK) err(where + ' > the id "' + IDK + '" is kept for the "I don\'t know" answer. Please use another id.');
        if (seen[x.id]) err(where + ' > the id "' + x.id + '" is used twice. Every id in a list must be different.');
        else if (global && allIds[x.id]) err(where + ' > the id "' + x.id + '" is also used in ' + allIds[x.id] + '. Ids of people, workstations, questions, reasons, days and Support requests must all be different.');
        seen[x.id] = true;
        if (global && !allIds[x.id]) allIds[x.id] = where;
      });
      return seen;
    }
    function byId(list, id) { return MARKING.byId(list, id); }
    function optionalImage(obj, where) {
      if (obj && obj.image !== undefined && obj.image !== null && !isStr(obj.image)) err(where + ' > "image" must be null or a file path in quote marks.');
    }

    /* ---- top of the file ---- */
    need(c, 'title', 'Top of the file', 'string');
    if (need(c, 'time_limit_minutes', 'Top of the file', 'number') && c.time_limit_minutes <= 0) err('Top of the file > "time_limit_minutes" must be more than 0.');
    if (c.results_mode !== 'full' && c.results_mode !== 'demo') err('Top of the file > "results_mode" must be "full" or "demo".');
    if (need(c, 'labels', 'Top of the file', 'object')) {
      REQUIRED_LABELS.forEach(function (k) { if (!isStr(c.labels[k])) err('labels > "' + k + '" is missing.'); });
    }

    /* ---- rules ---- */
    var r = isObj(c.rules) ? c.rules : {};
    var personQs = [], stationQs = [];
    if (need(c, 'rules', 'Top of the file', 'object')) {
      ['show_tutorial', 'ask_reason_for_unmoved', 'show_support_outcomes', 'notes_in_reflect',
       'notes_include_onboarding', 'can_skip_explore_points'].forEach(function (k) { need(r, k, 'rules', 'boolean'); });
      if (need(r, 'time_warning_minutes', 'rules', 'array')) {
        var seenMin = {};
        r.time_warning_minutes.forEach(function (m) {
          var w = 'rules > time_warning_minutes: ';
          if (!isNum(m) || m < 1 || Math.floor(m) !== m) { err(w + '"' + m + '" must be a whole number, 1 or more.'); return; }
          if (isNum(c.time_limit_minutes) && !(m < c.time_limit_minutes)) err(w + m + ' must be less than time_limit_minutes (' + c.time_limit_minutes + ').');
          if (seenMin[m]) err(w + m + ' is listed twice.');
          seenMin[m] = true;
        });
      }
      if (need(r, 'station_capacity', 'rules', 'number') && (r.station_capacity < 1 || Math.floor(r.station_capacity) !== r.station_capacity)) err('rules > "station_capacity" must be a whole number, 1 or more.');
      if (need(r, 'questions_per_target_per_day', 'rules', 'number') && (r.questions_per_target_per_day < 1 || Math.floor(r.questions_per_target_per_day) !== r.questions_per_target_per_day)) err('rules > "questions_per_target_per_day" must be a whole number, 1 or more.');
      if (r.reflect_default !== null && !isStr(r.reflect_default)) err('rules > "reflect_default" must be null (nothing pre-selected) or an answer id in quote marks.');
      if (need(r, 'person_questions', 'rules', 'array')) {
        personQs = r.person_questions;
        uniqueIds(personQs, 'rules > person_questions', true);
        var moodQs = 0;
        personQs.forEach(function (q) {
          if (!isStr(q.label)) err('rules > person_questions > ' + q.id + ' has no "label".');
          if (q.reveals_mood !== undefined && typeof q.reveals_mood !== 'boolean') err('rules > person_questions > ' + q.id + ' > "reveals_mood" must be true or false.');
          if (q.reveals_mood === true) moodQs++;
        });
        if (moodQs !== 1) err('rules > person_questions: exactly one question must have "reveals_mood": true (found ' + moodQs + ').');
      }
      if (need(r, 'station_questions', 'rules', 'array')) {
        stationQs = r.station_questions;
        uniqueIds(stationQs, 'rules > station_questions', true);
        stationQs.forEach(function (q) { if (!isStr(q.label)) err('rules > station_questions > ' + q.id + ' has no "label".'); });
      }
      if (need(r, 'reasons', 'rules', 'array')) {
        uniqueIds(r.reasons, 'rules > reasons', true);
        if (!r.reasons.length) err('rules > reasons must list at least one reason.');
        r.reasons.forEach(function (rs) {
          if (!isStr(rs.label)) err('rules > reasons > ' + rs.id + ' has no "label".');
          if (!isArr(rs.needs)) { err('rules > reasons > ' + rs.id + ' > "needs" must be a list in [ ] (it may be empty).'); return; }
          rs.needs.forEach(function (n) {
            if (n.target !== 'person' && n.target !== 'station') { err('rules > reasons > ' + rs.id + ' > needs: "target" must be "person" or "station".'); return; }
            var qlist = n.target === 'person' ? personQs : stationQs;
            if (!isArr(n.questions) || !n.questions.length) err('rules > reasons > ' + rs.id + ' > needs: "questions" must list at least one question id.');
            (n.questions || []).forEach(function (q) {
              if (!byId(qlist, q)) err('rules > reasons > ' + rs.id + ' > needs mentions the question "' + q + '", which is not in rules > ' + n.target + '_questions.');
            });
          });
        });
      }
    }

    /* ---- scoring and benchmark ---- */
    if (need(c, 'scoring', 'Top of the file', 'object')) {
      var s = c.scoring;
      if (need(s, 'onboarding', 'scoring', 'object')) need(s.onboarding, 'points_by_distance', 'scoring > onboarding', 'array');
      if (need(s, 'explore', 'scoring', 'object')) { need(s.explore, 'points_useful', 'scoring > explore', 'number'); need(s.explore, 'points_not_useful', 'scoring > explore', 'number'); }
      if (need(s, 'assign', 'scoring', 'object')) { ['placement_points', 'pair_points', 'reason_points'].forEach(function (k) { need(s.assign, k, 'scoring > assign', 'number'); }); }
      if (need(s, 'support', 'scoring', 'object') && need(s.support, 'tier_points', 'scoring > support', 'object')) {
        ['recommended', 'acceptable', 'weak'].forEach(function (t) { need(s.support.tier_points, t, 'scoring > support > tier_points', 'number'); });
      }
      if (need(s, 'reflect', 'scoring', 'object')) { need(s.reflect, 'points_correct', 'scoring > reflect', 'number'); need(s.reflect, 'points_idk_when_unknown', 'scoring > reflect', 'number'); }
    }
    if (c.benchmark) {
      var b = c.benchmark;
      need(b, 'phase_weights', 'benchmark', 'object');
      if (need(b, 'zones', 'benchmark', 'array') && b.zones.length && b.zones[0].from !== 0) err('benchmark > zones: the first zone must start "from": 0.');
      if (need(b, 'percentiles', 'benchmark', 'array')) {
        for (var pi = 1; pi < b.percentiles.length; pi++) {
          if (!(b.percentiles[pi][0] > b.percentiles[pi - 1][0])) err('benchmark > percentiles must be sorted by score, smallest first (problem at point ' + (pi + 1) + ').');
        }
      }
    }

    /* ---- start, tutorial, help ---- */
    if (need(c, 'start', 'Top of the file', 'object')) { need(c.start, 'heading', 'start', 'string'); need(c.start, 'body', 'start', 'string'); }
    if (r.show_tutorial === true && need(c, 'tutorial', 'Top of the file', 'object')) {
      TUTORIAL_KEYS.forEach(function (k) {
        if (need(c.tutorial, k, 'tutorial', 'object')) { need(c.tutorial[k], 'heading', 'tutorial > ' + k, 'string'); need(c.tutorial[k], 'body', 'tutorial > ' + k, 'string'); }
      });
      for (var tk in c.tutorial) if (TUTORIAL_KEYS.indexOf(tk) < 0) err('tutorial > "' + tk + '" is not a tutorial screen. The five screens are ' + TUTORIAL_KEYS.join(', ') + '.');
    }
    if (need(c, 'help', 'Top of the file', 'object') && need(c.help, 'definitions', 'help', 'array')) {
      c.help.definitions.forEach(function (d, i) {
        if (!isStr(d.term) || !isStr(d.meaning)) err('help > definitions > item ' + (i + 1) + ' needs both a "term" and a "meaning".');
      });
    }
    if (r.notes_include_onboarding === true && c.labels && !isStr(c.labels.notes_project)) err('labels > "notes_project" is missing (needed because rules > notes_include_onboarding is true).');

    /* ---- onboarding ---- */
    if (need(c, 'onboarding', 'Top of the file', 'object')) {
      var ob = c.onboarding;
      ['intro_heading', 'intro', 'rank_heading', 'rank_instruction', 'brief_heading'].forEach(function (k) { need(ob, k, 'onboarding', 'string'); });
      if (need(ob, 'questions', 'onboarding', 'array')) {
        uniqueIds(ob.questions, 'onboarding > questions', true);
        var positions = {};
        ob.questions.forEach(function (q) {
          var w = 'onboarding > questions > ' + q.id;
          need(q, 'text', w, 'string'); need(q, 'answer', w, 'string'); need(q, 'why', w, 'string');
          if (!(q.recommended_position >= 1 && q.recommended_position <= ob.questions.length)) err(w + ' > "recommended_position" must be a number from 1 to ' + ob.questions.length + '.');
          if (positions[q.recommended_position]) err(w + ' > "recommended_position" ' + q.recommended_position + ' is used by two questions.');
          positions[q.recommended_position] = true;
        });
        if (ob.questions.length < 2 || ob.questions.length > 6) err('onboarding > questions must have 2 to 6 questions (found ' + ob.questions.length + ').');
        for (var sl = 1; sl <= ob.questions.length; sl++) {
          if (c.labels && !isStr(c.labels['slot_' + sl])) err('labels > "slot_' + sl + '" is missing (one slot name per onboarding question).');
        }
      }
    }

    /* ---- people and workstations (the same every day) ---- */
    var people = isArr(c.people) ? c.people : [];
    var stations = isArr(c.stations) ? c.stations : [];
    if (need(c, 'people', 'Top of the file', 'array')) uniqueIds(people, 'people', true);
    if (need(c, 'stations', 'Top of the file', 'array')) uniqueIds(stations, 'stations', true);
    if (people.length < 2 || people.length > 5) err('people: there must be 2 to 5 people (found ' + people.length + ').');
    if (stations.length < 2 || stations.length > 5) err('stations: there must be 2 to 5 workstations (found ' + stations.length + ').');
    if (isNum(r.station_capacity) && people.length > stations.length * r.station_capacity) err('people: there are more people than the workstations can hold (' + stations.length + ' × station_capacity ' + r.station_capacity + ').');
    function checkStationList(list, where) {
      if (!isArr(list)) { err(where + ' must be a list in [ ].'); return; }
      list.forEach(function (sid) { if (!byId(stations, sid)) err(where + ' mentions "' + sid + '", which is not a workstation.'); });
    }
    people.forEach(function (p) {
      var w = 'people > ' + p.id;
      need(p, 'name', w, 'string'); need(p, 'role', w, 'string'); need(p, 'description', w, 'string'); need(p, 'placement_why', w, 'string');
      optionalImage(p, w);
      if (need(p, 'good_stations', w, 'array')) {
        if (!p.good_stations.length) err(w + ' > good_stations must list at least one workstation.');
        checkStationList(p.good_stations, w + ' > good_stations');
      }
      if (p.pair_with !== undefined) {
        if (!isArr(p.pair_with)) err(w + ' > "pair_with" must be a list in [ ] (it may be empty).');
        else p.pair_with.forEach(function (pid) {
          if (!byId(people, pid)) err(w + ' > pair_with mentions "' + pid + '", which is not a person.');
          if (pid === p.id) err(w + ' > pair_with cannot name the person themselves.');
        });
      }
    });
    stations.forEach(function (st) {
      var w = 'stations > ' + st.id;
      need(st, 'name', w, 'string'); need(st, 'short', w, 'string'); need(st, 'description', w, 'string');
      if (KNOWN_ICONS.indexOf(st.icon) < 0) err(w + ' > "icon" must be one of: ' + KNOWN_ICONS.join(', ') + '.');
      if (KNOWN_COLOURS.indexOf(st.colour) < 0) err(w + ' > "colour" must be one of: ' + KNOWN_COLOURS.join(', ') + '.');
      optionalImage(st, w);
    });
    if (need(c, 'map', 'Top of the file', 'object')) optionalImage(c.map, 'map');

    /* ---- days ---- */
    var cueless = {};   /* dayIndex -> { personId: true } for people nobody could learn about */
    if (need(c, 'days', 'Top of the file', 'array')) {
      if (!c.days.length) err('days: there must be at least one day.');
      uniqueIds(c.days, 'days', true);
      c.days.forEach(function (day, di) {
        var W = 'Day ' + (di + 1) + ' (' + (day.id || '?') + ')';
        ['name', 'goal_heading', 'goal'].forEach(function (k) { need(day, k, W, 'string'); });
        var phases = [];
        if (need(day, 'phases', W, 'array')) {
          var last = -1;
          if (!day.phases.length) err(W + ' > phases must list at least one stage.');
          day.phases.forEach(function (ph) {
            var idx = KNOWN_PHASES.indexOf(ph);
            if (idx < 0) err(W + ' > phases: "' + ph + '" is not a stage. Use explore, assign, support, reflect.');
            else if (idx <= last) err(W + ' > phases must keep the order explore, assign, support, reflect (you may leave some out).');
            last = Math.max(last, idx);
          });
          phases = day.phases;
        }
        var has = function (p) { return phases.indexOf(p) >= 0; };
        /* score_pairs: false = the pair bonus is not scored on this day (nobody can
           know the pairing yet). Missing means true. */
        if (day.score_pairs !== undefined && typeof day.score_pairs !== 'boolean') {
          err(W + ' > "score_pairs" must be true or false (leave it out for true).');
        }
        if (need(day, 'intros', W, 'object') && need(day, 'instructions', W, 'object')) {
          phases.forEach(function (ph) {
            if (!isStr(day.intros[ph])) err(W + ' > intros > "' + ph + '" is missing.');
            if (!isStr(day.instructions[ph])) err(W + ' > instructions > "' + ph + '" is missing.');
          });
        }

        /* start_assignment: every person exactly once, never over capacity */
        if (need(day, 'start_assignment', W, 'object')) {
          var seenP = {};
          for (var sid in day.start_assignment) {
            var list = day.start_assignment[sid];
            if (!byId(stations, sid)) { err(W + ' > start_assignment names "' + sid + '", which is not a workstation.'); continue; }
            if (!isArr(list)) { err(W + ' > start_assignment > ' + sid + ' must be a list in [ ] (it may be empty).'); continue; }
            if (isNum(r.station_capacity) && list.length > r.station_capacity) err(W + ' > start_assignment puts ' + list.length + ' people on "' + sid + '", but station_capacity is ' + r.station_capacity + '.');
            list.forEach(function (pid) {
              if (!byId(people, pid)) err(W + ' > start_assignment > ' + sid + ' mentions "' + pid + '", which is not a person.');
              if (seenP[pid]) err(W + ' > start_assignment puts "' + pid + '" on two workstations.');
              seenP[pid] = true;
            });
          }
          people.forEach(function (p) { if (!seenP[p.id]) err(W + ' > start_assignment has no workstation for "' + p.id + '".'); });
        }
        if (day.placement_why_override !== undefined) {
          if (!isObj(day.placement_why_override)) err(W + ' > "placement_why_override" must be a group in { }.');
          else for (var wp in day.placement_why_override) {
            if (!byId(people, wp)) err(W + ' > placement_why_override names "' + wp + '", which is not a person.');
            if (!isStr(day.placement_why_override[wp])) err(W + ' > placement_why_override > ' + wp + ' must be some text in quote marks.');
          }
        }
        if (day.good_stations_override !== undefined) {
          if (!isObj(day.good_stations_override)) err(W + ' > "good_stations_override" must be a group in { }.');
          else for (var op in day.good_stations_override) {
            if (!byId(people, op)) err(W + ' > good_stations_override names "' + op + '", which is not a person.');
            checkStationList(day.good_stations_override[op], W + ' > good_stations_override > ' + op);
            if (isArr(day.good_stations_override[op]) && !day.good_stations_override[op].length) err(W + ' > good_stations_override > ' + op + ' must list at least one workstation.');
            if (!(day.placement_why_override && isStr(day.placement_why_override[op]))) warn(W + ' > good_stations_override > ' + op + ' has no placement_why_override, so the results will show the usual explanation for this person.');
          }
        }
        /* override_revealed_by: what must have been asked TODAY for the day's
           good_stations_override to count against the candidate. A person listed
           here needs BOTH explanations (revealed and not revealed), and whatever
           must be asked has to be askable today, or the change could never apply. */
        if (day.placement_why_unrevealed !== undefined) {
          if (!isObj(day.placement_why_unrevealed)) err(W + ' > "placement_why_unrevealed" must be a group in { }.');
          else for (var up in day.placement_why_unrevealed) {
            if (!byId(people, up)) err(W + ' > placement_why_unrevealed names "' + up + '", which is not a person.');
            if (!isStr(day.placement_why_unrevealed[up])) err(W + ' > placement_why_unrevealed > ' + up + ' must be some text in quote marks.');
          }
        }
        if (day.override_revealed_by !== undefined) {
          if (!isObj(day.override_revealed_by)) err(W + ' > "override_revealed_by" must be a group in { }.');
          else for (var rp in day.override_revealed_by) {
            var rw = W + ' > override_revealed_by > ' + rp;
            if (!byId(people, rp)) { err(W + ' > override_revealed_by names "' + rp + '", which is not a person.'); continue; }
            if (!(day.good_stations_override && day.good_stations_override[rp])) err(rw + ' has no good_stations_override, so there is no change for it to reveal.');
            if (!(day.placement_why_override && isStr(day.placement_why_override[rp]))) err(rw + ' needs a placement_why_override (the results text when the change WAS revealed).');
            if (!(day.placement_why_unrevealed && isStr(day.placement_why_unrevealed[rp]))) err(rw + ' needs a placement_why_unrevealed (the results text when the change was NOT revealed).');
            var rlist = day.override_revealed_by[rp];
            if (!isArr(rlist) || !rlist.length) { err(rw + ' must be a list in [ ] with at least one thing to ask.'); continue; }
            rlist.forEach(function (nd) {
              if (!isObj(nd)) { err(rw + ': every item must be a group in { } with "target", "id" and "questions".'); return; }
              if (nd.target !== 'person' && nd.target !== 'station') { err(rw + ': "target" must be "person" or "station".'); return; }
              var pool = nd.target === 'person' ? people : stations;
              var qlist2 = nd.target === 'person' ? personQs : stationQs;
              if (!byId(pool, nd.id)) { err(rw + ': "' + nd.id + '" is not a ' + (nd.target === 'person' ? 'person' : 'workstation') + '.'); return; }
              if (!isArr(nd.questions) || !nd.questions.length) { err(rw + ': "questions" must list at least one question id.'); return; }
              nd.questions.forEach(function (q) {
                if (!byId(qlist2, q)) err(rw + ' mentions the question "' + q + '", which is not in rules > ' + nd.target + '_questions.');
              });
              var availList = isObj(day.available) ? (nd.target === 'person' ? day.available.people : day.available.stations) : null;
              if (!has('explore') || !isArr(availList) || availList.indexOf(nd.id) < 0) {
                err(rw + ': "' + nd.id + '" cannot be asked on this day, so the change could never be revealed. Add it to ' + W + ' > available.');
              }
            });
          }
        }

        /* Explore */
        var askable = {};
        if (has('explore')) {
          if (!isNum(day.explore_points) || day.explore_points < 0) err(W + ' > "explore_points" must be a number, 0 or more.');
          var avail = isObj(day.available) ? day.available : null;
          if (!avail) err(W + ' > "available" is missing or is not a group in { }.');
          var ans = isObj(day.answers) ? day.answers : null;
          if (!ans) err(W + ' > "answers" is missing or is not a group in { }.');
          var usefulCount = 0, targets = 0;
          function checkAnswers(kind, ids, qlist, pool) {
            if (!isArr(ids)) { err(W + ' > available > "' + kind + '" must be a list in [ ] (it may be empty).'); return; }
            var group = ans && isObj(ans[kind]) ? ans[kind] : {};
            ids.forEach(function (id) {
              if (!byId(pool, id)) { err(W + ' > available > ' + kind + ' mentions "' + id + '", which does not exist.'); return; }
              targets++;
              if (kind === 'people') askable[id] = true;
              var a = group[id];
              if (!isObj(a)) { err(W + ' > answers > ' + kind + ' > "' + id + '" is missing (it is available today, so it needs an answer to every question).'); return; }
              qlist.forEach(function (q) {
                var one = a[q.id], w = W + ' > answers > ' + kind + ' > ' + id + ' > ' + q.id;
                if (!isObj(one) || !isStr(one.text)) { err(w + ' is missing its "text".'); return; }
                if (typeof one.useful !== 'boolean') err(w + ' > "useful" must be true or false.');
                if (one.useful) usefulCount++;
                if (q.reveals_mood === true && one.useful === false) warn(w + ': answers to the mood question should be "useful": true (they give a cue for Reflect).');
                if (!isStr(one.why)) err(w + ' has no "why" (shown in the results).');
              });
            });
            for (var extra in group) if (ids.indexOf(extra) < 0) err(W + ' > answers > ' + kind + ' > "' + extra + '" has answers but is not in available > ' + kind + '.');
          }
          if (avail && ans) {
            checkAnswers('people', avail.people, personQs, people);
            checkAnswers('stations', avail.stations, stationQs, stations);
          }
          if (isNum(day.explore_points) && usefulCount < day.explore_points) warn(W + ': fewer useful answers (' + usefulCount + ') than Explore points (' + day.explore_points + '), so nobody can score full marks in Explore.');
          if (targets < 2) warn(W + ': fewer than two people or workstations can be asked today.');
        }

        /* Support */
        var supportIds = {}, moodRequest = {};
        if (has('support')) {
          if (need(day, 'support', W, 'array')) {
            uniqueIds(day.support, W + ' > support', true);
            if (!day.support.length) err(W + ' > support must have at least one request.');
            day.support.forEach(function (it) {
              var w = W + ' > support > ' + it.id;
              supportIds[it.id] = 0;
              if (!byId(people, it.person)) err(w + ' > "person" "' + it.person + '" is not a person.');
              need(it, 'message', w, 'string');
              if (it.reveals_mood !== undefined && typeof it.reveals_mood !== 'boolean') err(w + ' > "reveals_mood" must be true or false.');
              if (it.reveals_mood === true) moodRequest[it.person] = true;
              if (!isArr(it.options)) { err(w + ' > "options" must be a list in [ ].'); return; }
              if (it.options.length < 2 || it.options.length > 4) err(w + ': has ' + it.options.length + ' options; there must be 2 to 4.');
              uniqueIds(it.options, w + ' > options', false);
              var rec = 0;
              it.options.forEach(function (o) {
                if (!isStr(o.text)) err(w + ' > options > ' + o.id + ' has no "text".');
                if (['recommended', 'acceptable', 'weak'].indexOf(o.tier) < 0) err(w + ' > options > ' + o.id + ' > "tier" must be "recommended", "acceptable" or "weak".');
                if (o.tier === 'recommended') rec++;
                if (!isStr(o.why)) err(w + ' > options > ' + o.id + ' has no "why".');
                if (r.show_support_outcomes && !isStr(o.outcome)) err(w + ' > options > ' + o.id + ' has no "outcome" (needed because show_support_outcomes is true).');
              });
              if (rec !== 1) err(w + ': exactly one option must have "tier": "recommended" (found ' + rec + ').');
            });
          }
          if (need(day, 'support_groups', W, 'array')) {
            day.support_groups.forEach(function (g, gi) {
              if (!isArr(g) || !g.length) { err(W + ' > support_groups > group ' + (gi + 1) + ' must be a list with at least one request id.'); return; }
              g.forEach(function (sid) {
                if (!(sid in supportIds)) err(W + ' > support_groups > group ' + (gi + 1) + ' mentions "' + sid + '", which is not a Support request on this day.');
                else supportIds[sid]++;
              });
            });
            for (var rq in supportIds) {
              if (supportIds[rq] === 0) err(W + ' > support_groups does not include the request "' + rq + '". Every request must be in exactly one group.');
              if (supportIds[rq] > 1) err(W + ' > support_groups includes the request "' + rq + '" more than once.');
            }
          }
        }

        /* Reflect */
        if (has('reflect')) {
          if (need(day, 'reflect', W, 'object')) {
            var rf = day.reflect, w = W + ' > reflect';
            need(rf, 'heading', w, 'string'); need(rf, 'prompt', w, 'string');
            if (need(rf, 'options', w, 'array')) {
              if (rf.options.length !== 3) err(w + ' > options must have exactly three mood words (found ' + rf.options.length + ').');
              uniqueIds(rf.options, w + ' > options', false);
              rf.options.forEach(function (o) { if (!isStr(o.label)) err(w + ' > options > ' + o.id + ' has no "label".'); });
              if (r.reflect_default !== null && r.reflect_default !== undefined && r.reflect_default !== IDK && !byId(rf.options, r.reflect_default)) {
                err('rules > "reflect_default" is "' + r.reflect_default + '", which is not one of ' + W + '\'s mood ids (or "' + IDK + '").');
              }
            }
            if (need(rf, 'moods', w, 'object')) {
              people.forEach(function (p) {
                if (!(p.id in rf.moods)) err(w + ' > moods has no mood for "' + p.id + '".');
                else if (isArr(rf.options) && !byId(rf.options, rf.moods[p.id])) err(w + ' > moods > ' + p.id + ': "' + rf.moods[p.id] + '" is not one of today\'s mood ids.');
              });
              for (var mp in rf.moods) if (!byId(people, mp)) err(w + ' > moods names "' + mp + '", which is not a person.');
            }
            if (need(rf, 'why', w, 'object')) {
              people.forEach(function (p) { if (!isStr(rf.why[p.id])) err(w + ' > why has no explanation for "' + p.id + '".'); });
            }
          }
          var noCue = [];
          cueless[di] = {};
          people.forEach(function (p) {
            if (!askable[p.id] && !moodRequest[p.id]) { noCue.push(p.id); cueless[di][p.id] = true; }
          });
          if (!noCue.length) warn(W + ': every person has a possible mood cue today; the scenario guide asks for at least one person with none.');
        }
      });

      /* A person with no cue and no pair_with on two days in a row */
      people.forEach(function (p) {
        if (p.pair_with && p.pair_with.length) return;
        for (var d = 1; d < c.days.length; d++) {
          if (cueless[d - 1] && cueless[d] && cueless[d - 1][p.id] && cueless[d][p.id]) {
            warn('people > ' + p.id + ': no mood cue and no pair_with on ' + (c.days[d - 1].name || 'a day') + ' and ' + (c.days[d].name || 'the next day') + '.');
          }
        }
      });
    }
    return { errors: errors, warnings: warnings };
  }

  return { nameFromUrl: nameFromUrl, load: load, validate: validate, IDK: IDK };
})();
