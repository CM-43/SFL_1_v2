// Checks the marking rules against the worked example at the bottom of data/sfl2/content.js,
// plus a perfect run and an empty run. Run from the build folder: node tools/test-marking.js
const fs = require('fs');
global.window = {};
eval(fs.readFileSync('js/marking.js', 'utf8') + ';global.MARKING = MARKING;');
eval(fs.readFileSync('data/sfl2/content.js', 'utf8'));
const C = window.SFL_CONTENT;
let failed = 0;
function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + ' = ' + JSON.stringify(got) + (ok ? '' : ' (expected ' + JSON.stringify(want) + ')'));
}
function emptyDay() { return { asked: [], assignment: {}, reasons: {}, reasonTo: {}, support: {}, reflect: {}, late: {} }; }
function recommendedAll(day) { const s = {}; day.support.forEach(it => { s[it.id] = it.options.find(o => o.tier === 'recommended').id; }); return s; }
const ORDER = ['ob-work', 'ob-known', 'ob-support', 'ob-together'];
function runOf(days) { return { onboarding: { order: ORDER }, days: days, late: {} }; }
function assignItems(days, di) { return MARKING.markRun(C, runOf(days)).days[di].assign.items; }
function personItem(days, di, pid) { return assignItems(days, di).find(i => i.person.id === pid); }

/* ---- The worked example (Day 2) ---- */
const day = C.days[1];
const dr = emptyDay();
dr.asked = [{ target: 'person', id: 'tomasz', q: 'feeling' }, { target: 'person', id: 'kofi', q: 'feeling' }, { target: 'station', id: 'tide', q: 'work' }];
dr.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
dr.reasons = { kofi: 'needs', priya: 'coverage' };             // Ines and Tomasz are not moved
dr.reasonTo = { kofi: 'wildlife', priya: 'outreach' };
dr.support = recommendedAll(day);
dr.reflect = { tomasz: 'low', kofi: 'high', priya: 'high', ines: 'mid' };
const r = MARKING.markRun(C, runOf([emptyDay(), dr, emptyDay()])).days[1];
check('Worked example: Explore', [r.explore.score, r.explore.of], [3, 3]);
check('Worked example: Assign', [r.assign.score, r.assign.of], [6.5, 7]);
check('Worked example: Assign per person', r.assign.items.map(i => i.person.id + ' ' + i.points + '/' + i.of), ['ines 1.5/1.5', 'tomasz 2/2', 'priya 1.5/1.5', 'kofi 1.5/2']);
check('Worked example: Kofi reason not honest (the Wildlife Workstation was never asked on any day)', r.assign.items.find(i => i.person.id === 'kofi').honest, false);
{ const d2 = JSON.parse(JSON.stringify(dr)); d2.reasons.kofi = 'teammate';
  const r2 = MARKING.markRun(C, runOf([emptyDay(), d2, emptyDay()])).days[1];
  check('"Researcher assistance" is honest after the "feeling" question (2 Oct 2026)', r2.assign.items.find(i => i.person.id === 'kofi').honest, true);
  check('...and that run scores Assign 7 of 7', [r2.assign.score, r2.assign.of], [7, 7]); }
check('Worked example: Support', [r.support.score, r.support.of], [4, 4]);
check('Worked example: Reflect', [r.reflect.score, r.reflect.of], [2, 4]);
check('Worked example: Reflect cues', r.reflect.items.map(i => i.person.id + ':' + i.cues.join('+')), ['ines:', 'tomasz:asked+support', 'priya:support', 'kofi:asked']);

/* ---- A perfect run scores 100, with no knowledge the candidate could not have ----
   Each day is written out in full: only questions that are askable that day, only
   reasons the run itself can back, and Day 3 asks the Nursery so the change to
   Priya's best fit is revealed before Assign. */
const perfect = runOf([]);
// Day 1: 3 requests. Ines and Priya, the Nursery and Outreach can be asked.
const p1 = emptyDay();
p1.asked = [{ target: 'person', id: 'ines', q: 'feeling' },
            { target: 'person', id: 'priya', q: 'feeling' },
            { target: 'station', id: 'outreach', q: 'work' }];
