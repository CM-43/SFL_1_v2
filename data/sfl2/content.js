/* ==========================================================================
   SUSTAINABLE FUTURES LAB — CONTENT FILE v2 (scenario: Orrin Island)

   EVERYTHING THE CANDIDATE READS, AND EVERY NUMBER THAT SHAPES THE GAME,
   IS IN THIS FILE. Read EDITING-GUIDE.md before changing it.

   Quick rules for editing safely:
   · Text goes inside "double quote marks". To use a quote mark inside text,
     write \" (or use ' single quotes inside the text instead).
   · Every item in a list or group ends with a comma.
   · Lines starting with // are notes for us. The simulation ignores them.
   · \n inside text is a line break; \n\n is a blank line.
   · If you break something, the simulation will not start and will show a
     list of what to fix. Nothing broken ever reaches a customer silently.

   Evidence tags in the notes (from SFL-V2-SPEC.md):
     VERIFIED = seen in a photo of the real game · REPORTED = a candidate told us
     INFERRED = our reading of the photos · DECIDED = our own choice
     SHAKY = evidence points one way but is not conclusive
   The story, names and sentences are our own. Only the shape follows the real game.
   A worked marking example is at the bottom of this file.
   ========================================================================== */
window.SFL_CONTENT = {

  title: "Sustainable Futures Lab Simulation",   // login heading, page title, results file name

  time_limit_minutes: 30,        // DECIDED 17 Sep: the photographed sitting had 50% extra time (45 min), so the standard clock is 30

  results_mode: "full",          // "full" = everything explained; "demo" = percentile and scores only

  /* ---------------------------------------------------------------------
     RULES — how the game behaves. Change a value here, not the code.
     --------------------------------------------------------------------- */
  rules: {
    show_tutorial: true,             // true = the five tutorial screens come first (clock paused). VERIFIED
    time_warning_minutes: [10, 5, 4, 3, 2, 1], // a "Time remaining" note appears once at each of these minutes left. VERIFIED at 4; the list is DECIDED
    station_capacity: 2,             // most people one Workstation can hold; a Workstation may also be empty. VERIFIED
    questions_per_target_per_day: 1, // how many questions one person or Workstation answers per day. VERIFIED for people, INFERRED for Workstations

    // Questions the candidate can ask a person in Explore.
    // reveals_mood: true marks the question whose answer tells you how the person feels (used in Reflect marking).
    person_questions: [
      { id: "feeling", label: "How are you feeling about the project today?", reveals_mood: true },
      { id: "working", label: "How do you like to work with the team?" }
    ],

    // Questions the candidate can ask a Workstation in Explore.
    station_questions: [
      { id: "work",  label: "What work is planned here today?" },
      { id: "learn", label: "What have we learned here that could help today?" }
    ],

    // Reasons offered after every move in Assign. VERIFIED: four reasons plus Cancel.
    // Short labels (buttons, reasons, mood words, tabs, slot names, small headings) use the real game's wording (Master Doc D55);
    // full sentences are our own.
    // needs = what the candidate must have asked, on any day so far (Day 1 up to today), for the reason to be honest.
    //   The candidate's memory does not reset at midnight, so a question asked on an earlier day still backs a reason today.
    //   target "person"  = the person being moved; target "station" = the Workstation they are moved to.
    //   Several questions in one need = ANY one of them counts. An empty list = always honest.
    reasons: [
      { id: "preference", label: "Researcher preference",    needs: [{ target: "person",  questions: ["working", "feeling"] }] },
      { id: "teammate",   label: "Researcher assistance",    needs: [{ target: "person",  questions: ["working"] }] },
      { id: "needs",      label: "Latest workstation needs", needs: [{ target: "station", questions: ["work", "learn"] }] },
      { id: "coverage",   label: "Workstation coverage",     needs: [] }
    ],

    ask_reason_for_unmoved: false,   // false = people left where they started are not asked for a reason. REPORTED
    show_support_outcomes: false,    // false = nothing is shown after a Support answer. REPORTED
    notes_in_reflect: true,          // true = Notes can be opened on the Reflect screen. VERIFIED
    notes_include_onboarding: false, // false = the Onboarding answers are not kept in Notes. VERIFIED (no such tab in the photos)
    can_skip_explore_points: true,   // true = the candidate may leave Explore with requests unused. DECIDED
    reflect_default: null            // null = nothing pre-selected in Reflect. SHAKY (SQ26). Or a mood id such as "mid"
  },

  /* ---------------------------------------------------------------------
     SCORING — our own marking (McKinsey publishes nothing).
     --------------------------------------------------------------------- */
  scoring: {
    onboarding: { points_by_distance: [1, 0.5, 0, 0] },   // points for a question placed 0, 1, 2, 3 places from our order
    explore:    { points_useful: 1, points_not_useful: 0 }, // per question asked; the maximum is the day's Explore points
    assign:     { placement_points: 1,                      // person on one of their good_stations
                  pair_points: 0.5,                         // person shares a Workstation with someone in their pair_with AND that Workstation is one of their good_stations (only for people who have pair_with)
                  reason_points: 0.5 },                     // an honest reason (see rules > reasons > needs). Unscored in the real game? Unknown (SQ5)
    support:    { tier_points: { recommended: 1, acceptable: 1, weak: 0 } }, // only clearly weak answers lose marks
    reflect:    { points_correct: 1,                        // you had a clue about the person and picked their true mood
                  points_idk_when_unknown: 1 }              // you had no clue about the person and picked "I don't know"
  },

  /* ---------------------------------------------------------------------
     BENCHMARK — the same on every CaseMentor simulation. Do not change the
     zones or the percentiles table. The note will be updated after review.
     --------------------------------------------------------------------- */
  benchmark: {
    note: "This percentile is our own estimate for this simulation, not a McKinsey figure. McKinsey does not publish how this game is scored, and parts of the game are still being confirmed, so we score how closely your choices match the approach we teach. In Support, any reasonable response earns full marks; only clearly weak ones do not. Candidates who pass typically score in the top quartile, but we recommend aiming for the 90th and above.",
    phase_weights: { onboarding: 10, explore: 15, assign: 25, support: 25, reflect: 25 },
    zones: [
      { from: 0,  label: "Below 70th" },
      { from: 70, label: "Borderline" },
      { from: 80, label: "Likely pass" },
      { from: 90, label: "Comfortable" }
    ],
    percentiles: [[0,1],[20,5],[35,12],[45,20],[55,30],[62,40],[68,50],[74,60],[79,68],[84,75],[88,80],[91,85],[94,90],[96,94],[98,97],[100,99]]
  },

  /* ---------------------------------------------------------------------
     WORDS ON BUTTONS AND SCREENS
     {name}, {station}, {day}, {n}, {minutes} are filled in automatically.
     --------------------------------------------------------------------- */
  labels: {
    // Login and start
    login_lede: "Please sign in to begin.",
    start_button: "Start",
    // Buttons that move the candidate on
    continue: "Continue",
    start: "Start",                          // Project Introduction card
    start_project: "Start Project",          // last tutorial card; starts the clock
    start_day: "Start Day {n}",              // Day Goal card
    start_explore: "Start Explore",
    start_assign: "Start Assign",
    start_support: "Start Support",
    start_reflect: "Start Reflect",
    confirm_order: "Confirm Order",
    understood: "Understood",
    confirm_assignments: "Confirm Assignments",
    complete_reflect: "Complete Reflect",
    // Progress line and left column
    progress_tutorial: "Tutorial",
    progress_onboarding: "Onboarding",
    kicker_day: "Day {n}",                   // small heading above each stage intro card
    day_goal: "Day {day} Goal",
    stage: "Stage",
    phase_onboarding: "Onboarding",
    onboarding: "Onboarding",                // results and CSV section name
    phase_explore: "Explore",
    phase_assign: "Assign",
    phase_support: "Support",
    phase_reflect: "Reflect",
    // Onboarding ranking
    slot_1: "First Question",               // slot names on the ranking screen, one per onboarding question
    slot_2: "Second Question",
    slot_3: "Third Question",
    slot_4: "Fourth Question",
    drag_hint: "Drag a question into a slot, or click a question and then a slot.",
    move_up: "Move up",
    move_down: "Move down",
    // Explore
    explore_requests: "Explore Requests",
    ask_person_greeting: "Hello! I have time for one question today. What would you like to ask?",
    ask_no_points: "You have no Explore Requests left today.",
    never_mind: "Actually, never mind.",     // closes either question card in Explore
    cancel_pill: "Cancel",                   // closes the reason card in Assign
    cancel: "Cancel",                        // the Restart popup
    continue_pill: "Continue",
    // Assign
    assign_title: "Assign {name} to the {station}?",
    assign_reason_sub: "Choose the reason for this move.",
    station_full: "That Workstation is full. Move someone off it first.",
    assign_complete_title: "Assign Complete!",
    assign_complete_body: "Every Researcher now knows where they are working today.",
    not_placed: "Not placed",
    // Support
    support_request_title: "Support Request",
    support_request_body: "{name} would like your help with their work.",
    answer_request: "Answer Request",
    make_another_selection: "Make Another Selection",
    support_outcome_title: "What happened",      // only used when rules > show_support_outcomes is true
    support_close: "Back to the map",            // only used when rules > show_support_outcomes is true
    // Reflect
    idk: "I don't know",
    // Notes and Help
    notes: "Notes",
    help: "Help",
    close: "Close",
    notes_researchers: "Researchers",
    notes_workstations: "Workstations",
    notes_project: "Project",                    // only used when rules > notes_include_onboarding is true
    conversation_history: "Conversation History",
    no_history: "No conversation history recorded yet.",
    i_asked: "I asked",
    response: "Response",
    help_instructions: "This stage",
    help_definitions: "Key terms",
    // Clock
    timer_min: "min",
    timer_up: "Time's up",
    timer_paused: "Timer paused",
    time_warning_title: "Time remaining",
    time_warning_body: "{n} minutes left to complete the project.",
    time_warning_body_one: "1 minute left to complete the project.",   // used for the 1-minute note
    // Top-right tools
    restart: "Restart",
    restart_title: "Restart the simulation?",
    restart_body: "Your answers will be lost.",
    fullscreen: "Full Screen",
    exit_fullscreen: "Exit Full Screen",
    // End and results
    finish_title: "You have completed the simulation",
    finish_button: "See Your Results",
    results_title: "Your result",
    print: "Print",
    csv: "Download CSV",
    tile_onboarding: "Onboarding",
    tile_explore: "Explore",
    tile_assign: "Assign",
    tile_support: "Support",
    tile_reflect: "Reflect",
    out_of: "out of {n}",
    late: "answered after time ran out",
    weighted_line: "Weighted score {n} / 100",
    time_left_line: "Finished with {n} min left",
    time_up_line: "Time ran out before the end; late answers are marked",
    your_answer: "Your answer",
    our_view: "Our view",
    not_answered: "Not answered",
    recommended_label: "Recommended",
    reason_flag: "you had not asked, on any day so far, what this reason relies on",
    reason_none: "no reason asked (not moved)",
    unused_points: "{n} Explore Request(s) not used",
    nothing_asked: "No questions asked",
    useful_yes: "worth asking",
    useful_no: "already clear from what was on screen",
    paired_yes: "working with {name}",
    paired_no: "should share a Workstation with {name}",
    cue_asked: "You asked {name} how they felt.",
    cue_support: "{name}'s Support request showed how they felt.",
    cue_none: "You had no information about how {name} felt today, so \"I don't know\" was the honest answer.",
    demo_note: "This is the free demo, which shows your score and percentile only. Our full simulations come with every answer explained in detail.",
    // CSV column and row names
    csv_section: "Section",
    csv_item: "Item",
    csv_your_answer: "Your answer",
    csv_our_view: "Our view",
    csv_points: "Points",
    csv_out_of: "Out of",
    csv_late: "Late",
    csv_total: "Total",
    csv_weighted: "Weighted score",
    csv_percentile: "Estimated percentile",
    csv_yes: "yes"
  },

  /* ---------------------------------------------------------------------
     START CARD (house card; the clock does not start here)
     --------------------------------------------------------------------- */
  start: {
    heading: "Sustainable Futures Lab",
    body: "You will lead a research team through a short tutorial, an onboarding step and three project days. Each day has four stages: Explore, Assign, Support and Reflect.\n\nYou will have {minutes} minutes once the project begins. The clock stays paused during the tutorial."
  },

  /* ---------------------------------------------------------------------
     TUTORIAL — five cards, clock paused. VERIFIED order and topics.
     --------------------------------------------------------------------- */
  tutorial: {
    welcome: {
      heading: "Welcome to the Lab",
      body: "Orrin is a small island in a warm, shallow sea. Young mangroves line its southern shore, and every season sea turtles come up onto the same beaches to lay their eggs. The Sustainable Futures Lab studies how the island is changing and works with the island's other teams to protect what lives there.\n\nYou have joined the Lab as Team Leader. Over a three-day project, you will guide four Researchers as they work on a problem that threatens the shore. Each day starts with a goal and has four stages: Explore, Assign, Support and Reflect.\n\nPress \"Continue\" for a short tour of the features you will use."
    },
    timer: {
      heading: "Timer",
      body: "The timer is paused while you read this tutorial.\n\nOnce the project begins it runs without stopping, and you cannot pause it. Your remaining time is shown in the top-left corner."
    },
    notes: {
      heading: "Notes",
      body: "Everything you learn in Explore is saved in your Notes: each question you asked and the answer you were given, sorted by Researcher and by Workstation.\n\nYou can review them whenever you like before making later decisions. Notes start empty each day. Open them from the bottom-left corner."
    },
    help: {
      heading: "Help Menu",
      body: "Help explains what to do in the stage you are on, and defines the key terms, such as Workstation and Explore Request.\n\nOpen it from the bottom-left corner, next to Notes."
    },
    complete: {
      heading: "Tutorial Complete",
      body: "Some situations will point to one clear answer. Others will need your judgement, so use what you learn about the Researchers as you go, and check your Notes first.\n\nAre you ready to join the Lab?\n\nWhen you press \"Start Project\", the project and your timer will start."
    }
  },

  /* ---------------------------------------------------------------------
     HELP PANEL — key terms (the current stage's instructions are added
     automatically). DECIDED: the real Help panel was never photographed.
     --------------------------------------------------------------------- */
  help: {
    definitions: [
      { term: "Researcher", meaning: "A member of your team, with their own role and strengths." },
      { term: "Workstation", meaning: "Where one kind of work happens. Holds up to two Researchers, or none." },
      { term: "Explore Request", meaning: "One question. You get a few each day." },
      { term: "Support Request", meaning: "A Researcher asking for your advice." },
      { term: "Notes", meaning: "What you learned in Explore today." }
    ]
  },

  /* ---------------------------------------------------------------------
     ONBOARDING — introduction, rank four questions, read the brief.
     The questions are general, not about the story (VERIFIED).
     recommended_position = our order; why = shown in the results.
     --------------------------------------------------------------------- */
  onboarding: {
    intro_heading: "Project Introduction",
    intro: "Along Orrin's southern shore, newly planted mangrove seedlings are dying before they can take root. Without them, the shore is washing away.\n\nThat shore is where sea turtles come to nest. If it keeps eroding, this season's nests could be lost.\n\nThe Lab has been asked to find out what is going wrong and to protect the nesting beach.",
    rank_heading: "Prioritize Your Onboarding Brief",
    rank_instruction: "Your brief will answer the four questions below. Choose the order you want them answered in, from first to last.",
    brief_heading: "Onboarding Brief",
    questions: [
      { id: "ob-work", recommended_position: 1,
        text: "What does the Lab need to get done on this project?",
        answer: "The team will find out why the seedlings are failing, protect the turtle nests and keep the island's other teams informed. The work happens at four Workstations, each with its own focus: Nursery, Tide, Outreach and Wildlife.",
        why: "Start with the goal and the work: everything else depends on knowing what has to be achieved." },
      { id: "ob-known", recommended_position: 2,
        text: "What do we know about the problem so far?",
        answer: "The team has looked at the water, the soil and the new sea wall as possible causes of the dying seedlings. None has been confirmed yet, so more evidence is needed.",
        why: "Next, what is already known about the problem, so you do not repeat work or jump to a cause." },
      { id: "ob-support", recommended_position: 3,
        text: "How can I help each Researcher do their best work?",
        answer: "You will learn what each Researcher is good at, decide where they work each day, and advise them when they ask for help. At the end of each day, you will also judge how each of them feels.",
        why: "Once the goal and the problem are clear, turn to the people who will do the work." },
      { id: "ob-together", recommended_position: 4,
        text: "How can I get the team working well together?",
        answer: "Each Researcher sees the problem differently and brings different skills. You decide when they work alone and when together. Your team: Ines (Ecologist), Tomasz (Biologist), Priya (Habitat Planner) and Kofi (Engineer).",
        why: "How the team works together builds on knowing the goal, the problem and each person, so it comes last." }
    ]
  },

  /* ---------------------------------------------------------------------
     PEOPLE — the same four every day.
     good_stations = where they fit (placement points).
     pair_with     = who they should share a Workstation with (pair points). Leave it out if nobody.
     image         = optional picture file; null draws the house initials circle.
     --------------------------------------------------------------------- */
  people: [
    { id: "ines", name: "Ines", role: "Ecologist", image: null,
      description: "Studies how plants and animals depend on the land and water around them.",
      good_stations: ["nursery", "tide"],       // either fits: she reads roots, mud and water well
      placement_why: "Ines is at her best where roots, mud and water meet, so the Nursery or the Tide Workstation fits her. She works well on her own." },
    { id: "tomasz", name: "Tomasz", role: "Biologist", image: null,
      description: "Studies living things and how healthy they are.",
      good_stations: ["wildlife"],
      pair_with: ["kofi"],                      // he interprets results; Kofi gathers the data
      placement_why: "Tomasz is strongest at making sense of results about animals, not at collecting samples. At Wildlife he can interpret the nest data that Kofi gathers." },
    { id: "priya", name: "Priya", role: "Habitat Planner", image: null,
      description: "Plans how land is used so that wildlife and people can share it.",
      good_stations: ["outreach"],              // non-obvious: her title points to planting, her strength is organising
      placement_why: "Her title suggests planting work, but Priya's strength right now is keeping people connected: tracking updates and following up. That is what Outreach needs." },
    { id: "kofi", name: "Kofi", role: "Engineer", image: null,
      description: "Designs and builds the equipment the Lab uses in the field.",
      good_stations: ["wildlife", "tide"],      // either fits his building skills
      pair_with: ["tomasz"],                    // he wants someone who can explain what the readings mean
      placement_why: "Kofi builds and runs the nest sensors. He does best at Wildlife next to Tomasz, who can explain what the readings mean for the turtles." }
  ],

  /* ---------------------------------------------------------------------
     WORKSTATIONS — the same four every day.
     short  = the word on the Workstation's sign and badges
     icon   = leaf, drop, signal, paw, bird, sprout, wrench, chart, boat or document
     colour = green, blue, amber, orange or purple
     --------------------------------------------------------------------- */
  stations: [
    { id: "nursery", name: "Nursery Workstation", short: "Nursery", icon: "leaf", colour: "green", image: null,
      description: "Where Researchers grow and replant the mangrove seedlings." },
    { id: "tide", name: "Tide Workstation", short: "Tide", icon: "drop", colour: "blue", image: null,
      description: "Where Researchers test the water and mud along the shore." },
    { id: "outreach", name: "Outreach Workstation", short: "Outreach", icon: "signal", colour: "amber", image: null,
      description: "Where Researchers keep the island's other teams informed." },
    { id: "wildlife", name: "Wildlife Workstation", short: "Wildlife", icon: "paw", colour: "orange", image: null,
      description: "Where Researchers watch over the sea turtles and their nests." }
  ],

  map: { image: null },   // optional picture of the whole island; null draws our own map

  /* ---------------------------------------------------------------------
     THE THREE DAYS
     --------------------------------------------------------------------- */
  days: [

    /* === DAY 1 === */
    {
      id: "day1", name: "Day 1",
      goal_heading: "Day 1 Goal",
      goal: "Place each Researcher where their skills and interests fit today's work best.",
      phases: ["explore", "assign", "support", "reflect"],
      // THE STAGE INTRO CARDS ARE THE SAME ON EVERY DAY (the real game shows one fixed
      // text per stage). If you change one of these four texts, change it in Day 1,
      // Day 2 and Day 3 so all three stay identical. Nothing here may hint at the day's
      // own twist; the day-specific steer belongs in that day's "goal".
      intros: {
        explore: "Use your Explore Requests to learn about the Researchers and Workstations that matter for today's goal. Each request asks one Researcher or Workstation one question.\n\nWho and what you can ask changes from day to day.",
        assign: "Here is where each Researcher is working now.\n\nMove anyone you think should work somewhere else, using your goal, what you learned in Explore and what each Workstation needs.",
        support: "During the day, Researchers will come to you for advice on problems in their work. Each request describes a situation and offers several possible responses.\n\nChoose the response that helps them most. When more than one request is waiting, you decide which one to answer first.",
        reflect: "Before the day ends, think about how each Researcher is feeling. Use what they told you and how they came across in their requests today, and decide how each of them would describe their day."
      },
      instructions: {   // shown in the left column and in Help
        explore: "Click a Researcher or Workstation with a badge to ask one question. Each uses one Explore Request; each answers once a day. Answers go into your Notes.",
        assign: "Drag Researchers onto Workstations: up to two each, or none. Give a reason for every move. Everyone starts where their past experience put them; change anything today's work needs.",
        support: "Click a Researcher with an alert to open their request. Read the situation carefully, then choose the response that you think helps them and the project the most.",
        reflect: "Choose how each Researcher would finish the sentence, using what they told you and how they came across today. With nothing to go on, choose \"I don't know\"."
      },
      // Pair points are not scored on Day 1 (C2): neither person in a pair, and neither of
      // their Workstations, can be asked today, so the candidate cannot know a pairing.
      // Leave this out (or set it to true) on a day where pairs should count.
      score_pairs: false,
      explore_points: 3,   // VERIFIED 3 / 3 / 2
      available: { people: ["ines", "priya"], stations: ["nursery", "outreach"] },   // 2 people + 2 Workstations, as photographed
      answers: {
        people: {
          ines: {
            feeling: { text: "I'm confident today. I'd happily study the seedlings that survived, at the Nursery or out by the tide pools, and see what their roots can tell us about the mud.",
                       useful: true, why: "Tells you Ines felt confident today, a cue for Reflect." },   // feeling answers are always useful: they give a mood cue
            working: { text: "I like people who test ideas quickly and share what they find. I'm most useful where we study what the water and the mud do to the roots of the plants.",
                       useful: false, why: "Ines's role already told you where she fits; the request was better spent where the answer was open." }
          },
          priya: {
            feeling: { text: "Honestly, I'm worried. The island teams all tell different stories about the shore, three different versions this week alone, and nobody is tracking them or checking who has heard what.",
                       useful: true, why: "Tells you Priya felt doubtful today, a cue for Reflect. It also hints that tracking the teams' updates matters to her." },
            working: { text: "I'm best at keeping people connected: tracking who needs what, logging every update and following up until it is answered. Site planning can wait for now; that part is less urgent.",
                       useful: true, why: "Shows Priya belongs at Outreach, even though her title points to planting work." }
          }
        },
        stations: {
          nursery: {
            work:  { text: "Researchers will count and measure the surviving seedlings in every row of the Nursery. It suits someone who knows how plants respond to the land and water around them.",
                     useful: false, why: "The Nursery's description already told you this work; nothing here changes a placement." },
            learn: { text: "Seedlings nearest the new sea wall are dying fastest, row after row. Finding out why suits someone who reads roots and mud, and how plants depend on what surrounds them.",
                     useful: false, why: "Ines's role already pointed to roots and mud, so this only confirmed it; the request was better spent where the answer was open." }
          },
          outreach: {
            work:  { text: "Island teams send updates all day, by radio, by email and on notes left at the door. The work is mostly logging them, chasing replies and keeping everyone informed.",
                     useful: true, why: "Shows Outreach needs an organiser, which points to Priya rather than a scientist." },
            learn: { text: "Island teams' updates pile up faster than anyone logs them; twelve were waiting this morning, some of them two days old. Outreach needs someone who tracks and follows up.",
                     useful: true, why: "Told you Outreach needs someone who tracks and follows up, which points to Priya rather than a scientist." }
          }
        }
      },
      // One Workstation with two, one empty (INFERRED from the photos). Two start in the right place (Ines, Tomasz), two do not (Kofi, Priya).
      start_assignment: { nursery: ["ines"], tide: [], outreach: ["kofi"], wildlife: ["tomasz", "priya"] },
      support_groups: [["d1-s1"], ["d1-s2"], ["d1-s3"], ["d1-s4"]],   // Day 1: one request at a time
      support: [
        { id: "d1-s1", person: "kofi", reveals_mood: false,
          message: "The nursery team wants new water pipes fitted by Friday, because the old ones leak along two rows of seedlings. The parts will not arrive until next Wednesday. Their lead has asked me to promise Friday anyway, so the team can plan.\n\nHow should I answer them?",
          options: [
            { id: "a", tier: "recommended", text: "Tell them honestly that the parts arrive on Wednesday, and offer a temporary fix, such as hoses along the leaking rows, that keeps the seedlings watered until then.",
              why: "Honest about the date and still solves the team's real problem." },
            { id: "b", tier: "weak", text: "Agree to Friday so the nursery team can plan their week around it, and ask the supplier to rush the parts so the date can still be met.",
              why: "Sounds helpful, but it commits to a date that depends on a supplier Kofi does not control." }
          ] },
        { id: "d1-s2", person: "tomasz", reveals_mood: true,   // "I'm worried I've missed something" = Doubtful
          message: "I'm worried I've missed something. My samples from the dying seedlings don't match what the soil team found in the same three rows. They present their findings to the village council at ten tomorrow morning, and the report is already written.\n\nWhat should I do before their presentation?",
          options: [
            { id: "a", tier: "weak", text: "Check your samples again tonight, running each test a second time, so you are sure of your results before raising the difference with the soil team.",
              why: "Waits too long: the soil team may present findings that turn out to be wrong." },
            { id: "b", tier: "recommended", text: "Share your results with the soil team today, show them where the two sets differ, and agree together what can be said with confidence to the council.",
              why: "Raises the gap in time and works it out with the people affected." }
          ] },
        { id: "d1-s3", person: "ines", reveals_mood: true,   // "I'm sure they can show us" = Confident
          message: "Good news: a few seedlings on the north bank are thriving, and I'm sure they can show us what works. About thirty are still healthy after six weeks. But the planting team wants everyone on replanting this week, before the spring tides.\n\nHow should I raise this with them?",
          options: [
            { id: "a", tier: "recommended", text: "Explain what the north bank could teach the whole project about keeping seedlings alive, and ask the planting team how a short study could fit around the replanting.",
              why: "Links the idea to the shared goal and plans it with the team." },
            { id: "b", tier: "acceptable", text: "Ask the planting team if you can spend one morning this week on the north bank, taking notes and samples, before you join them on the replanting.",
              why: "Reasonable, but it does not explain why the study matters to everyone." }
          ] },
        { id: "d1-s4", person: "priya", reveals_mood: false,
          message: "The village council and the fishing cooperative have both booked the survey boats for Thursday, and each needs both boats. Both requests reached me this morning, within an hour of each other. Each has written to me twice, saying its trip is the more urgent one.\n\nHow should I settle this?",
          options: [
            { id: "a", tier: "weak", text: "Give Thursday to the council, since its survey feeds the project report, and offer the cooperative the next free day with the boats, so neither trip is lost.",
              why: "Looks fair, but it decides for both groups without asking what each trip needs, so the cooperative's reasons are never heard." },
            { id: "b", tier: "recommended", text: "Ask both groups what each trip must achieve and by when, then propose a schedule for the boats that both of them can accept before Thursday.",
              why: "Looks at what each group actually needs and finds a shared answer." }
          ] }
      ],
      reflect: {
        heading: "How would each Researcher finish this sentence?",
        prompt: "At the end of today, I feel…",
        options: [ { id: "low", label: "Doubtful" }, { id: "mid", label: "Neutral" }, { id: "high", label: "Confident" } ],   // Day 1 words, low to high (real game's words, VERIFIED)
        moods: { ines: "high", tomasz: "low", priya: "low", kofi: "mid" },
        why: {   // shown in the results
          ines: "Ines said she was confident in Explore, and her Support request said she was sure the north bank could show the team what works.",
          tomasz: "Tomasz's Support request began \"I'm worried I've missed something\": he doubted his own work.",
          priya: "Priya told you in Explore that she was worried: nobody was tracking the teams' stories.",
          kofi: "Kofi could not be asked today, and his request did not show how he felt."
        }
      }
    },

    /* === DAY 2 === */
    {
      id: "day2", name: "Day 2",
      goal_heading: "Day 2 Goal",
      goal: "Make sure Researchers who work better together are placed together.",
      phases: ["explore", "assign", "support", "reflect"],
      // THE STAGE INTRO CARDS ARE THE SAME ON EVERY DAY (the real game shows one fixed
      // text per stage). If you change one of these four texts, change it in Day 1,
      // Day 2 and Day 3 so all three stay identical. Nothing here may hint at the day's
      // own twist; the day-specific steer belongs in that day's "goal".
      intros: {
        explore: "Use your Explore Requests to learn about the Researchers and Workstations that matter for today's goal. Each request asks one Researcher or Workstation one question.\n\nWho and what you can ask changes from day to day.",
        assign: "Here is where each Researcher is working now.\n\nMove anyone you think should work somewhere else, using your goal, what you learned in Explore and what each Workstation needs.",
        support: "During the day, Researchers will come to you for advice on problems in their work. Each request describes a situation and offers several possible responses.\n\nChoose the response that helps them most. When more than one request is waiting, you decide which one to answer first.",
        reflect: "Before the day ends, think about how each Researcher is feeling. Use what they told you and how they came across in their requests today, and decide how each of them would describe their day."
      },
      instructions: {
        explore: "Click a Researcher or Workstation with a badge to ask one question. Each uses one Explore Request; each answers once a day. Answers go into your Notes.",
        assign: "Drag Researchers onto Workstations: up to two each, or none. Give a reason for every move. Everyone starts where their past experience put them; change anything today's work needs.",
        support: "Click a Researcher with an alert to open their request. Read the situation carefully, then choose the response that you think helps them and the project the most.",
        reflect: "Choose how each Researcher would finish the sentence, using what they told you and how they came across today. With nothing to go on, choose \"I don't know\"."
      },
      explore_points: 3,
      available: { people: ["tomasz", "kofi"], stations: ["tide", "wildlife"] },
      answers: {
        people: {
          tomasz: {
            feeling: { text: "I'm pulled in too many directions. I've been out sampling since dawn, wading along the shore with a bucket, and fieldwork isn't where I add most to this team.",
                       useful: true, why: "Tells you Tomasz felt unbalanced today, a cue for Reflect. It also shows fieldwork is not his best use." },
            working: { text: "Give me results to make sense of and I'm happy; that's where my training helps most. I work best next to someone who can gather the data and bring it to me.",
                       useful: true, why: "Shows Tomasz should be paired with someone who gathers data: Kofi." }
          },
          kofi: {
            feeling: { text: "I'm fine, I suppose; today feels ordinary. Nothing much has changed since yesterday. I'm most use where the sensor readings come in, next to someone who reads them.",
                       useful: true, why: "Tells you Kofi felt ordinary today, a cue for Reflect, and that he belongs where the readings come in, beside Tomasz." },
            working: { text: "I'm happy building and running the nest sensors; I set up six of them last week. I need a turtle expert beside me to turn the numbers into decisions about the nests.",
                       useful: true, why: "Shows Kofi needs a biologist beside him: Tomasz at Wildlife." }
          }
        },
        stations: {
          tide: {
            work:  { text: "Researchers will take water samples at marked points along the shore, twice a day at low tide. It needs steady hands and patience more than a specialist.",
                     useful: true, why: "Told you the Tide needs no specialist today, so nobody well placed elsewhere needs to move." },
            learn: { text: "Salt near the nursery is back to normal, so water now looks a less likely cause of the dying seedlings. The sampling left needs steady hands, not a specialist.",
                     useful: true, why: "Told you water is a less likely cause and that the sampling needs no specialist, so nobody has to move to the Tide." }
          },
          wildlife: {
            work:  { text: "Researchers will read the nest sensor data and judge whether the eggs are at risk from heat or flooding. It needs both a builder and a biologist, working side by side.",
                     useful: true, why: "Shows Wildlife needs two people working together: Kofi and Tomasz." },
            learn: { text: "Volunteers moved two nests off the eroding dune last night, to higher sand. The nest sensors now need someone to run them and someone to read them, working together.",
                     useful: true, why: "Told you the nest sensors need a builder and a reader together, which points to Kofi with Tomasz." }
          }
        }
      },
      // One each (VERIFIED for Day 2). Two start in the right place (Ines, Tomasz), two do not (Priya, Kofi).
      start_assignment: { nursery: ["priya"], tide: ["ines"], outreach: ["kofi"], wildlife: ["tomasz"] },
      support_groups: [["d2-s1"], ["d2-s2", "d2-s3"], ["d2-s4"]],   // one, then two together, then one
      support: [
        { id: "d2-s1", person: "priya", reveals_mood: true,   // "under control" = Balanced
          message: "I've got the updates under control now: every team's requests are logged and answered, most within a day. The dune team has asked whether we can share our nest map with a school group of twenty students who are visiting next week.\n\nHow should I respond?",
          options: [
            { id: "a", tier: "recommended", text: "Check with the wildlife team what is safe to share, then send the students a version of the map without the exact nest locations, in time for their visit.",
              why: "Helps the students while protecting the nests." },
            { id: "b", tier: "acceptable", text: "Tell the dune team you will reply once the wildlife team has looked at the request, and that you will pass on whatever the wildlife team decides.",
              why: "Safe, but it leaves the students waiting without a plan." },
            { id: "c", tier: "weak", text: "Send the students the full map so they can help check the nests during their visit, and ask them to keep the nest locations to themselves.",
              why: "Helpful on the surface, but it relies on a request to protect exact nest locations and never checks the risk with the wildlife team." }
          ] },
        { id: "d2-s2", person: "tomasz", reveals_mood: true,   // "I'm drowning", can't keep up = Unbalanced
          message: "I'm drowning in samples. The wildlife team has added five new tests since this morning, on top of the twelve I already had. Their nest decision is due tonight, and at this rate I can't finish the analysis they need by then.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Keep going on all the tests tonight so the wildlife team has everything they asked for, and flag any results you are unsure about when you send them.",
              why: "Looks committed, but it ignores that Tomasz is already overloaded; rushing every test risks mistakes in the ones that matter." },
            { id: "b", tier: "recommended", text: "Ask the wildlife team which tests matter most for tonight's decision, finish those first, and agree a new time with them for the rest of the analysis.",
              why: "Protects the key decision and resets the workload with the team." },
            { id: "c", tier: "acceptable", text: "Tell the wildlife team you are behind, explain how many tests are still waiting, and ask if someone else can take some of them off you.",
              why: "Reasonable, but it does not say which tests matter most." }
          ] },
        { id: "d2-s3", person: "ines", reveals_mood: false,
          message: "The coastal office plans to extend the sea wall by two hundred metres next month. Our early data suggests the wall may be making erosion worse further along the shore, where the turtles nest. We have only three weeks of readings so far.\n\nHow should I share this with them?",
          options: [
            { id: "a", tier: "recommended", text: "Share the early data, be clear about what is still uncertain, and ask the coastal office to review the extension plan with us before work starts.",
              why: "Raises the risk in time, honestly, and invites them to decide together." },
            { id: "b", tier: "weak", text: "Ask them to pause the extension until our data is complete, since the risk to the shore and the turtle nests is real and hard to undo.",
              why: "Too forceful for early data: it asks them to stop work before they have seen the evidence." },
            { id: "c", tier: "weak", text: "Wait until the data is complete, then send the coastal office a full report, so they get one clear answer they can act on with confidence.",
              why: "Waits too long: work on the wall may start before the report is ready." }
          ] },
        { id: "d2-s4", person: "kofi", reveals_mood: false,
          message: "Two volunteers disagree about where to put the new nest sensors: one wants them up by the dune, the other near the waterline. They have argued about it for two days, and the whole beach team is now waiting on the two of them.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Pick the spot with the stronger technical case yourself, and explain your reasoning to both volunteers so the beach team can move on with the work today.",
              why: "Decisive, but it leaves both volunteers out of the decision." },
            { id: "b", tier: "recommended", text: "Bring the two volunteers together, ask each to explain their choice against what the sensors must measure, and agree a spot that both of them can accept.",
              why: "Uses the shared goal to reach a decision both can accept." },
            { id: "c", tier: "acceptable", text: "Put sensors in both spots for a day, compare the readings from each, and use the results to decide where the sensors should stay for the season.",
              why: "Reasonable, but it costs a day and leaves the disagreement open until then." }
          ] }
      ],
      reflect: {
        heading: "How would each Researcher finish this sentence?",
        prompt: "At the end of today, I feel…",
        options: [ { id: "low", label: "Unbalanced" }, { id: "mid", label: "Neutral" }, { id: "high", label: "Balanced" } ],   // Day 2 words (real game's words, VERIFIED)
        moods: { ines: "mid", tomasz: "low", priya: "high", kofi: "mid" },
        why: {
          ines: "Ines could not be asked today, and her request did not show how she felt.",
          tomasz: "Tomasz said he was pulled in too many directions in Explore, and his Support request began \"I'm drowning\".",
          priya: "Priya's Support request said she had the updates under control: her work was in balance.",
          kofi: "Kofi told you in Explore that today felt ordinary."
        }
      }
    },

    /* === DAY 3 === */
    {
      id: "day3", name: "Day 3",
      goal_heading: "Day 3 Goal",
      // The Daily Goal carries the only day-specific steer (the stage intro cards must stay identical).
      goal: "Turn what the team has learned into a plan for the shore. Some Workstations' work has changed today.",
      phases: ["explore", "assign", "support", "reflect"],
      // THE STAGE INTRO CARDS ARE THE SAME ON EVERY DAY (the real game shows one fixed
      // text per stage). If you change one of these four texts, change it in Day 1,
      // Day 2 and Day 3 so all three stay identical. Nothing here may hint at the day's
      // own twist; the day-specific steer belongs in that day's "goal".
      intros: {
        explore: "Use your Explore Requests to learn about the Researchers and Workstations that matter for today's goal. Each request asks one Researcher or Workstation one question.\n\nWho and what you can ask changes from day to day.",
        assign: "Here is where each Researcher is working now.\n\nMove anyone you think should work somewhere else, using your goal, what you learned in Explore and what each Workstation needs.",
        support: "During the day, Researchers will come to you for advice on problems in their work. Each request describes a situation and offers several possible responses.\n\nChoose the response that helps them most. When more than one request is waiting, you decide which one to answer first.",
        reflect: "Before the day ends, think about how each Researcher is feeling. Use what they told you and how they came across in their requests today, and decide how each of them would describe their day."
      },
      instructions: {
        explore: "Click a Researcher or Workstation with a badge to ask one question. Each uses one Explore Request; each answers once a day. Answers go into your Notes.",
        assign: "Drag Researchers onto Workstations: up to two each, or none. Give a reason for every move. Everyone starts where their past experience put them; change anything today's work needs.",
        support: "Click a Researcher with an alert to open their request. Read the situation carefully, then choose the response that you think helps them and the project the most.",
        reflect: "Choose how each Researcher would finish the sentence, using what they told you and how they came across today. With nothing to go on, choose \"I don't know\"."
      },
      explore_points: 2,
      available: { people: ["kofi", "ines"], stations: ["nursery", "wildlife"] },   // INFERRED: 2 + 2 (SQ27)
      answers: {
        people: {
          kofi: {
            feeling: { text: "I'm fired up. We finally have enough data to build something real for the beach, and I'd like to build it with Tomasz on the turtle side of the work.",
                       useful: true, why: "Tells you Kofi felt motivated today, a cue for Reflect, and confirms he should work with Tomasz." },
            working: { text: "I like turning findings into things we can install on the beach, like sensors and fences. Put me with whoever understands the turtles best, so what I build actually helps them.",
                       useful: true, why: "Shows Kofi should work beside Tomasz at Wildlife." }
          },
          ines: {
            feeling: { text: "I'm steady today. Nothing new has gone wrong since yesterday, and I'd like to keep working at the Nursery or the tide pools, close to where my soil tests are.",
                       useful: true, why: "Tells you Ines felt steady today, a cue for Reflect, and that she wants to stay at the Nursery or the Tide." },
            working: { text: "I'd like a quiet stretch to finish my soil tests, at the Nursery or by the tide pools. I work best looking closely at roots, mud and water.",
                       useful: false, why: "Ines's role already told you where she fits; the request was better spent where the answer was open." }
          }
        },
        stations: {
          nursery: {
            work:  { text: "Researchers will choose new planting sites from the soil results, marking which stretches of shore to plant next. That is habitat planning, so it needs someone trained to plan habitats.",
                     useful: true, why: "Shows the Nursery needs a habitat planner today: Priya belongs at the Nursery now, not at Outreach." },
            learn: { text: "Seedlings in higher, firmer mud survived twice as often as the rest. Today the Nursery uses that to pick new planting sites, which is habitat planning, not growing seedlings.",
                     useful: true, why: "Told you the Nursery now plans new planting sites, which is habitat planning: Priya belongs there today, not at Outreach." }
          },
          wildlife: {
            work:  { text: "Researchers will design fencing to protect the nests before hatching begins. It needs an engineer who can build it, working alongside someone who knows how turtles use the beach.",
                     useful: true, why: "Shows Wildlife needs Kofi and Tomasz together." },
            learn: { text: "Hatching starts in ten days, so the fence must be designed now and built this week. It needs an engineer with a turtle expert beside him to get it right.",
                     useful: true, why: "Told you the fence must be designed now, by an engineer with a turtle expert: Kofi with Tomasz." }
          }
        }
      },
      // Day 3's own insight: Priya's best fit moves to the Nursery.
      // The change only counts against the candidate if today's Explore told them about it (C3).
      //   good_stations_override   = where the person fits today, INSTEAD of their usual good_stations
      //   override_revealed_by     = what the candidate must have asked TODAY for the change to apply.
      //                              Same shape as a reason's "needs", but each entry names its own id.
      //                              Leave it out and the change always applies.
      //   placement_why_override   = the results explanation when the change was revealed
      //   placement_why_unrevealed = the results explanation when it was not (no second penalty)
      good_stations_override: { priya: ["nursery"] },
      override_revealed_by:   { priya: [{ target: "station", id: "nursery", questions: ["work", "learn"] }] },
      placement_why_override: {   // shown in the results instead of the person's usual placement_why
        priya: "Today the Nursery chooses new planting sites from the soil results, which is habitat planning, so Priya fits the Nursery and Outreach no longer needs her most. You asked the Nursery today, so you were told this before you decided."
      },
      placement_why_unrevealed: {   // shown when nothing the candidate asked today revealed the change
        priya: "Nothing you asked today showed that the Nursery's work had changed, so Outreach was right on what you knew, and this row is marked against Outreach. Had you asked the Nursery what work is planned, you would have learned that today it chooses new planting sites, which is habitat planning, and that Priya fits there."
      },
      // Two start in the right place (Kofi, Tomasz), two do not (Priya, Ines). Repeating Day 2's answer is not enough.
      start_assignment: { nursery: [], tide: ["kofi"], outreach: ["priya"], wildlife: ["tomasz", "ines"] },
      support_groups: [["d3-s1", "d3-s2"], ["d3-s3", "d3-s4"], ["d3-s5"]],   // two, two, one
      support: [
        { id: "d3-s1", person: "kofi", reveals_mood: true,   // "I'm raring to go" = Motivated
          message: "I'm raring to go: the fence design is ready, and we could start building this week. The tourism office is nervous that fencing will spoil the beach for visitors. They told me summer bookings are already down this year.\n\nHow should I bring them on board?",
          options: [
            { id: "a", tier: "recommended", text: "Show them the design, ask what worries them most, and look together for changes that protect the nests and keep the beach open and welcoming.",
              why: "Listens to their concern and looks for a solution that works for both sides." },
            { id: "b", tier: "acceptable", text: "Send them the design with a short note on why the fencing matters for the turtles and how long it will need to stay on the beach.",
              why: "Explains the reason, but does not ask what worries them." },
            { id: "c", tier: "weak", text: "Explain that the fence is needed to meet the hatching deadline and that the design is final, then share the build schedule with them so they can plan.",
              why: "Clear, but too forceful: it informs a group the project needs instead of involving it." },
            { id: "d", tier: "weak", text: "Invite them to walk the beach and visit the nests with you next week, so they can see the risk for themselves before anyone decides anything about the fence.",
              why: "Waits too long: hatching starts soon." }
          ] },
        { id: "d3-s2", person: "priya", reveals_mood: true,   // "I'm stuck" = Stuck
          message: "I'm stuck. The council wants one recovery plan for the shore by Monday. The nursery team says replanting must come first, and the wildlife team says the nests cannot wait. Each lead has emailed me twice today, asking me to back them.\n\nHow can I move this forward?",
          options: [
            { id: "a", tier: "weak", text: "Ask the council which work matters most to them, since they asked for the plan, and order the whole plan to match what they tell you.",
              why: "Sounds client-focused, but it hands the decision away and leaves both teams unheard." },
            { id: "b", tier: "recommended", text: "Meet both teams together tomorrow, agree what the plan must achieve by Monday, and order the work around that shared goal before it goes to the council.",
              why: "Brings both teams to one goal and decides from there." },
            { id: "c", tier: "acceptable", text: "Draft a plan that splits the time evenly between the two teams, and ask both teams for comments before you send the draft on to the council.",
              why: "Fair, but an even split may not suit what the plan must achieve." },
            { id: "d", tier: "weak", text: "Put the nursery work first, because the seedlings drive the erosion, and schedule the wildlife work straight after it, so nothing is dropped from the plan.",
              why: "Has a logic to it, but it picks a side without hearing either team." }
          ] },
        { id: "d3-s3", person: "ines", reveals_mood: false,
          message: "My soil tests show the mud is too loose where the sea wall ends; I tested twelve spots along that stretch. Replanting there may fail again, but the planting team has already prepared those rows and plans to plant them on Thursday.\n\nWhat should I tell them?",
          options: [
            { id: "a", tier: "acceptable", text: "Share the results with the planting team and suggest they plant a small trial section first, so they can see how the seedlings do in that mud.",
              why: "Sensible, but it does not recognise the team's work or look for a better site." },
            { id: "b", tier: "recommended", text: "Walk the planting team through the results, recognise the work they have already done on those rows, and agree together where to plant instead before Thursday.",
              why: "Shares the evidence, respects their effort and decides with them." },
            { id: "c", tier: "weak", text: "Ask the planting team to stop work on those rows today, and send them the soil results tonight so they can read them in full before tomorrow.",
              why: "Quick, but too forceful: it stops their work before they have seen the evidence or had a say." },
            { id: "d", tier: "weak", text: "Repeat the tests at the same twelve spots before raising it with the planting team, so you don't disrupt their work on the strength of one set of results.",
              why: "Careful, but it waits too long: the rows may be planted before the tests are done." }
          ] },
        { id: "d3-s4", person: "kofi", reveals_mood: false,   // Kofi's second request today (VERIFIED: one person can ask twice)
          message: "The fence posts have arrived a third shorter than we ordered: the supplier mixed up our order with another one. They can swap them for the right ones, but it will take four days. We had planned to start building tomorrow, and hatching starts in ten days.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "recommended", text: "Ask the supplier for the swap, and in the meantime protect the most exposed nests with temporary barriers, so no nest is left open for four days.",
              why: "Fixes the order and protects the nests in the meantime." },
            { id: "b", tier: "weak", text: "Use the shorter posts as they are, setting each one a little less deep in the sand, so building can start tomorrow as planned and nothing waits on the supplier.",
              why: "Fast, but short posts sit less deep and weaken the fence." },
            { id: "c", tier: "acceptable", text: "Ask the team if anyone knows a faster local supplier before you decide, since a quicker swap would let the building start sooner and keep the plan on track.",
              why: "Reasonable, but it leaves the nests unprotected while you look." },
            { id: "d", tier: "weak", text: "Hold all the beach work until the right posts arrive, so the fence is built once and properly rather than patched together with the wrong parts.",
              why: "Thorough, but it waits four days and leaves the nests exposed." }
          ] },
        { id: "d3-s5", person: "tomasz", reveals_mood: false,
          message: "The students who helped with the nest counts want to publish their own article in the island newsletter next week. Some of their numbers are wrong: they counted forty-two nests, and we recorded thirty-seven. They sent me the draft this morning.\n\nHow should I handle this?",
          options: [
            { id: "a", tier: "acceptable", text: "Send them the correct numbers from the Lab's records and ask them to update the article before it goes out in the island newsletter next week.",
              why: "Fixes the numbers, but does not thank them or offer help." },
            { id: "b", tier: "weak", text: "Ask them to hold the article until the project's own report is out, so the numbers in both match and newsletter readers are not confused by two different counts.",
              why: "Sounds careful, but it delays their work and never fixes the wrong numbers with them." },
            { id: "c", tier: "recommended", text: "Thank them for their help this season, go through the numbers with them, and offer to check the article before it goes out in the island newsletter.",
              why: "Keeps their goodwill and makes sure the numbers are right." },
            { id: "d", tier: "weak", text: "Leave the article to them, since it is their work, and post the correct nest numbers on the Lab's own page for anyone who wants to check.",
              why: "Respects their work, but lets wrong numbers go out instead of fixing them at the source." }
          ] }
      ],
      reflect: {
        heading: "How would each Researcher finish this sentence?",
        prompt: "At the end of today, I feel…",
        options: [ { id: "low", label: "Stuck" }, { id: "mid", label: "Neutral" }, { id: "high", label: "Motivated" } ],   // Day 3 words: our own (SQ25)
        moods: { ines: "mid", tomasz: "mid", priya: "low", kofi: "high" },
        why: {
          ines: "Ines told you in Explore that she felt steady.",
          tomasz: "Tomasz could not be asked today, and his request did not show how he felt.",
          priya: "Priya's Support request began with \"I'm stuck\".",
          kofi: "Kofi said he was fired up in Explore, and his first Support request began \"I'm raring to go\"."
        }
      }
    }
  ]
};

