"""Teaching copy check: plays the recorded route (tools/teach-route.json) with
real mouse actions and checks the presenter aids at every step.

Usage (start a server in this folder first: python3 -m http.server 8765):
    python3 tools/teach-run.py WIDTH HEIGHT OUTDIR          the whole route
    python3 tools/teach-run.py WIDTH HEIGHT OUTDIR jump     Ctrl+Shift+2 and +3, then the rest of the route
    python3 tools/teach-run.py WIDTH HEIGHT OUTDIR off      the live content (no presenter): keys do nothing
Another port: SFL_PORT=8770 python3 tools/teach-run.py ...

At every step: the screen key is the step's screen; each bubble (N) shows the
expected text, sits inside the window with no text cut off, holds the clock
(sampled twice, 1.2 s apart); a screenshot OUTDIR/NNN-<screen>-bK.png.
Think bubbles with an anchor (round 2): (a) an outline round every anchor
(for a person: concentric with the avatar circle, centres within 1 px, the
outline the circle's box grown equally on all four sides), no outline round
anything in the bubble's "may_cover", (b) the bubble covers none of its
anchors (a person counts with its coin or alert badge), (c) the tail tip
within 14 px of the first anchor, (d) the text that matters it covers is
logged, and it fails if it covers more than 15% (30% at 900 x 540) of the
Support message or of a pill, or any of the Reflect table. Things named in
the bubble's "may_cover" do not count for (d); they are logged separately
as "covers (allowed)". Notepad notes: all in the same place; a
persist note stays while the step's later bubbles show, the clock runs while
it shows alone, and it goes when the screen changes.
Once each: N after the last bubble shows nothing new; B and H (also with a
persist note); T on a map.
Always: no "Timer paused" after Start Project, no console errors or warnings,
no page errors. At the end: 100 weighted, 99th percentile, the expected phase
totals, every results row a green tick.
"""
import sys, os, json, re
from playwright.sync_api import sync_playwright

W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
MODE = sys.argv[4] if len(sys.argv) > 4 else ""
HERE = os.path.dirname(os.path.abspath(__file__))
ROUTE = json.load(open(os.path.join(HERE, "teach-route.json"), encoding="utf-8"))
STEPS = ROUTE["steps"]
PORT = os.environ.get("SFL_PORT", "8765")
URL = f"http://localhost:{PORT}/index.html"
os.makedirs(OUT, exist_ok=True)
LOG, CHECKS, ERRORS = [], [], []
DONE_ONCE = set()

def log(msg):
    LOG.append(msg); print(msg, flush=True)

def check(name, ok, info=""):
    CHECKS.append((name, bool(ok)))
    if not ok or os.environ.get("SFL_VERBOSE"):
        log(("PASS " if ok else "FAIL ") + name + (" :: " + str(info) if info != "" else ""))

# ---- helpers modelled on tools/playthrough.py -----------------------------
def state(page):
    return page.evaluate("() => JSON.parse(JSON.stringify(window.__sfl.getState()))")

def pres(page):
    return page.evaluate("() => window.__sfl.presenter ? window.__sfl.presenter() : null")

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

def settle(page, ms=350):
    page.wait_for_timeout(ms)

CLOCK = """() => { const t = window.__sfl.getState().timer;
  return t.running ? Math.max(0, t.total - (Date.now() - t.startedAt) / 1000) : t.left; }"""
def clock(page):
    return page.evaluate(CLOCK)

PAUSED = """() => { const e = document.getElementById('timer-paused');
  return !!e && getComputedStyle(e).visibility === 'visible'; }"""
def check_no_paused(page, label):
    check(f"no 'Timer paused' visible ({label})", not page.evaluate(PAUSED))

BUBBLE = """() => {
  const b = document.querySelector('.pres-layer .pres-bubble.is-think, .pres-layer .pres-bubble.is-pad');
  if (!b) return null;
  const r = b.getBoundingClientRect(), cs = getComputedStyle(b), t = b.querySelector('.pb-text'), hd = b.querySelector('.pb-head');
  const box = [r.left, r.top, r.right, r.bottom];
  // the tail's tip, worked out from the drawn triangle (::before)
  let tip = null;
  const tc = ['tail-up', 'tail-down', 'tail-left', 'tail-right'].find(c => b.classList.contains(c));
  if (tc) {
    const cs = getComputedStyle(b, '::before');
    const x0 = r.left + b.clientLeft + parseFloat(cs.left), y0 = r.top + b.clientTop + parseFloat(cs.top);
    const bl = parseFloat(cs.borderLeftWidth), br = parseFloat(cs.borderRightWidth), bt = parseFloat(cs.borderTopWidth), bb = parseFloat(cs.borderBottomWidth);
    tip = tc === 'tail-down' ? [x0 + bl, y0 + bt + bb] : tc === 'tail-up' ? [x0 + bl, y0]
        : tc === 'tail-right' ? [x0 + bl + br, y0 + bt] : [x0, y0 + bt];
  }
  const ext = tip ? [Math.min(box[0], tip[0]), Math.min(box[1], tip[1]), Math.max(box[2], tip[0]), Math.max(box[3], tip[1])] : box;
  const tr = t ? t.getBoundingClientRect() : null;
  return { text: t ? t.innerText : '', head: hd ? hd.textContent : null,
           style: b.classList.contains('is-paper') ? 'paper' : 'think',
           visible: cs.visibility === 'visible' && parseFloat(cs.opacity) > 0.99,
           box: box, ext: ext, tip: tip, tail: tc || null, left: r.left, bottom: r.bottom,
           vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight,
           // (the tail sticks out of the bubble on purpose, so the text box itself is checked)
           clipped: !t || t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 ||
                    tr.left < r.left || tr.right > r.right + 0.5 || tr.top < r.top || tr.bottom > r.bottom + 0.5,
           fontPx: parseFloat(cs.fontSize), widthPct: r.width / document.documentElement.clientWidth * 100 };
}"""

