/* ==========================================================================
   SUSTAINABLE FUTURES LAB — TEACHING COPY (scenario: Sorrel Island)

   This content file is used ONLY to record the course video's playthrough.
   It is never given to customers. Same file layout as the live simulation's
   data/sfl2/content.js; read EDITING-GUIDE.md before changing it.
   The rules, scoring, benchmark and labels below are the live simulation's.
   ========================================================================== */
window.SFL_CONTENT = {

  title: "Sustainable Futures Lab Simulation",   // login heading, page title, results file name

  time_limit_minutes: 30,        // as the live simulation

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
      { id: "teammate",   label: "Researcher assistance",    needs: [{ target: "person",  questions: ["working", "feeling"] }] },   // either question counts (2 Oct 2026): a "feeling" answer can also say who the person wants to work beside
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
     TUTORIAL — five cards, clock paused. Same as the live sim except the
     first card's story paragraph.
     --------------------------------------------------------------------- */
  tutorial: {
    welcome: {
      heading: "Welcome to the Lab",
      body: "Sorrel is a small, hilly island of orchards and wildflower meadows. Its growers have kept honeybees for generations, and every spring the bees pollinate the fruit trees. The Sustainable Futures Lab studies how the island is changing and works with the island's other teams to protect what lives there.\n\nYou have joined the Lab as Team Leader. Over a three-day project, you will guide four Researchers as they work on a problem that threatens the island's harvest. Each day starts with a goal and has four stages: Explore, Assign, Support and Reflect.\n\nPress \"Continue\" for a short tour of the features you will use."
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
     ONBOARDING — the four questions are the live sim's (general, not story);
     the answers are this story's.
     --------------------------------------------------------------------- */
  onboarding: {
    intro_heading: "Project Introduction",
    intro: "Across Sorrel's hillsides, the growers' honeybee colonies are dying out. Hives that were full last spring now stand almost empty.\n\nWithout the bees, the orchards set very little fruit. If the colonies keep failing, this year's harvest could be lost.\n\nThe Lab has been asked to find out what is going wrong and to protect the colonies that remain.",
    rank_heading: "Prioritize Your Onboarding Brief",
    rank_instruction: "Your brief will answer the four questions below. Choose the order you want them answered in, from first to last.",
    brief_heading: "Onboarding Brief",
    questions: [
      { id: "ob-work", recommended_position: 1,
        text: "What does the Lab need to get done on this project?",
        answer: "The team will find out why the colonies are failing, protect the hives that are still healthy and keep the island's growers informed. The work happens at four Workstations, each with its own focus: Meadow, Spring, Liaison and Apiary.",
        why: "Start with the goal and the work: everything else depends on knowing what has to be achieved." },
      { id: "ob-known", recommended_position: 2,
        text: "What do we know about the problem so far?",
        answer: "The team has looked at a new orchard spray, the low water in the stream and a hive disease as possible causes of the failing colonies. None has been confirmed yet, so more evidence is needed.",
        why: "Next, what is already known about the problem, so you do not repeat work or jump to a cause." },
      { id: "ob-support", recommended_position: 3,
        text: "How can I help each Researcher do their best work?",
        answer: "You will learn what each Researcher is good at, decide where they work each day, and advise them when they ask for help. At the end of each day, you will also judge how each of them feels.",
        why: "Once the goal and the problem are clear, turn to the people who will do the work." },
      { id: "ob-together", recommended_position: 4,
        text: "How can I get the team working well together?",
        answer: "Each Researcher sees the problem differently and brings different skills. You decide when they work alone and when together. Your team: Mara (Ecologist), Leon (Biologist), Aiko (Habitat Planner) and Davi (Engineer).",
        why: "How the team works together builds on knowing the goal, the problem and each person, so it comes last." }
    ]
  },

  /* ---------------------------------------------------------------------
     PEOPLE — the same four every day.
     --------------------------------------------------------------------- */
  people: [
    { id: "mara", name: "Mara", role: "Ecologist", image: null,
      description: "Studies how plants, animals and their surroundings depend on one another.",
      good_stations: ["meadow", "apiary"],     // Meadow is her usual place; the Apiary fits when the bee work needs plant knowledge
      pair_with: ["leon"],                     // scored on Day 2 only (Days 1 and 3 have score_pairs: false)
      placement_why: "Mara's ecology training fits the Meadow, where the island's wildflowers are surveyed. When the bee work needs someone who knows the plants, she is also well placed at the Apiary beside Leon." },
    { id: "leon", name: "Leon", role: "Biologist", image: null,
      description: "Studies living things and what keeps them healthy.",
      good_stations: ["apiary"],
      pair_with: ["mara"],
      placement_why: "Leon studies what keeps living things healthy, so the Apiary, where the colonies are examined, is his place." },
    { id: "aiko", name: "Aiko", role: "Habitat Planner", image: null,
      description: "Plans how land is shared between wildlife and people.",
      good_stations: ["spring"],               // not obvious from her title: she has to tell you
      placement_why: "Aiko is trained to draw up plans that different users can share. At the Spring, that is the plan for who pumps how much water from the stream." },
    { id: "davi", name: "Davi", role: "Engineer", image: null,
      description: "Builds and looks after the instruments the Lab uses outdoors.",
      good_stations: ["liaison"],              // not obvious from his title: the Liaison's work is showing growers how to fit his meters
      placement_why: "Davi built the water meters the growers are being asked to fit. The Liaison's work is showing the growers how, so he fits there." }
  ],

  /* ---------------------------------------------------------------------
     WORKSTATIONS — the same four every day.
     --------------------------------------------------------------------- */
  stations: [
    { id: "meadow", name: "Meadow Workstation", short: "Meadow", icon: "leaf", colour: "green", image: null,
      description: "Where Researchers survey and replant the island's wildflower meadows." },
    { id: "spring", name: "Spring Workstation", short: "Spring", icon: "drop", colour: "blue", image: null,
      description: "Where Researchers test the stream and the water the island depends on." },
    { id: "liaison", name: "Liaison Workstation", short: "Liaison", icon: "signal", colour: "amber", image: null,
      description: "Where Researchers keep the island's growers and other teams informed." },
    { id: "apiary", name: "Apiary Workstation", short: "Apiary", icon: "hive", colour: "orange", image: null,
      description: "Where Researchers examine the honeybee colonies and their hives." }
  ],

  map: { image: null },

  /* ---------------------------------------------------------------------
     THE THREE DAYS
     --------------------------------------------------------------------- */
  days: [

    /* === DAY 1 === teaching points: skip the obvious; ask "feeling"; every move backed by an answer;
       each weak Support type once; one "I don't know". */
    {
      id: "day1", name: "Day 1",
      goal_heading: "Day 1 Goal",
      goal: "Today, put each Researcher where their strengths and wishes help the work most.",
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
      score_pairs: false,   // nobody in the pair, and neither of their Workstations' pair needs, can be learned today
      explore_points: 3,
      available: { people: ["aiko", "davi"], stations: ["liaison", "meadow"] },
      answers: {
        people: {
          aiko: {
            feeling: { text: "I'm confident about today. Every grower pumps from the same stream and nobody has a plan for sharing it. Planning that is my training, so I'd help most at the Spring.",
                       useful: true, why: "Tells you Aiko felt confident today, a cue for Reflect, and that she fits the Spring, which her title does not show." },
            working: { text: "I work best sitting down with the people affected and agreeing a plan with them. Put me at the Spring, where the stream has to be shared, and I'll get the growers talking.",
                       useful: true, why: "Shows Aiko fits the Spring, where a plan for sharing the stream is needed." }
          },
          davi: {
            feeling: { text: "Much the same as any other day. The water meters I built are finished and boxed. I'd rather be showing the growers how to fit them than sitting at my bench.",
                       useful: true, why: "Tells you Davi felt ordinary today, a cue for Reflect, and that he wants to be helping the growers fit his meters." },
            working: { text: "I like working with the people who will use what I build. The meters are ready, so put me with whoever deals with the growers and I'll show them how each one fits.",
                       useful: true, why: "Shows Davi belongs with whoever deals with the growers: the Liaison." }
          }
        },
        stations: {
          liaison: {
            work:  { text: "Every grower has been asked to fit one of the Lab's water meters to their pump this week. It needs someone who knows the equipment and can show people how to use it.",
                     useful: true, why: "Shows the Liaison needs someone who knows the meters, which points to Davi." },
            learn: { text: "Growers say the new water meters look complicated, and only three have fitted one so far. The Liaison needs someone who knows the equipment well enough to explain it simply.",
                     useful: true, why: "Told you the Liaison needs someone who can explain the meters, which points to Davi." }
          },
          meadow: {
            work:  { text: "Researchers will count the wildflowers in every meadow plot and record which are in bloom. It suits someone who knows how plants, animals and their surroundings depend on one another.",
                     useful: false, why: "The Meadow's description and Mara's role already told you this; the request was better spent where the answer was open." },
            learn: { text: "The plots nearest the orchards have the fewest flowers this year. Working out why suits someone who studies how plants, animals and their surroundings depend on one another.",
                     useful: false, why: "Mara's role already pointed to this work, so the answer only confirmed it; the request was better spent where the answer was open." }
          }
        }
      },
      // Two on one Workstation, one empty. Two start in the right place (Mara, Leon), two do not (Aiko, Davi).
      start_assignment: { meadow: ["mara", "aiko"], spring: ["davi"], liaison: [], apiary: ["leon"] },
      support_groups: [["d1-s1"], ["d1-s2"], ["d1-s3"], ["d1-s4"]],
      support: [
        { id: "d1-s1", person: "aiko", reveals_mood: true,   // "I'm confident the rota ... is fair" = Confident. Weak type: leaves someone out.
          message: "I'm confident the rota I've drafted for the stream is fair. The chair of the growers' association has offered to approve it tonight on behalf of all the growers. But three small growers at the bottom of the stream are not members of the association.\n\nShould I accept his offer?",
          options: [
            { id: "a", tier: "weak", text: "Accept the chair's offer, since the association speaks for most of the growers, and send the three small growers a copy of the rota as soon as it has been approved.",
              why: "Quick, but it leaves out three growers who pump from the same stream and have not seen the rota." },
            { id: "b", tier: "recommended", text: "Thank the chair, and ask for one more day to show the rota to the three small growers as well, so that everyone who pumps from the stream has seen it.",
              why: "Keeps the chair's support and makes sure nobody who uses the stream is left out." }
          ] },
        { id: "d1-s2", person: "leon", reveals_mood: false,   // Weak type: waits too long.
          message: "Three hives at the Hartley orchard have died since Monday, and the grower wants to know whether to move his other hives away. My tests on the dead bees will take another four days. He has asked me for an answer by tonight.\n\nWhat should I tell him?",
          options: [
            { id: "a", tier: "recommended", text: "Tell him what you know so far and what is still uncertain, and suggest moving the hives nearest the dead ones now, as a precaution, until the tests are done.",
              why: "Honest about what is not yet known, and still protects the hives most at risk." },
            { id: "b", tier: "weak", text: "Ask him to leave all the hives where they are until the tests are done in four days, so that he only has to act once, on a result you are both sure of.",
              why: "Sounds careful, but it waits too long: more hives may die in those four days." }
          ] },
        { id: "d1-s3", person: "mara", reveals_mood: true,   // "I'm not sure my flower counts can be trusted" = Doubtful. Both options are fine.
          message: "I'm not sure my flower counts can be trusted. Two volunteers counted the same meadow plot this morning and came back with very different numbers. Twenty plots are still to be counted today, by eight volunteers.\n\nWhat should I do about the counting?",
          options: [
            { id: "a", tier: "acceptable", text: "Count one plot together with all eight volunteers this afternoon, so that everyone sees the same method being used, and then carry on with the remaining plots as planned.",
              why: "Reasonable: it fixes the method from now on, though it does not find out what went wrong this morning." },
            { id: "b", tier: "recommended", text: "Ask the two volunteers to show you how each of them counted, agree one method with the whole group, and recount any plots that were done differently.",
              why: "Finds the cause first, agrees the method with everyone and repairs the counts already made." }
          ] },
        { id: "d1-s4", person: "davi", reveals_mood: false,   // The message shows the GROWER's mood, not Davi's. Weak type: too forceful.
          message: "One grower refuses to fit a water meter. He says the Lab has no right to measure what he pumps, and two of his neighbours are now hesitating too. Without his readings there will be a gap in the middle of the stream.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Tell him that every grower on the stream has to fit a meter this week, explain that the whole project depends on it, and book a time to install his.",
              why: "Clear, but too forceful: it tells him what to do without hearing his objection." },
            { id: "b", tier: "recommended", text: "Ask him what worries him about the meter, explain what the readings will and will not be used for, and look for a way he is comfortable taking part.",
              why: "Hears the objection first and looks for a way he can agree to." }
          ] }
      ],
      reflect: {
        heading: "How would each Researcher finish this sentence?",
        prompt: "At the end of today, I feel…",
        options: [ { id: "low", label: "Doubtful" }, { id: "mid", label: "Neutral" }, { id: "high", label: "Confident" } ],
        moods: { mara: "low", leon: "mid", aiko: "high", davi: "mid" },
        why: {
          mara: "Mara's Support request began \"I'm not sure my flower counts can be trusted\".",
          leon: "Leon could not be asked today, and his request did not show how he felt.",
          aiko: "Aiko's Support request began \"I'm confident the rota I've drafted for the stream is fair\". If you asked her in Explore, she said she was confident too.",
          davi: "If you asked Davi in Explore, he said today was much the same as any other day. His request showed how the grower felt, not how he felt."
        }
      }
    },

    /* === DAY 2 === teaching points: the Daily Goal steers the question (one "work with the team" question,
       at the cost of a mood clue); Researcher assistance; a move backed by today's answer that also matches
       yesterday's paper note; one Workstation left empty; a message that shows another team's mood. */
    {
      id: "day2", name: "Day 2",
      goal_heading: "Day 2 Goal",
      goal: "Today's work goes faster in pairs. Put Researchers who want to work together on the same Workstation.",
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
      explore_points: 3,
      available: { people: ["leon", "mara"], stations: ["apiary", "spring"] },
      answers: {
        people: {
          leon: {
            feeling: { text: "I feel on top of things today. The bee counts are up to date, and I know what the Apiary lacks: someone who can tell me which flowers the colonies are missing.",
                       useful: true, why: "Tells you Leon felt balanced today, a cue for Reflect, and that the Apiary needs someone who knows the flowers." },
            working: { text: "I can count the bees, but I can't tell which flowers they are missing. I'd get twice as far with Mara beside me at the Apiary, reading the plants.",
                       useful: true, why: "Shows Leon wants Mara beside him at the Apiary: a pairing you can act on." }
          },
          mara: {
            feeling: { text: "It's an ordinary day for me. The meadow counts are finished and in good order, so I have time to spare. I'd happily lend my plant knowledge wherever the bee work needs it.",
                       useful: true, why: "Tells you Mara felt ordinary today, a cue for Reflect, and that she is free to help where the bee work needs plant knowledge." },
            working: { text: "I like working next to someone whose skills differ from mine. With the meadow counts finished, I'd gladly join whoever needs a plant expert, and the bee work looks like the place.",
                       useful: true, why: "Shows Mara is ready to work beside someone on the bee work: Leon at the Apiary." }
          }
        },
        stations: {
          apiary: {
            work:  { text: "Researchers will record which flowers the surviving colonies visit, hive by hive. The work needs someone who knows bees and someone who knows plants, working side by side.",
                     useful: true, why: "Shows the Apiary needs a bee expert and a plant expert together: Leon and Mara." },
            learn: { text: "The healthiest colonies all feed in the same two meadows. Finding out what those meadows offer needs a bee expert and a plant expert working on it together.",
                     useful: true, why: "Told you the Apiary needs a bee expert and a plant expert together: Leon and Mara." }
          },
          spring: {
            work:  { text: "Researchers will draw up the rota for which grower pumps from the stream and when. It is planning work more than water testing, and suits someone trained to plan shared use.",
                     useful: true, why: "Shows the Spring needs a planner today, which points to Aiko." },
            learn: { text: "The stream is at half its usual level, so the growers must take turns to pump. Setting those turns is planning work, and suits someone trained to plan how something is shared.",
                     useful: true, why: "Told you the Spring's work is planning how the stream is shared, which points to Aiko." }
          }
        }
      },
      // One each (as photographed for Day 2). Two start in the right place (Leon, Davi), two do not (Mara, Aiko).
      start_assignment: { meadow: ["aiko"], spring: ["mara"], liaison: ["davi"], apiary: ["leon"] },
      support_groups: [["d2-s1"], ["d2-s2", "d2-s3"], ["d2-s4"]],
      support: [
        { id: "d2-s1", person: "aiko", reveals_mood: true,   // "I feel pulled in two directions" = Unbalanced
          message: "I feel pulled in two directions. The pumping rota was built for the growers we knew about, and now four more farms downstream say they draw from the same stream. The upper growers want the rota kept as it is; the new farms want a share.\n\nWhat should I do next?",
          options: [
            { id: "a", tier: "recommended", text: "Tell every grower what has changed, find out how much the four new farms pump and when, and rework the rota with every user of the stream taking part.",
              why: "Faces the bigger problem openly and reworks the plan with everyone it affects." },
            { id: "b", tier: "acceptable", text: "Keep this week's rota, let the four new farms go on pumping as they have been, and bring every user of the stream together to draw up next week's.",
              why: "Calm and practical, but the stream stays overdrawn for another week." },
            { id: "c", tier: "weak", text: "Keep the rota as it was agreed, since the growers on it have planned around it, and put the four new farms on a list for any hours left over.",
              why: "Protects the agreement, but it leaves four users of the stream out of the plan." }
          ] },
        { id: "d2-s2", person: "leon", reveals_mood: true,   // "The bee work feels well in hand today" = Balanced. A disagreement inside the team.
          message: "The bee work feels well in hand today. One problem, though: Aiko and Davi disagree about Friday's meeting with the growers. She wants to open with the rota; he wants to open with the meter readings. The talk has turned sharp, and both have asked me to back them.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Tell them that the meter readings will come first, since the numbers are what the growers are coming for, and ask them both to prepare on that basis.",
              why: "Settles it fast, but too forcefully: it overrules Aiko without hearing either of them out." },
            { id: "b", tier: "recommended", text: "Ask them both what the growers should leave the meeting knowing, let that decide the order, and have each of them present their own part.",
              why: "Goes back to the shared goal and lets it settle the order." },
            { id: "c", tier: "acceptable", text: "Suggest that each of them prepares their own part today, and that the three of you settle the order tomorrow, once both parts are ready.",
              why: "Keeps the work moving, but it leaves the disagreement itself for another day." }
          ] },
        { id: "d2-s3", person: "davi", reveals_mood: false,   // The message shows the HARBOUR CREW's mood, not Davi's.
          message: "The harbour crew is furious. Our meter deliveries have blocked their slipway twice this week, and their foreman says the crew is worn out and close to refusing our next shipment. Twelve more meters are due to arrive on Thursday.\n\nHow should I respond?",
          options: [
            { id: "a", tier: "recommended", text: "Apologise for the blocked slipway, ask the foreman which times and places suit the crew, and agree a delivery plan for Thursday that keeps the slipway clear.",
              why: "Takes the complaint seriously and fixes Thursday with the people affected." },
            { id: "b", tier: "weak", text: "Wait until Thursday's shipment has arrived before raising it, so that you can go through the whole week with the foreman and settle everything in one conversation.",
              why: "Tidy, but it waits too long: the crew may refuse the shipment before you have spoken." },
            { id: "c", tier: "acceptable", text: "Send the foreman a note apologising for the trouble, and tell him that Thursday's shipment will be unloaded at the far end of the quay instead.",
              why: "Fixes the slipway, but it decides the new arrangement without asking the crew." }
          ] },
        { id: "d2-s4", person: "mara", reveals_mood: false,   // A technical judgement.
          message: "Two of the hives were given the same number by mistake, so thirty pollen samples are mixed and I can't tell which hive each came from. The testing lab collects tomorrow morning and will not come again for two weeks. The growers are waiting for its results.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Send all the samples as they are, under the shared number, so that the collection goes ahead on time, and work out which hive is which once the results are back.",
              why: "Keeps to the timetable, but it lets results nobody can trust go out to the growers." },
            { id: "b", tier: "recommended", text: "Send the samples you are sure of, hold the thirty mixed ones back, and tell the lab and the growers which two hives will follow later.",
              why: "Keeps the reliable work on time and is open about the part that is not." },
            { id: "c", tier: "acceptable", text: "Ask the lab to skip tomorrow and collect everything in two weeks, and use the time to gather fresh samples from the two hives, so that all the results arrive together.",
              why: "Gets clean samples, but it holds every result back for two weeks to fix two hives." }
          ] }
      ],
      reflect: {
        heading: "How would each Researcher finish this sentence?",
        prompt: "At the end of today, I feel…",
        options: [ { id: "low", label: "Unbalanced" }, { id: "mid", label: "Neutral" }, { id: "high", label: "Balanced" } ],
        moods: { mara: "mid", leon: "high", aiko: "low", davi: "mid" },
        why: {
          mara: "If you asked Mara in Explore, she said it was an ordinary day for her. Her request did not show how she felt.",
          leon: "Leon's Support request began \"The bee work feels well in hand today\". If you asked him how he felt in Explore, he said he felt on top of things.",
          aiko: "Aiko's Support request began \"I feel pulled in two directions\".",
          davi: "Davi could not be asked today. His request described how the harbour crew felt, not how he felt."
        }
      }
    },

    /* === DAY 3 === teaching points: yesterday's right layout is wrong today; both requests go to
       Workstations because the Goal says work has changed; one "new information" question; every
       Reflect clue comes from Support (paper notes); one Researcher asks twice. */
    {
      id: "day3", name: "Day 3",
      goal_heading: "Day 3 Goal",
      goal: "The findings are in, and some Workstations have new work today. Move Researchers to match it.",
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
      score_pairs: false,   // today's goal is changed work, not pairs
      explore_points: 2,
      available: { people: ["mara", "leon"], stations: ["apiary", "spring"] },
      answers: {
        people: {
          mara: {
            feeling: { text: "I'm fine today, nothing more than that. The flower records are finished and the meadows need their usual counts. I'm happiest back at the Meadow, keeping those going.",
                       useful: true, why: "Tells you Mara felt ordinary today, a cue for Reflect, and that she belongs back at the Meadow." },
            working: { text: "With the flower records finished, I'd like a quiet day on my own counts. I work best at the Meadow, where I know every plot and every flower in it.",
                       useful: false, why: "Mara's role and the Meadow's description already told you where she fits; the request was better spent on what has changed." }
          },
          leon: {
            feeling: { text: "Discouraged, honestly. Colonies are still dying downwind of the sprayed orchards, and I can't stop it from here. The Apiary is still where I'm needed, with the hives.",
                       useful: true, why: "Tells you Leon felt discouraged today, a cue for Reflect, and that he should stay at the Apiary." },
            working: { text: "I'd like to stay with the colonies today. I work best at the Apiary, where I can open each hive and see for myself how it is doing.",
                       useful: false, why: "Leon's role and the Apiary's description already told you where he fits; the request was better spent on what has changed." }
          }
        },
        stations: {
          apiary: {
            work:  { text: "Researchers will choose new sites for the hives, sheltered from the orchard spray. Choosing sites is land planning, so it needs someone trained to plan how land is shared, beside our bee expert.",
                     useful: true, why: "Shows the Apiary needs a land planner today: Aiko belongs there now, beside Leon." },
            learn: { text: "Colonies downwind of the sprayed orchards are failing fastest. Today the hives move to sheltered sites, and picking those sites is work for someone trained to plan how land is shared.",
                     useful: true, why: "Told you the Apiary is choosing new hive sites today, which is land planning: Aiko belongs there now." }
          },
          spring: {
            work:  { text: "Researchers will check and reset the water meter on every pump along the stream. It is equipment work now, not planning, and needs the person who knows how the meters are built.",
                     useful: true, why: "Shows the Spring's work is now resetting the meters: Davi belongs there today." },
            learn: { text: "The stream tests came back clean, so the water is no longer suspected. But half the meters are giving false readings and need resetting, which is work for whoever built them.",
                     useful: true, why: "Told you the water is cleared and the Spring's work is now resetting the meters: Davi belongs there today." }
          }
        }
      },
      // Today's two changes. Each counts only if the candidate asked something today that revealed it.
      good_stations_override: { aiko: ["apiary"], davi: ["spring"] },
      override_revealed_by: {
        aiko: [{ target: "station", id: "apiary", questions: ["work", "learn"] }],
        davi: [{ target: "station", id: "spring", questions: ["work", "learn"] }]
      },
      placement_why_override: {
        aiko: "Today the Apiary chooses new sites for the hives, which is land planning, so Aiko fits the Apiary beside Leon. You asked the Apiary today, so you were told this before you decided.",
        davi: "Today the Spring's work is resetting the water meters Davi built, so he fits the Spring and the Liaison no longer needs him most. You asked the Spring today, so you were told this before you decided."
      },
      placement_why_unrevealed: {
        aiko: "Nothing you asked today showed that the Apiary's work had changed, so the Spring was right on what you knew, and this row is marked against the Spring. Had you asked the Apiary, you would have learned that today it chooses new hive sites, which is land planning, and that Aiko fits there.",
        davi: "Nothing you asked today showed that the Spring's work had changed, so the Liaison was right on what you knew, and this row is marked against the Liaison. Had you asked the Spring, you would have learned that the meters need resetting and that Davi fits the Spring today."
      },
      // Yesterday's right layout: everyone starts where they usually fit. Two are now in the wrong place (Aiko, Davi).
      start_assignment: { meadow: ["mara"], spring: ["aiko"], liaison: ["davi"], apiary: ["leon"] },
      support_groups: [["d3-s1", "d3-s2"], ["d3-s3", "d3-s4"], ["d3-s5"]],
      support: [
        { id: "d3-s1", person: "mara", reveals_mood: false,
          message: "The wildflower strips we sowed as a trial are already drawing bees. Now six growers want seed for their own land this week, and we have enough for two. The supplier can send more, but it will take three weeks.\n\nHow should I handle the requests?",
          options: [
            { id: "a", tier: "recommended", text: "Tell all six how much seed there is, agree with them where two strips would help the colonies most, and order the rest now for the other four.",
              why: "Open with all six, and decides with them where the scarce seed does most good." },
            { id: "b", tier: "acceptable", text: "Give the seed to the first two growers who asked for it, order more today, and promise the other four that theirs will follow as soon as it arrives.",
              why: "Simple and fair on its face, but the seed may not go where the colonies need it most." },
            { id: "c", tier: "weak", text: "Choose the two farms nearest the weakest colonies yourself, deliver the seed there this week, and let the other four growers know once it has been done.",
              why: "Puts the seed in a sensible place, but it decides for all six growers without involving them." },
            { id: "d", tier: "weak", text: "Hold all the seed back until the full order arrives in three weeks, so that all six growers can sow at the same time and nobody is passed over.",
              why: "Even-handed, but it waits too long: three weeks of flowering are lost for the colonies." }
          ] },
        { id: "d3-s2", person: "leon", reveals_mood: true,   // "It's disheartening" = Discouraged
          message: "It's disheartening. We moved six hives to the sheltered sites this morning, and one grower has moved his straight back, saying the new site is too far from his trees. Two others are now talking about doing the same.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Tell the grower that the sheltered sites were chosen on the evidence, that a hive moved back will be at risk, and ask him to return his hive today.",
              why: "Accurate, but too forceful: it tells him what to do without hearing why he moved the hive." },
            { id: "b", tier: "recommended", text: "Visit the grower, ask what the distance costs him, show him what the spray is doing to colonies like his, and look together for a sheltered site nearer his trees.",
              why: "Hears his reason, shares the evidence and looks for a site that works for him." },
            { id: "c", tier: "acceptable", text: "Check with Aiko whether there is a sheltered site closer to his trees, and if there is one, offer it to him in place of the site he has left.",
              why: "Practical, but it does not ask him what the problem is or show him the risk." },
            { id: "d", tier: "weak", text: "Leave his hive where he has put it, since it is his to place, and concentrate on the growers who are willing to keep theirs at the sheltered sites.",
              why: "Respects his choice, but it leaves a colony at risk and ignores the two growers who may follow him." }
          ] },
        { id: "d3-s3", person: "aiko", reveals_mood: false,   // Aiko's first request today.
          message: "The sheltered site I chose for the northern hives turns out to be the village picnic ground. It is the only spot on that hillside out of the spray, but the parish council has not been asked. The hives are due to move there tomorrow.\n\nHow should I proceed?",
          options: [
            { id: "a", tier: "acceptable", text: "Write to the parish council today explaining why the picnic ground was chosen, and ask them to let you know before tomorrow if they object to it.",
              why: "Informs the council in time, but it leaves them little room to shape the decision." },
            { id: "b", tier: "weak", text: "Put off tomorrow's move until the council's next monthly meeting, so that the site can be discussed properly and approved before any hive is placed there.",
              why: "Respectful, but it waits too long: the northern hives stay in the spray until the meeting." },
            { id: "c", tier: "recommended", text: "Speak to the parish council today, explain why that site shelters the hives, ask what the village needs from the picnic ground, and agree where the hives can stand.",
              why: "Involves the council before the move and settles the details with them." },
            { id: "d", tier: "weak", text: "Go ahead with the move tomorrow as planned, since the hives can be shifted again if the council objects, and write to the council once they are in place.",
              why: "Keeps to the timetable, but it leaves the village out of a decision about its own ground." }
          ] },
        { id: "d3-s4", person: "davi", reveals_mood: true,   // "I'm encouraged" = Encouraged. A technical judgement.
          message: "I'm encouraged: every meter on the stream is now reset. But the new readings disagree with the old pump logs by about a fifth, and I can't yet tell which of the two is wrong. Next week's pumping rota will be built on these numbers.\n\nWhat should I do?",
          options: [
            { id: "a", tier: "weak", text: "Hold the rota back until you have traced the difference between the two sets of numbers, so that it is built on figures the growers will not question.",
              why: "Thorough, but it waits too long: next week's rota cannot wait for a full investigation." },
            { id: "b", tier: "recommended", text: "Test two of the meters against a measured tank today to see which figure is right, and warn the rota team now that the numbers may shift by a fifth.",
              why: "Starts with the quickest check and warns the people who depend on the numbers." },
            { id: "c", tier: "acceptable", text: "Give the rota team both sets of numbers and explain the gap between them, so that they can choose which set to use for next week.",
              why: "Open about the problem, but it hands the team a question they cannot answer." },
            { id: "d", tier: "weak", text: "Use the meter readings as they are, since the meters are newer than the logs, and build the rota on them, treating the old logs as the less reliable record.",
              why: "Fast, but it assumes the newer figure is right without checking." }
          ] },
        { id: "d3-s5", person: "aiko", reveals_mood: false,   // Aiko's second request today.
          message: "One last thing before the day ends. Leon wants to move the remaining hives tonight, in the dark, while the bees are quiet. Two growers have asked to be there when theirs are moved, and they can only come in the morning.\n\nWhat should I tell Leon?",
          options: [
            { id: "a", tier: "weak", text: "Move all the hives tonight as Leon suggests, since that is best for the bees, and let the two growers know in the morning how the move went.",
              why: "Good for the bees, but it leaves out two growers who asked to be there." },
            { id: "b", tier: "recommended", text: "Move tonight every hive whose owner is content, and agree with Leon and the two growers a time at first light for theirs, before the bees are flying.",
              why: "Keeps the move on time and includes the two growers who asked to be there." },
            { id: "c", tier: "acceptable", text: "Ask Leon to move all the hives at first light instead of tonight, so that the two growers can be there when theirs are moved.",
              why: "Includes the two growers, but it changes the plan for every hive to do so." },
            { id: "d", tier: "weak", text: "Put the whole move off until a day when every grower can be there, so that nobody's hives are moved without them, and tell Leon why.",
              why: "Considerate, but it waits too long: the hives stay in the spray in the meantime." }
          ] }
      ],
      reflect: {
        heading: "How would each Researcher finish this sentence?",
        prompt: "At the end of today, I feel…",
        options: [ { id: "low", label: "Discouraged" }, { id: "mid", label: "Neutral" }, { id: "high", label: "Encouraged" } ],   // Day 3 words: our own; the real ones were not photographed
        moods: { mara: "mid", leon: "low", aiko: "mid", davi: "high" },
        why: {
          mara: "If you asked Mara in Explore, she said she was fine today, nothing more. Her request did not show how she felt.",
          leon: "Leon's Support request began \"It's disheartening\". If you asked him in Explore, he said he was discouraged.",
          aiko: "Aiko could not be asked today, and neither of her requests showed how she felt.",
          davi: "Davi's Support request began \"I'm encouraged\"."
        }
      }
    }
  ]
};

