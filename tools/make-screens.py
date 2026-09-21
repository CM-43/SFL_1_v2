"""Redraws every picture in screens/ and screens/1920/ from the scripted route.

Usage: python tools/make-screens.py [OUTDIR]
       (first run: cd SFL-BUILD-v2 && python3 -m http.server 8765)
       OUTDIR defaults to the build's own screens/ folder.

Needs Python and Playwright, the same as tools/playthrough.py.

What it makes, in one pass:
  * screens/                the whole set at 1402 x 789
  * screens/1920/           the thirteen pictures of that set at 1920 x 1080
  * screens/00-content-error.png        from a deliberately broken copy of the
                                        content file, made and deleted here
  * screens/26-results-detail-late-run.png and 27-time-up.png
                                        from a second run of the same route in
                                        which the clock runs out on Day 3
  * screens/11*.png                     sixteen Explore answer cards: the two
                                        the route itself reaches, the eight
                                        added in round 6 (all four answers that
                                        earn nothing, and four that point the
                                        candidate somewhere) and the six added
                                        in round 7 (11k to 11p)

The Explore answer cards are photographed in a short side pass at the start of
each day's Explore stage: that day's Explore Requests are raised so every card
can be opened, the pictures are taken, and the day's questions and requests are
then put back exactly as they were before the real route carries on.
"""
import os, shutil, subprocess, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "screens")
OUT1920 = os.path.join(OUT, "1920")
URL = "http://localhost:8765/index.html"
USER, PASS = "CaseMentor3917", "SFL-SIM-5z3p7G"

os.makedirs(OUT, exist_ok=True)
os.makedirs(OUT1920, exist_ok=True)

def log(msg):
    print(msg, flush=True)

# The thirteen pictures that also exist at 1920 x 1080.
WIDE = {
    "03-tutorial-5-complete", "05-onboarding-rank", "05c-onboarding-rank-filled",
    "06-onboarding-brief", "07-day-goal", "09-explore-map", "10-explore-ask-person",
    "16-assign-reason", "21-support-question", "21c-support-question-4-options",
    "22-reflect", "22b-reflect-time-warning", "25-results",
}

# The Explore answer cards, by day. (target, id, question, picture name)
# 11 and 11b were already in the folder; 11c to 11j were added in round 6,
# 11k to 11p in round 7.
ANSWER_CARDS = {
    0: [("person",  "ines",     "feeling", "11-explore-answer"),
        ("person",  "ines",     "working", "11c-explore-answer-d1-ines-working"),
        ("station", "nursery",  "work",    "11d-explore-answer-d1-nursery-work"),
        ("station", "nursery",  "learn",   "11e-explore-answer-d1-nursery-learn"),
        ("station", "outreach", "work",    "11f-explore-answer-d1-outreach-work"),
        ("station", "outreach", "learn",   "11k-explore-answer-d1-outreach-learn")],
    1: [("person",  "kofi",     "working", "11g-explore-answer-d2-kofi-working"),
        ("station", "wildlife", "work",    "11h-explore-answer-d2-wildlife-work"),
        ("person",  "kofi",     "feeling", "11l-explore-answer-d2-kofi-feeling"),
        ("station", "tide",     "learn",   "11m-explore-answer-d2-tide-learn"),
        ("station", "wildlife", "learn",   "11n-explore-answer-d2-wildlife-learn")],
    2: [("station", "nursery",  "work",    "11b-explore-answer-day3"),
        ("station", "nursery",  "learn",   "11j-explore-answer-d3-nursery-learn"),
        ("person",  "ines",     "working", "11i-explore-answer-d3-ines-working"),
        ("person",  "ines",     "feeling", "11o-explore-answer-d3-ines-feeling"),
        ("station", "wildlife", "learn",   "11p-explore-answer-d3-wildlife-learn")],
}