PERSIST = """() => { const b = document.querySelector('.pres-layer .pres-bubble.is-persist');
  if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
  return { box: [r.left, r.top, r.right, r.bottom], left: r.left, bottom: r.bottom, visible: cs.visibility === 'visible',
           lines: [...b.querySelectorAll('.pb-line')].map(e => e.textContent) }; }"""

# The test's own reading of each anchor name (independent of js/app.js).
INSPECT = """([names, box, allowed]) => {
  const app = document.getElementById('app'), q = s => app.querySelector(s), all = s => [...app.querySelectorAll(s)];
  const st = window.__sfl.getState(), c = st.content;
  const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 ? [r.left, r.top, r.right, r.bottom] : null; };
  const U = l => l.filter(Boolean).reduce((a, r) => a ? [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])] : r, null);
  function avatar(id) {
    const p = c.people.find(x => x.id === id); const t = p && all('.token').find(t => t.querySelector('.token-name').textContent === p.name);
    return t ? t.querySelector('.avatar') : null;
  }
  function find(n) {
    const [k, ...rest] = n.split(':'), id = rest.join(':');
    const card = q('.qcard') || q('.modal-backdrop .modal') || q('.gcard') || q('.start-panel');
    if (k === 'heading') return R(card && card.querySelector('h1, h2'));
    if (k === 'body') return R(q('.gcard .gc-body') || q('.start-body'));
    if (k === 'button') return R(q('.modal-backdrop .modal .btn') || q('.gcard .gc-actions .btn') || q('.stage-go') || q('[data-act="start"]'));
    if (k === 'timer') return R(q('#ring-timer'));
    if (k === 'notes-pill' || k === 'help-pill') return R(q('.pill-btn[data-id="' + k.split('-')[0] + '"]'));
    if (k === 'goal' || k === 'stage') { const lb = all('.g-left .lc-box')[k === 'goal' ? 0 : 1]; return lb ? U([R(lb), R(q(k === 'goal' ? '.g-left .lc-goal' : '.g-left .lc-stages'))]) : null; }
    if (k === 'requests') return R(q('.coins'));
    if (k === 'person') { const av = avatar(id); return av ? U([R(av), ...[...av.querySelectorAll('.badge')].map(R)]) : null; }
    if (k === 'station') { const s = c.stations.find(x => x.id === id); const e = all('.station').find(e => e.querySelector('.st-sign span').textContent === s.short);
      return e ? U([R(e.querySelector('.st-sign')), ...[...e.querySelectorAll('.st-building, .st-img')].map(R)]) : null; }
    if (k === 'rank') return R(q('.rank-card[data-id="' + id + '"]:not(.is-ghost)'));
    if (k === 'brief') return R(all('.brief-item')[+id - 1]);
    if (k === 'question') return R(q('.opt-pill[data-act="ask-q"][data-id="' + id + '"]'));
    if (k === 'answer' || k === 'message') return R(q('.qcard .qc-text'));
    if (k === 'reason') return R(q('.opt-pill[data-act="reason"][data-id="' + id + '"]'));
    if (k === 'option') return R(q('.opt-pill[data-act="support-choose"][data-id="' + id + '"]'));
    if (k === 'reflect-head') return R(q('.reflect-table thead tr'));
    if (k === 'row') { const e = q('.reflect-table tbody [data-person="' + id + '"]'); return R(e && e.closest('tr')); }
    if (k === 'results-score') return R(q('.standing-left'));
    return null;
  }
  const inter = (a, r) => { if (!a || !r) return 0; const w = Math.min(a[2], r[2]) - Math.max(a[0], r[0]), h = Math.min(a[3], r[3]) - Math.max(a[1], r[1]); return w > 0 && h > 0 ? w * h : 0; };
  const anchors = names.map(find);
  // a person's avatar circle alone (the outline must be concentric with it)
  const circles = names.map(n => n.startsWith('person:') ? R(avatar(n.slice(7))) : null);
  const allowedBoxes = allowed.map(find);
  const outlines = [...document.querySelectorAll('.pres-layer .pres-outline')].map(R);
  // text that matters
  const covered = [];
  // the 5th field is the thing's anchor name, where it has one (for "may_cover")
  const add = (label, e, limit, name) => { const r = R(e); if (!r) return; const a = inter(box, r); if (a > 0) covered.push([label, Math.round(a), Math.round(100 * a / ((r[2] - r[0]) * (r[3] - r[1]))), limit, name || null]); };
  const msg = q('.qcard.is-question .qc-text'); if (msg) add('Support message', msg, 'msg', 'message');
  all('.qcard .opt-pill').forEach(e => add('pill "' + e.textContent.trim().slice(0, 24) + '"', e, 'pill',
    e.dataset.act === 'support-choose' ? 'option:' + e.dataset.id : e.dataset.act === 'reason' ? 'reason:' + e.dataset.id : e.dataset.act === 'ask-q' ? 'question:' + e.dataset.id : null));
  const tb = q('.reflect-table'); if (tb) add('Reflect table', tb, 'table');
  all('.qcard .qc-text').forEach(e => { if (e !== msg) add('card text', e, null); });
  // headings: their words only, line by line (not the empty rest of the line)
  all('.gcard h1, .qcard h2, .modal h2, .reflect-inner h2').forEach(e => {
    const rg = document.createRange(); rg.selectNodeContents(e); let a = 0, full = 0;
    [...rg.getClientRects()].forEach(q => { const r = [q.left, q.top, q.right, q.bottom]; a += inter(box, r); full += q.width * q.height; });
    if (a > 0) covered.push(['heading', Math.round(a), Math.round(100 * a / full), null, null]); });
  all('.gc-body > *, .gc-lede, .start-body').forEach(e => add('body text', e, null));
  all('.brief-item').forEach((e, i) => add('Brief row ' + (i + 1), e, null));
  all('.rank-card:not(.is-ghost)').forEach(e => add('ranking card', e, null));
  all('.rank-slot').forEach(e => add('ranking slot', e, null));
  all('.reflect-prompt').forEach(e => add('Reflect prompt', e, null));
  const inLeft = names.some(n => n === 'goal' || n === 'stage');
  if (!inLeft) { const g = all('.g-left .lc-box')[0]; if (g) { add('goal box', g, null); add('goal text', q('.g-left .lc-goal'), null); } }
  return { anchors, circles, allowedBoxes, outlines, covered, anchorHits: anchors.map(a => Math.round(inter(box, a))) };
}"""

