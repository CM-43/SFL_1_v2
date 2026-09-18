# How to change the Sustainable Futures Lab simulation (v2, no coding needed)

This guide is for changing words, numbers and rules. You never need to touch the files in `js/` or `css/`.

## 1. What is in this folder

| File or folder | What it is | Do you edit it? |
|---|---|---|
| `data/sfl2/content.js` | **Everything the candidate reads, and every number and rule.** | **Yes, this is the one** |
| `config.js` | The username, the password code, and which content folder to use | Sometimes |
| `tools/make-passcode.html` | Makes the code for a new password | Just open it |
| `data/test-every-shape/content.js` | A test scenario that uses every option. Not for customers | No |
| `tools/*.js`, `tools/playthrough.py` | Checks for developers (need Node.js; the playthrough needs Python and Playwright) | No |
| `tools/make-screens.py` | Redraws every picture in `screens/` and `screens/1920/` from the scripted route, in one pass. Start `python3 -m http.server 8765` in this folder, then run `python3 tools/make-screens.py` (needs Python and Playwright) | Just run it |
| `screens/` | Pictures of every screen, for review | No |
| `index.html`, `js/`, `css/` | The simulation itself | No |

## 2. Before you change anything

1. **Keep a copy** of `data/sfl2/content.js` (for example `content-backup.js`), so you can always go back.
2. Open `content.js` in a plain text editor (Notepad or VS Code), not Word.
3. Lines starting with `//` are notes. The simulation ignores them. The notes say how sure we are about each rule: **VERIFIED** (seen in a photo of the real game), **REPORTED** (a candidate told us), **INFERRED** (our reading of the photos), **DECIDED** (our own choice) and **SHAKY** (not yet certain). The SQ numbers point to the open questions in `SFL-V2-SPEC.md` section 10.

## 3. The three rules for editing safely

- **Text sits inside double quote marks:** `name: "Ines",`
  If the text itself needs a double quote mark, put a backslash in front of it: `\"`.
- **Items in a list end with a comma.** A missing comma is the most common mistake.
- **Numbers, true/false and null have no quote marks:** `explore_points: 3,` and `show_tutorial: true,`

Inside text, `\n` is a line break and `\n\n` starts a new paragraph.

**If you make a mistake, nothing breaks silently.** The simulation will not start. It shows a list of what to fix, and where (for example "Day 2 > support > d2-s3 > options"). Undo your change, or fix what the list says.

**Keep texts short.** Every card must fit on a small laptop screen (900 × 540) without scrolling. As a guide: Explore answers under about 120 characters, Support messages under about 200, Support options under about 150.

## 4. How the file is laid out

The file runs from top to bottom in this order:

| Section | What it holds |
|---|---|
| `title`, `time_limit_minutes`, `results_mode` | The name, the clock, full or demo results |
| `rules:` | Switches for how the game behaves (section 5) |
| `scoring:` and `benchmark:` | Points and the percentile table |
| `labels:` | Every button and fixed word on screen |
| `start:` | The start card before the clock runs |
| `tutorial:` | The five tutorial cards (clock paused) |
| `help:` | The key terms in the Help panel |
| `onboarding:` | The project introduction, the four questions to order, and their answers |
| `people:` | The four Researchers. **The same people every day** |
| `stations:` | The four Workstations. **The same every day** |
| `days:` | Day 1, Day 2 and Day 3, each starting with `/* === DAY 1 === */` |
| Notes at the very bottom | A worked marking example |

Each day holds, in order: its goal, its stages, the stage intro cards (`intros`), the left-column instructions (`instructions`), Explore, the starting positions, Support, and Reflect.

