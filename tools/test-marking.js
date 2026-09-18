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

/* ---- The worked example (Day 2) ---- */
const day = C.days[1];
const dr = emptyDay();
dr.asked = [{ target: 'person', id: 'tomasz', q: 'feeling' }, { target: 'person', id: 'kofi', q: 'feeling' }, { target: 'station', id: 'tide', q: 'work' }];
dr.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
dr.reasons = { kofi: 'teammate', priya: 'coverage' };          // Ines and Tomasz are not moved
dr.reasonTo = { kofi: 'wildlife', priya: 'outreach' };
dr.support = recommendedAll(day);
dr.reflect = { tomasz: 'low', kofi: 'high', priya: 'high', ines: 'mid' };
const run = { onboarding: { order: ['ob-work', 'ob-known', 'ob-support', 'ob-together'] }, days: [emptyDay(), dr, emptyDay()], late: {} };
const r = MARKING.markRun(C, run).days[1];
check('Worked example: Explore', [r.explore.score, r.explore.of], [2, 3]);
check('Worked example: Assign', [r.assign.score, r.assign.of], [6.5, 7]);
check('Worked example: Assign per person', r.assign.items.map(i => i.person.id + ' ' + i.points + '/' + i.of), ['ines 1.5/1.5', 'tomasz 2/2', 'priya 1.5/1.5', 'kofi 1.5/2']);
check('Worked example: Kofi reason not honest', r.assign.items.find(i => i.person.id === 'kofi').honest, false);
check('Worked example: Support', [r.support.score, r.support.of], [4, 4]);
check('Worked example: Reflect', [r.reflect.score, r.reflect.of], [2, 4]);
check('Worked example: Reflect cues', r.reflect.items.map(i => i.person.id + ':' + i.cues.join('+')), ['ines:', 'tomasz:asked+support', 'priya:support', 'kofi:asked']);

/* ---- A perfect run scores 100 ---- */
const perfect = { onboarding: { order: ['ob-work', 'ob-known', 'ob-support', 'ob-together'] }, days: [], late: {} };
C.days.forEach(d => {
  const x = emptyDay();
  // ask useful questions only, up to the day's points
  const useful = [];
  ['people', 'stations'].forEach(kind => { for (const id in d.answers[kind]) for (const q in d.answers[kind][id]) if (d.answers[kind][id][q].useful) useful.push({ target: kind === 'people' ? 'person' : 'station', id, q }); });
  // prefer mood questions so Reflect cues exist, but one question per target per day
  const seen = {};
  useful.sort((a, b) => (b.q === 'feeling') - (a.q === 'feeling'));
  useful.forEach(u => { if (x.asked.length < d.explore_points && !seen[u.target + u.id]) { seen[u.target + u.id] = 1; x.asked.push(u); } });
  x.assignment = { ines: 'nursery', tomasz: 'wildlife', kofi: 'wildlife', priya: MARKING.goodStationsOf(C, d, 'priya')[0] };
  x.reasons = { ines: 'coverage', tomasz: 'coverage', kofi: 'coverage', priya: 'coverage' };
  x.support = recommendedAll(d);
  x.reflect = {};
  C.people.forEach(p => { x.reflect[p.id] = MARKING.moodCues(C, d, x, p.id).length ? d.reflect.moods[p.id] : 'idk'; });
  perfect.days.push(x);
});
const pr = MARKING.markRun(C, perfect);
check('Perfect run: weighted', pr.weighted, 100);
check('Perfect run: percentile', pr.percentile, 99);

/* ---- Nothing done: unmoved people who start well placed still earn reason points ---- */
const empty = MARKING.markRun(C, { onboarding: { order: [] }, days: [emptyDay(), emptyDay(), emptyDay()], late: {} });
// Pair bonus only on a good station: two people sharing a wrong Workstation earn nothing.
check('Pair bonus: none when the pair shares a wrong Workstation', (() => {
  const x = emptyDay(); x.assignment = { ines: 'outreach', tomasz: 'nursery', kofi: 'nursery', priya: 'wildlife' };
  const it = MARKING.markRun(C, { onboarding: { order: [] }, days: [x, emptyDay(), emptyDay()], late: {} }).days[0].assign.items;
  return it.filter(i => i.person.id === 'tomasz' || i.person.id === 'kofi').map(i => i.pointsPair);
})(), [0, 0]);
// Start layouts: two right, two wrong each day. Left alone, the two right ones earn placement + reason points (1.5 each).
check('Empty run: Day 1 Assign (Ines and Tomasz start right)', [empty.days[0].assign.score, empty.days[0].assign.of], [3, 7]);
check('Empty run: Day 2 Assign (Ines and Tomasz start right)', [empty.days[1].assign.score, empty.days[1].assign.of], [3, 7]);
check('Empty run: Day 3 Assign (Kofi and Tomasz start right; Priya at Outreach is wrong today)', [empty.days[2].assign.score, empty.days[2].assign.of], [3, 7]);
// Day 3 override: Day 2's answer repeated on Day 3 loses Priya's points
check('Day 3: Priya at Outreach scores 0 placement', (() => {
  const x = emptyDay(); x.assignment = { ines: 'tide', tomasz: 'wildlife', kofi: 'wildlife', priya: 'outreach' };
  return MARKING.markRun(C, { onboarding: { order: [] }, days: [emptyDay(), emptyDay(), x], late: {} }).days[2].assign.items.find(i => i.person.id === 'priya').pointsPlace;
})(), 0);
// Useful rule: every feeling answer is useful
check('Every feeling answer is useful', C.days.every(d => Object.values(d.answers.people).every(a => a.feeling.useful === true)), true);
check('Empty run: Day 1 Reflect (nothing chosen)', empty.days[0].reflect.score, 0);

console.log(failed ? failed + ' check(s) FAILED' : 'All marking checks passed');
process.exit(failed ? 1 : 0);