def norm(s):
    return re.sub(r"\s+", " ", (s or "")).strip()

def expected_bubbles(page, i):
    return page.evaluate("(i) => { const p = window.__sfl.getState().content.presenter; return p.steps[i].bubbles; }", i)

def paper_title(page):
    return page.evaluate("() => window.__sfl.getState().content.presenter.paper_title")

SMALL = W <= 900 and H <= 540          # the 15% rule may be relaxed to 30% here
PAPER_HOMES = []                        # (label, left, bottom) of every notepad note
COVER_LOG = []                          # (label, what, px2, %) for every bubble that covers text that matters
ALLOWED_LOG = []                        # the same, for things named in the bubble's "may_cover"
RELAXED = []

def anchors_of(b):
    a = b.get("anchor")
    if a is None:
        return ["pad"] if b["style"] == "paper" else ["none"]
    return a if isinstance(a, list) else [a]

def dist_to_box(pt, r):
    dx = max(r[0] - pt[0], 0, pt[0] - r[2]); dy = max(r[1] - pt[1], 0, pt[1] - r[3])
    return (dx * dx + dy * dy) ** 0.5

def check_bubble(page, i, scr, k, exp, label):
    page.wait_for_timeout(400)   # the bubble fades in over 140 ms
    names = anchors_of(exp)
    if names == ["persist"]:
        pz = page.evaluate(PERSIST)
        check(f"persist note shown ({label})", pz is not None and pz["visible"] and
              [norm(x) for x in pz["lines"]] == [norm(x) for x in exp["text"].split("\n")], pz and pz["lines"])
        if pz:
            PAPER_HOMES.append((label, pz["left"], pz["bottom"]))
            check(f"persist note inside the window ({label})", pz["box"][0] >= 0 and pz["box"][1] >= 0 and pz["box"][2] <= W and pz["box"][3] <= H, pz["box"])
            tb = page.evaluate("() => { const e = document.querySelector('.reflect-table'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }")
            check(f"persist note does not cover the Reflect table ({label})", not tb or not (pz["box"][0] < tb[2] and tb[0] < pz["box"][2] and pz["box"][1] < tb[3] and tb[1] < pz["box"][3]), (pz["box"], tb))
        c1 = clock(page); page.wait_for_timeout(1200); c2 = clock(page)
        check(f"clock runs while only the persist note shows ({label})", 0.9 < c1 - c2 < 1.6, (round(c1, 2), round(c2, 2)))
        page.screenshot(path=f"{OUT}/{i:03d}-{scr}-b{k + 1}.png")
        return pz
    b = page.evaluate(BUBBLE)
    if b is None:
        check(f"bubble shown ({label})", False); return None
    check(f"bubble visible with expected text ({label})", b["visible"] and norm(b["text"]) == norm(exp["text"]) and b["style"] == exp["style"],
          (b["visible"], b["style"], b["text"][:60]))
    x0, y0, x1, y1 = b["ext"]
    check(f"bubble (and tail) inside the window ({label})", x0 >= 0 and y0 >= 0 and x1 <= b["vw"] + 0.5 and y1 <= b["vh"] + 0.5, b["ext"])
    check(f"bubble text not cut off ({label})", not b["clipped"])
    c1 = clock(page); page.wait_for_timeout(1200); c2 = clock(page)
    check(f"clock held while bubble shows ({label})", abs(c1 - c2) < 0.05, (round(c1, 2), round(c2, 2)))
    may = exp.get("may_cover") or []
    ins = page.evaluate(INSPECT, [[] if names == ["none"] or exp["style"] == "paper" else names, b["box"], may])
    if exp["style"] == "paper":
        check(f"paper heading ({label})", norm(b["head"]) == norm(paper_title(page)), b["head"])
        PAPER_HOMES.append((label, b["left"], b["bottom"]))
        check(f"pad note has no tail and no outline ({label})", b["tail"] is None and not ins["outlines"], (b["tail"], ins["outlines"]))
    elif names == ["none"]:
        check(f"'none' bubble has no tail and no outline ({label})", b["tail"] is None and not ins["outlines"], (b["tail"], ins["outlines"]))
        check(f"think bubble 22-34% wide ({label})", 21.5 <= b["widthPct"] <= 34.5, round(b["widthPct"], 1))
    else:
        check(f"think bubble 22-34% wide ({label})", 21.5 <= b["widthPct"] <= 34.5, round(b["widthPct"], 1))
        anchors = ins["anchors"]
        check(f"(a) every anchor found on screen ({label})", all(anchors), names)
        for n, ab, cb in zip(names, anchors, ins["circles"]):
            if n.startswith("person:"):
                # concentric with the avatar circle: centres within 1px, the same gap on all four sides
                def concentric(o):
                    if not o or not cb: return False
                    g = [cb[0] - o[0], cb[1] - o[1], o[2] - cb[2], o[3] - cb[3]]
                    return (abs((o[0] + o[2]) / 2 - (cb[0] + cb[2]) / 2) <= 1 and abs((o[1] + o[3]) / 2 - (cb[1] + cb[3]) / 2) <= 1
                            and min(g) > 0 and max(g) - min(g) <= 1)
                ok = any(concentric(o) for o in ins["outlines"])
                check(f"(a) outline round {n} concentric with the avatar circle ({label})", ok, (cb, ins["outlines"]))
            else:
                ok = ab is not None and any(o and all(abs(o[j] - ab[j]) <= 8 for j in range(4)) for o in ins["outlines"])
                check(f"(a) outline round {n} ({label})", ok, (ab, ins["outlines"]))
        for n, mb in zip(may, ins["allowedBoxes"]):
            check(f"(a) may_cover {n} on screen and not outlined ({label})",
                  mb is not None and not any(o and all(abs(o[j] - mb[j]) <= 8 for j in range(4)) for o in ins["outlines"]), (mb, ins["outlines"]))
        check(f"(a) one outline per anchor ({label})", len(ins["outlines"]) == len(names), len(ins["outlines"]))
        check(f"(b) bubble covers none of its anchors ({label})", not any(ins["anchorHits"]), dict(zip(names, ins["anchorHits"])))
        d = dist_to_box(b["tip"], anchors[0]) if b["tip"] and anchors[0] else None
        check(f"(c) tail tip within 14px of {names[0]} ({label})", d is not None and d <= 14, (b["tail"], d))
    # (d) text that matters
    allowed = [c for c in ins["covered"] if c[4] is not None and c[4] in may]
    covered = [c[:4] for c in ins["covered"] if not (c[4] is not None and c[4] in may)]
    for what, px, pct, lim in covered:
        COVER_LOG.append((label, what, px, pct))
    for what, px, pct, lim, n in allowed:
        ALLOWED_LOG.append((label, what, px, pct))
    if covered:
        log(f"  covers {label}: " + "; ".join(f"{w} {px}px2 ({pct}%)" for w, px, pct, lim in covered))
    if allowed:
        log(f"  covers (allowed) {label}: " + "; ".join(f"{w} {px}px2 ({pct}%)" for w, px, pct, lim, n in allowed))
    if exp["style"] == "think":
        limit = 30 if SMALL else 15
        bad = [(w, pct) for w, px, pct, lim in covered if (lim == "table" and px > 0) or (lim in ("msg", "pill") and pct > limit)]
        check(f"(d) no more than {limit}% of the message or a pill, none of the Reflect table ({label})", not bad, bad)
        if SMALL:
            for w, px, pct, lim in covered:
                if lim in ("msg", "pill") and pct > 15:
                    RELAXED.append(f"{label}: {w} {pct}%")
    page.screenshot(path=f"{OUT}/{i:03d}-{scr}-b{k + 1}.png")
    return b

