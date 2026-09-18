"""Scripted playthrough of SFL v2 (Fable's round-9 script) plus the round-3 to round-5 checks.
Usage: python tools/playthrough.py WIDTH HEIGHT OUTDIR   [late|unrevealed|guess]
       (first run: cd SFL-BUILD-v2 && python3 -m http.server 8765)

Run it at all four supported sizes; everything must pass at each of them:
    900x540   1120x630   1402x789   1920x1080

Modes:
  (none)      the scripted route. Expected result: 93.1 weighted, 89th percentile.
  late        time runs out at the start of Day 3 Assign.
  unrevealed  the same route, except that on Day 3 the candidate asks Kofi and Ines
              instead of the Nursery, and leaves Priya at Outreach. Nothing told them
              the Nursery's work had changed, so Outreach still scores (round 5, C3).
              Use this to read the wording on the results page.
  guess       the unrevealed route, except that Priya IS moved to the Nursery, with
              "Workstation coverage" as the reason. The candidate guessed the change
              without asking, so the placement scores 0 and the same unrevealed text
              is shown (round 6, B). Use this to read that wording too.
"""
import sys, os, json
from playwright.sync_api import sync_playwright

W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
MODE = sys.argv[4] if len(sys.argv) > 4 else ""
LATE = MODE == "late"                # time runs out at the start of Day 3 Assign
UNREVEALED = MODE == "unrevealed"    # Day 3: the Nursery is never asked, Priya stays at Outreach
GUESS = MODE == "guess"              # Day 3: the Nursery is never asked, but Priya is moved there anyway
NO_NURSERY = UNREVEALED or GUESS     # both routes ask Kofi and Ines instead of the Nursery
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:8765/index.html"
LOG = []
CHECKS = []
shot_n = [0]
SEEN = set()

def log(msg):
    LOG.append(msg); print(msg, flush=True)

def check(name, ok, info=""):
    CHECKS.append((name, bool(ok)))
    log(("PASS " if ok else "FAIL ") + name + (" :: " + str(info) if info else ""))

def shot(page, name):
    shot_n[0] += 1
    fn = f"{OUT}/{shot_n[0]:02d}-{name}.png"
    page.screenshot(path=fn)
    return fn

def state(page):
    return page.evaluate("() => JSON.parse(JSON.stringify(window.__sfl.getState()))")

def click(page, sel):
    page.wait_for_selector(sel, state="visible", timeout=5000)
    page.click(sel)
    page.wait_for_timeout(150)

def drag(page, src_sel, dst_sel):
    s = page.locator(src_sel).first.bounding_box()
    d = page.locator(dst_sel).first.bounding_box()
    sx, sy = s["x"] + s["width"] / 2, s["y"] + s["height"] / 2
    dx, dy = d["x"] + d["width"] / 2, d["y"] + d["height"] / 2
    page.mouse.move(sx, sy); page.mouse.down()
    for i in range(1, 13):
        page.mouse.move(sx + (dx - sx) * i / 12, sy + (dy - sy) * i / 12)
        page.wait_for_timeout(20)
    page.mouse.up(); page.wait_for_timeout(200)

def set_time_left(page, seconds):
    page.evaluate("(s) => { const st = window.__sfl.getState(); st.timer.startedAt = Date.now() - (st.timer.total - s) * 1000; }", seconds)

BOX = "(e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }"
def overlap(a, b):
    return a and b and a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]

def check_toast_clear(page, label):
    t = page.locator(".toast"); c = page.locator(".coins")
    if t.count() == 0 or c.count() == 0:
        check(f"toast/coins both present ({label})", False, f"toast={t.count()} coins={c.count()}"); return
    tb = t.first.evaluate(BOX); cb = c.first.evaluate(BOX)
    check(f"toast does not cover Explore Requests ({label})", not overlap(tb, cb), f"toast={tb} coins={cb}")
    check(f"toast inside window ({label})", tb[0] >= 0 and tb[2] <= W and tb[3] <= H, tb)

def wait_toast(page, expect, name, closable_check=False):
    page.wait_for_timeout(2300)
    txt = page.locator(".toast").all_inner_texts()
    shot(page, name)
    log(f"TOAST expect {expect}: {txt!r}")
    check(f"toast shown: {expect}", len(txt) == 1, txt)
    check_toast_clear(page, name)
    return txt

