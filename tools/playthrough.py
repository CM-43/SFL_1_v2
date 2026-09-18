"""Scripted playthrough of SFL v2 (Fable's round-9 script) plus the round-3 checks.
Usage: python tools/playthrough.py WIDTH HEIGHT OUTDIR   [late]   (first run: cd SFL-BUILD-v2 && python3 -m http.server 8765)"""
import sys, os, json
from playwright.sync_api import sync_playwright

W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
LATE = len(sys.argv) > 4 and sys.argv[4] == "late"   # time runs out at the start of Day 3 Assign
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:8765/index.html"
LOG = []
CHECKS = []
shot_n = [0]

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
        shot(page, f"{dayname}-{item}-question")
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
    page.fill("#u", "CaseMentor3917"); page.fill("#p", "wrong"); page.click('button[type="submit"]'); page.wait_for_timeout(300)
    check("wrong password rejected", page.locator('[data-act="start"]').count() == 0)
    page.fill("#u", "CaseMentor3917"); page.fill("#p", "SFL-SIM-5z3p7G"); page.click('button[type="submit"]')
    page.wait_for_selector('[data-act="start"]'); shot(page, "start")
    click(page, '[data-act="start"]')
    for i in range(5):
        shot(page, f"tutorial{i+1}"); card_next(page)
    shot(page, "onb-intro"); card_next(page)
    order = ["ob-work", "ob-known", "ob-support", "ob-together"]
    for i, q in enumerate(order):
        drag(page, f'.rank-card[data-id="{q}"]', f'[data-rank-slot="{i}"]')
    check("ranking by drag", state(page)["run"]["onboarding"]["order"] == order, state(page)["run"]["onboarding"]["order"])
    click(page, '[data-act="rank-up"][data-id="3"]'); click(page, '[data-act="rank-down"][data-id="2"]')
    check("ranking arrows", state(page)["run"]["onboarding"]["order"] == order)
    click(page, '[data-act="panel"][data-id="help"]'); shot(page, "onb-rank-help"); click(page, '[data-act="panel-close"]')
    card_next(page, "onb-brief"); card_next(page, "d1-goal"); card_next(page, "d1-explore-intro"); card_next(page, "d1-explore-map")
    # ---- DAY 1 EXPLORE
    check_signs(page, "d1 explore")
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
    ask(page, "person", "ines", "feeling", "d1-ines")
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
    shot(page, "d1-assign-intro"); card_next(page, "d1-assign-map")
    move(page, "kofi", "wildlife", None, "d1-kofi-wildlife", expect_full=True)
    move(page, "priya", "outreach", "coverage", "d1-priya-outreach")
    move(page, "kofi", "wildlife", "teammate", "d1-kofi-wildlife2")
    move(page, "ines", "tide", "preference", "d1-ines-tide", cancel=True)
    click(page, '[data-drag="person"][data-id="ines"]'); click(page, '[data-station="tide"]')
    page.wait_for_selector('[data-act="reason"]', timeout=4000); click(page, '[data-act="reason"][data-id="preference"]')
    shot(page, "d1-assign-done-map")
    check("click-to-place fallback", state(page)["run"]["days"][0]["assignment"].get("ines") == "tide", state(page)["run"]["days"][0]["assignment"])
    click(page, '[data-act="stage-done"]'); shot(page, "d1-assign-complete")
    card_next(page, "d1-support-intro"); card_next(page, "d1-support-map")
    support_all(page, "d1", {"d1-s1": "a", "d1-s2": "b", "d1-s3": "a", "d1-s4": "b"})
    click(page, '[data-act="stage-done"]'); shot(page, "d1-reflect-intro"); card_next(page, "d1-reflect")
    reflect(page, "d1", {"ines": "high", "tomasz": "low", "priya": "low", "kofi": "idk"})
    click(page, '[data-act="stage-done"]')
    shot(page, "d2-goal"); card_next(page, "d2-explore-intro"); card_next(page, "d2-explore-map")
    check_signs(page, "d2 explore")
    ask(page, "person", "tomasz", "feeling", "d2-tomasz")
    ask(page, "person", "kofi", "working", "d2-kofi")
    ask(page, "station", "wildlife", "work", "d2-wildlife")
    click(page, '[data-act="panel"][data-id="notes"]'); click(page, '[data-act="notes-pick"][data-id="kofi"]'); shot(page, "d2-notes-kofi"); click(page, '[data-act="panel-close"]')
    click(page, '[data-act="stage-done"]'); card_next(page, "d2-assign-map")
    move(page, "kofi", "wildlife", "teammate", "d2-kofi-wildlife")
    move(page, "priya", "outreach", "coverage", "d2-priya-outreach")
    move(page, "ines", "wildlife", None, "d2-ines-wildlife", expect_full=True)
    click(page, '[data-act="stage-done"]'); card_next(page, "d2-support-intro"); card_next(page, "d2-support-map")
    support_all(page, "d2", {"d2-s1": "a", "d2-s2": "b", "d2-s3": "a", "d2-s4": "b"})
    click(page, '[data-act="stage-done"]'); card_next(page, "d2-reflect")
    reflect(page, "d2", {"ines": "idk", "tomasz": "low", "priya": "high", "kofi": "mid"})
    click(page, '[data-act="stage-done"]')
    shot(page, "d3-goal"); card_next(page, "d3-explore-intro"); card_next(page, "d3-explore-map")
    check_signs(page, "d3 explore")
    ask(page, "person", "kofi", "feeling", "d3-kofi")
    ask(page, "station", "nursery", "work", "d3-nursery")
    click(page, '[data-act="stage-done"]'); card_next(page, "d3-assign-map")
    if LATE:
        set_time_left(page, 0); page.wait_for_timeout(1500)
    move(page, "ines", "tide", "preference", "d3-ines-tide")
    move(page, "priya", "tide", None, "d3-priya-tide", expect_full=True)
    move(page, "kofi", "wildlife", "needs", "d3-kofi-wildlife")
    move(page, "priya", "nursery", "needs", "d3-priya-nursery")
    click(page, '[data-act="stage-done"]'); card_next(page, "d3-support-intro"); card_next(page, "d3-support-map")
    support_all(page, "d3", {"d3-s1": "a", "d3-s2": "b", "d3-s3": "b", "d3-s4": "a", "d3-s5": "c"})
    click(page, '[data-act="stage-done"]'); card_next(page, "d3-reflect")
    reflect(page, "d3", {"ines": "mid", "tomasz": "idk", "priya": "low", "kofi": "high"})
    click(page, '[data-act="stage-done"]')
    page.wait_for_selector('[data-act="see-results"]'); shot(page, "finish")
    click(page, '[data-act="see-results"]'); page.wait_for_timeout(500); shot(page, "results-top")
    toggles = page.locator('[data-act="toggle-block"]')
    ids = [toggles.nth(i).get_attribute("data-id") for i in range(toggles.count())]
    for bid in ids:
        if not state(page)["ui"]["openBlocks"].get(bid):
            page.click(f'[data-act="toggle-block"][data-id="{bid}"]'); page.wait_for_timeout(100)
    page.screenshot(path=f"{OUT}/results-full.png", full_page=True)
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
    if not LATE: check("score 92 weighted / 87th percentile", r.get("weighted") == 92 and r.get("percentile") == 87, (r.get("weighted"), r.get("percentile")))
    with page.expect_download() as dl:
        click(page, '[data-act="csv"]')
    csvpath = f"{OUT}/results.csv"; dl.value.save_as(csvpath)
    import csv as _csv
    rows = list(_csv.reader(open(csvpath, encoding="utf-8-sig")))
    check("CSV 52 rows x 7 columns", len(rows) == 52 and all(len(x) == 7 for x in rows), len(rows))
    check("no page errors", not errors, errors)
    browser.close()

passed = sum(1 for _, ok in CHECKS if ok)
log(f"CHECKS {W}x{H}: {passed} passed, {len(CHECKS) - passed} failed, {len(CHECKS)} total")
with open(f"{OUT}/log.txt", "w") as f:
    f.write("\n".join(LOG))