# ---- the recorded route as mouse actions ----------------------------------
def day_of(scr):
    return int(scr[1]) - 1

def support_person(page, di, item):
    return page.evaluate("([d, it]) => window.__sfl.getState().content.days[d].support.find(s => s.id === it).person", [di, item])

def act(page, i):
    step = STEPS[i]; scr = step["screen"]; nxt = STEPS[i + 1]["screen"] if i + 1 < len(STEPS) else None
    if scr == "start":
        click(page, '[data-act="start"]'); return
    if scr == "onb.rank":
        for n, q in enumerate(ROUTE["onboarding_order"]):
            drag(page, f'.rank-card[data-id="{q}"]', f'[data-rank-slot="{n}"]')
        check("ranking in the recorded order", state(page)["run"]["onboarding"]["order"] == ROUTE["onboarding_order"])
        click(page, '[data-act="card-next"]'); return
    if scr.startswith("tut.") or scr.startswith("onb.") or scr.endswith(".goal") or scr.endswith(".intro") or scr.endswith(".assign.complete"):
        click(page, '[data-act="card-next"]'); return
    if scr == "finish":
        click(page, '[data-act="see-results"]'); return
    if scr == "results":
        return
    di = day_of(scr); rd = ROUTE["days"][di]
    part = scr.split(".", 1)[1]
    if part == "explore.map":
        if "Open Notes" in step["do"]:
            before = pres(page)["key"]
            click(page, '[data-act="panel"][data-id="notes"]')
            click(page, '[data-act="notes-tab"][data-id="stations"]')
            click(page, '[data-act="notes-tab"][data-id="people"]')
            check(f"opening Notes does not change the screen key ({scr})", pres(page)["key"] == before, pres(page)["key"])
            click(page, '[data-act="panel-close"]')
        m = re.match(r"d\d\.ask\.(.+)$", nxt or "")
        if m:
            tid = m.group(1)
            target = [a[0] for a in rd["ask"] if a[1] == tid][0]
            click(page, f'[data-act="ask"][data-target="{target}"][data-id="{tid}"]')
        else:
            click(page, '[data-act="stage-done"]')
        return
    if part.startswith("ask."):
        tid = part[4:]; q = [a[2] for a in rd["ask"] if a[1] == tid][0]
        click(page, f'[data-act="ask-q"][data-id="{q}"]'); return
    if part.startswith("answer."):
        click(page, '[data-act="card-close"]'); return
    if part == "assign.map":
        m = re.match(r"d\d\.reason\.(.+)$", nxt or "")
        if m:
            pid = m.group(1); st = [mv[1] for mv in rd["moves"] if mv[0] == pid][0]
            drag(page, f'[data-drag="person"][data-id="{pid}"]', f'[data-station="{st}"]')
        else:
            click(page, '[data-act="stage-done"]')
        return
    if part.startswith("reason."):
        pid = part[7:]; rs = [mv[2] for mv in rd["moves"] if mv[0] == pid][0]
        click(page, f'[data-act="reason"][data-id="{rs}"]'); return
    if part == "support.map":
        m = re.match(r"d\d\.request\.(.+)$", nxt or "")
        if m:
            pid = support_person(page, di, m.group(1))
            click(page, f'[data-act="support-open"][data-id="{pid}"]')
        else:
            click(page, '[data-act="stage-done"]')
        return
    if part.startswith("request."):
        click(page, '[data-act="request-answer"]'); return
    if part.startswith("question."):
        item = part[9:]; opt = dict(rd["support"])[item]
        click(page, f'[data-act="support-choose"][data-id="{opt}"]'); return
    if part == "reflect":
        for pid, mood in rd["reflect"].items():
            click(page, f'[data-act="reflect-pick"][data-person="{pid}"][data-id="{mood}"]')
        click(page, '[data-act="stage-done"]'); return
    raise RuntimeError("no action for " + scr)

