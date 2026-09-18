// Regenerates data/test-every-shape/content.js from data/sfl2/content.js.
// Run from the build folder: node tools/make-test-content.js   (for developers; not needed for content editing)
// It can also be loaded by a test script: require('./make-test-content.js').build({ people: 2, capacity: 1 })
// builds a smaller variant in memory without writing anything.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function loadSfl2() {
  const sandbox = {};
  new Function('window', fs.readFileSync(path.join(ROOT, 'data/sfl2/content.js'), 'utf8'))(sandbox);
  return JSON.parse(JSON.stringify(sandbox.SFL_CONTENT));
}
function svgUri(body, bg) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="' + bg + '"/>' + body + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const FACE = '<circle cx="32" cy="26" r="12" fill="#1a2230"/><path d="M12 60c2-14 12-20 20-20s18 6 20 20Z" fill="#1a2230"/>';
const HOUSE = '<path d="M10 34 L32 14 L54 34 Z" fill="#fff"/><rect x="16" y="34" width="32" height="20" fill="#fff"/>';

function build(opts) {
  opts = opts || {};
  const n = opts.people || 5;
  const cap = opts.capacity || 3;
  const c = loadSfl2();
  c.title = 'Every Shape Test';
  c.time_limit_minutes = 3;
  c.results_mode = 'demo';
  Object.assign(c.rules, {
    show_tutorial: false, time_warning_minutes: [2, 1], station_capacity: cap, questions_per_target_per_day: 2,
    ask_reason_for_unmoved: true, show_support_outcomes: true, notes_in_reflect: false,
    notes_include_onboarding: true, can_skip_explore_points: false, reflect_default: 'mid'
  });
  // Three onboarding questions instead of four
  c.onboarding.questions = c.onboarding.questions.slice(0, 3).map((q, i) => Object.assign(q, { recommended_position: i + 1 }));
  delete c.labels.slot_4;

  // A fifth person and a fifth Workstation; pictures as data: URIs
  c.people.push({ id: 'lena', name: 'Lena Marsh-Oyelaran', role: 'Data Analyst', image: null,
    description: 'Keeps the project\'s numbers in order.', good_stations: ['records'],
    placement_why: 'Test person: Lena fits the Records Workstation.' });
  c.stations.push({ id: 'records', name: 'Records Workstation', short: 'Records', icon: 'chart', colour: 'purple', image: null,
    description: 'Where Researchers file and check the project\'s data.' });
  c.people[0].image = svgUri(FACE, '#93c5fd');
  c.people[4].image = svgUri(FACE, '#fda4af');
  c.stations[0].image = svgUri(HOUSE, '#15803d');
  c.map.image = svgUri('<circle cx="32" cy="32" r="24" fill="#4b6b55"/>', '#24374b');

  // Test only: everyone has a pair_with, so the "no cue two days running" advice does not fire
  c.people.find(p => p.id === 'ines').pair_with = ['priya'];
  c.people.find(p => p.id === 'priya').pair_with = ['ines'];
  c.people.find(p => p.id === 'lena').pair_with = ['kofi'];
  const [d1, d2, d3] = c.days;
  const ans = (t, u) => ({ text: t, useful: u, why: 'Test answer.' });
  const lenaAnswers = { feeling: ans('I feel neutral about the numbers today.', true), working: ans('I work best alone with the records.', true) };
  const recordsAnswers = { work: ans('Filing the survey sheets.', true), learn: ans('Nothing new.', false) };
  const lenaMood = (day, mood) => { day.reflect.moods.lena = mood; day.reflect.why.lena = 'Test mood for Lena.'; };
  function renameSupport(day, prefix) {
    const map = {};
    day.support.forEach(s => { map[s.id] = prefix + s.id.split('-').pop(); s.id = map[s.id]; });
    day.support_groups = day.support_groups.map(g => g.map(id => map[id]));
  }

  // Day A: no Explore; 2 requests with 2 options, one at a time
  const a = JSON.parse(JSON.stringify(d1));
  Object.assign(a, { id: 'dA', name: 'Day A', goal_heading: 'Day A Goal', phases: ['assign', 'support', 'reflect'] });
  delete a.explore_points; delete a.available; delete a.answers;
  a.support = a.support.slice(0, 2);
  a.support_groups = [[a.support[0].id], [a.support[1].id]];
  a.start_assignment = { nursery: ['tomasz', 'kofi', 'priya'], tide: [], outreach: ['ines'], wildlife: [], records: ['lena'] };
  lenaMood(a, 'mid');
  renameSupport(a, 'a-');

  // Day B: Explore and Reflect only; 1 Explore Request
  const b = JSON.parse(JSON.stringify(d2));
  Object.assign(b, { id: 'dB', name: 'Day B', goal_heading: 'Day B Goal', phases: ['explore', 'reflect'], explore_points: 1 });
  b.available = { people: ['tomasz'], stations: ['records'] };
  b.answers = { people: { tomasz: b.answers.people.tomasz }, stations: { records: recordsAnswers } };
  delete b.support; delete b.support_groups;
  b.start_assignment = { nursery: ['ines'], tide: ['kofi'], outreach: ['priya'], wildlife: ['tomasz'], records: ['lena'] };
  lenaMood(b, 'high');

  // Day C: everything, 4 Explore Requests, a Support group of three, three people start on one Workstation
  const cc = JSON.parse(JSON.stringify(d3));
  Object.assign(cc, { id: 'dC', name: 'Day C', goal_heading: 'Day C Goal', explore_points: 4 });
  cc.available = { people: ['kofi', 'ines', 'lena'], stations: ['nursery', 'wildlife'] };
  cc.answers.people.lena = lenaAnswers;
  cc.support_groups = [[cc.support[0].id, cc.support[1].id, cc.support[2].id], [cc.support[3].id, cc.support[4].id]];
  cc.start_assignment = { nursery: [], tide: ['priya', 'kofi', 'ines'], outreach: [], wildlife: ['tomasz'], records: ['lena'] };
  cc.good_stations_override = { lena: ['records', 'outreach'] };
  cc.placement_why_override = { lena: 'Test: on Day C Lena also fits Outreach.' };
  lenaMood(cc, 'low');
  renameSupport(cc, 'c-');

  // Day D: a copy of Day 1 (four days in all)
  const dd = JSON.parse(JSON.stringify(d1));
  Object.assign(dd, { id: 'dD', name: 'Day D', goal_heading: 'Day D Goal' });
  dd.start_assignment = { nursery: ['tomasz'], tide: ['kofi'], outreach: ['ines'], wildlife: ['priya'], records: ['lena'] };
  lenaMood(dd, 'mid');
  renameSupport(dd, 'd-');

  c.days = [a, b, cc, dd];
  // Support outcomes are switched on, so every option needs one
  c.days.forEach(day => (day.support || []).forEach(s => s.options.forEach(o => { o.outcome = 'Test outcome for option ' + o.id + '.'; })));

  if (n < 5) trimTo(c, n, cap);
  else if (cap < 3) c.days.forEach(day => { day.start_assignment = oneEach(c); });
  return c;
}