# ---------------------------------------------------------------------------
# Small helpers, the same ones tools/playthrough.py uses.
# ---------------------------------------------------------------------------
class Shooter:
    """Saves a picture only if this pass wants it, so one route feeds both sizes."""
    def __init__(self, page, folder, wanted=None):
        self.page, self.folder, self.wanted = page, folder, wanted
        self.taken = []
    def cap(self, name):
        if self.wanted is not None and name not in self.wanted:
            return
        path = os.path.join(self.folder, name + ".png")
        self.page.screenshot(path=path)
        self.taken.append(os.path.basename(path))
        log("  " + os.path.relpath(path, ROOT))

def click(page, sel):
    page.wait_for_selector(sel, state="visible", timeout=5000)
    page.click(sel)
    page.wait_for_timeout(150)

def settle(page, ms=340):
    page.wait_for_timeout(ms)

def drag(page, src_sel, dst_sel):
    s = page.locator(src_sel).first.bounding_box()
    d = page.locator(dst_sel).first.bounding_box()
    sx, sy = s["x"] + s["width"] / 2, s["y"] + s["height"] / 2
    dx, dy = d["x"] + d["width"] / 2, d["y"] + d["height"] / 2
    page.mouse.move(sx, sy); page.mouse.down()
    for i in range(1, 13):
        page.mouse.move(sx + (dx - sx) * i / 12, sy + (dy - sy) * i / 12)
        page.wait_for_timeout(18)
    page.mouse.up(); page.wait_for_timeout(220)

def set_time_left(page, seconds):
    page.evaluate("(s) => { const st = window.__sfl.getState();"
                  " st.timer.startedAt = Date.now() - (st.timer.total - s) * 1000; }", seconds)

def redraw(page):
    """Redraw the screen after the state has been changed from outside."""
    page.evaluate("""() => { const b = document.createElement('button');
      b.setAttribute('data-act', 'card-close');
      b.style.position = 'fixed'; b.style.left = '-9999px';
      document.body.appendChild(b); b.click(); b.remove(); }""")
    page.wait_for_timeout(200)

def clear_warnings(page, minutes_left=25):
    """Put the clock back and forget which time notes have been shown."""
    page.evaluate("""() => { const st = window.__sfl.getState();
      st.ui.warningOpen = null; st.ui.warningsShown = {}; }""")
    set_time_left(page, minutes_left * 60)
    page.wait_for_timeout(1200)

def time_note(page, seconds):
    """Wind the clock on until the time note appears."""
    set_time_left(page, seconds)
    page.wait_for_timeout(2400)

def close_note(page):
    if page.locator('[data-act="warning-close"]').count():
        click(page, '[data-act="warning-close"]')

# ---------------------------------------------------------------------------
# The Explore answer cards: a side pass that leaves the run as it found it.
# ---------------------------------------------------------------------------
def answer_cards(page, sh, day_index):
    """Photograph this day's answer cards, then put the day's questions back.

    A Researcher or Workstation answers only one question a day, so the day's
    list of questions asked is cleared between cards. The run is left exactly as
    it was found: nothing asked, every Explore Request still unspent.
    """
    cards = ANSWER_CARDS.get(day_index, [])
    if not cards or all(sh.wanted is not None and n not in sh.wanted for _, _, _, n in cards):
        return
    def forget():
        page.evaluate("""(d) => { const dr = window.__sfl.getState().run.days[d];
          dr.asked = []; dr.late = {}; }""", day_index)
        redraw(page)
    for target, tid, q, name in cards:
        forget()
        click(page, f'[data-act="ask"][data-target="{target}"][data-id="{tid}"]')
        settle(page)
        click(page, f'[data-act="ask-q"][data-id="{q}"]')
        settle(page)
        sh.cap(name)
        click(page, '[data-act="card-close"]')
    forget()