def test_t_hold(page, label):
    page.keyboard.press("t")
    v1 = clock(page); page.wait_for_timeout(1500); v2 = clock(page)
    check(f"T holds the clock ({label})", abs(v1 - v2) < 0.05 and pres(page)["holding"], (round(v1, 2), round(v2, 2)))
    check_no_paused(page, f"T hold, {label}")
    page.keyboard.press("t")
    page.wait_for_timeout(2000); v3 = clock(page)
    check(f"T release: the clock carries on from the held value ({label})", abs((v1 - 2.0) - v3) <= 1.0, (round(v1, 2), round(v3, 2)))
    tl = page.evaluate("() => document.querySelectorAll('.toast').length")
    check(f"no time warning after the release ({label})", tl == 0, tl)

def test_b_h(page, i, exp, label):
    def shown():
        b = page.evaluate(BUBBLE); return norm(b["text"]) if b else None
    page.keyboard.press("b"); page.wait_for_timeout(200)
    check(f"B goes back one bubble ({label})", shown() == norm(exp[-2]["text"]), shown())
    for _ in range(len(exp) - 2):
        page.keyboard.press("b"); page.wait_for_timeout(200)
    check(f"B reaches the first bubble ({label})", shown() == norm(exp[0]["text"]), shown())
    page.keyboard.press("b"); page.wait_for_timeout(200)
    check(f"B from the first bubble hides it ({label})", shown() is None, shown())
    page.keyboard.press("n"); page.wait_for_timeout(200)
    check(f"N after B shows the first bubble again ({label})", shown() == norm(exp[0]["text"]), shown())
    page.keyboard.press("h"); page.wait_for_timeout(200)
    check(f"H hides the bubble ({label})", shown() is None, shown())
    c1 = clock(page); page.wait_for_timeout(1200); c2 = clock(page)
    check(f"clock runs again once the bubble is hidden ({label})", 0.9 < c1 - c2 < 1.6, (round(c1, 2), round(c2, 2)))
    for n in range(1, len(exp)):
        page.keyboard.press("n"); page.wait_for_timeout(200)
    check(f"N after H carries on to the last bubble ({label})", shown() == norm(exp[-1]["text"]), shown())