**The four stage intro cards (`intros`) must stay identical on all three days.** The real game shows one fixed text per stage, every day. If you change one, change it in Day 1, Day 2 and Day 3 so all three still match, and keep the day's own twist out of them: the only day-specific steer belongs in that day's `goal` (Day 3's goal is the one that has one).

## 5. Common changes, with examples

### Change some wording
Find the text and change what is inside the quotes. All button and screen words are in `labels:`.

`station_full: "That Workstation is full. Move someone off it first.",` → `station_full: "This Workstation already has two Researchers.",`

Words in curly brackets, like `{name}` or `{n}`, are filled in by the simulation. Keep them.

**The label rule (Master Doc D55).** Short labels use the real game's wording, so candidates recognise them: buttons, the four reasons, the mood words, tab names, slot names, small headings and toast titles (roughly up to three or four words). Full sentences use our own wording: the Explore questions, prompts, greetings, instructions, card text, answers and messages. The real wording is in `SFL-SCREENSHOT-INVENTORY.md`. When you change a short label, check it against the photos first. Buttons capitalise every word; a pill that is a sentence keeps its full stop or question mark, and a pill that is a label has none.

### Change the time limit or the time warnings
`time_limit_minutes: 30,` → `time_limit_minutes: 35,`

`time_warning_minutes: [10, 5, 4, 3, 2, 1],` (in `rules:`) lists the minutes at which a "Time remaining" note appears. Each note appears once and the candidate can close it. If a new note appears while an older one is still open, the new one replaces it. If the clock passes two minutes on the list at once, only the later note shows.
- Whole numbers only, each smaller than the time limit, no number twice. `[]` means no notes at all.
- The note's words are `time_warning_body` ("{n} minutes left…") and, for the 1-minute note, `time_warning_body_one`, so it never says "1 minutes".

### Switch a rule on or off
Everything in `rules:` is a switch.

| Rule | What it does |
|---|---|
| `show_tutorial` | `true` = the five tutorial cards come first, with the clock paused |
| `station_capacity` | The most Researchers one Workstation can hold (the real game: 2). A drop on a full Workstation is refused with a short note |
| `questions_per_target_per_day` | How many questions one Researcher or Workstation answers per day (the real game: 1) |
| `ask_reason_for_unmoved` | `true` = people left where they started are also asked for a reason (Cancel skips that person) |
| `show_support_outcomes` | `true` = show what happened after each Support answer. Every option then needs an `outcome:` |
| `notes_in_reflect` | Show the Notes button on the Reflect screen |
| `notes_include_onboarding` | Keep the Onboarding answers in a "Project" tab in Notes |
| `can_skip_explore_points` | `true` = candidates may continue with Explore Requests unused |
| `reflect_default` | `null` = nothing pre-selected in Reflect. `"mid"` would pre-select the middle mood word |

### Change the questions or the reasons
`person_questions` and `station_questions` are the questions offered in Explore. Exactly one person question must have `reveals_mood: true`: it is the "how are you feeling" question that Reflect marking uses.

`reasons` are the choices after every move in Assign. `needs` says what the candidate must have asked for the reason to count as honest:

`needs: [{ target: "person", questions: ["working", "feeling"] }]` reads: "honest if the candidate asked this person either question". `target: "station"` means the Workstation the person was moved to. `needs: []` means always honest.

**A reason counts everything the candidate has learned so far, not only today.** A question asked on Day 1 still backs a reason given on Day 3. The Notes panel starts empty each day, but the candidate does not forget what they were told. So "Researcher preference" for Priya on Day 2 is honest if Priya was asked on Day 1, even though she cannot be asked on Day 2.

### Change a Researcher
Each person has:
- `name`, `role`, `description`: shown on the map and in Notes
- `good_stations`: where they fit best (placement points)
- `pair_with` (optional): who they should share a Workstation with. Pair points are paid only when they share **one of their `good_stations`** with that person. Leave it out if nobody
- `placement_why`: the explanation shown in the results
- `image`: leave as `null` (see "Pictures" below)

If one day's answers should change where someone fits, add these to that day (Day 3 does this for Priya):

```
good_stations_override:   { priya: ["nursery"] },
override_revealed_by:     { priya: [{ target: "station", id: "nursery", questions: ["work", "learn"] }] },
placement_why_override:   { priya: "Today the Nursery chooses new planting sites…" },
placement_why_unrevealed: { priya: "Nothing you asked today showed that the Nursery's work had changed…" },
```

- `good_stations_override` changes where the person fits, for that day only.
- `override_revealed_by` says **what the candidate must have asked that day for the change to count.** It is written like a reason's `needs`, but each item names its own `id`: here, the candidate must have asked the Nursery either of its two questions. Ask it and the change applies; do not ask it and the person's usual `good_stations` are used, so the candidate is marked on what they actually knew. Leave `override_revealed_by` out and the change always applies.
- `placement_why_override` is the results explanation when the change **was** revealed.
- `placement_why_unrevealed` is the results explanation when it **was not**. Write it so the candidate can see they were not punished for a question they never asked, and say what asking would have told them.

Anyone named in `override_revealed_by` needs both explanations, and whatever must be asked has to be askable that day, or the error list will say so. Make sure at least one of that day's Explore answers actually shows the change, and mark that answer `useful: true`.

### Change a Workstation
Each has `name` (full name), `short` (the word on its sign), `description`, `icon` and `colour`.
- Icons: `leaf`, `drop`, `signal`, `paw`, `bird`, `sprout`, `wrench`, `chart`, `boat`, `document`, `chat`
- Colours: `green`, `blue`, `amber`, `orange`, `purple`

### Change Explore for a day
- `explore_points: 3,` is how many questions the candidate can ask that day. **An Explore Request that is not used does cost points:** the score is out of the day's request count, not out of the number of questions asked, so leaving a request unused scores the same as spending it on an answer that was not useful.
- `available: { people: ["ines", "priya"], stations: ["nursery", "outreach"] }` says who can be asked that day. Everyone else is greyed out.
- `answers:` needs one answer per question for everyone who is available. Each answer has `text`, `useful` (`true` earns the Explore point) and `why` (shown in the results).
- When is an answer `useful: true`?
  - The answer to the "feeling" question is **always** useful: it tells the candidate that person's mood, which Reflect asks about. Its `why` says what it told you ("Tells you Kofi felt ordinary today, a cue for Reflect"). Do not say it was the only way to a Reflect point: the candidate cannot know beforehand whether a Support request will show that mood.
  - Every other answer should be `useful: true` as well, because every answer is written to tell the candidate something they can act on: what a person is best at, what skill a Workstation's work needs, or who fits it. Write the answers that way first, then tag them.
  - **The only answers tagged `useful: false` are the ones the candidate could already have read on screen** before spending the request. In this scenario there are exactly four: Day 1 Ines "How do you like to work" and Day 3 Ines "How do you like to work" (her role already says where she fits), and Day 1 Nursery "What work is planned" and Day 1 Nursery "What have we learned" (the Nursery's description already says what happens there). Their `why` names what was already visible, for example: "Ines's role already told you where she fits; the request was better spent where the answer was open."
  - For a useful answer, the `why` says what the answer told the candidate, for example: "Told you the Tide needs no specialist today, so nobody well placed elsewhere needs to move."
  - Each day needs at least as many useful answers as Explore Requests (the error list warns you if not).

### Change the starting positions for a day
`start_assignment` lists who stands on each Workstation when Assign begins. Every person must appear exactly once, and no Workstation may hold more than `station_capacity`. An empty Workstation is written `tide: []`.

Start some people in the right place and some in the wrong place (the scenario uses two and two), so that leaving someone alone is also a decision.

### Change Support for a day
Each request has:
- `person`: who asks
- `message`: a short situation ending in a question. `\n\n` separates the situation from the question
- `reveals_mood`: `true` if the wording shows how the person feels today (used in Reflect marking)
- `options`: 2 to 4 answers. Each has `text`, `tier` (exactly one `"recommended"`, the rest `"acceptable"` or `"weak"`) and `why` (shown in the results)
- Write every option so it sounds sensible. A weak option should fail only on a second look: it is too forceful, waits too long, or leaves someone out. Its `why` names which.

`support_groups` decides when requests appear. All requests in the first group appear together. When they are all answered, the next group appears:

`support_groups: [["d2-s1"], ["d2-s2", "d2-s3"], ["d2-s4"]],` = one request, then two together, then one.

Every request must be in exactly one group. One person may have two requests on the same day.

### Change Reflect for a day
- `options`: exactly three mood words, from low to high, with ids (`low`, `mid`, `high`). "I don't know" is added automatically. Days 1 and 2 use the real game's words (Doubtful / Neutral / Confident, Unbalanced / Neutral / Balanced); Day 3's were never photographed, so they are our own.
- `moods`: each person's true mood that day.
- `why`: the explanation for each person, shown in the results.

How it is marked: if the candidate had a clue about the person (they asked the "feeling" question, or answered one of that person's requests marked `reveals_mood: true`), the true mood scores. If they had no clue, "I don't know" scores. So make sure each mood matches what the person said, and leave at least one person each day with no clue at all.

### Change the number of days
The days are the big blocks under `days: [`.
- **Fewer days:** delete a whole block, from its opening `{` to its closing `},`.
- **More days:** copy a whole block, paste it after the last one, and change its `id`, `name` and `goal_heading`, and the `id` of every Support request (ids must be different across the whole file). The progress line at the top updates by itself.

### Remove a stage from a day
`phases: ["explore", "assign", "support", "reflect"],` → `phases: ["explore", "assign", "reflect"],`
Keep the order explore, assign, support, reflect.

### Change how many points something is worth
Everything is in `scoring:`. Examples:
- A reasonable-but-not-best Support answer: `acceptable: 1` (full marks) or `acceptable: 0.5` (half).
- The pair bonus in Assign: `pair_points: 0.5` (paid only on a good Workstation).
- To switch the pair bonus off for one day, put `score_pairs: false,` in that day (Day 1 has it). On such a day nobody earns pair points, that day's Assign total is smaller — Day 1 is out of 6 instead of 7 — and the results show no pairing line at all. Use it on a day where the candidate could not have learned who works with whom: on Day 1 neither person in the pair, nor either of their Workstations, can be asked. Leave it out (or write `true`) for a normal day.
- How much each part counts towards the percentile: `phase_weights` in `benchmark:`.

**Do not change** the `percentiles` table or the `zones`. They are the same on every CaseMentor simulation.

### Pictures
`image: null` on people and Workstations, and `map: { image: null }`, draw our own simple artwork. To use a picture instead, put the file in the folder (for example `img/ines.png`) and write `image: "img/ines.png"`. Use only pictures we own.

### Turn this into the free demo
`results_mode: "full",` → `results_mode: "demo",` and in `config.js`, `requireLogin: false,`

## 6. Checking your change

1. Double-click `index.html`. It opens in your browser, with no internet needed.
2. If you see the error list, fix what it says.
3. Play through the part you changed, at a small window size as well as full screen.
4. Optional: open `index.html?content=test-every-shape` to confirm the simulation still copes with unusual shapes.
5. Optional, for developers with Node.js: `node tools/check-content.js sfl2` runs the same checks without a browser, and `node tools/test-marking.js` checks the marking against the worked example at the bottom of the content file.

## 7. Changing the password

1. Open `tools/make-passcode.html` and type the new password.
2. Copy the long code it shows.
3. In `config.js`, paste it between the quotes of `passcodeHash: "…",`
4. The username is `username: "…",` in the same file.

This is a courtesy gate, not real security. Anyone determined can read a browser page's files.

## 8. Putting it online (same as Sea Wolf and Redrock)

1. Upload the **whole folder** to the GitHub repository. Drag the folders, not the files inside them: the web uploader silently flattens folders.
2. After uploading, open the live page and check that your change is there.
3. Embed it in the lesson with:

```
<iframe src="https://<user>.github.io/<repo>/index.html" allowfullscreen allow="fullscreen" style="width:100%;aspect-ratio:16/9;border:0;display:block"></iframe>
```

Without `allowfullscreen`, the fullscreen button hides itself.