# ---------------------------------------------------------------------------
# The route. `late` runs out the clock at the start of Day 3 Assign.
# ---------------------------------------------------------------------------
def play(page, sh, late=False):
    page.goto(URL); page.wait_for_selector("#u")
    sh.cap("01-login")
    page.fill("#u", USER); page.fill("#p", PASS); page.click('button[type="submit"]')
    page.wait_for_selector('[data-act="start"]'); settle(page)
    sh.cap("02-start")

    # ---- tutorial (the clock is paused) -----------------------------------
    click(page, '[data-act="start"]')
    for name in ("03-tutorial-1-welcome", "03-tutorial-2-timer", "03-tutorial-3-notes",
                 "03-tutorial-4-help", "03-tutorial-5-complete"):
        settle(page); sh.cap(name); click(page, '[data-act="card-next"]')

    # ---- onboarding -------------------------------------------------------
    settle(page); sh.cap("04-onboarding-intro"); click(page, '[data-act="card-next"]')
    settle(page); sh.cap("05-onboarding-rank")
    click(page, '[data-act="panel"][data-id="help"]'); settle(page)
    sh.cap("05b-onboarding-rank-help")
    click(page, '[data-act="panel-close"]')
    for i, q in enumerate(["ob-work", "ob-known", "ob-support", "ob-together"]):
        drag(page, f'.rank-card[data-id="{q}"]', f'[data-rank-slot="{i}"]')
    settle(page); sh.cap("05c-onboarding-rank-filled")
    click(page, '[data-act="card-next"]')
    settle(page); sh.cap("06-onboarding-brief"); click(page, '[data-act="card-next"]')

    # ====================== DAY 1 ==========================================
    settle(page); sh.cap("07-day-goal"); click(page, '[data-act="card-next"]')
    settle(page); sh.cap("08-stage-intro"); click(page, '[data-act="card-next"]')
    settle(page); sh.cap("09-explore-map")

    # the time notes, photographed on the Explore map
    time_note(page, 10 * 60 + 1); sh.cap("23-time-warning"); close_note(page)
    time_note(page, 61); sh.cap("23b-time-warning-1-minute"); close_note(page)
    clear_warnings(page)

    answer_cards(page, sh, 0)

    click(page, '[data-act="ask"][data-target="person"][data-id="ines"]'); settle(page)
    sh.cap("10-explore-ask-person")
    click(page, '[data-act="ask-q"][data-id="feeling"]'); settle(page)
    click(page, '[data-act="card-close"]')
    click(page, '[data-act="panel"][data-id="notes"]')
    click(page, '[data-act="notes-pick"][data-id="ines"]'); settle(page)
    sh.cap("13-notes")
    click(page, '[data-act="panel-close"]')
    click(page, '[data-act="panel"][data-id="help"]'); settle(page)
    sh.cap("14-help")
    click(page, '[data-act="panel-close"]')
    click(page, '[data-act="ask"][data-target="person"][data-id="priya"]'); settle(page)
    click(page, '[data-act="ask-q"][data-id="working"]'); settle(page)
    click(page, '[data-act="card-close"]')
    click(page, '[data-act="ask"][data-target="station"][data-id="outreach"]'); settle(page)
    sh.cap("12-explore-ask-workstation")
    click(page, '[data-act="ask-q"][data-id="work"]'); settle(page)
    click(page, '[data-act="card-close"]')

    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]')
    settle(page); sh.cap("15-assign-map")
    # Wildlife is full, so this drop is refused and the short note appears.
    drag(page, '[data-drag="person"][data-id="kofi"]', '[data-station="wildlife"]')
    settle(page); sh.cap("17-assign-full-hint"); page.wait_for_timeout(2800)
    drag(page, '[data-drag="person"][data-id="priya"]', '[data-station="outreach"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000); settle(page)
    sh.cap("16-assign-reason")
    click(page, '[data-act="reason"][data-id="coverage"]')
    drag(page, '[data-drag="person"][data-id="kofi"]', '[data-station="wildlife"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="teammate"]')
    drag(page, '[data-drag="person"][data-id="ines"]', '[data-station="tide"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="preference"]')
    click(page, '[data-act="stage-done"]'); settle(page)
    sh.cap("18-assign-complete")
    click(page, '[data-act="card-next"]'); click(page, '[data-act="card-next"]')
    settle(page); sh.cap("19-support-map")
    support_day(page, sh, {"d1-s1": "a", "d1-s2": "b", "d1-s3": "a", "d1-s4": "b"},
                first_request="20-support-request", first_question="21-support-question")
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]')
    settle(page); sh.cap("22-reflect")
    time_note(page, 10 * 60 + 1); sh.cap("22b-reflect-time-warning"); close_note(page)
    clear_warnings(page)
    reflect(page, {"ines": "high", "tomasz": "low", "priya": "low", "kofi": "idk"})
    click(page, '[data-act="stage-done"]')

    # ====================== DAY 2 ==========================================
    click(page, '[data-act="card-next"]'); click(page, '[data-act="card-next"]'); settle(page)
    answer_cards(page, sh, 1)
    ask(page, "person", "tomasz", "feeling")
    ask(page, "person", "kofi", "working")
    ask(page, "station", "wildlife", "work")
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]'); settle(page)
    drag(page, '[data-drag="person"][data-id="kofi"]', '[data-station="wildlife"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="teammate"]')
    drag(page, '[data-drag="person"][data-id="priya"]', '[data-station="outreach"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="coverage"]')
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]'); click(page, '[data-act="card-next"]')
    support_day(page, sh, {"d2-s1": "a", "d2-s2": "b", "d2-s3": "a", "d2-s4": "b"},
                first_question="21b-support-question-3-options")
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]')
    reflect(page, {"ines": "idk", "tomasz": "low", "priya": "high", "kofi": "mid"})
    click(page, '[data-act="stage-done"]')

    # ====================== DAY 3 ==========================================
    click(page, '[data-act="card-next"]'); click(page, '[data-act="card-next"]'); settle(page)
    answer_cards(page, sh, 2)
    ask(page, "person", "kofi", "feeling")
    ask(page, "station", "nursery", "work")
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]'); settle(page)
    if late:
        set_time_left(page, 0); page.wait_for_timeout(1600)
        sh.cap("27-time-up")
    drag(page, '[data-drag="person"][data-id="ines"]', '[data-station="tide"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="preference"]')
    drag(page, '[data-drag="person"][data-id="kofi"]', '[data-station="wildlife"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="needs"]')
    drag(page, '[data-drag="person"][data-id="priya"]', '[data-station="nursery"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    click(page, '[data-act="reason"][data-id="needs"]')
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]'); click(page, '[data-act="card-next"]')
    support_day(page, sh, {"d3-s1": "a", "d3-s2": "b", "d3-s3": "b", "d3-s4": "a", "d3-s5": "c"},
                first_question="21c-support-question-4-options")
    click(page, '[data-act="stage-done"]'); click(page, '[data-act="card-next"]')
    reflect(page, {"ines": "mid", "tomasz": "idk", "priya": "low", "kofi": "high"})
    click(page, '[data-act="stage-done"]')

    # ---- the end of the run and the results -------------------------------
    page.wait_for_selector('[data-act="see-results"]'); settle(page)
    sh.cap("24-finish")
    click(page, '[data-act="see-results"]'); page.wait_for_timeout(600)
    sh.cap("25-results")
    if late:
        # Open every block, then photograph Day 3 on its own: its rows carry the
        # "answered after time ran out" flags.
        toggles = page.locator('[data-act="toggle-block"]')
        ids = [toggles.nth(i).get_attribute("data-id") for i in range(toggles.count())]
        for bid in ids:
            open_now = page.evaluate("(b) => !!window.__sfl.getState().ui.openBlocks[b]", bid)
            if not open_now:
                page.click(f'[data-act="toggle-block"][data-id="{bid}"]'); page.wait_for_timeout(120)
        d3 = page.locator('.r-block').filter(has=page.locator('.r-title', has_text="Day 3")).first
        path = os.path.join(sh.folder, "26-results-detail-late-run.png")
        d3.screenshot(path=path)
        sh.taken.append(os.path.basename(path))
        log("  " + os.path.relpath(path, ROOT))