def check_signs(page, label):
    signs = page.evaluate("""() => [...document.querySelectorAll('.st-sign')].map(s => {
      const sp = s.querySelector('span'), bd = s.querySelector('.badge-coin');
      const r = e => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      return { t: sp.textContent, trunc: sp.scrollWidth > sp.clientWidth + 0.5, span: r(sp), badge: bd ? r(bd) : null };
    })""")
    for s in signs:
        check(f"sign '{s['t']}' text not cut ({label})", not s["trunc"])
        if s["badge"]:
            check(f"coin badge clear of '{s['t']}' ({label})", not overlap(s["span"], s["badge"]), f"span={s['span']} badge={s['badge']}")

# ---- round 4: nothing may change size while the candidate works ---------
def box(page, sel):
    """The bounding box of the first match, rounded to a tenth of a pixel."""
    el = page.locator(sel).first
    b = el.bounding_box()
    return None if b is None else [round(b[k], 1) for k in ("x", "y", "width", "height")]

def settle(page, ms=320):
    """Wait for any opening animation to finish before measuring."""
    page.wait_for_timeout(ms)

def check_same_box(name, boxes):
    """Every box in the list must be the same, to the pixel."""
    first = boxes[0][1] if boxes else None
    same = all(b == first for _, b in boxes)
    check(name, same and first is not None, boxes)

# ---- round 4: nothing may flash or replay its opening animation ---------
def anim_watch(page):
    page.evaluate("""() => { window.__anim = [];
      if (!window.__animHooked) { window.__animHooked = true;
        document.addEventListener('animationstart', function (e) { window.__anim.push(e.animationName); }, true); } }""")

def anim_check(page, label):
    page.wait_for_timeout(300)
    got = [a for a in page.evaluate("() => window.__anim || []") if a != "alert-pulse"]
    check(f"nothing replays its opening animation: {label}", not got, got)

# ---- round 4: no text is cut off ---------------------------------------
TEXTFIT = """() => {
  const sel = '.gcard, .gcard *, .qcard, .qcard *, .opt-pill, .pill-btn, .btn, .btn-quiet,' +
              '.g-left, .g-left *, .side-panel, .side-panel *, .toast, .toast *, .tile, .tile *,' +
              '.slot-label, .coins, .coins span, .lc-box, .lc-name, .brief-q, .brief-a, .rank-text';
  const bad = [];
  document.querySelectorAll(sel).forEach(function (e) {
    const cs = getComputedStyle(e);
    if (cs.overflowX !== 'visible' && cs.overflowX !== 'hidden') return;   // allowed to scroll
    if (e.classList.contains('token-name') || e.closest('.st-sign')) return; // checked by check_signs
    if (e.closest('.avatar') || e.closest('.st-disc')) return;  // a circle whose badge sticks out, not text
    if (e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1) {
      bad.push([e.className || e.tagName, (e.textContent || '').trim().slice(0, 34), e.scrollWidth, e.clientWidth]);
    }
  });
  return bad;
}"""
def check_text_fits(page, label):
    bad = page.evaluate(TEXTFIT)
    check(f"no text cut off ({label})", not bad, bad)

# ---- round 6 item A: the left column must fit on every map screen -------
LEFTFIT = """() => {
  const c = document.querySelector('.g-left');
  if (!c) return null;
  const items = [...c.querySelectorAll('.lc-stage')];
  if (!items.length) return null;
  const last = items[items.length - 1];
  const cb = c.getBoundingClientRect(), lb = last.getBoundingClientRect();
  return { scrollHeight: c.scrollHeight, clientHeight: c.clientHeight,
           last: last.querySelector('.lc-name').textContent,
           lastBottom: Math.round(lb.bottom * 10) / 10,
           colBottom: Math.round(cb.bottom * 10) / 10,
           clear: Math.round((cb.bottom - lb.bottom) * 10) / 10 };
}"""
def check_left_column(page, label):
    """label names the day and the stage, so a failure says which screen it was."""
    m = page.evaluate(LEFTFIT)
    if m is None:
        check(f"left column present ({label})", False); return
    check(f"left column does not overflow ({label})", m["scrollHeight"] <= m["clientHeight"] + 1,
          f"scrollHeight={m['scrollHeight']} clientHeight={m['clientHeight']}")
    check(f"left column: last stage '{m['last']}' fully inside the column ({label})", m["clear"] >= 0,
          f"last bottom={m['lastBottom']} column bottom={m['colBottom']} clear={m['clear']}")
    log(f"LEFT {label}: scroll={m['scrollHeight']} client={m['clientHeight']} "
        f"last={m['last']!r} bottom={m['lastBottom']} col={m['colBottom']} clear={m['clear']}")