def test_b_h_persist(page, exp, label):
    """B and H on a step that opens with a persist note (Reflect)."""
    def cur():
        b = page.evaluate(BUBBLE); return norm(b["text"]) if b else None
    for _ in range(len(exp) - 2):
        page.keyboard.press("b"); page.wait_for_timeout(200)
    check(f"B back to the first think bubble, persist note stays ({label})", cur() == norm(exp[1]["text"]) and page.evaluate(PERSIST) is not None, cur())
    page.keyboard.press("b"); page.wait_for_timeout(200)
    check(f"B from the first think bubble: persist note only ({label})", cur() is None and page.evaluate(PERSIST) is not None, cur())
    page.keyboard.press("n"); page.wait_for_timeout(200)
    page.keyboard.press("h"); page.wait_for_timeout(200)
    check(f"first H hides the think bubble, not the persist note ({label})", cur() is None and page.evaluate(PERSIST) is not None)
    page.keyboard.press("h"); page.wait_for_timeout(200)
    check(f"second H hides the persist note ({label})", page.evaluate(PERSIST) is None)
    page.keyboard.press("n"); page.wait_for_timeout(300)
    check(f"N after H carries on ({label})", cur() == norm(exp[2]["text"]), cur())

def play(page, start_index):
    for i in range(start_index, len(STEPS)):
        step = STEPS[i]; scr = step["screen"]
        settle(page)
        p = pres(page)
        check(f"step {i}: screen key is {scr}", p and p["key"] == scr and p["ptr"] == i, p)
        if p is None or p["key"] != scr:
            log(f"ABORT at step {i}: key {p and p['key']} pointer {p and p['ptr']}")
            return False
        if i >= 6:
            check_no_paused(page, f"step {i} {scr}")
        if scr.endswith(".explore.map") and "tmap" not in DONE_ONCE:
            DONE_ONCE.add("tmap"); test_t_hold(page, f"step {i} {scr}")
        exp = expected_bubbles(page, i)
        check(f"step {i}: bubble count matches the route file", len(exp) == step["bubbles"], (len(exp), step["bubbles"]))
        persist_at = next((j for j, b in enumerate(exp) if anchors_of(b) == ["persist"]), None)
        for k, b in enumerate(exp):
            page.keyboard.press("n")
            check_bubble(page, i, scr, k, b, f"step {i} {scr} b{k + 1}")
            check_no_paused(page, f"step {i} b{k + 1}") if i >= 6 else None
            if persist_at is not None and k > persist_at:
                check(f"persist note still shown with bubble {k + 1} (step {i})", page.evaluate(PERSIST) is not None)
        if exp:
            last = page.evaluate(BUBBLE)
            page.keyboard.press("n"); page.wait_for_timeout(250)
            again = page.evaluate(BUBBLE)
            check(f"N after the last bubble shows nothing new (step {i})", again is not None and last is not None and again["text"] == last["text"]
                  and pres(page)["idx"] == len(exp) - 1, (again and again["text"][:40]))
            if len(exp) >= 3 and persist_at is None and "bh" not in DONE_ONCE:
                DONE_ONCE.add("bh"); test_b_h(page, i, exp, f"step {i} {scr}")
            if persist_at == 0 and len(exp) >= 3 and "bhp" not in DONE_ONCE:
                DONE_ONCE.add("bhp"); test_b_h_persist(page, exp, f"step {i} {scr}")
        else:
            page.keyboard.press("n"); page.wait_for_timeout(150)
            check(f"N on a step with no bubbles shows nothing (step {i})", page.evaluate(BUBBLE) is None)
        act(page, i)
        if exp and scr != "results":
            settle(page, 250)
            check(f"bubble, note and outlines gone when the screen changes (step {i} {scr})",
                  page.evaluate(BUBBLE) is None and page.evaluate(PERSIST) is None
                  and page.evaluate("() => document.querySelectorAll('.pres-layer > *').length") == 0)
    return True