def ask(page, target, tid, q):
    click(page, f'[data-act="ask"][data-target="{target}"][data-id="{tid}"]')
    click(page, f'[data-act="ask-q"][data-id="{q}"]')
    click(page, '[data-act="card-close"]')

def support_day(page, sh, choices, first_request=None, first_question=None):
    first = True
    while True:
        alerts = page.locator('[data-act="support-open"]')
        if alerts.count() == 0:
            break
        pid = alerts.nth(0).get_attribute("data-id")
        click(page, f'[data-act="support-open"][data-id="{pid}"]')
        settle(page)
        if first and first_request:
            sh.cap(first_request)
        click(page, '[data-act="request-answer"]')
        settle(page)
        if first and first_question:
            sh.cap(first_question)
        first = False
        item = page.evaluate("() => window.__sfl.getState().ui.modal.item")
        click(page, f'[data-act="support-choose"][data-id="{choices.get(item, "a")}"]')

def reflect(page, picks):
    for person, opt in picks.items():
        click(page, f'[data-act="reflect-pick"][data-person="{person}"][data-id="{opt}"]')

# ---------------------------------------------------------------------------
# The error screen: a copy of the content file with two deliberate mistakes.
# ---------------------------------------------------------------------------
BROKEN = "broken-for-screens"   # only letters, numbers and hyphens: the ?content= name rule