def check_options_centred(page, label):
    d = page.evaluate("""() => {
      const c = document.querySelector('.qcard.is-question');
      const p = document.querySelector('.qcard.is-question .qc-pills');
      if (!c || !p) return null;
      const cb = c.getBoundingClientRect(), pb = p.getBoundingClientRect(), cs = getComputedStyle(c);
      return [Math.round((pb.top - cb.top - parseFloat(cs.paddingTop)) * 10) / 10,
              Math.round((cb.bottom - parseFloat(cs.paddingBottom) - pb.bottom) * 10) / 10,
              document.querySelectorAll('.qcard.is-question .opt-pill').length];
    }""")
    check(f"Support card with two options: options centred, no hole under them ({label})",
          d is not None and d[2] == 2 and abs(d[0] - d[1]) <= 1.5, d)

def ask(page, target, tid, q, name):
    click(page, f'[data-act="ask"][data-target="{target}"][data-id="{tid}"]')
    shot(page, f"{name}-askcard")
    click(page, f'[data-act="ask-q"][data-id="{q}"]')
    shot(page, f"{name}-answer")
    click(page, '[data-act="card-close"]')

def move(page, person, station, reason, name, expect_full=False, cancel=False):
    before = state(page)
    drag(page, f'[data-drag="person"][data-id="{person}"]', f'[data-station="{station}"]')
    if expect_full:
        shot(page, f"{name}-fullhint")
        st = state(page)
        check(f"full-station drop refused {person}->{station}", st["ui"]["modal"] is None, st["ui"]["modal"])
        page.wait_for_timeout(2800)
        return
    page.wait_for_selector('[data-act="reason"]', timeout=4000)
    shot(page, f"{name}-reason")
    if cancel:
        click(page, '[data-act="reason-cancel"]')
        st = state(page)
        check(f"cancel move {person}->{station}", st["ui"]["modal"] is None)
        return
    click(page, f'[data-act="reason"][data-id="{reason}"]')
    shot(page, f"{name}-placed")

def support_all(page, dayname, choices):
    n = 0
    while True:
        alerts = page.locator('[data-act="support-open"]')
        if alerts.count() == 0: break
        pid = alerts.nth(0).get_attribute("data-id")
        click(page, f'[data-act="support-open"][data-id="{pid}"]')
        if n == 0:
            click(page, '[data-act="card-close"]')
            check(f"{dayname} 'Make another selection' closes card", state(page)["ui"]["modal"] is None)
            click(page, f'[data-act="support-open"][data-id="{pid}"]')
        click(page, '[data-act="request-answer"]')
        item = state(page)["ui"]["modal"]["item"]
        settle(page)
        shot(page, f"{dayname}-{item}-question")
        nopt = page.locator('.qcard.is-question .opt-pill').count()
        if nopt == 2 and "2opt" not in SEEN:
            SEEN.add("2opt"); check_options_centred(page, dayname + " " + item); check_text_fits(page, "Support question card")
        if nopt == 4 and "4opt" not in SEEN:
            SEEN.add("4opt"); check_text_fits(page, "Support question card, four options")
        anim_watch(page)
        click(page, f'[data-act="support-choose"][data-id="{choices.get(item, "a")}"]')
        n += 1
    log(f"{dayname} support answered {n} requests")
    check(f"{dayname} support requests answered", n >= 4, n)

def reflect(page, dayname, picks):
    for person, opt in picks.items():
        click(page, f'[data-act="reflect-pick"][data-person="{person}"][data-id="{opt}"]')
    click(page, '[data-act="panel"][data-id="notes"]'); shot(page, f"{dayname}-reflect-notes")
    click(page, '[data-act="panel-close"]'); shot(page, f"{dayname}-reflect-filled")