/* ==========================================================================
   PRESENTER AIDS — used only in this teaching copy. With "enabled: false"
   the simulation behaves exactly like the live one.
   steps = the recorded route, ONE ENTRY PER SCREEN VISIT, in order. Each step
   names the screen it happens on and carries that visit's bubbles, in the
   order they are shown. A key shows the next bubble, a key goes back, a key
   hides it. style "think" = yellow thinking bubble; "paper" = an
   "On my paper" note.
   ========================================================================== */
window.SFL_CONTENT.presenter = {
  enabled: true,
  paper_title: "On my paper",
  // The recorded route as data, for the jump keys (Ctrl+Shift+1/2/3): jumping to Day N
  // plays these choices for the days before it. Same route as tools/teach-route.json.
  clock_presets_minutes: [30, 21, 12],   // time left on the clock after a jump to Day 1, 2, 3
  route: {
    onboarding_order: ["ob-work", "ob-known", "ob-support", "ob-together"],
    days: [
      { // Day 1
        asked: [{ target: "person", id: "aiko", q: "feeling" }, { target: "person", id: "davi", q: "feeling" }, { target: "station", id: "liaison", q: "work" }],
        assignment: { mara: "meadow", leon: "apiary", aiko: "spring", davi: "liaison" },
        reasons: { aiko: "preference", davi: "needs" },
        reasonTo: { aiko: "spring", davi: "liaison" },
        support: { "d1-s1": "b", "d1-s2": "a", "d1-s3": "b", "d1-s4": "b" },
        reflect: { mara: "low", leon: "idk", aiko: "high", davi: "mid" }
      },
      { // Day 2
        asked: [{ target: "person", id: "leon", q: "working" }, { target: "person", id: "mara", q: "feeling" }, { target: "station", id: "spring", q: "work" }],
        assignment: { mara: "apiary", leon: "apiary", aiko: "spring", davi: "liaison" },
        reasons: { mara: "teammate", aiko: "needs" },
        reasonTo: { mara: "apiary", aiko: "spring" },
        support: { "d2-s1": "a", "d2-s2": "b", "d2-s3": "a", "d2-s4": "b" },
        reflect: { mara: "mid", leon: "high", aiko: "low", davi: "idk" }
      },
      { // Day 3
        asked: [{ target: "station", id: "apiary", q: "work" }, { target: "station", id: "spring", q: "learn" }],
        assignment: { mara: "meadow", leon: "apiary", aiko: "apiary", davi: "spring" },
        reasons: { aiko: "needs", davi: "needs" },
        reasonTo: { aiko: "apiary", davi: "spring" },
        support: { "d3-s1": "a", "d3-s2": "b", "d3-s3": "c", "d3-s4": "b", "d3-s5": "b" },
        reflect: { mara: "idk", leon: "low", aiko: "idk", davi: "high" }
      }
    ]
  },
  steps: [
    { screen: "start", bubbles: [] },
    { screen: "tut.welcome", bubbles: [{ style: "think", anchor: "body", text: "Three days, four stages a day: Explore, Assign, Support, Reflect." }] },
    { screen: "tut.timer", bubbles: [{ style: "think", anchor: "body", text: "One clock for the whole game. Once it starts, it never stops." }] },
    { screen: "tut.notes", bubbles: [{ style: "think", anchor: "body", text: "Notes only hold the descriptions and my Explore answers, and they empty every day. So: pen and paper." }] },
    { screen: "tut.help", bubbles: [] },
    { screen: "tut.complete", bubbles: [{ style: "think", anchor: "button", text: "Clicking this starts the clock." }] },
    { screen: "onb.intro", bubbles: [{ style: "think", anchor: "body", text: "Skim the story. It is background, not something to memorise." }] },
    { screen: "onb.rank", bubbles: [{ style: "think", anchor: "rank:ob-work", text: "SPOT the blocker: without the goal and the work, nothing else makes sense. That goes first." }, { style: "think", anchor: ["rank:ob-known", "rank:ob-support", "rank:ob-together"], text: "STACK: next, what is already known, so I don't repeat work. Then the people who do the work. Teamwork builds on all three, so it goes last." }, { style: "think", anchor: "button", text: "SETTLE: I get all four answers whatever the order. Get the first two right and move on." }] },
    { screen: "onb.brief", bubbles: [{ style: "think", anchor: "brief:4", text: "This Brief does not come back. I write the four roles down before I click." }, { style: "paper", anchor: "pad", text: "Mara – Ecologist · Leon – Biologist · Aiko – Habitat Planner · Davi – Engineer. Workstations: Meadow, Spring, Liaison, Apiary." }] },
    { screen: "d1.goal", bubbles: [{ style: "think", anchor: "body", text: "RESET: read the Daily Goal closely. Today is about each person's strengths and wishes." }] },
    { screen: "d1.explore.intro", bubbles: [{ style: "think", anchor: "body", text: "In the real game this card was word for word the same on Day 2. From tomorrow I skim it." }] },
    { screen: "d1.explore.map", bubbles: [{ style: "think", anchor: "requests", text: "SCAN: three requests, four things I may ask today: Aiko, Davi, the Liaison and the Meadow." }, { style: "think", anchor: "notes-pill", text: "The one-line descriptions of all four Researchers and all four Workstations are in Notes. I read them before I spend anything." }, { style: "think", anchor: ["station:meadow", "person:mara"], text: "MATCH the obvious: an Ecologist and a plants Workstation. I do not need to ask the Meadow." }, { style: "think", anchor: ["person:aiko", "person:davi", "station:liaison"], text: "SPEND on the gaps: I cannot guess where a Habitat Planner or an Engineer fits here. So: Aiko, Davi and the Liaison." }] },
    { screen: "d1.ask.aiko", bubbles: [{ style: "think", anchor: "question:feeling", text: "One question per person per day. My default question is \"How are you feeling\": it is the only mood clue I can ask for." }] },
    { screen: "d1.answer.aiko", bubbles: [{ style: "think", anchor: "answer", text: "Two things in one answer: she is confident, and she fits the Spring." }, { style: "paper", anchor: "pad", text: "Day 1 – Aiko: confident. Wants the Spring (plan for sharing the stream)." }] },
    { screen: "d1.explore.map", bubbles: [] },
    { screen: "d1.ask.davi", bubbles: [{ style: "think", anchor: "question:feeling", text: "Same default question for Davi." }] },
    { screen: "d1.answer.davi", bubbles: [{ style: "think", anchor: "answer", text: "An ordinary day for him. And he wants to be out showing growers how to fit his meters." }, { style: "paper", anchor: "pad", text: "Day 1 – Davi: ordinary day. Wants to help growers fit the meters." }] },
    { screen: "d1.explore.map", bubbles: [] },
    { screen: "d1.ask.liaison", bubbles: [{ style: "think", anchor: "question:work", text: "For a Workstation, either question helps. This one names the skill outright." }] },
    { screen: "d1.answer.liaison", bubbles: [{ style: "think", anchor: "answer", text: "The Liaison needs someone who knows the meters. That is Davi." }, { style: "think", anchor: "requests", text: "All three requests used. I never leave one unspent." }] },
    { screen: "d1.explore.map", bubbles: [] },
    { screen: "d1.assign.intro", bubbles: [] },
    { screen: "d1.assign.map", bubbles: [{ style: "think", anchor: ["station:meadow", "station:liaison"], text: "The starting layout is a hint, not the answer. Two share the Meadow, and the Liaison is empty." }, { style: "think", anchor: "person:aiko", text: "ANCHOR: I start with the two people I have answers about. Aiko first: she told me she fits the Spring." }] },
    { screen: "d1.reason.aiko", bubbles: [{ style: "think", anchor: "reason:preference", text: "LABEL honestly: she told me she wanted it. That is \"Researcher preference\"." }] },
    { screen: "d1.assign.map", bubbles: [{ style: "think", anchor: "person:davi", text: "Now Davi, to the Liaison. It needs someone who knows the meters, and he built them." }] },
    { screen: "d1.reason.davi", bubbles: [{ style: "think", anchor: "reason:needs", text: "The Liaison told me what it needs today: \"Latest workstation needs\"." }, { style: "think", anchor: "reason:coverage", text: "The Liaison was empty, so \"Workstation coverage\" is true as well. But a reason I was told beats coverage. Coverage is for moves nothing else backs." }] },
    { screen: "d1.assign.map", bubbles: [{ style: "think", anchor: ["person:mara", "person:leon"], text: "FILL: Mara and Leon already sit where their descriptions fit, so I leave them. Every Workstation is covered." }] },
    { screen: "d1.assign.complete", bubbles: [] },
    { screen: "d1.support.intro", bubbles: [] },
    { screen: "d1.support.map", bubbles: [{ style: "think", anchor: "person:aiko", text: "An alert means a request. Today they arrive one at a time." }] },
    { screen: "d1.request.d1-s1", bubbles: [] },
    { screen: "d1.question.d1-s1", bubbles: [{ style: "think", anchor: "message", text: "IDENTIFY: a decision involving people outside my team: the growers." }, { style: "think", anchor: "option:a", text: "CHOOSE by elimination. The first option approves the rota without the three small growers. It leaves someone out." }, { style: "think", anchor: "option:b", may_cover: ["option:a"], text: "So I pick the second: it asks for one more day, so that everyone who pumps from the stream sees the rota." }, { style: "paper", anchor: "pad", text: "Day 1 – Aiko: rota approval. \"I'm confident\" – confident again." }] },
    { screen: "d1.support.map", bubbles: [] },
    { screen: "d1.request.d1-s2", bubbles: [] },
    { screen: "d1.question.d1-s2", bubbles: [{ style: "think", anchor: "option:b", text: "The second option waits four days for certainty while hives are dying. It delays too much." }, { style: "think", anchor: "option:a", may_cover: ["option:b"], text: "So I pick the first: it is honest about what is not known yet, and still protects the hives most at risk." }, { style: "paper", anchor: "pad", text: "Day 1 – Leon: dead hives at Hartley. No sign of how he feels." }] },
    { screen: "d1.support.map", bubbles: [] },
    { screen: "d1.request.d1-s3", bubbles: [] },
    { screen: "d1.question.d1-s3", bubbles: [{ style: "think", anchor: ["option:b", "option:a"], text: "Neither option is weak. Both work. Mine is the second: it finds out what went wrong before fixing it." }, { style: "paper", anchor: "pad", text: "Day 1 – Mara: flower counts differ. \"Not sure my counts can be trusted\" – doubtful." }] },
    { screen: "d1.support.map", bubbles: [] },
    { screen: "d1.request.d1-s4", bubbles: [] },
    { screen: "d1.question.d1-s4", bubbles: [{ style: "think", anchor: "option:a", text: "The first option tells the grower what to do. Too forceful." }, { style: "think", anchor: "option:b", may_cover: ["option:a"], text: "So I pick the second: it asks what worries him first, then looks for a way he can agree to." }, { style: "paper", anchor: "pad", text: "Day 1 – Davi: grower refusing a meter. The grower is upset; no sign of Davi's own mood." }] },
    { screen: "d1.support.map", bubbles: [] },
    { screen: "d1.reflect.intro", bubbles: [] },
    { screen: "d1.reflect", bubbles: [{ style: "paper", anchor: "persist", text: "Aiko – confident (asked); \"I'm confident\" (rota request)\nDavi – ordinary day (asked)\nMara – \"not sure my counts can be trusted\" (request)\nLeon – nothing" }, { style: "think", anchor: "notes-pill", text: "RECALL: two possible clues per person. Their \"feeling\" answer is still in Notes. How they sounded in Support is only on my paper." }, { style: "think", anchor: "reflect-head", text: "READ against today's words. Aiko was confident twice. Mara doubted her counts: Doubtful. Davi said an ordinary day: Neutral." }, { style: "think", anchor: "row:leon", text: "RESIST: I have nothing on Leon. \"I don't know\" is a real answer, and the game's own instruction offers it." }] },
    { screen: "d2.goal", bubbles: [{ style: "think", anchor: "body", text: "RESET: a new goal. Today is about who works better together." }, { style: "think", anchor: "body", text: "This goal's wording is ours. The real Day 2 goal was not photographed." }] },
    { screen: "d2.explore.intro", bubbles: [{ style: "think", anchor: "body", text: "Same card as yesterday. Skim." }] },
    { screen: "d2.explore.map", bubbles: [{ style: "think", anchor: "notes-pill", text: "Notes are empty again. Yesterday now lives only on my paper." }, { style: "think", anchor: ["person:leon", "person:mara", "station:apiary", "station:spring"], text: "Different targets today: Leon, Mara, the Apiary and the Spring. Three requests." }, { style: "think", anchor: "goal", text: "The goal is about people working together, so I ask the two people first. Their answers will tell me which Workstation to ask." }] },
    { screen: "d2.ask.leon", bubbles: [{ style: "think", anchor: "question:working", text: "Today's goal is about working together, and this question asks exactly that. So for one person I ask it." }, { style: "think", anchor: "question:feeling", text: "The cost: no mood clue from Leon in Explore." }] },
    { screen: "d2.answer.leon", bubbles: [{ style: "think", anchor: "answer", text: "He names it: Mara beside him at the Apiary." }, { style: "paper", anchor: "pad", text: "Day 2 – Leon: wants Mara with him at the Apiary. No mood clue yet." }] },
    { screen: "d2.explore.map", bubbles: [] },
    { screen: "d2.ask.mara", bubbles: [{ style: "think", anchor: "question:feeling", text: "Back to my default question for Mara." }] },
    { screen: "d2.answer.mara", bubbles: [{ style: "think", anchor: "answer", text: "An ordinary day, counts finished, glad to help the bee work. The pairing fits from her side too." }, { style: "paper", anchor: "pad", text: "Day 2 – Mara: ordinary day. Meadow counts finished; free to help the bee work." }] },
    { screen: "d2.explore.map", bubbles: [{ style: "think", anchor: "station:spring", text: "One request left. Both people have pointed at the Apiary, so the Spring is my gap." }] },
    { screen: "d2.ask.spring", bubbles: [{ style: "think", anchor: "question:work", text: "Either Workstation question helps. I ask what work is planned." }] },
    { screen: "d2.answer.spring", bubbles: [{ style: "think", anchor: "answer", text: "Planning work. That is Aiko's training." }, { style: "paper", anchor: "pad", text: "Yesterday – Aiko: wants the Spring. Today's answer says the same." }] },
    { screen: "d2.explore.map", bubbles: [] },
    { screen: "d2.assign.intro", bubbles: [] },
    { screen: "d2.assign.map", bubbles: [{ style: "think", anchor: "none", text: "The layout has changed overnight: one person on each Workstation. I check it fresh." }, { style: "think", anchor: "person:mara", text: "ANCHOR: Leon asked for Mara at the Apiary, and that is today's goal." }] },
    { screen: "d2.reason.mara", bubbles: [{ style: "think", anchor: "reason:teammate", text: "I am placing her to help a colleague. That is \"Researcher assistance\"." }] },
    { screen: "d2.assign.map", bubbles: [{ style: "think", anchor: "person:aiko", text: "Now Aiko. The Spring's work today is planning, and that is her training." }] },
    { screen: "d2.reason.aiko", bubbles: [{ style: "think", anchor: "reason:needs", text: "The Spring told me today what it needs: \"Latest workstation needs\"." }, { style: "think", anchor: "reason:needs", text: "If I had not asked the Spring, I would still move her on yesterday's note. Today's answers come first; yesterday's notes are my fallback." }] },
    { screen: "d2.assign.map", bubbles: [{ style: "think", anchor: "station:meadow", text: "Four people, one pair: one Workstation stays empty. Mara said the meadow counts are finished, so the Meadow can wait." }] },
    { screen: "d2.assign.complete", bubbles: [] },
    { screen: "d2.support.intro", bubbles: [] },
    { screen: "d2.support.map", bubbles: [] },
    { screen: "d2.request.d2-s1", bubbles: [] },
    { screen: "d2.question.d2-s1", bubbles: [{ style: "think", anchor: "option:c", text: "Three options now. The third keeps four users of the stream out of the plan: out." }, { style: "think", anchor: ["option:a", "option:b"], may_cover: ["option:c"], text: "Two left. The second is fine, but the stream stays overdrawn for another week. The first reworks the plan with everyone: I pick the first." }, { style: "paper", anchor: "pad", text: "Day 2 – Aiko: four new farms on the stream. \"Pulled in two directions\"." }] },
    { screen: "d2.support.map", bubbles: [{ style: "think", anchor: ["person:leon", "person:davi"], text: "Two requests at once. The order is mine. I just answer what is there." }] },
    { screen: "d2.request.d2-s2", bubbles: [] },
    { screen: "d2.question.d2-s2", bubbles: [{ style: "think", anchor: "message", text: "IDENTIFY: this one is a disagreement inside my own team." }, { style: "think", anchor: "option:a", text: "The first option overrules Aiko without hearing either of them: too forceful. Out." }, { style: "think", anchor: ["option:b", "option:c"], may_cover: ["option:a"], text: "Two left. The third is fine, but it leaves the disagreement for another day. The second lets the shared goal settle the order: I pick the second." }, { style: "paper", anchor: "pad", text: "Day 2 – Leon: Aiko and Davi disagree. \"The bee work feels well in hand\" – steady." }] },
    { screen: "d2.support.map", bubbles: [] },
    { screen: "d2.request.d2-s3", bubbles: [] },
    { screen: "d2.question.d2-s3", bubbles: [{ style: "think", anchor: "message", text: "Whose feelings? The harbour crew is furious and worn out. Davi tells me nothing about himself." }, { style: "think", anchor: "option:b", text: "The second option waits until after Thursday. Too late." }, { style: "think", anchor: ["option:a", "option:c"], may_cover: ["option:b"], text: "Two left. The third fixes the slipway, but decides the new place without asking the crew. The first asks the foreman what suits the crew: I pick the first." }, { style: "paper", anchor: "pad", text: "Day 2 – Davi: harbour crew angry about deliveries. No sign of how HE feels." }] },
    { screen: "d2.support.map", bubbles: [] },
    { screen: "d2.request.d2-s4", bubbles: [] },
    { screen: "d2.question.d2-s4", bubbles: [{ style: "think", anchor: "option:a", text: "A technical problem: thirty mixed samples. The first option sends out results nobody can trust." }, { style: "think", anchor: ["option:b", "option:c"], may_cover: ["option:a"], text: "Two left. The third is fine, but it holds every result back for two weeks. The second keeps the good work moving and is open about the rest: I pick the second." }, { style: "paper", anchor: "pad", text: "Day 2 – Mara: mixed samples. No sign of how she feels." }] },
    { screen: "d2.support.map", bubbles: [] },
    { screen: "d2.reflect.intro", bubbles: [] },
    { screen: "d2.reflect", bubbles: [{ style: "paper", anchor: "persist", text: "Mara – ordinary day (asked)\nLeon – \"the bee work feels well in hand\" (request)\nAiko – \"pulled in two directions\" (request)\nDavi – nothing about him (the harbour crew was angry)" }, { style: "think", anchor: "reflect-head", text: "READ: the words have changed. Today it is Unbalanced, Neutral, Balanced: steady, or pulled in two directions?" }, { style: "think", anchor: ["row:mara", "row:leon", "row:aiko"], text: "Mara said an ordinary day: Neutral. Leon \"well in hand\": Balanced. Aiko \"pulled in two directions\": Unbalanced." }, { style: "think", anchor: "row:davi", text: "Davi: the anger in his message was the harbour crew's. I have nothing on him: \"I don't know\"." }] },
    { screen: "d3.goal", bubbles: [{ style: "think", anchor: "body", text: "RESET: the goal says some Workstations have new work today. That tells me where to spend my requests." }] },
    { screen: "d3.explore.intro", bubbles: [] },
    { screen: "d3.explore.map", bubbles: [{ style: "think", anchor: "requests", text: "Only two requests today, and four things I may ask: Mara, Leon, the Apiary and the Spring." }, { style: "think", anchor: ["station:apiary", "station:spring"], text: "The goal is about changed work, so both requests go to the Workstations. The cost: no mood clues from Explore today." }] },
    { screen: "d3.ask.apiary", bubbles: [{ style: "think", anchor: "question:work", text: "The goal says the work has changed. Either question helps; I ask what is planned here today." }] },
    { screen: "d3.answer.apiary", bubbles: [{ style: "think", anchor: "answer", text: "The Apiary now chooses new hive sites. That is land planning: Aiko, beside Leon." }] },
    { screen: "d3.explore.map", bubbles: [] },
    { screen: "d3.ask.spring", bubbles: [{ style: "think", anchor: "question:learn", text: "The other Workstation question this time. Either one helps." }] },
    { screen: "d3.answer.spring", bubbles: [{ style: "think", anchor: "answer", text: "The water is cleared. What is left is resetting the meters: Davi's work." }] },
    { screen: "d3.explore.map", bubbles: [] },
    { screen: "d3.assign.intro", bubbles: [] },
    { screen: "d3.assign.map", bubbles: [{ style: "think", anchor: ["person:aiko", "person:davi"], text: "Everyone starts in their usual place. Today two of them are in the wrong place." }, { style: "think", anchor: ["person:aiko", "station:apiary"], text: "ANCHOR: the Apiary told me it needs a land planner beside Leon. Aiko moves first." }] },
    { screen: "d3.reason.aiko", bubbles: [{ style: "think", anchor: "reason:needs", text: "The Apiary told me today: \"Latest workstation needs\"." }] },
    { screen: "d3.assign.map", bubbles: [{ style: "think", anchor: "person:davi", text: "Now Davi. The Spring's work is resetting the meters he built." }] },
    { screen: "d3.reason.davi", bubbles: [{ style: "think", anchor: "reason:needs", text: "Same label: the Spring told me today." }] },
    { screen: "d3.assign.map", bubbles: [{ style: "think", anchor: ["person:mara", "person:leon"], text: "FILL: Mara and Leon stay. Today's goal is changed work, not pairs, so yesterday's pair does not decide." }, { style: "think", anchor: "station:liaison", text: "The Liaison is empty. A need I was told about took Davi away, and nothing today says the Liaison needs someone." }] },
    { screen: "d3.assign.complete", bubbles: [] },
    { screen: "d3.support.intro", bubbles: [] },
    { screen: "d3.support.map", bubbles: [{ style: "think", anchor: "timer", text: "DECIDE: a glance at the clock. Four options each from here, so I eliminate fast. No screen gets a long stare." }] },
    { screen: "d3.request.d3-s1", bubbles: [] },
    { screen: "d3.question.d3-s1", bubbles: [{ style: "think", anchor: ["option:d", "option:c"], text: "Four options. I eliminate first: the third decides for all six growers without them; the fourth waits three weeks." }, { style: "think", anchor: ["option:a", "option:b"], may_cover: ["option:c", "option:d"], text: "Of the two left, the second gives the seed to whoever asked first. The first decides with the growers where it does most good: I pick the first." }, { style: "paper", anchor: "pad", text: "Day 3 – Mara: seed for six growers, enough for two. No sign of how she feels." }] },
    { screen: "d3.support.map", bubbles: [] },
    { screen: "d3.request.d3-s2", bubbles: [] },
    { screen: "d3.question.d3-s2", bubbles: [{ style: "think", anchor: ["option:a", "option:d"], text: "The first tells him what to do. The fourth leaves a colony at risk and ignores the growers who may follow." }, { style: "think", anchor: ["option:b", "option:c"], may_cover: ["option:a", "option:d"], text: "Of the two left, the third only offers him another site. The second first asks what the distance costs him and shows him the risk: I pick the second." }, { style: "paper", anchor: "pad", text: "Day 3 – Leon: grower moved his hive back. \"It's disheartening\"." }] },
    { screen: "d3.support.map", bubbles: [] },
    { screen: "d3.request.d3-s3", bubbles: [] },
    { screen: "d3.question.d3-s3", bubbles: [{ style: "think", anchor: ["option:b", "option:d"], text: "The second waits for the council's monthly meeting. The fourth moves first and tells the village afterwards." }, { style: "think", anchor: ["option:c", "option:a"], may_cover: ["option:b", "option:d"], text: "Of the two left, the first only gives the council until tomorrow to object. The third asks what the village needs and agrees the place with them: I pick the third." }, { style: "paper", anchor: "pad", text: "Day 3 – Aiko: hive site on the picnic ground. No sign of how she feels." }] },
    { screen: "d3.support.map", bubbles: [] },
    { screen: "d3.request.d3-s4", bubbles: [] },
    { screen: "d3.question.d3-s4", bubbles: [{ style: "think", anchor: ["option:a", "option:d"], text: "A technical judgement. The first waits for a full investigation; the fourth assumes the newer figure is right without checking." }, { style: "think", anchor: ["option:b", "option:c"], may_cover: ["option:a", "option:d"], text: "Of the two left, the third hands the rota team a question they cannot answer. The second runs the quickest check and warns them now: I pick the second." }, { style: "paper", anchor: "pad", text: "Day 3 – Davi: meters disagree with the old logs. \"I'm encouraged\"." }] },
    { screen: "d3.support.map", bubbles: [{ style: "think", anchor: "person:aiko", text: "Aiko again. One Researcher can ask more than once in a day." }] },
    { screen: "d3.request.d3-s5", bubbles: [] },
    { screen: "d3.question.d3-s5", bubbles: [{ style: "think", anchor: ["option:a", "option:d"], text: "The first leaves out the two growers who asked to be there. The fourth puts the whole move off." }, { style: "think", anchor: ["option:b", "option:c"], may_cover: ["option:a", "option:d"], text: "Of the two left, the third changes the plan for every hive. The second moves the other hives tonight and the two growers' at first light: I pick the second." }, { style: "paper", anchor: "pad", text: "Day 3 – Aiko (2nd): moving hives tonight. Still no sign of how she feels." }] },
    { screen: "d3.support.map", bubbles: [] },
    { screen: "d3.reflect.intro", bubbles: [] },
    { screen: "d3.reflect", bubbles: [{ style: "paper", anchor: "persist", text: "Leon – \"It's disheartening\" (request)\nDavi – \"I'm encouraged\" (request)\nMara – nothing\nAiko – nothing (two requests, no sign)" }, { style: "think", anchor: "reflect-head", text: "READ the words first. These three are our own: the real Day 3 words were not photographed." }, { style: "think", anchor: ["row:leon", "row:davi"], text: "Notes hold no mood clue: I asked no person today. Everything is on my paper. Leon \"disheartening\": Discouraged. Davi \"encouraged\": Encouraged." }, { style: "think", anchor: ["row:mara", "row:aiko"], text: "Nothing on Mara or Aiko: two \"I don't know\"s today. That is the price of spending both requests on Workstations. An active choice on every row." }] },
    { screen: "finish", bubbles: [] },
    { screen: "results", bubbles: [{ style: "think", anchor: "results-score", text: "This marking is ours. McKinsey publishes nothing about how the game is scored." }] }
  ]
};