p1.assignment = { ines: 'nursery', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
p1.reasons = { priya: 'preference', kofi: 'coverage' };   // Priya: asked how she felt. Kofi: coverage needs nothing
p1.reasonTo = { priya: 'outreach', kofi: 'wildlife' };
// Day 2: 3 requests. Tomasz and Kofi, the Tide and Wildlife can be asked.
const p2 = emptyDay();
p2.asked = [{ target: 'person', id: 'tomasz', q: 'feeling' },
            { target: 'person', id: 'kofi', q: 'feeling' },
            { target: 'station', id: 'wildlife', q: 'work' }];
p2.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
p2.reasons = { kofi: 'needs', priya: 'coverage' };        // Kofi: asked Wildlife what work is planned
p2.reasonTo = { kofi: 'wildlife', priya: 'outreach' };
// Day 3: 2 requests. Kofi and Ines, the Nursery and Wildlife can be asked.
const p3 = emptyDay();
p3.asked = [{ target: 'station', id: 'nursery', q: 'work' },   // reveals that Priya now fits the Nursery
            { target: 'person', id: 'kofi', q: 'feeling' }];
p3.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'nursery' };
p3.reasons = { ines: 'preference', kofi: 'needs', priya: 'needs' };
p3.reasonTo = { ines: 'tide', kofi: 'wildlife', priya: 'nursery' };
//   Ines "Researcher preference": backed by Day 1, when she was asked how she felt.
//   Kofi "Latest workstation needs": backed by Day 2, when Wildlife was asked.
//   Priya "Latest workstation needs": backed by today's Nursery question.
[p1, p2, p3].forEach((x, i) => {
  x.support = recommendedAll(C.days[i]);
  x.reflect = {};
  C.people.forEach(p => { x.reflect[p.id] = MARKING.moodCues(C, C.days[i], x, p.id).length ? C.days[i].reflect.moods[p.id] : 'idk'; });
  perfect.days.push(x);
});
const pr = MARKING.markRun(C, perfect);
check('Perfect run: per phase', MARKING.PHASES.map(k => k + ' ' + pr.phaseTotals[k].score + '/' + pr.phaseTotals[k].of),
  ['onboarding 4/4', 'explore 8/8', 'assign 20/20', 'support 13/13', 'reflect 12/12']);
check('Perfect run: weighted', pr.weighted, 100);
check('Perfect run: percentile', pr.percentile, 99);

/* ---- C1: a reason counts what was learned on ANY day so far ---- */
// Day 2, Priya -> Outreach with "Researcher preference". Priya can only be asked on Day 1.
function priyaPreferenceDay2(askedOnDay1) {
  const d1 = emptyDay();
  if (askedOnDay1) d1.asked = [{ target: 'person', id: 'priya', q: 'working' }];
  const d2 = emptyDay();
  d2.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'outreach', priya: 'outreach' };
  d2.reasons = { priya: 'preference' };
  d2.reasonTo = { priya: 'outreach' };
  return personItem([d1, d2, emptyDay()], 1, 'priya').honest;
}
check('C1: Day 2 "Researcher preference" for Priya is honest after Day 1 asked her', priyaPreferenceDay2(true), true);
check('C1: the same reason is not honest when Priya was never asked', priyaPreferenceDay2(false), false);