def check_results(page, label, earlier_days=0):
    st = state(page); r = st["result"]; exp = ROUTE["expected"]
    check(f"results: {exp['weighted']} weighted, {exp['percentile']}th percentile ({label})",
          r and r["weighted"] == exp["weighted"] and r["percentile"] == exp["percentile"], r and (r["weighted"], r["percentile"]))
    for ph, (sc, of) in exp["phases"].items():
        t = r["phaseTotals"][ph]
        check(f"results: {ph} {sc}/{of} ({label})", abs(t["score"] - sc) < 1e-6 and abs(t["of"] - of) < 1e-6, t)
    toggles = page.locator('[data-act="toggle-block"]')
    ids = [toggles.nth(i).get_attribute("data-id") for i in range(toggles.count())]
    for bid in ids:
        if not state(page)["ui"]["openBlocks"].get(bid):
            page.click(f'[data-act="toggle-block"][data-id="{bid}"]'); page.wait_for_timeout(100)
    rows = page.evaluate("""() => [...document.querySelectorAll('.mark-row')].map(e =>
      [e.classList.contains('is-right') && !!e.querySelector('.mark-icon.ok'), e.querySelector('.row-main').textContent.slice(0, 50)])""")
    bad = [t for ok, t in rows if not ok]
    check(f"results: every row is a green tick ({label})", rows and not bad, (len(rows), bad))
    page.screenshot(path=f"{OUT}/results-full-{label}.png", full_page=True)
    # Earlier days, filled by a jump, must hold exactly the recorded route.
    run = st["run"]
    for di in range(earlier_days):
        rd, dr = ROUTE["days"][di], run["days"][di]
        check(f"Day {di + 1} asked as recorded ({label})", [[a["target"], a["id"], a["q"]] for a in dr["asked"]] == rd["ask"], dr["asked"])
        moved = {m[0]: (m[1], m[2]) for m in rd["moves"]}
        check(f"Day {di + 1} moves and reasons as recorded ({label})",
              all(dr["assignment"][p] == s and dr["reasons"][p] == rs and dr["reasonTo"][p] == s for p, (s, rs) in moved.items())
              and set(dr["reasons"]) == set(moved), (dr["assignment"], dr["reasons"]))
        check(f"Day {di + 1} support as recorded ({label})", dr["support"] == dict(rd["support"]), dr["support"])
        check(f"Day {di + 1} reflect as recorded ({label})", dr["reflect"] == rd["reflect"], dr["reflect"])
        dres = r["days"][di]
        n_rows = sum(len(dres[k]["items"]) for k in ("explore", "assign", "support", "reflect") if dres.get(k))
        check(f"Day {di + 1} results rows filled ({label})", n_rows == len(rd["ask"]) + 4 + len(rd["support"]) + 4, n_rows)

def new_page(p):
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": W, "height": H})
    page = ctx.new_page()
    page.on("pageerror", lambda e: (ERRORS.append("pageerror: " + str(e)), log("PAGEERROR " + str(e) + " " + str(getattr(e, "stack", "")))))
    page.on("console", lambda m: ERRORS.append("console." + m.type + ": " + m.text) if m.type in ("error", "warning")
            else log("  console.info: " + m.text) if m.type == "info" else None)
    return browser, page

def to_day1_explore(page):
    """Click through to the Day 1 Explore map (steps 0 to 10, no bubbles)."""
    page.goto(URL); page.wait_for_selector('[data-act="start"]')
    for i in range(0, 11):
        settle(page, 250); act(page, i)
    settle(page)
    check("reached the Day 1 Explore map", pres(page)["key"] == "d1.explore.map", pres(page))

