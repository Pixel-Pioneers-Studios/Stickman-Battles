"""Flag minor-second / minor-ninth collisions between sustained notes, beat by beat (sampled notes only).

    .venv/bin/python harmony_check.py [module]   (imports module.build; default boss_theme)
"""
import collections, importlib, sys
bt = importlib.import_module(sys.argv[1] if len(sys.argv) > 1 else 'boss_theme')
E = bt.build()
b = E.beat
PERC = {'harp', 'glock', 'chimes'}
base = (bt.INTRO + bt.BODY) * 4 * b          # second body pass
end = base + bt.BODY * 4 * b
rows = collections.defaultdict(list)
for inst, m, t, d, v, tr in E.log:
    if inst in PERC or 'spic' in inst or 'stac' in inst: continue
    if t + d < 0: continue
    rows['all'].append((round(m), t, t + d, inst))
bad = collections.Counter(); detail = collections.defaultdict(set)
def chk(t0, label):
    on = [(m, i) for m, s, e, i in rows['all'] if s <= t0 + 0.02 and e >= t0 + b * 0.5]
    ps = sorted(set(m for m, _ in on))
    for a in range(len(ps)):
        for c in range(a + 1, len(ps)):
            iv = ps[c] - ps[a]
            if iv % 12 in (1, 11) and not (iv % 12 == 11 and iv > 12) and iv != 11:
                bad[label] += 1
                names = sorted(set(i for m, i in on if m in (ps[a], ps[c])))
                detail[label].add(f'{ps[a]}-{ps[c]} ({",".join(names)})')
for k in range(bt.INTRO * 4):
    chk(k * b, f'intro bar {k // 4 + 1} beat {k % 4 + 1}')
for k in range(bt.BODY * 4):
    chk(base + k * b, f'body bar {k // 4 + 1} beat {k % 4 + 1}')
for lab in bad: print(lab, '|', '; '.join(sorted(detail[lab])))