/* ---- C2: the pair bonus is not scored on Day 1 ---- */
const pairDay1 = (() => {
  const x = emptyDay(); x.assignment = { ines: 'nursery', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
  return assignItems([x, emptyDay(), emptyDay()], 0)
    .filter(i => i.person.id === 'tomasz' || i.person.id === 'kofi')
    .map(i => [i.person.id, i.paired, i.pointsPair, i.of]);
})();
check('C2: Day 1 pair bonus is 0 even when Tomasz and Kofi share Wildlife', pairDay1,
  [['tomasz', true, 0, 1.5], ['kofi', true, 0, 1.5]]);
check('C2: Day 1 Assign is out of 6, Days 2 and 3 out of 7',
  MARKING.markRun(C, runOf([emptyDay(), emptyDay(), emptyDay()])).days.map(d => d.assign.of), [6, 7, 7]);
// Day 2 still scores pairs, and only on a Workstation that suits them.
check('C2: Day 2 pair bonus paid when the pair shares a good Workstation', (() => {
  const x = emptyDay(); x.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
  return assignItems([emptyDay(), x, emptyDay()], 1).filter(i => i.person.id === 'tomasz' || i.person.id === 'kofi').map(i => i.pointsPair);
})(), [0.5, 0.5]);
check('C2: Day 2 pair bonus not paid when the pair shares a wrong Workstation', (() => {
  const x = emptyDay(); x.assignment = { ines: 'outreach', tomasz: 'nursery', kofi: 'nursery', priya: 'wildlife' };
  return assignItems([emptyDay(), x, emptyDay()], 1).filter(i => i.person.id === 'tomasz' || i.person.id === 'kofi').map(i => i.pointsPair);
})(), [0, 0]);

/* ---- C3: Day 3's change to Priya's best fit only counts if it was revealed ---- */
function priyaLeftAtOutreach(askNursery) {
  const x = emptyDay();
  if (askNursery) x.asked = [{ target: 'station', id: 'nursery', q: 'work' }];
  x.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
  const it = personItem([emptyDay(), emptyDay(), x], 2, 'priya');
  return [it.pointsPlace, it.overrideApplied, it.goodStations];
}
check('C3: Priya left at Outreach scores full placement when the Nursery was not asked', priyaLeftAtOutreach(false), [1, false, ['outreach']]);
check('C3: the same choice scores 0 when the Nursery was asked', priyaLeftAtOutreach(true), [0, true, ['nursery']]);
check('C3: asking the Nursery "what have we learned" also reveals it', (() => {
  const x = emptyDay(); x.asked = [{ target: 'station', id: 'nursery', q: 'learn' }];
  x.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'nursery' };
  const it = personItem([emptyDay(), emptyDay(), x], 2, 'priya');
  return [it.pointsPlace, it.overrideApplied];
})(), [1, true]);
check('C3: Priya at the Nursery with nothing asked keeps her usual fit, so it scores 0', (() => {
  const x = emptyDay(); x.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'nursery' };
  return personItem([emptyDay(), emptyDay(), x], 2, 'priya').pointsPlace;
})(), 0);
check('C3: both explanations exist for every person in override_revealed_by',
  Object.keys(C.days[2].override_revealed_by).every(pid =>
    typeof C.days[2].placement_why_override[pid] === 'string' &&
    typeof C.days[2].placement_why_unrevealed[pid] === 'string'), true);

/* ---- B1: exactly four answers are not worth asking ---- */
check('B1: the four useful:false answers', (() => {
  const zeros = [];
  C.days.forEach((d, i) => ['people', 'stations'].forEach(kind => {
    for (const id in d.answers[kind]) for (const q in d.answers[kind][id]) if (!d.answers[kind][id][q].useful) zeros.push('day' + (i + 1) + ' ' + id + '.' + q);
  }));
  return zeros.sort();
})(), ['day1 ines.working', 'day1 nursery.learn', 'day1 nursery.work', 'day3 ines.working']);
check('Every feeling answer is useful', C.days.every(d => Object.values(d.answers.people).every(a => a.feeling.useful === true)), true);

/* ---- Nothing done: unmoved people who start well placed still earn reason points ---- */
const empty = MARKING.markRun(C, runOf([emptyDay(), emptyDay(), emptyDay()]));
// Start layouts: two right, two wrong each day. Left alone, the two right ones earn placement + reason points (1.5 each).
check('Empty run: Day 1 Assign (Ines and Tomasz start right; no pair bonus today)', [empty.days[0].assign.score, empty.days[0].assign.of], [3, 6]);
check('Empty run: Day 2 Assign (Ines and Tomasz start right)', [empty.days[1].assign.score, empty.days[1].assign.of], [3, 7]);
// Day 3: Kofi and Tomasz start right. Priya starts at Outreach and nothing was asked, so that is still right for her.
check('Empty run: Day 3 Assign (nothing asked, so Priya at Outreach is still right)', [empty.days[2].assign.score, empty.days[2].assign.of], [4.5, 7]);
check('Empty run: Day 1 Reflect (nothing chosen)', empty.days[0].reflect.score, 0);

/* ---- D: the real game's fixed texts ---- */
check('D1: the stage intro cards are identical on all three days',
  C.days.every(d => JSON.stringify(d.intros) === JSON.stringify(C.days[0].intros)), true);
check('D4: one Reflect prompt on all three days', C.days.every(d => d.reflect.prompt === C.days[0].reflect.prompt), true);

console.log(failed ? failed + ' check(s) FAILED' : 'All marking checks passed');
process.exit(failed ? 1 : 0);