/* ==========================================================================
   WORKED MARKING EXAMPLE (Day 2) - how the rules above turn choices into points.
   This exact run is checked by tools/test-marking.js.

   EXPLORE (3 requests). The candidate asks:
     Tomasz "How are you feeling..."   useful: true                    -> 1
     Kofi   "How are you feeling..."   useful: true                    -> 1
     Tide   "What work is planned..."  useful: true                    -> 1
     Explore = 3 out of 3.
     (Every answer on Day 2 is worth asking. The four answers in the whole file
      that are not are Day 1 Ines "How do you like to work", Day 1 Nursery
      "What work is planned", Day 1 Nursery "What have we learned" and Day 3
      Ines "How do you like to work": each one only repeats what the role text
      or the Workstation's description already said on screen.)

   ASSIGN. Day 2 starts: Nursery Priya - Tide Ines - Outreach Kofi - Wildlife Tomasz.
   The candidate moves:
     Kofi   -> Wildlife, reason "Researcher assistance"
              (needs Kofi "How do you like to work"; on Day 1 nothing was asked and
               today only "How are you feeling", so it is NOT honest: the results
               say "you had not asked, on any day so far, what this reason relies on")
     Priya  -> Outreach, reason "Workstation coverage"  (needs nothing: honest)
     Ines and Tomasz are left where they are (already well placed, so no reason is asked).
   Points (placement 1 + pair 0.5 if they share a GOOD Workstation with their pair + reason 0.5):
     Ines   Tide is a good fit 1 + no pair_with (0 of 0) + left well placed 0.5 = 1.5 of 1.5
     Tomasz Wildlife 1 + shares it with Kofi 0.5 + left well placed 0.5      = 2   of 2
     Kofi   Wildlife 1 + shares it with Tomasz 0.5 + not honest 0            = 1.5 of 2
     Priya  Outreach 1 + no pair_with + honest 0.5                           = 1.5 of 1.5
     Assign = 6.5 out of 7. (One pair, Tomasz and Kofi, earns the pair bonus for both.)
     Day 1 is different: it has score_pairs: false, so no pair bonus is scored at
     all and Day 1's Assign is out of 6, not 7. Day 3 is out of 7 like Day 2.

   SUPPORT. The recommended option on all four requests: 4 out of 4.

   REFLECT. True moods: Tomasz Unbalanced, Kofi Neutral, Priya Balanced, Ines Neutral.
     Tomasz: two cues (asked how he felt + his mood-revealing request). Answer Unbalanced -> 1 of 1
     Kofi:   one cue (asked how he felt). Answer Balanced (wrong)                 -> 0 of 1
     Priya:  one cue (her mood-revealing request). Answer Balanced                -> 1 of 1
     Ines:   no cue (not askable, her request reveals nothing). Answer Neutral.
             Right mood, but she gave no sign of it; "I don't know" was expected -> 0 of 1
     Reflect = 2 out of 4.

   THE DAY 3 CHANGE, IN ONE LINE. On Day 3 Priya's best fit moves to the Nursery,
   but only for a candidate who asked the Nursery something today. Ask it and
   leaving her at Outreach scores 0; do not ask it and Outreach still scores 1,
   and the results say what asking would have told them. Not asking the Nursery
   never costs the placement point: on what the candidate knew, Outreach was right.
   ========================================================================== */