def card_next(page, name=None):
    click(page, '[data-act="card-next"]')
    if name: shot(page, name)

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": W, "height": H}, accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append("console." + m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    page.goto(URL); page.wait_for_selector("#u"); shot(page, "login")
    anim_watch(page)
    page.fill("#u", "CaseMentor3917"); page.fill("#p", "wrong"); page.click('button[type="submit"]'); page.wait_for_timeout(300)
    check("wrong password rejected", page.locator('[data-act="start"]').count() == 0)
    page.fill("#u", "CaseMentor3917"); page.fill("#p", "SFL-SIM-5z3p7G"); page.click('button[type="submit"]')
    page.wait_for_selector('[data-act="start"]'); shot(page, "start")
    click(page, '[data-act="start"]')
    tut_boxes = []
    for i in range(5):
        settle(page); shot(page, f"tutorial{i+1}")
        tut_boxes.append((f"tutorial {i+1}", box(page, ".gcard")))
        card_next(page)
    check_same_box("tutorial: the five cards are the same size", tut_boxes)
    check_text_fits(page, "tutorial 5")
    shot(page, "onb-intro"); card_next(page)
    settle(page)
    order = ["ob-work", "ob-known", "ob-support", "ob-together"]
    rank_boxes = [("before the first drag", box(page, ".gcard"))]
    check_text_fits(page, "ranking card")
    for i, q in enumerate(order):
        anim_watch(page)
        drag(page, f'.rank-card[data-id="{q}"]', f'[data-rank-slot="{i}"]')
        if i == 0:
            anim_check(page, "ranking card after a drop")
        rank_boxes.append((f"after drop {i+1}", box(page, ".gcard")))
    check("ranking by drag", state(page)["run"]["onboarding"]["order"] == order, state(page)["run"]["onboarding"]["order"])
    click(page, '[data-act="rank-up"][data-id="3"]')
    rank_boxes.append(("after arrow up", box(page, ".gcard")))
    click(page, '[data-act="rank-down"][data-id="2"]')
    rank_boxes.append(("after arrow down", box(page, ".gcard")))
    check("ranking arrows", state(page)["run"]["onboarding"]["order"] == order)
    check_same_box("ranking card: the card does not change size at any point", rank_boxes)
    labels = page.evaluate("""() => [...document.querySelectorAll('.slot-label')].map(e =>
      [e.textContent, e.scrollWidth > e.clientWidth + 0.5, e.getClientRects().length])""")
    for t, cut, lines in labels:
        check(f"slot name '{t}' on one line, not cut", not cut and lines == 1, (cut, lines))
    anim_watch(page)
    click(page, '[data-act="panel"][data-id="help"]'); shot(page, "onb-rank-help"); click(page, '[data-act="panel-close"]')
    anim_check(page, "ranking card, Help opened and closed")
    card_next(page, "onb-brief")
    settle(page)
    rows = page.evaluate("() => [...document.querySelectorAll('.brief-item')].map(e => Math.round(e.getBoundingClientRect().left))")
    check("Onboarding Brief: the four answers are in one column", len(rows) == 4 and len(set(rows)) == 1, rows)
    sc = page.evaluate("""() => { const e = document.querySelector('.gc-scroll');
      return [e.scrollHeight, e.clientHeight]; }""")
    check("Onboarding Brief fits without scrolling", sc[0] <= sc[1] + 1, sc)
    check_text_fits(page, "Onboarding Brief")
    card_next(page, "d1-goal")
    intro_boxes = []
    card_next(page, "d1-explore-intro"); settle(page)
    intro_boxes.append(("explore intro", box(page, ".gcard")))
    card_next(page, "d1-explore-map")
    # ---- DAY 1 EXPLORE
    check_signs(page, "d1 explore")
    check_left_column(page, "Day 1 Explore map")
    # ---- time toasts, tested on the Explore map (item 4)
    set_time_left(page, 601); wait_toast(page, 10, "toast-10")
    click(page, '[data-act="warning-close"]'); page.wait_for_timeout(300)
    check("toast closes", page.locator(".toast").count() == 0)
    set_time_left(page, 301); wait_toast(page, 5, "toast-5")
    set_time_left(page, 181); wait_toast(page, "3 (jump past 4)", "toast-3-jump")
    check("jump shows 3 not 4", "3 minutes" in " ".join(page.locator(".toast").all_inner_texts()))
    set_time_left(page, 121); wait_toast(page, "2 (replaces 3)", "toast-2")
    set_time_left(page, 61); t = wait_toast(page, "1 singular", "toast-1")
    check("1-minute toast singular", "1 minutes" not in " ".join(t))
    click(page, '[data-act="warning-close"]')
    check("toast-1 closes", page.locator(".toast").count() == 0)
    set_time_left(page, 25 * 60); page.wait_for_timeout(1200)
    check_text_fits(page, "Explore map")
    click(page, '[data-act="ask"][data-target="person"][data-id="ines"]')
    settle(page); anim_watch(page)
    click(page, '[data-act="ask-q"][data-id="feeling"]')
    anim_check(page, "ask card, a question chosen inside it")
    check_text_fits(page, "ask card")
    click(page, '[data-act="card-close"]')
    check("Ines answered", state(page)["run"]["days"][0]["asked"][0]["q"] == "feeling", state(page)["run"]["days"][0]["asked"])
    click(page, '[data-act="ask"][data-target="person"][data-id="priya"]'); click(page, '[data-act="card-close"]')
    ask(page, "person", "priya", "working", "d1-priya")
    click(page, '[data-act="panel"][data-id="notes"]'); shot(page, "d1-notes-people")
    click(page, '[data-act="notes-tab"][data-id="stations"]'); page.wait_for_timeout(150); shot(page, "d1-notes-stations")
    picks = page.evaluate("""() => [...document.querySelectorAll('.sp-pick span:last-child')].map(s => {
      const b = s.getBoundingClientRect(), pb = s.closest('.sp-panel, .side-panel').getBoundingClientRect();
      return { t: s.textContent, cut: s.scrollWidth > s.clientWidth + 0.5 || s.scrollHeight > s.clientHeight + 0.5, inside: b.right <= pb.right + 0.5 && b.left >= pb.left - 0.5, h: b.height };
    })""")
    check("Notes Workstations tab has 4 names", len(picks) == 4, picks)
    for pk in picks:
        check(f"Notes Workstations name '{pk['t']}' shown in full", not pk["cut"] and pk["inside"] and "…" not in pk["t"], pk)
    click(page, '[data-act="notes-tab"][data-id="people"]'); page.wait_for_timeout(150)
    names = page.evaluate("() => [...document.querySelectorAll('.sp-pick span:last-child')].map(s => s.scrollWidth > s.clientWidth + 0.5)")
    check("Notes Researchers names shown in full", not any(names), names)
    check_text_fits(page, "Notes panel")
    click(page, '[data-act="panel-close"]')
    ask(page, "station", "outreach", "work", "d1-outreach")
    shot(page, "d1-explore-nocoins")
    nurs = page.locator('[data-act="ask"][data-target="station"][data-id="nursery"]')
    if nurs.count():
        click(page, '[data-act="ask"][data-target="station"][data-id="nursery"]')
        qb = page.locator('[data-act="ask-q"]')
        check("no-coins: questions disabled", all(qb.nth(i).get_attribute("disabled") is not None for i in range(qb.count())))
        click(page, '[data-act="card-close"]')
    click(page, '[data-act="panel"][data-id="help"]'); shot(page, "d1-help"); click(page, '[data-act="panel-close"]')
    click(page, '[data-act="stage-done"]')
    shot(page, "d1-assign-intro"); settle(page)
    intro_boxes.append(("assign intro", box(page, ".gcard")))
    card_next(page, "d1-assign-map")
    slot_h = page.evaluate("""() => [...document.querySelectorAll('.st-slots')].map(e =>
      [Math.round(e.getBoundingClientRect().height * 10) / 10, e.querySelectorAll('.token').length])""")
    check("Workstation boxes: same height empty or filled", len(set(h for h, _ in slot_h)) == 1 and len(slot_h) == 4, slot_h)
    check("Workstation boxes: at least one empty and one filled", len(set(k for _, k in slot_h)) > 1, slot_h)
    check_text_fits(page, "Assign map")
    check_left_column(page, "Day 1 Assign map")
    move(page, "kofi", "wildlife", None, "d1-kofi-wildlife", expect_full=True)
    move(page, "priya", "outreach", "coverage", "d1-priya-outreach")
    after = page.evaluate("() => [...document.querySelectorAll('.st-slots')].map(e => Math.round(e.getBoundingClientRect().height * 10) / 10)")
    check("Workstation boxes: unchanged after the first person is dropped", len(set(after)) == 1, after)
    move(page, "kofi", "wildlife", "teammate", "d1-kofi-wildlife2")
    move(page, "ines", "tide", "preference", "d1-ines-tide", cancel=True)
    click(page, '[data-drag="person"][data-id="ines"]'); click(page, '[data-station="tide"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000); click(page, '[data-act="reason"][data-id="preference"]')
    shot(page, "d1-assign-done-map")
    check("click-to-place fallback", state(page)["run"]["days"][0]["assignment"].get("ines") == "tide", state(page)["run"]["days"][0]["assignment"])
    click(page, '[data-act="stage-done"]'); shot(page, "d1-assign-complete")
    card_next(page, "d1-support-intro"); settle(page)
    intro_boxes.append(("support intro", box(page, ".gcard")))
    card_next(page, "d1-support-map")
    check_left_column(page, "Day 1 Support map")
    support_all(page, "d1", {"d1-s1": "a", "d1-s2": "b", "d1-s3": "a", "d1-s4": "b"})
    click(page, '[data-act="stage-done"]'); shot(page, "d1-reflect-intro"); settle(page)
    intro_boxes.append(("reflect intro", box(page, ".gcard")))
    check_same_box("Day 1: the four stage-intro cards are the same size", intro_boxes)
    card_next(page, "d1-reflect"); settle(page)
    check_text_fits(page, "Reflect")
    check_left_column(page, "Day 1 Reflect map")
    anim_watch(page)
    click(page, '[data-act="reflect-pick"][data-person="ines"][data-id="high"]')
    anim_check(page, "Reflect, an answer picked")
    # the time note on Reflect sits bottom-right, clear of the table (item 17)
    page.evaluate("() => { window.__sfl.getState().ui.warningsShown = {}; }")
    set_time_left(page, 10 * 60 + 1); page.wait_for_timeout(2400)
    shot(page, "d1-reflect-toast")
    tb, rb = box(page, ".toast"), box(page, ".reflect-inner")
    check("Reflect toast shown", tb is not None, tb)
    if tb and rb:
        ov = tb[0] < rb[0] + rb[2] and rb[0] < tb[0] + tb[2] and tb[1] < rb[1] + rb[3] and rb[1] < tb[1] + tb[3]
        check("Reflect toast does not cover the table", not ov, (tb, rb))
        gb = box(page, ".stage-go")
        ovb = gb and tb[0] < gb[0] + gb[2] and gb[0] < tb[0] + tb[2] and tb[1] < gb[1] + gb[3] and gb[1] < tb[1] + tb[3]
        check("Reflect toast sits above the Complete Reflect button", not ovb, (tb, gb))
        sb = box(page, ".stage-area")
        check("Reflect toast inside the stage", tb[0] >= sb[0] - 0.5 and tb[0] + tb[2] <= sb[0] + sb[2] + 0.5 and tb[1] + tb[3] <= sb[1] + sb[3] + 0.5, (tb, sb))
    anim_watch(page)
    click(page, '[data-act="panel"][data-id="notes"]'); click(page, '[data-act="panel-close"]')
    anim_check(page, "Reflect, a toast open and the screen redrawn")
    click(page, '[data-act="warning-close"]')
    page.evaluate("() => { const st = window.__sfl.getState(); st.ui.warningOpen = null; [10,5,4,3,2,1].forEach(function (m) { st.ui.warningsShown[m] = true; }); }")
    set_time_left(page, 25 * 60); page.wait_for_timeout(1200)
    reflect(page, "d1", {"ines": "high", "tomasz": "low", "priya": "low", "kofi": "idk"})
    click(page, '[data-act="stage-done"]')
    shot(page, "d2-goal"); card_next(page, "d2-explore-intro"); card_next(page, "d2-explore-map")
    check_signs(page, "d2 explore")
    check_left_column(page, "Day 2 Explore map")
    ask(page, "person", "tomasz", "feeling", "d2-tomasz")
    ask(page, "person", "kofi", "working", "d2-kofi")
    ask(page, "station", "wildlife", "work", "d2-wildlife")
    click(page, '[data-act="panel"][data-id="notes"]'); click(page, '[data-act="notes-pick"][data-id="kofi"]'); shot(page, "d2-notes-kofi"); click(page, '[data-act="panel-close"]')
    click(page, '[data-act="stage-done"]'); card_next(page, "d2-assign-map")
    check_left_column(page, "Day 2 Assign map")
    move(page, "kofi", "wildlife", "teammate", "d2-kofi-wildlife")
    move(page, "priya", "outreach", "coverage", "d2-priya-outreach")
    move(page, "ines", "wildlife", None, "d2-ines-wildlife", expect_full=True)
    click(page, '[data-act="stage-done"]'); card_next(page, "d2-support-intro"); card_next(page, "d2-support-map")
    check_left_column(page, "Day 2 Support map")
    support_all(page, "d2", {"d2-s1": "a", "d2-s2": "b", "d2-s3": "a", "d2-s4": "b"})
    click(page, '[data-act="stage-done"]'); card_next(page, "d2-reflect")
    check_left_column(page, "Day 2 Reflect map")
    reflect(page, "d2", {"ines": "idk", "tomasz": "low", "priya": "high", "kofi": "mid"})
    click(page, '[data-act="stage-done"]')
    shot(page, "d3-goal"); card_next(page, "d3-explore-intro"); card_next(page, "d3-explore-map")
    check_signs(page, "d3 explore")
    check_left_column(page, "Day 3 Explore map")
    ask(page, "person", "kofi", "feeling", "d3-kofi")
    if NO_NURSERY:
        ask(page, "person", "ines", "feeling", "d3-ines")
    else:
        ask(page, "station", "nursery", "work", "d3-nursery")
    click(page, '[data-act="stage-done"]'); card_next(page, "d3-assign-map")
    check_left_column(page, "Day 3 Assign map")
    if LATE:
        set_time_left(page, 0); page.wait_for_timeout(1500)
    move(page, "ines", "tide", "preference", "d3-ines-tide")
    move(page, "priya", "tide", None, "d3-priya-tide", expect_full=True)
    move(page, "kofi", "wildlife", "needs", "d3-kofi-wildlife")
    if GUESS:
        # The Nursery was never asked, but the candidate guesses from the Day 3 goal.
        move(page, "priya", "nursery", "coverage", "d3-priya-nursery-guess")
    elif not UNREVEALED:
        move(page, "priya", "nursery", "needs", "d3-priya-nursery")
    click(page, '[data-act="stage-done"]'); card_next(page, "d3-support-intro"); card_next(page, "d3-support-map")
    check_left_column(page, "Day 3 Support map")
    support_all(page, "d3", {"d3-s1": "a", "d3-s2": "b", "d3-s3": "b", "d3-s4": "a", "d3-s5": "c"})
    click(page, '[data-act="stage-done"]'); card_next(page, "d3-reflect")
    check_left_column(page, "Day 3 Reflect map")
    reflect(page, "d3", {"ines": "mid", "tomasz": "idk", "priya": "low", "kofi": "high"})
    click(page, '[data-act="stage-done"]')
    page.wait_for_selector('[data-act="see-results"]'); shot(page, "finish")
    click(page, '[data-act="see-results"]'); page.wait_for_timeout(500); shot(page, "results-top")
    tops = page.evaluate("() => [...document.querySelectorAll('.tile')].map(e => Math.round(e.getBoundingClientRect().top))")
    check("results: the five score tiles share one row", len(tops) == 5 and len(set(tops)) == 1, tops)
    check_text_fits(page, "results, top")
    toggles = page.locator('[data-act="toggle-block"]')
    ids = [toggles.nth(i).get_attribute("data-id") for i in range(toggles.count())]
    for bid in ids:
        if not state(page)["ui"]["openBlocks"].get(bid):
            page.click(f'[data-act="toggle-block"][data-id="{bid}"]'); page.wait_for_timeout(100)
    page.screenshot(path=f"{OUT}/results-full.png", full_page=True)
    # One picture per results block, so the marking detail can be read on its own
    # (round 5: Day 1 has no pairing line; Day 3 carries Priya's explanation).
    blocks = page.locator('.r-block')
    for i in range(blocks.count()):
        title = blocks.nth(i).locator('.r-title').inner_text().strip().lower().replace(' ', '-')
        blocks.nth(i).screenshot(path=f"{OUT}/results-detail-{i}-{title}.png")
    # ---- item 1: Reflect rows with no cue show the "no information" sentence only
    st = state(page); r = st["result"]
    nocue = []; withcue = []
    for di, d in enumerate(r["days"]):
        for it in (d.get("reflect") or {}).get("items", []):
            (withcue if it["cues"] else nocue).append((di, it["person"]["name"]))
    reasons = page.evaluate("""() => [...document.querySelectorAll('.mark-reason')].map(e => e.textContent.trim())""")
    for di, name in nocue:
        sentence = f"You had no information about how {name} felt today, so \"I don't know\" was the honest answer."
        check(f"Day {di+1} {name} (no cue): reason is the no-information sentence only", sentence in reasons, name)
    bad = [x for x in reasons if x.startswith("You had no information") and not x.endswith("honest answer.")]
    check("no Reflect row adds a 'why' after the no-information sentence", not bad, bad)
    check("rows with a cue still show the explanation", all(any(x.startswith(("You asked", "You answered")) or name in x for x in reasons) for _, name in withcue) and len(withcue) > 0, len(withcue))
    log(f"no-cue rows: {nocue}")
    log("RESULT: " + json.dumps({k: r[k] for k in r if k in ("weighted", "percentile", "decile", "topShare")}))
    if MODE == "":
        # Round 5 arithmetic. Onboarding 4/4 · Explore 8/8 · Assign 5.5+7+7 = 19.5/20
        # (Day 1 is out of 6: no pair bonus; Kofi's "Researcher assistance" is still
        # dishonest because he is never asked "How do you like to work" before Day 2)
        # Support 13/13 · Reflect 3+3+3 = 9/12.
        # weighted = 10(1) + 15(1) + 25(0.975) + 25(1) + 25(0.75) = 93.125 -> 93.1
        check("score 93.1 weighted / 89th percentile", r.get("weighted") == 93.1 and r.get("percentile") == 89, (r.get("weighted"), r.get("percentile")))
    if UNREVEALED or GUESS:
        # Round 6 item B. The Nursery was never asked on Day 3, so Priya is marked
        # against Outreach wherever she ended up, and both routes show the same text.
        OPENING = "Nothing you asked today showed"
        pr = [i for i in r["days"][2]["assign"]["items"] if i["person"]["id"] == "priya"][0]
        whys = page.evaluate("""() => [...document.querySelectorAll('.mark-reason')].map(e => e.textContent.trim())""")
        check(f"Day 3 {MODE}: the override did not apply", pr["overrideApplied"] is False, pr["overrideApplied"])
        check(f"Day 3 {MODE}: the results show the unrevealed explanation",
              any(x.startswith(OPENING) for x in whys),
              [x[:60] for x in whys if "Nursery" in x])
        if UNREVEALED:
            # Priya was left at Outreach, which is still one of her good Workstations.
            check("Day 3 unrevealed: Priya at Outreach still scores her placement", pr["pointsPlace"] == 1, pr["pointsPlace"])
        else:
            # Priya was moved to the Nursery on a guess: nothing asked showed the change,
            # so she is marked against Outreach and the placement scores nothing.
            check("Day 3 guess: Priya moved to the Nursery without asking scores 0 for her placement",
                  pr["pointsPlace"] == 0, pr["pointsPlace"])
        d3 = page.locator('.r-block').filter(has=page.locator('.r-title', has_text="Day 3")).first
        d3.screenshot(path=f"{OUT}/results-day3-{MODE}.png")
        log(f"saved {OUT}/results-day3-{MODE}.png")
    # Round 5, C2: no pairing line anywhere in Day 1's Assign rows
    d1pair = page.evaluate("""() => {
      const blocks = [...document.querySelectorAll('.row-detail')].map(e => e.textContent);
      return blocks.filter(t => t.includes('working with') || t.includes('should share a Workstation with')).length;
    }""")
    check("results: pairing lines shown on Days 2 and 3 only (4, never 6)", d1pair == 4, d1pair)
    with page.expect_download() as dl:
        click(page, '[data-act="csv"]')
    csvpath = f"{OUT}/results.csv"; dl.value.save_as(csvpath)
    import csv as _csv
    rows = list(_csv.reader(open(csvpath, encoding="utf-8-sig")))
    c_day1_assign = page.evaluate("""() => { const st = window.__sfl.getState();
      return st.content.days[0].name + ' ' + st.content.labels.phase_assign; }""")
    check("CSV 52 rows x 7 columns", len(rows) == 52 and all(len(x) == 7 for x in rows), len(rows))
    # Round 6 item C: Day 1 scores no pair bonus, so no Day 1 Assign row may name a partner.
    d1assign = [x for x in rows if x[0] == c_day1_assign]
    badpair = [x for x in d1assign if " + " in x[3]]
    check("CSV: no Day 1 Assign row names a pairing", len(d1assign) == 4 and not badpair, (len(d1assign), badpair))
    check("no page errors", not errors, errors)
    browser.close()

passed = sum(1 for _, ok in CHECKS if ok)
log(f"CHECKS {W}x{H}: {passed} passed, {len(CHECKS) - passed} failed, {len(CHECKS)} total")
with open(f"{OUT}/log.txt", "w") as f:
    f.write("\n".join(LOG))
