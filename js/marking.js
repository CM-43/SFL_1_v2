/* ==========================================================================
   SUSTAINABLE FUTURES LAB — THE RULES (v2)

   Everything that decides a score lives here, and nothing here touches the
   page. The screens (js/app.js) call these functions and only draw the
   results. Every number used (points, weights, the percentile table) comes
   from the content file, so changing how the game is marked is a content
   edit, not a code edit.

   HOW A RUN IS RECORDED (built by js/app.js, read here)
     run.onboarding.order        ids of the onboarding questions, slot by slot
     run.days[i].asked           [{ target: 'person'|'station', id, q }] in the order asked
     run.days[i].assignment      { personId: stationId } at the end of Assign
                                 (empty until Assign starts: the start layout counts)
     run.days[i].reasons         { personId: reasonId }  last reason given for a move
     run.days[i].reasonTo        { personId: stationId } the Workstation that reason was for
     run.days[i].support         { requestId: optionId }
     run.days[i].reflect         { personId: moodId or 'idk' }
     run.days[i].late            { key: true } answers given after time ran out:
                                 'explore-<n>', 'assign', 'support-<id>', 'reflect'
     run.late                    { onboarding: true } the same, for Onboarding
   ========================================================================== */
var MARKING = (function () {

  var IDK = 'idk';   /* the id of the "I don't know" column in Reflect */

  function byId(list, id) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function dayRunOf(run, index) {
    return (run.days && run.days[index]) ||
      { asked: [], assignment: {}, reasons: {}, reasonTo: {}, support: {}, reflect: {}, late: {} };
  }
  function run_late(dayRun, key) { return !!(dayRun.late && dayRun.late[key]); }
  function points(n) { return Math.round(n * 100) / 100; }

  /* ---- Where people stand ------------------------------------------------
     The day's start layout is written Workstation -> people. */
  function startStation(day, personId) {
    var sa = day.start_assignment || {};
    for (var sid in sa) if ((sa[sid] || []).indexOf(personId) >= 0) return sid;
    return null;
  }
  function currentStation(day, dayRun, personId) {
    if (dayRun && dayRun.assignment && Object.prototype.hasOwnProperty.call(dayRun.assignment, personId)) return dayRun.assignment[personId] || null;
    return startStation(day, personId);
  }
  function peopleAt(content, day, dayRun, stationId) {
    return (content.people || []).filter(function (p) { return currentStation(day, dayRun, p.id) === stationId; });
  }
  /* A day may move where someone fits (good_stations_override). That change only
     counts if the candidate could have known about it. day.override_revealed_by
     lists, per person, what must have been asked TODAY for the change to apply
     (the same shape as a reason's `needs`, but each entry names its own id).
     No override_revealed_by for that person = the change always applies. */
  function overrideApplies(day, personId, dayRun) {
    var o = day.good_stations_override;
    if (!o || !o[personId]) return false;
    var rb = day.override_revealed_by;
    if (!rb || !rb[personId]) return true;
    var needs = rb[personId] || [];
    for (var i = 0; i < needs.length; i++) {
      var nd = needs[i];
      if (!hasAsked(dayRun, nd.target, nd.id, nd.questions)) return false;
    }
    return true;
  }
  /* Where this person fits on this day, for this run. */
  function goodStationsOf(content, day, personId, dayRun) {
    if (overrideApplies(day, personId, dayRun)) return day.good_stations_override[personId];
    var p = byId(content.people, personId);
    return p ? (p.good_stations || []) : [];
  }

  /* ---- Explore: what the candidate asked --------------------------------- */
  function hasAsked(dayRun, target, id, questionIds) {
    var asked = (dayRun && dayRun.asked) || [];
    for (var i = 0; i < asked.length; i++) {
      if (asked[i].target === target && asked[i].id === id &&
          (!questionIds || !questionIds.length || questionIds.indexOf(asked[i].q) >= 0)) return true;
    }
    return false;
  }
  function askedCount(dayRun, target, id) {
    var n = 0, asked = (dayRun && dayRun.asked) || [];
    for (var i = 0; i < asked.length; i++) if (asked[i].target === target && asked[i].id === id) n++;
    return n;
  }
  function answerFor(day, target, id, q) {
    var group = day.answers && day.answers[target === 'person' ? 'people' : 'stations'];
    return group && group[id] ? group[id][q] || null : null;
  }

  /* A reason is honest when the candidate asked, ON ANY DAY SO FAR, everything
     the reason relies on. The candidate's memory does not reset at midnight, so
     a question asked on Day 1 still backs a reason given on Day 3 (the Notes
     panel clears each day, but the person does not forget). markRun therefore
     passes a run holding every question asked on days 1..today.
     Each entry in `needs` must be met; inside one entry, any one of its
     questions is enough. A reason with no needs is always honest. For a
     "station" need, the Workstation is the one the person was moved to. */
  function reasonHonest(content, dayRun, personId, stationId, reasonId) {
    var reason = byId(content.rules.reasons, reasonId);
    if (!reason) return false;
    var needs = reason.needs || [];
    for (var i = 0; i < needs.length; i++) {
      var n = needs[i];
      var id = n.target === 'person' ? personId : stationId;
      if (!hasAsked(dayRun, n.target, id, n.questions)) return false;
    }
    return true;
  }

  /* ---- Reflect: did the candidate have a clue about this person? ---------
     'asked'   = asked the person the mood question that day
     'support' = answered one of the person's mood-revealing requests that day
     Both can be true. None = no clue. */
  function moodCues(content, day, dayRun, personId) {
    var cues = [];
    var moodQ = null;
    (content.rules.person_questions || []).forEach(function (q) { if (q.reveals_mood) moodQ = q.id; });
    if (moodQ && hasAsked(dayRun, 'person', personId, [moodQ])) cues.push('asked');
    var list = day.support || [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.person === personId && it.reveals_mood === true && dayRun.support && dayRun.support[it.id]) { cues.push('support'); break; }
    }
    return cues;
  }

  /* ======================================================================
     1. ONBOARDING — the ranking against our recommended order.
        scoring.onboarding.points_by_distance[d] = points for a question
        placed d places away from our position.
     ====================================================================== */
  function markOnboarding(content, run) {
    var ob = content.onboarding;
    var table = content.scoring.onboarding.points_by_distance;
    var order = (run.onboarding && run.onboarding.order) || [];
    var items = [], score = 0, of = 0;
    for (var i = 0; i < ob.questions.length; i++) {
      var q = ob.questions[i];
      var yourPos = order.indexOf(q.id) + 1;
      var dist = yourPos > 0 ? Math.abs(yourPos - q.recommended_position) : 99;
      var p = dist < table.length ? table[dist] : 0;
      var best = table[0];
      score += p; of += best;
      items.push({ question: q, yourPosition: yourPos, recommended: q.recommended_position,
                   points: p, of: best, late: !!(run.late && run.late.onboarding) });
    }
    return { score: points(score), of: points(of), items: items };
  }

  /* ======================================================================
     2. EXPLORE — was each question spent on something worth knowing?
        The content marks every answer `useful: true/false`. Score = the
        points of the questions asked, out of the day's Explore points.
        An Explore Request that is not used DOES cost points: the score is
        out of the day's request count, not out of the number of questions
        asked, so leaving a request unused scores the same as spending it on
        an answer that was not useful. The results page also names how many
        were left unused.
     ====================================================================== */
  function markExplore(content, day, dayRun) {
    var sc = content.scoring.explore;
    var budget = day.explore_points || 0;
    var items = [], score = 0;
    var asked = dayRun.asked || [];
    for (var i = 0; i < asked.length; i++) {
      var a = asked[i];
      var who = a.target === 'person' ? byId(content.people, a.id) : byId(content.stations, a.id);
      var qlist = a.target === 'person' ? content.rules.person_questions : content.rules.station_questions;
      var ans = answerFor(day, a.target, a.id, a.q);
      var useful = !!(ans && ans.useful);
      var p = useful ? sc.points_useful : sc.points_not_useful;
      score += p;
      items.push({ asked: a, who: who, question: byId(qlist, a.q), answer: ans, useful: useful,
                   points: p, of: sc.points_useful, late: run_late(dayRun, 'explore-' + i) });
    }
    var of = budget * sc.points_useful;
    return { score: points(Math.min(score, of)), of: points(of), items: items,
             unspent: Math.max(0, budget - asked.length) };
  }

  /* ======================================================================
     3. ASSIGN — right Workstation, the right partner, an honest reason.
        Per person:
          placement_points  on one of their good_stations (or the day's
                            good_stations_override, when it applies — see
                            overrideApplies)
          pair_points       shares a Workstation with someone in pair_with,
                            AND that Workstation is one of their good_stations
                            (only people who have pair_with can earn it).
                            A day with `score_pairs: false` does not score
                            pairs at all: pairMax is 0 for everyone, so that
                            day's Assign total is smaller. Missing = true.
          reason_points     an honest reason for their last move; a person
                            never moved earns it only when well placed.
                            Honest = asked on ANY day so far, so markAssign
                            takes `historyRun`: a run holding every question
                            asked on days 1..today.
     ====================================================================== */
  function markAssign(content, day, dayRun, historyRun) {
    var askedRun = historyRun || dayRun;
    var sc = content.scoring.assign;
    var items = [], score = 0, of = 0;
    var people = content.people || [];
    for (var i = 0; i < people.length; i++) {
      var person = people[i];
      var st = currentStation(day, dayRun, person.id);
      var goodList = goodStationsOf(content, day, person.id, dayRun);
      var good = !!st && goodList.indexOf(st) >= 0;
      var pairList = person.pair_with || [];
      var pairsScored = day.score_pairs !== false;
      var pairMax = (pairsScored && pairList.length) ? sc.pair_points : 0;
      var partners = [];
      if (st) pairList.forEach(function (pid) { if (currentStation(day, dayRun, pid) === st) partners.push(pid); });
      var paired = partners.length > 0;
      var reasonId = dayRun.reasons ? dayRun.reasons[person.id] : null;
      var reasonTo = dayRun.reasonTo && dayRun.reasonTo[person.id] ? dayRun.reasonTo[person.id] : st;
      var honest = reasonId ? reasonHonest(content, askedRun, person.id, reasonTo, reasonId) : null;
      var pPlace = good ? sc.placement_points : 0;
      var pPair = pairMax && paired && good ? sc.pair_points : 0;
      var pReason = reasonId ? (honest ? sc.reason_points : 0) : (good ? sc.reason_points : 0);
      var max = sc.placement_points + pairMax + sc.reason_points;
      score += pPlace + pPair + pReason;
      of += max;
      items.push({ person: person, station: byId(content.stations, st), goodStations: goodList,
                   good: good, pairWith: pairList, partners: partners, paired: paired,
                   pairsScored: pairsScored,
                   hasOverride: !!(day.good_stations_override && day.good_stations_override[person.id]),
                   overrideApplied: overrideApplies(day, person.id, dayRun),
                   reason: byId(content.rules.reasons, reasonId), honest: honest,
                   pointsPlace: pPlace, pointsPair: pPair, pointsReason: pReason,
                   points: points(pPlace + pPair + pReason), of: points(max),
                   late: run_late(dayRun, 'assign') });
    }
    return { score: points(score), of: points(of), items: items };
  }

  /* ======================================================================
     4. SUPPORT — only clearly weak options lose marks.
        Each option has a tier: recommended, acceptable or weak.
        scoring.support.tier_points gives the points for each tier.
     ====================================================================== */
  function markSupport(content, day, dayRun) {
    var tiers = content.scoring.support.tier_points;
    var items = [], score = 0, of = 0;
    var list = day.support || [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var chosenId = dayRun.support ? dayRun.support[item.id] : null;
      var chosen = byId(item.options, chosenId);
      var p = chosen ? (tiers[chosen.tier] || 0) : 0;
      var recommended = null;
      for (var j = 0; j < item.options.length; j++) if (item.options[j].tier === 'recommended') recommended = item.options[j];
      score += p; of += tiers.recommended;
      items.push({ item: item, person: byId(content.people, item.person), chosen: chosen, recommended: recommended,
                   points: p, of: tiers.recommended, late: run_late(dayRun, 'support-' + item.id) });
    }
    return { score: points(score), of: points(of), items: items };
  }

  /* ======================================================================
     5. REFLECT — one row per person: their true mood today, marked by what
        the candidate could have known.
          had a clue  -> the true mood earns points_correct, anything else 0
          no clue     -> "I don't know" earns points_idk_when_unknown, anything else 0
     ====================================================================== */
  function markReflect(content, day, dayRun) {
    var sc = content.scoring.reflect;
    var rf = day.reflect || {};
    var items = [], score = 0, of = 0;
    var people = content.people || [];
    for (var i = 0; i < people.length; i++) {
      var person = people[i];
      var truthId = rf.moods ? rf.moods[person.id] : null;
      var cues = moodCues(content, day, dayRun, person.id);
      var chosenId = dayRun.reflect ? dayRun.reflect[person.id] || null : null;
      var expected = cues.length ? truthId : IDK;
      var max = cues.length ? sc.points_correct : sc.points_idk_when_unknown;
      var p = chosenId && chosenId === expected ? max : 0;
      score += p; of += max;
      items.push({ person: person, cues: cues, truth: byId(rf.options, truthId),
                   chosenId: chosenId, chosen: chosenId === IDK ? { id: IDK } : byId(rf.options, chosenId),
                   expectedId: expected, points: p, of: max, why: rf.why ? rf.why[person.id] : '',
                   late: run_late(dayRun, 'reflect') });
    }
    return { score: points(score), of: points(of), items: items };
  }

  /* ======================================================================
     6. THE WHOLE RUN, AND WHERE THE CANDIDATE STANDS
     ====================================================================== */
  var PHASES = ['onboarding', 'explore', 'assign', 'support', 'reflect'];

  function markRun(content, run) {
    var out = { onboarding: markOnboarding(content, run), days: [] };
    var totals = { explore: [0, 0], assign: [0, 0], support: [0, 0], reflect: [0, 0] };
    /* Every question asked on days 1..today, in order. Assign reads this, not
       just today's questions, so a reason may rest on something learned on an
       earlier day (the Notes panel clears each day; the candidate does not). */
    var askedSoFar = [];
    for (var d = 0; d < content.days.length; d++) {
      var day = content.days[d];
      var dr = dayRunOf(run, d);
      askedSoFar = askedSoFar.concat(dr.asked || []);
      var historyRun = { asked: askedSoFar };
      var has = function (ph) { return (day.phases || []).indexOf(ph) >= 0; };
      var r = {
        explore: has('explore') ? markExplore(content, day, dr) : null,
        assign: has('assign') ? markAssign(content, day, dr, historyRun) : null,
        support: has('support') ? markSupport(content, day, dr) : null,
        reflect: has('reflect') ? markReflect(content, day, dr) : null
      };
      for (var k in totals) if (r[k]) { totals[k][0] += r[k].score; totals[k][1] += r[k].of; }
      out.days.push(r);
    }
    out.phaseTotals = {
      onboarding: { score: out.onboarding.score, of: out.onboarding.of },
      explore: { score: points(totals.explore[0]), of: points(totals.explore[1]) },
      assign: { score: points(totals.assign[0]), of: points(totals.assign[1]) },
      support: { score: points(totals.support[0]), of: points(totals.support[1]) },
      reflect: { score: points(totals.reflect[0]), of: points(totals.reflect[1]) }
    };

    var bench = content.benchmark;
    if (bench) {
      out.weighted = weightedScore(out.phaseTotals, bench.phase_weights);
      out.percentile = percentile(out.weighted, bench);
      out.decile = decileOf(out.percentile);
      out.topShare = 100 - out.percentile;
      out.zone = zoneOf(out.percentile, bench.zones);
    } else {
      out.weighted = out.percentile = out.decile = out.topShare = out.zone = null;
    }
    return out;
  }

  /* The weighted score out of 100, to one decimal place.
       weighted = 100 x sum(weight x score/of) / sum(weight)
     over the phases that exist in this content. Dividing by the weights
     actually used keeps the score out of 100 even if, say, a content file
     has no Reflect phase at all. */
  function weightedScore(totals, weights) {
    var sum = 0, wsum = 0;
    for (var i = 0; i < PHASES.length; i++) {
      var t = totals[PHASES[i]];
      var w = weights && typeof weights[PHASES[i]] === 'number' ? weights[PHASES[i]] : 0;
      if (!t || !(t.of > 0) || !w) continue;
      sum += w * (t.score / t.of);
      wsum += w;
    }
    if (!wsum) return 0;
    return Math.round((100 * sum / wsum) * 10 + 1e-9) / 10;
  }

  /* Copied from Redrock's marking.js so every product reads the shared
     percentile table the same way: straight line between points, rounded,
     kept between 1 and 99. */
  function percentile(weighted, benchmark) {
    var pts = (benchmark && benchmark.percentiles) || [];
    if (!pts.length || typeof weighted !== 'number' || !isFinite(weighted)) return null;
    var value;
    if (weighted <= pts[0][0]) {
      value = pts[0][1];
    } else if (weighted >= pts[pts.length - 1][0]) {
      value = pts[pts.length - 1][1];
    } else {
      value = pts[pts.length - 1][1];
      for (var i = 1; i < pts.length; i++) {
        if (weighted <= pts[i][0]) {
          var x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1];
          value = (x1 === x0) ? y1 : y0 + (y1 - y0) * (weighted - x0) / (x1 - x0);
          break;
        }
      }
    }
    var whole = Math.floor(value + 0.5 + 1e-9);
    return Math.max(1, Math.min(99, whole));
  }

  function decileOf(p) {
    if (typeof p !== 'number') return null;
    return Math.max(1, Math.min(10, Math.ceil(p / 10)));
  }

  function zoneOf(p, zones) {
    if (typeof p !== 'number' || !zones || !zones.length) return null;
    var found = null;
    for (var i = 0; i < zones.length; i++) {
      if (zones[i].from <= p) found = { index: i, from: zones[i].from, label: zones[i].label };
    }
    return found;
  }

  return {
    IDK: IDK,
    byId: byId,
    startStation: startStation,
    currentStation: currentStation,
    peopleAt: peopleAt,
    goodStationsOf: goodStationsOf,
    overrideApplies: overrideApplies,
    hasAsked: hasAsked,
    askedCount: askedCount,
    answerFor: answerFor,
    reasonHonest: reasonHonest,
    moodCues: moodCues,
    markRun: markRun,
    weightedScore: weightedScore,
    percentile: percentile,
    decileOf: decileOf,
    zoneOf: zoneOf,
    PHASES: PHASES
  };
})();