def error_screen(page, sh):
    src = os.path.join(ROOT, "data", "sfl2", "content.js")
    folder = os.path.join(ROOT, "data", BROKEN)
    os.makedirs(folder, exist_ok=True)
    text = open(src, encoding="utf-8").read()
    text = text.replace('explore_points: 3,   // VERIFIED 3 / 3 / 2',
                        'explore_points: "three",', 1)
    text = text.replace('{ id: "d1-s1", person: "kofi"', '{ id: "d1-s1", person: "kofy"', 1)
    open(os.path.join(folder, "content.js"), "w", encoding="utf-8").write(text)
    try:
        page.goto(URL + "?content=" + BROKEN)
        page.wait_for_selector(".error-list", timeout=5000)
        page.wait_for_timeout(300)
        sh.cap("00-content-error")
    finally:
        shutil.rmtree(folder, ignore_errors=True)

# ---------------------------------------------------------------------------
def main():
    made = []
    with sync_playwright() as p:
        browser = p.chromium.launch()

        log("1402 x 789 -> " + os.path.relpath(OUT, ROOT))
        ctx = browser.new_context(viewport={"width": 1402, "height": 789})
        page = ctx.new_page()
        sh = Shooter(page, OUT)
        error_screen(page, sh)
        play(page, sh, late=False)
        made += sh.taken
        ctx.close()

        log("1402 x 789, the run in which the clock runs out")
        ctx = browser.new_context(viewport={"width": 1402, "height": 789})
        page = ctx.new_page()
        sh = Shooter(page, OUT, wanted={"27-time-up"})
        play(page, sh, late=True)
        made += sh.taken
        ctx.close()

        log("1920 x 1080 -> " + os.path.relpath(OUT1920, ROOT))
        ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = ctx.new_page()
        sh = Shooter(page, OUT1920, wanted=WIDE)
        play(page, sh, late=False)
        made += ["1920/" + n for n in sh.taken]
        ctx.close()

        browser.close()
    log(f"\n{len(made)} pictures written.")
    return made

if __name__ == "__main__":
    main()