/* A smaller variant: keep the first n people and n Workstations. */
function oneEach(c) {
  const sa = {};
  c.stations.forEach((s, i) => { sa[s.id] = c.people[i] ? [c.people[i].id] : []; });
  return sa;
}
function trimTo(c, n, cap) {
  c.people = c.people.slice(0, n);
  c.stations = c.stations.slice(0, n);
  const P = new Set(c.people.map(p => p.id)), S = new Set(c.stations.map(s => s.id));
  c.people.forEach(p => {
    p.good_stations = p.good_stations.filter(s => S.has(s));
    if (!p.good_stations.length) p.good_stations = [c.stations[0].id];
    p.pair_with = (p.pair_with || []).filter(x => P.has(x));
    if (!p.pair_with.length) p.pair_with = [c.people.find(o => o.id !== p.id).id];
  });
  const last = c.people[c.people.length - 1].id;   // nobody can learn how this person feels (Reflect "I don't know")
  c.days.forEach(day => {
    if (day.available) {
      day.available.people = day.available.people.filter(x => P.has(x) && x !== last);
      day.available.stations = day.available.stations.filter(x => S.has(x));
      if (!day.available.people.length) day.available.people = [c.people[0].id];
      if (!day.available.stations.length) day.available.stations = [c.stations[0].id];
      const src = day.answers;
      const fill = (group, id, kind) => group[id] || { feeling: { text: 'Test.', useful: true, why: 'Test.' }, working: { text: 'Test.', useful: true, why: 'Test.' },
                                                         work: { text: 'Test.', useful: true, why: 'Test.' }, learn: { text: 'Test.', useful: true, why: 'Test.' } };
      day.answers = { people: {}, stations: {} };
      day.available.people.forEach(id => { const a = fill(src.people, id); day.answers.people[id] = { feeling: a.feeling, working: a.working }; });
      day.available.stations.forEach(id => { const a = fill(src.stations, id); day.answers.stations[id] = { work: a.work, learn: a.learn }; });
      const useful = [].concat(...Object.values(day.answers.people).map(Object.values), ...Object.values(day.answers.stations).map(Object.values)).filter(a => a.useful).length;
      day.explore_points = Math.max(1, Math.min(day.explore_points, day.available.people.length + day.available.stations.length, useful));
    }
    day.start_assignment = oneEach(c);
    if (cap > 1 && n > 2) { const ids = c.stations.map(s => s.id); day.start_assignment[ids[0]] = [c.people[0].id, c.people[1].id]; day.start_assignment[ids[1]] = []; }
    if (day.support) {
      day.support = day.support.filter(s => P.has(s.person));
      day.support.forEach(s => { if (s.person === last) s.reveals_mood = false; });
      if (!day.support.length) { day.phases = day.phases.filter(p => p !== 'support'); delete day.support; delete day.support_groups; }
      else {
        const keep = new Set(day.support.map(s => s.id));
        day.support_groups = day.support_groups.map(g => g.filter(id => keep.has(id))).filter(g => g.length);
      }
    }
    if (day.reflect) {
      for (const k of Object.keys(day.reflect.moods)) if (!P.has(k)) { delete day.reflect.moods[k]; delete day.reflect.why[k]; }
    }
    delete day.good_stations_override;
    delete day.placement_why_override;
  });
}

module.exports = { build };

if (require.main === module) {
  const c = build();
  fs.writeFileSync(path.join(ROOT, 'data/test-every-shape/content.js'),
`/* TEST CONTENT — not for customers. Uses the shapes the v2 content format allows:
   5 people and 5 Workstations (smaller variants: 2, 3 and 4 are built in memory by the
   test script from tools/make-test-content.js); 4 days; a day without Explore; a day with
   only Explore and Reflect; a Support group of three; three people starting on one
   Workstation (station_capacity 3); a good_stations_override; 3 onboarding questions;
   2 questions per person per day; pictures as data: URIs; no tutorial; Reflect
   pre-selected; Support outcomes shown; every other switch the other way; demo results;
   a 3-minute clock. Open with index.html?content=test-every-shape
   Regenerate it rather than editing by hand. */
window.SFL_CONTENT = ` + JSON.stringify(c, null, 1) + ';\n');
  console.log('Wrote data/test-every-shape/content.js');
}