with sync_playwright() as p:
    if MODE == "":
        browser, page = new_page(p)
        page.goto(URL); page.wait_for_selector('[data-act="start"]')
        check("presenter layer is a sibling of #app", page.evaluate(
            "() => { const l = document.querySelector('.pres-layer'); return !!l && l.parentNode === document.getElementById('app').parentNode && getComputedStyle(l).pointerEvents === 'none'; }"))
        if play(page, 0):
            check_results(page, "route")
        browser.close()
    elif MODE == "jump":
        for n in (2, 3):
            browser, page = new_page(p)
            to_day1_explore(page)
            page.keyboard.press("n"); page.wait_for_timeout(300)        # a bubble open when jumping
            page.keyboard.press(f"Control+Shift+{n}"); settle(page, 500)
            st = state(page); pi = pres(page)
            goal_i = [i for i, s in enumerate(STEPS) if s["screen"] == f"d{n}.goal"][0]
            check(f"jump {n}: Day {n} Goal card shown", pi["key"] == f"d{n}.goal" and page.locator(".gcard h1").inner_text().strip()
                  == st["content"]["days"][n - 1]["goal_heading"].strip(), pi)
            check(f"jump {n}: pointer on the d{n}.goal step", pi["ptr"] == goal_i and pi["idx"] == -1 and page.evaluate(BUBBLE) is None, pi)
            preset = st["content"]["presenter"]["clock_presets_minutes"][n - 1] * 60
            c = clock(page)
            check(f"jump {n}: clock running from {preset // 60} minutes", st["timer"]["running"] and preset - 3 <= c <= preset, round(c, 1))
            check(f"jump {n}: nothing open", st["ui"]["modal"] is None and st["ui"]["dialog"] is None and st["ui"]["panel"] is None)
            later = st["run"]["days"][n - 1:]
            check(f"jump {n}: Day {n} onwards empty", all(not d["asked"] and not d["assignment"] and not d["reasons"] and not d["support"]
                  and not d["reflect"] and not d["late"] for d in later))
            check(f"jump {n}: onboarding done in the recorded order", st["run"]["onboarding"]["order"] == ROUTE["onboarding_order"])
            page.screenshot(path=f"{OUT}/jump{n}-goal.png")
            if play(page, goal_i):
                check_results(page, f"jump{n}", earlier_days=n - 1)
            browser.close()
    elif MODE == "off":
        browser, page = new_page(p)
        page.goto(URL + "?content=sfl2"); page.wait_for_selector('[data-act="start"]')
        SNAP = "() => { const s = JSON.parse(JSON.stringify(window.__sfl.getState())); delete s.timer.left; return JSON.stringify(s); }"
        def keys_change_nothing(label, expect_running):
            before = page.evaluate(SNAP); html_before = page.evaluate("() => document.getElementById('app').innerHTML")
            c1 = clock(page)
            for k in ("n", "b", "h", "t", "Control+Shift+2", "n"):
                page.keyboard.press(k); page.wait_for_timeout(150)
            page.wait_for_timeout(1300); c2 = clock(page)
            check(f"off: keys change no state ({label})", page.evaluate(SNAP) == before)
            if not expect_running:   # a running clock repaints the ring every second, so only compare a still screen
                check(f"off: keys change nothing on screen ({label})",
                      page.evaluate("() => document.getElementById('app').innerHTML") == html_before)
            check(f"off: no presenter layer or body class ({label})", page.evaluate(
                "() => !document.querySelector('.pres-layer') && !document.body.className.includes('pres-')"))
            check(f"off: presenter hook reports nothing ({label})", pres(page) is None)
            if expect_running:
                check(f"off: clock keeps running ({label})", 1.0 < c1 - c2 < 2.6, (round(c1, 2), round(c2, 2)))
        keys_change_nothing("start", False)
        click(page, '[data-act="start"]'); settle(page)
        keys_change_nothing("tutorial", False)
        for _ in range(5):
            click(page, '[data-act="card-next"]')
        settle(page)
        check("off: clock started at Start Project", state(page)["timer"]["running"])
        keys_change_nothing("Project Introduction, clock running", True)
        page.screenshot(path=f"{OUT}/off-onb-intro.png")
        browser.close()
    else:
        raise SystemExit("unknown mode " + MODE)

check("no console errors or warnings, no page errors", not ERRORS, ERRORS[:5])
if PAPER_HOMES:
    lefts = [x[1] for x in PAPER_HOMES]; bottoms = [x[2] for x in PAPER_HOMES]
    check(f"every notepad note in the same place ({len(PAPER_HOMES)} notes)", max(lefts) - min(lefts) <= 2 and max(bottoms) - min(bottoms) <= 2,
          (min(lefts), max(lefts), min(bottoms), max(bottoms)))
passed = sum(1 for _, ok in CHECKS if ok)
for name, ok in CHECKS:
    if not ok:
        log("FAILED: " + name)
log(f"bubbles covering text that matters: {len(set(c[0] for c in COVER_LOG))}")
for lab, what, px, pct in COVER_LOG:
    log(f"  COVER {lab}: {what} {px}px2 ({pct}%)")
for lab, what, px, pct in ALLOWED_LOG:
    log(f"  covers (allowed) {lab}: {what} {px}px2 ({pct}%)")
for r in RELAXED:
    log(f"  RELAXED (15% -> 30%) {r}")
log(f"CHECKS {W}x{H} {MODE or 'normal'}: {passed} passed, {len(CHECKS) - passed} failed, {len(CHECKS)} total")
with open(f"{OUT}/log.txt", "w") as f:
    f.write("\n".join(LOG))
sys.exit(0 if passed == len(CHECKS) else 1)
