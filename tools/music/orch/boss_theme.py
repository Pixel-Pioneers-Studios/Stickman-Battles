"""The Ninety-Fifth: boss theme (the Creator fight and TrueForm). E minor, 140 BPM.

Built on the films' ideas:
  Kael       his theme from films 1-4 (E minor; E major at the climax)
  Creator    stacked fifths, something being built: E B F# C# G#, in brass with glass over it
  Laws       open fifths over a low C, no third (Cosmic Axiom)
  Sovereign  his wrong notes, D D# A A#, as a brass cluster
  The kept   the "ninety-four" figure, far off, in the breakdown

Layout: an 8-bar intro that plays once, then a 64-bar body that loops sample-accurately.
  body  1-8  drive        9-16 theme (horns)     17-24 the Creator builds   25-32 theme (tutti)
       33-40 breakdown   41-48 theme vs fifths   49-56 theme in E major     57-64 return and build

    .venv/bin/python boss_theme.py [--preview] [--stems]
"""
import argparse, math, os, sys, time
import numpy as np
import soundfile as sf
from engine import Engine, make_ir, make_delay_ir, mtof, lufs, db, SR

BPM = 140
INTRO, BODY = 8, 64
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')

# ── material ──
PC = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
CHORD = {  # root, tones (pitch classes)
    'Em': ('E', [4, 7, 11]), 'C': ('C', [0, 4, 7]), 'D': ('D', [2, 6, 9]), 'B': ('B', [11, 3, 6]), 'Am': ('A', [9, 0, 4]),
    'G': ('G', [7, 11, 2]), 'E': ('E', [4, 8, 11]), 'C#m': ('C#', [1, 4, 8]), 'B7': ('B', [11, 3, 6, 9]), 'A': ('A', [9, 1, 4]),
    'E5': ('E', [4, 11]), 'C5': ('C', [0, 7, 2]), 'Bsus': ('B', [11, 4, 6]), 'Cmaj7': ('C', [0, 4, 7, 11]), 'Gs m': ('G#', [8, 11, 3]),
    'Am6': ('A', [9, 0, 4, 6]), 'D5': ('D', [2, 9]),
}
KAEL = [[(76, 1.5), (71, .5), (76, 1), (79, .5), (78, .5)],
        [(76, 1.5), (74, .5), (72, 1), (67, 1)],
        [(78, 1.5), (81, .5), (79, 1), (78, .5), (74, .5)],
        [(75, 2), (71, 2)]]
KAEL_ANS = [KAEL[0], KAEL[1],
            [(72, 1.5), (76, .5), (79, 1), (78, .5), (76, .5)],
            [(75, 1.5), (78, .5), (71, 2)]]
KAEL_MAJ = [[(76, 1.5), (71, .5), (76, 1), (80, .5), (78, .5)],
            [(76, 1.5), (75, .5), (73, 1), (68, 1)],
            [(78, 1.5), (81, .5), (80, 1), (78, .5), (75, .5)],
            [(80, 2), (76, 2)]]
KAEL_MAJ_ANS = [KAEL_MAJ[0], KAEL_MAJ[1],
                [(73, 1.5), (76, .5), (81, 1), (80, .5), (78, .5)],
                [(78, 2), (75, 1), (71, 1)]]
FIFTHS = [40, 47, 54, 61, 68]          # E B F# C# G#: the Creator
SOV = [50, 51, 57, 58]                 # D D# A A#
KEPT = [69, 72, 76, 79, 76, 72]        # the ninety-four
STAR = [86, 88, 93, 95]               # the film's starlight, a step down so it sits over the C of the Laws
ACC = [0, 3, 6, 8, 11, 14]             # 3-3-2 accents in sixteenths


def tones(ch, lo, hi):
    root, pcs = CHORD[ch]
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def root(ch, octave_lo=28):
    r = PC[CHORD[ch][0]]
    m = octave_lo + ((r - octave_lo) % 12)
    return m


def flat(lines):
    return [n for line in lines for n in line]


def build():
    total_bars = INTRO + 2 * BODY + 2
    E = Engine(BPM, total_bars * 240 / BPM + 6.0)
    b = E.beat
    T = E.t

    # ── tracks ──
    hall = {'hall': 0.0}
    E.track('vln', pan=-0.42, sends={'hall': 0.34}, eq=[('hp', 160, 0.7, 0), ('peak', 3200, 0.9, -1.5)])
    E.track('vln_s', pan=-0.38, sends={'hall': 0.26}, eq=[('hp', 180, 0.7, 0)])
    E.track('vla', pan=-0.08, sends={'hall': 0.32}, eq=[('hp', 120, 0.7, 0), ('peak', 500, 1.0, -1.5)])
    E.track('vla_s', pan=-0.05, sends={'hall': 0.24}, eq=[('hp', 120, 0.7, 0)])
    E.track('vc', pan=0.3, sends={'hall': 0.3}, eq=[('hp', 50, 0.7, 0), ('peak', 300, 1.0, -2)])
    E.track('vc_s', pan=0.24, sends={'hall': 0.2}, eq=[('hp', 55, 0.7, 0), ('peak', 280, 1.0, -2), ('peak', 2500, 1.0, 2)],
            comp={'thresh': -20, 'ratio': 2.5, 'attack': 0.005, 'release': 0.08, 'makeup': 2})
    E.track('cb', pan=0.42, sends={'hall': 0.26}, eq=[('hp', 30, 0.7, 0), ('peak', 250, 1.0, -2)])
    E.track('hn', pan=-0.22, sends={'hall': 0.42}, eq=[('hp', 80, 0.7, 0), ('peak', 400, 1.0, -1.5), ('high', 6000, 0.7, -2)])
    E.track('tbn', pan=0.28, sends={'hall': 0.34}, eq=[('hp', 60, 0.7, 0)])
    E.track('tpt', pan=0.12, sends={'hall': 0.32}, eq=[('hp', 150, 0.7, 0), ('high', 7000, 0.7, -2)])
    E.track('tba', pan=0.36, sends={'hall': 0.28}, eq=[('hp', 28, 0.7, 0)])
    E.track('brs_s', pan=0.08, sends={'hall': 0.3}, eq=[('hp', 70, 0.7, 0), ('peak', 320, 1.0, -2)], comp={'thresh': -18, 'ratio': 2, 'attack': 0.004, 'release': 0.1, 'makeup': 1})
    E.track('timp', pan=-0.1, sends={'hall': 0.32}, eq=[('hp', 40, 0.7, 0)])
    E.track('perc', pan=0.0, sends={'hall': 0.22}, eq=[('hp', 32, 0.7, 0), ('peak', 400, 1.0, -3), ('peak', 90, 1.2, 2)],
            comp={'thresh': -16, 'ratio': 3, 'attack': 0.003, 'release': 0.12, 'makeup': 2}, sat=0.4)
    E.track('drm', pan=0.0, sends={'hall': 0.08, 'plate': 0.12}, eq=[('hp', 35, 0.7, 0)],
            comp={'thresh': -14, 'ratio': 3, 'attack': 0.002, 'release': 0.09, 'makeup': 1.5}, sat=0.3)
    E.track('hats', pan=0.18, sends={'plate': 0.08}, eq=[('hp', 5000, 0.7, 0)])
    E.track('cym', pan=-0.05, sends={'hall': 0.25}, eq=[('hp', 300, 0.7, 0), ('high', 9000, 0.7, -2)])
    E.track('bass', sends={}, eq=[('hp', 30, 0.7, 0), ('peak', 180, 1.0, 1), ('peak', 350, 1.0, -2), ('lp', 1800, 0.7, 0)], duck=0.55, duck_release=0.16, mono_below=180, sat=0.6)
    E.track('sub', sends={}, eq=[('lp', 120, 0.7, 0)], duck=0.7, duck_release=0.18, width=0.0)
    E.track('arp', pan=0.0, width=1.2, sends={'hall': 0.18, 'delay': 0.22}, eq=[('hp', 250, 0.7, 0)], duck=0.35)
    E.track('pad', width=1.3, sends={'hall': 0.3}, eq=[('hp', 260, 0.7, 0), ('lp', 7000, 0.7, 0)], duck=0.4, duck_release=0.25)
    E.track('choir', width=1.1, sends={'hall': 0.55}, eq=[('hp', 240, 0.7, 0), ('peak', 3000, 1.0, -3)])
    E.track('bells', width=1.2, sends={'hall': 0.5, 'delay': 0.12}, eq=[('hp', 300, 0.7, 0)])
    E.track('fx', width=1.2, sends={'hall': 0.3}, eq=[('hp', 40, 0.7, 0)])
    E.track('hit', sends={'hall': 0.25}, eq=[('hp', 25, 0.7, 0)], sat=0.3)

    # mix desk: track faders in dB, set by ear-proxy (stemlevels.py) against the melody carriers
    MIX = {'perc': -8, 'drm': -7, 'hit': -6, 'bass': -6, 'sub': -6, 'hats': 8, 'timp': 8, 'arp': 3, 'bells': 4, 'vc_s': -2}
    for k, v in MIX.items(): E.tracks[k].gain = v

    # ── part helpers ──
    def strings_pad(bar, chs, beats_each=4, vel=0.6, vln_hi=79, expr=None, trem=False, low=True, gain=0.0):
        t = T(bar)
        for ch in chs:
            d = beats_each * b
            top = [m for m in tones(ch, 64, vln_hi)][-2:]
            mid = tones(ch, 55, 64)[:2]
            vinst = 'vln_trem' if trem else 'vln_sus'
            for m in top: E.note(vinst, m, t, d, vel=vel, track='vln', expr=expr, gain_db=gain - 3)
            for m in mid: E.note('vla_sus', m, t, d, vel=vel, track='vla', expr=expr, gain_db=gain - 3)
            r = root(ch, 40)
            E.note('vc_sus', r, t, d, vel=vel, track='vc', expr=expr, gain_db=gain - 1)
            E.note('vc_sus', r + 7 if ch not in ('B', 'B7', 'Bsus') else r + 7, t, d, vel=vel * 0.9, track='vc', expr=expr, gain_db=gain - 5)
            if low: E.note('cb_sus', root(ch, 28), t, d, vel=vel, track='cb', expr=expr, gain_db=gain - 1)
            t += d

    def ostinato(bar, ch, inst='vc_spic', track='vc_s', octave=40, vel=0.85, gain=0.0, pattern=None, bars=1, fifth_only=False):
        r = root(ch, octave)
        third = 3 if ch in ('Em', 'Am', 'C#m', 'Gs m') else 4
        p = pattern or [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12]
        for k in range(bars):
            for i, iv in enumerate(p):
                if iv is None: continue
                acc = i in ACC
                E.note(inst, r + iv, T(bar + k, i / 4), b / 4, vel=vel if acc else vel * 0.55, track=track, gain_db=gain + (0 if acc else -2.0))

    def hi_ostinato(bar, ch, vel=0.7, gain=-4, bars=1):
        # violins: chord arpeggio in sixteenths, octave 5
        ts = tones(ch, 64, 83)
        r = ts[0]
        fig = [ts[0], ts[1], ts[2], ts[1], ts[3] if len(ts) > 3 else ts[2] + 12, ts[2], ts[1], ts[2]] * 2
        for k in range(bars):
            for i, m in enumerate(fig):
                E.note('vln_spic', m, T(bar + k, i / 4), b / 4, vel=vel if i in ACC else vel * 0.6, track='vln_s', gain_db=gain)

    def viola_eighths(bar, ch, vel=0.7, gain=-3, bars=1):
        ts = tones(ch, 52, 66)
        for k in range(bars):
            for i in range(8):
                m = ts[[0, 1, 2, 1, 0, 1, 2, 1][i] % len(ts)]
                E.note('vla_spic', m, T(bar + k, i / 2), b / 2, vel=vel if i % 2 == 0 else vel * 0.7, track='vla_s', gain_db=gain)

    def brass_stabs(bar, ch, vel=0.85, slots=(0, 3, 6), gain=0.0, tuba=True):
        r = root(ch, 40)
        for s in slots:
            t = T(bar, s / 4)
            E.note('tbn_stac', r, t, b * 0.5, vel=vel, track='brs_s', gain_db=gain, ens=2)
            E.note('tbn_stac', r + 7, t, b * 0.5, vel=vel * 0.9, track='brs_s', gain_db=gain - 2)
            E.note('hn_stac', r + 12, t, b * 0.5, vel=vel, track='brs_s', gain_db=gain - 1, ens=2)
            if tuba: E.note('tba_stac', r - 12 if r - 12 >= 34 else r, t, b * 0.5, vel=vel, track='brs_s', gain_db=gain - 1)

    def bass(bar, ch, bars=1, pattern='8ths', gain=-17, cutoff=700):
        f = mtof(root(ch, 28))
        for k in range(bars):
            if pattern == '8ths':
                for i in range(8):
                    E.synth('bass', f * (2 if i in (3, 7) else 1), T(bar + k, i / 2), b / 2 * 0.85, wave='saw', voices=3, detune=0.14, spread=0.0,
                            cutoff=lambda tt, c=cutoff: c * (1 + 2.5 * np.exp(-tt * 18)), res=0.25, amp_env=(0.003, 0.05, 0.8, 0.04), gain_db=gain, drive=1.2)
            elif pattern == 'hold':
                E.synth('bass', f, T(bar + k), 4 * b, wave='saw', voices=3, detune=0.12, cutoff=cutoff * 0.7, res=0.15, amp_env=(0.01, 0.2, 0.9, 0.1), gain_db=gain, drive=0.8)
            E.synth('sub', f, T(bar + k), 4 * b * 0.98, wave='sine', amp_env=(0.004, 0.1, 1.0, 0.05), gain_db=-13)

    def arp(bar, ch, bars=1, gain=-22, octave=64, bright=2400):
        ts = tones(ch, octave, octave + 19)
        seq = [ts[0], ts[1], ts[2], ts[3 % len(ts)] if len(ts) > 3 else ts[0] + 12, ts[2], ts[1]]
        for k in range(bars):
            for i in range(16):
                m = seq[i % len(seq)] + (12 if (i // 6) % 2 and i % 3 == 0 else 0)
                E.synth('arp', mtof(m), T(bar + k, i / 4), b / 4 * 0.6, wave='saw', voices=2, detune=0.08, spread=0.6,
                        cutoff=lambda tt, c=bright: 300 + c * np.exp(-tt * 22), res=0.3, amp_env=(0.002, 0.08, 0.25, 0.06),
                        gain_db=gain + (2 if i in ACC else 0))

    def pad(bar, ch, beats=4, gain=-24, cutoff=1800):
        for m in tones(ch, 52, 71):
            E.synth('pad', mtof(m), T(bar), beats * b, wave='saw', voices=5, detune=0.18, spread=0.9, cutoff=cutoff, res=0.1,
                    amp_env=(0.25, 0.3, 0.85, 0.6), gain_db=gain)

    def drums(bar, style='full', fill=False, bars=1, hat16=True, gain=0.0):
        for k in range(bars):
            br = bar + k
            last = fill and k == bars - 1
            # taiko: the 3-3-2 pulse
            for s in ([0, 3, 6, 8, 11, 14] if style != 'half' else [0, 6, 8]):
                if last and s >= 8: continue
                E.taiko('perc', T(br, s / 4), gain_db=gain - (4 if s in (0, 8) else 8), pitch=1.0 if s in (0, 8) else 1.15)
            if style in ('full', 'drive'):
                E.kick('drm', T(br, 0), gain_db=gain - 5)
                E.kick('drm', T(br, 2.5), gain_db=gain - 8)
                if not last: E.snare('drm', T(br, 2), gain_db=gain - 7)
                if style == 'full' and not last: E.kick('drm', T(br, 3.25), gain_db=gain - 10)
                n = 16 if hat16 else 8
                for i in range(n):
                    if last and i >= n // 2: continue
                    E.hat('hats', T(br, i * 4 / n), gain_db=gain - (19 if i % (n // 4) == 0 else 25), open_=(i == n - 2 and not hat16))
            elif style == 'taiko':
                E.kick('drm', T(br, 0), gain_db=gain - 7)
            elif style == 'half':
                E.kick('drm', T(br, 0), gain_db=gain - 6)
                E.snare('drm', T(br, 2), gain_db=gain - 9)
            if last:
                # tom fill over the last two beats
                for i in range(8):
                    E.taiko('perc', T(br, 2 + i / 4), gain_db=gain - 9 + i * 0.7, pitch=1.5 - i * 0.06)
                    E.snare('drm', T(br, 2 + i / 4), gain_db=gain - 17 + i * 1.2, layer=(i % 2 == 0))

    def impact(t, gain=0.0, gong=False, crash=True, low_note=28):
        E.taiko('hit', t, gain_db=gain - 2, pitch=0.85, key=True)
        E.kick('hit', t, gain_db=gain - 4, f_hi=120, f_lo=38, decay=0.6, key=False)
        E.sub_drop('hit', t, dur=2.2, gain_db=gain - 10)
        if crash:
            k = int(E.rng.integers(1, 3))
            E.sample_hit('cym', f'vsco/Percussion/cymbal-crash1_ff_rr{k}.wav', t - 0.005, gain_db=gain - 9)
        if gong:
            E.sample_hit('cym', 'vsco/Percussion/gongHit_f.wav', t, gain_db=gain - 8)
        E.sample_hit('timp', 'vsco/Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', t, gain_db=gain - 6)

    def swell_cymbal(t_end, kind='Median', gain=-10):
        lens = {'Short': 2121550, 'Median': 2291710, 'Long': 2991302}
        # crescendo samples peak at their end: place so the peak lands on t_end
        rel = f'vsco/Percussion/susCymb1-cresc-{kind}_v1.wav'
        L, R, _ = E.bank.load(rel)
        pk = int(np.argmax(np.abs(L)))
        E.sample_hit('cym', rel, t_end - pk / SR, gain_db=gain, length=pk / SR + 0.05, fade=0.04)

    def timp_roll(t0, t1, gain=-8):
        rel = 'vsco/Percussion/Timpani/Rolls/Timpani1_Roll_v5_rr1_Sum.wav'
        L, R, _ = E.bank.load(rel)
        d = t1 - t0
        E.sample_hit('timp', rel, t0, gain_db=gain, length=min(d, len(L) / SR), fade=0.05)

    def snare_roll(t0, t1, gain=-12):
        rel = 'vsco/Percussion/Snare2-rollSN_v5_rr1_Sum.wav'
        L, R, _ = E.bank.load(rel)
        d = min(t1 - t0, len(L) / SR)
        n = int(d * SR)
        x = np.stack([L[:n], R[:n]], 1) * (np.linspace(0.15, 1, n) ** 2)[:, None]
        E.add('drm', t1 - d, (x * db(gain)).astype(np.float32))

    def braam(t, notes, dur, gain=0.0, vel=0.95):
        for m in notes:
            inst = 'tba_sus' if m < 40 else ('tbn_sus' if m < 58 else 'ihn')
            E.note(inst, m, t, dur, vel=vel, track={'tba_sus': 'tba', 'tbn_sus': 'tbn', 'ihn': 'hn'}[inst], gain_db=gain - 2, ens=2,
                   expr=[(0, 0), (0.4, -3), (dur, -6)])
        for m in notes[:3]:
            E.synth('pad', mtof(m), t, dur, wave='saw', voices=4, detune=0.2, spread=0.8,
                    cutoff=lambda tt: 200 + 2600 * np.exp(-tt * 2.5), res=0.3, amp_env=(0.01, 0.6, 0.5, 0.8), gain_db=gain - 18, drive=1.5)

    def glass(t, notes, step, gain=0.0, inst='glock'):
        for i, m in enumerate(notes):
            E.note(inst, m, t + i * step, 2.5, vel=0.6, track='bells', gain_db=gain - 8)

    def theme(bar, lines, inst, track, octave=0, vel=0.78, gain=0.0, ens=1, legato=True):
        # phrasing: louder toward the line's high notes, easing off on each bar's last note
        allm = [m for line in lines for m, _ in line]
        lo, hi = min(allm), max(allm)
        notes, vs = [], []
        for line in lines:
            for i, (m, d) in enumerate(line):
                notes.append((m + octave, d))
                vs.append(min(1.0, vel * (0.88 + 0.18 * (m - lo) / max(1, hi - lo)) * (0.94 if i == len(line) - 1 else 1.0)))
        kw = {'ens': ens} if ens > 1 else {}
        E.line(inst, notes, T(bar), track=track, vel=lambda i: vs[i], gain_db=gain, legato=legato, **kw)

    # ── intro (plays once) ──
    def intro():
        E.reseed(11)
        # darkness: sub drone, low strings swelling, the Creator's fifths assembling in glass
        E.synth('sub', mtof(28), T(0), 6 * 4 * b, wave='sine', amp_env=(3.0, 0.1, 1.0, 1.0), gain_db=-20)
        E.note('cb_sus', 28, T(0), 6 * 4 * b, vel=0.45, track='cb', expr=[(0, -18), (8, -4), (14, -8)])
        E.note('vc_sus', 40, T(0, 0), 6 * 4 * b, vel=0.45, track='vc', expr=[(0, -20), (9, -6), (14, -8)])
        for i, m in enumerate(FIFTHS):
            t = T(0) + i * 3 * b
            if i < 2: E.note('chimes', m + 24, t, 4.0, vel=0.45, track='bells', gain_db=-5)
            E.note('glock', m + 36, t + 0.01, 2.0, vel=0.35, track='bells', gain_db=-12)
            E.note('harp', m + 12, t, 2.0, vel=0.6, track='bells', gain_db=-3)
            E.note('vln_trem', m + 24 if m + 24 <= 86 else m + 12, t, (15 - i * 3) * b, vel=0.4, track='vln', gain_db=-8, expr=[(0, -14), (1.5, -3)])
        E.choir('choir', [52, 59], T(2), 4 * 4 * b, vowel='oo', gain_db=-22, attack=4.0, release=1.5)
        # a far heartbeat
        for k in range(4):
            E.taiko('perc', T(2 + k), gain_db=-13, pitch=0.9); E.taiko('perc', T(2 + k, 0.5), gain_db=-17, pitch=0.9)
        # the clock starts: ostinato and arp, filtered, rising
        for k in range(2):
            ostinato(4 + k, 'E5', vel=0.45 + 0.15 * k, gain=-8 + 3 * k, pattern=[0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 0, 12, 7, 12])
            arp(4 + k, 'Em', gain=-30 + 4 * k, bright=600 + 900 * k)
        swell_cymbal(T(6), 'Long', gain=-12)
        riser = E.riser('fx', T(4), T(6), gain_db=-20, f0=200, f1=5000)
        # the braam
        impact(T(6), gain=1, gong=True)
        braam(T(6), [28, 40, 47, 52, 59], 4 * b * 1.0, gain=3)
        E.choir('choir', [64, 71, 76], T(6), 4 * b, vowel='ah', gain_db=-17, attack=0.08, release=1.2)
        ostinato(6, 'E5', vel=0.8, gain=-3)
        # the last bar: snare and timpani rolls, a riser, then one beat of nothing
        ostinato(7, 'E5', vel=0.9, gain=-1, pattern=[0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, None, None, None, None])
        timp_roll(T(7), T(7, 3), gain=-8)
        snare_roll(T(7), T(7, 3), gain=-10)
        E.riser('fx', T(7), T(7, 3), gain_db=-16, f0=400, f1=9000)
        swell_cymbal(T(7, 3), 'Short', gain=-11)
        for i, m in enumerate([40, 47, 52, 59, 64, 71]):
            E.note('tbn_sus' if m < 58 else 'ihn', m, T(7) + i * b * 0.5, 3 * b - i * b * 0.5, vel=0.5, track='tbn' if m < 58 else 'hn',
                   gain_db=-6, expr=[(0, -12), (3 * b - i * b * 0.5, 0)])

    # ── body (loops) ──
    def body(o):
        E.reseed(29)
        # 1-8: drive
        prog_a = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B']
        impact(T(o), gain=0, gong=False)
        for k, ch in enumerate(prog_a):
            bar = o + k
            ostinato(bar, ch)
            if k >= 2: viola_eighths(bar, ch, vel=0.65, gain=-5)
            brass_stabs(bar, ch, vel=0.8 if k % 2 == 0 else 0.7, slots=(0, 3, 6) if k % 2 == 0 else (0, 3, 6, 10, 12), gain=-3)
            bass(bar, ch)
            arp(bar, ch, gain=-26 + k * 0.5)
            drums(bar, 'drive' if k >= 4 else 'taiko', fill=(k == 7), hat16=(k >= 6), gain=-1.5 if k < 4 else -0.5)
        strings_pad(o + 4, ['Em', 'Em', 'C', 'B'], vel=0.55, gain=-5, low=False, expr=[(0, -10), (2.5, 0)])
        swell_cymbal(T(o + 8), 'Short', gain=-13)

        # 9-16: Kael's theme, horns and cellos in unison, an octave below its film pitch
        prog_b = ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B']
        impact(T(o + 8), gain=-2)
        theme(o + 8, KAEL + KAEL_ANS, 'ihn', 'hn', octave=-12, vel=0.8, gain=1, ens=3)
        theme(o + 8, KAEL + KAEL_ANS, 'vc_sus', 'vc', octave=-12, vel=0.7, gain=-4)
        for k, ch in enumerate(prog_b):
            bar = o + 8 + k
            ostinato(bar, ch, inst='cb_spic', track='cb', octave=28, vel=0.75, gain=-3, pattern=[0, None, 12, 0, None, 12, 0, None, 0, None, 12, 0, None, 12, 0, 12])
            viola_eighths(bar, ch, vel=0.7, gain=-4)
            strings_pad(bar, [ch], vel=0.5, gain=-7, trem=True, low=False)
            bass(bar, ch, gain=-18)
            pad(bar, ch, gain=-27)
            drums(bar, 'half' if k < 4 else 'drive', fill=(k == 7), hat16=(k >= 4), gain=-1.5)
            E.note('tbn_sus', root(ch, 40), T(bar), 4 * b, vel=0.55, track='tbn', gain_db=-6, ens=2, expr=[(0, -6), (1.0, -2), (4 * b, -8)])
        swell_cymbal(T(o + 16), 'Median', gain=-12)
        E.riser('fx', T(o + 15), T(o + 16), gain_db=-20)

        # 17-24: the Creator builds. Stacked fifths in the brass, glass above, strings answer.
        impact(T(o + 16), gain=0, gong=True)
        stacks = [(('E5', 'E5'), FIFTHS), (('Em', 'B'), None), (('C', 'C'), [36, 43, 50, 57, 64]), (('D', 'D'), [38, 45, 52, 59, 66])]
        for k2, (chs, st) in enumerate(stacks):
            bar = o + 16 + k2 * 2
            ch = chs[0]
            for kk in range(2):
                ostinato(bar + kk, chs[kk])
                hi_ostinato(bar + kk, chs[kk], vel=0.7, gain=-6)
                bass(bar + kk, chs[kk], gain=-17)
                drums(bar + kk, 'full', fill=(k2 == 3 and kk == 1), hat16=True)
            if st:
                for i, m in enumerate(st[:4]):
                    inst, trk = ('tba_sus', 'tba') if m < 40 else (('tbn_sus', 'tbn') if m < 60 else ('ihn', 'hn'))
                    E.note(inst, m, T(bar, i), (8 - i) * b, vel=0.85, track=trk, gain_db=-1, ens=2, expr=[(0, 0), (0.3, -4), ((8 - i) * b, 0)])
                    if m >= 50: E.note('ihn', m + 12 if m + 12 <= 77 else m, T(bar, i), (8 - i) * b, vel=0.7, track='hn', gain_db=-5, ens=2)
                top = st[4]
                E.note('tpt_sus', top + 12 if top + 12 <= 84 else top, T(bar + 1), 4 * b, vel=0.85, track='tpt', gain_db=-2, ens=2, expr=[(0, -10), (4 * b, 0)])
                E.note('ihn', top, T(bar + 1), 4 * b, vel=0.85, track='hn', gain_db=-2, ens=3, expr=[(0, -8), (4 * b, 0)])
                glass(T(bar), [m + 36 for m in st], b, gain=0)
                glass(T(bar), [m + 24 for m in st], b, gain=-2, inst='harp')
            else:
                # the strings answer: a falling E minor run in violins, the lows punch the 3-3-2
                run = [88, 86, 83, 81, 79, 78, 76, 74, 71, 69, 67, 66, 64, 62, 59, 57][::1]
                for i, m in enumerate(run):
                    E.note('vln_spic', min(m, 86), T(bar, 2 + i / 8 * 2), b / 4, vel=0.8, track='vln_s', gain_db=-1)
                brass_stabs(bar, 'Em', slots=(0, 3, 6, 8, 11, 14), vel=0.9, gain=-2)
                brass_stabs(bar + 1, 'B', slots=(0, 3, 6), vel=0.85, gain=-2)
                E.note('tpt_sus', 75, T(bar + 1, 2), 2 * b, vel=0.8, track='tpt', gain_db=-4, ens=2, expr=[(0, -6), (2 * b, 0)])
            if k2 == 3:
                E.note('tpt_sus', 78, T(bar + 1, 2), 2 * b, vel=0.9, track='tpt', gain_db=-2, ens=2)
        E.choir('choir', [64, 71], T(o + 20), 4 * 4 * b, vowel='ah', gain_db=-24, attack=2.0)
        swell_cymbal(T(o + 24), 'Median', gain=-11)
        E.riser('fx', T(o + 22), T(o + 24), gain_db=-18)

        # 25-32: the theme, tutti: violins at film pitch, violas and horns an octave down, trumpets join for the answer
        prog_d = ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B']
        impact(T(o + 24), gain=0, gong=True)
        theme(o + 24, KAEL + KAEL_ANS, 'vln_sus', 'vln', octave=0, vel=0.85, gain=1)
        theme(o + 24, KAEL + KAEL_ANS, 'vla_sus', 'vla', octave=-12, vel=0.8, gain=-1)
        theme(o + 24, KAEL + KAEL_ANS, 'ihn', 'hn', octave=-12, vel=0.85, gain=0, ens=3)
        theme(o + 28, KAEL_ANS, 'tpt_sus', 'tpt', octave=0, vel=0.8, gain=-5, ens=2)
        for k, ch in enumerate(prog_d):
            bar = o + 24 + k
            ostinato(bar, ch)
            brass_stabs(bar, ch, vel=0.75, slots=(0, 3, 6), gain=-6, tuba=False)
            r = root(ch, 40)
            E.note('tbn_sus', r, T(bar), 4 * b, vel=0.75, track='tbn', gain_db=-3, ens=2)
            E.note('tbn_sus', r + 7, T(bar), 4 * b, vel=0.7, track='tbn', gain_db=-6, ens=2)
            E.note('tba_sus', root(ch, 28) + 12 if root(ch, 28) < 34 else root(ch, 28), T(bar), 4 * b, vel=0.7, track='tba', gain_db=-4)
            E.note('cb_sus', root(ch, 28), T(bar), 4 * b, vel=0.75, track='cb', gain_db=-2)
            bass(bar, ch)
            pad(bar, ch, gain=-25, cutoff=2600)
            arp(bar, ch, gain=-25)
            drums(bar, 'full', fill=(k == 7), hat16=True)
            E.choir('choir', tones(ch, 60, 72)[:3], T(bar), 4 * b, vowel='ah', gain_db=-22, attack=0.3, release=0.6)
            if k == 3: impact(T(bar + 1), gain=-4, crash=True)
        swell_cymbal(T(o + 32), 'Short', gain=-12)

        # 33-40: breakdown. The Laws: open fifths over C, no third, starlight; the kept, far off; Kael alone.
        impact(T(o + 32), gain=-3, gong=True)
        E.downlifter('fx', T(o + 32), dur=3.0, gain_db=-18)
        for k in range(4):
            E.note('cb_sus', 36, T(o + 32 + k), 4 * b, vel=0.6, track='cb', gain_db=-3)
            E.note('vc_sus', 43, T(o + 32 + k), 4 * b, vel=0.55, track='vc', gain_db=-4)
            E.note('vla_sus', 50, T(o + 32 + k), 4 * b, vel=0.5, track='vla', gain_db=-6)
            E.synth('sub', mtof(24), T(o + 32 + k), 4 * b, wave='sine', amp_env=(0.3, 0.1, 1.0, 0.3), gain_db=-17)
            E.taiko('perc', T(o + 32 + k), gain_db=-15, pitch=0.85); E.taiko('perc', T(o + 32 + k, 0.5), gain_db=-19, pitch=0.85)
        for i, m in enumerate(STAR):
            E.note('glock', m, T(o + 32) + i * 0.11, 3.0, vel=0.4, track='bells', gain_db=-16)
            E.note('glock', m, T(o + 34) + i * 0.11, 3.0, vel=0.35, track='bells', gain_db=-18)
        E.note('vln_sus', 79, T(o + 32), 8 * 4 * b * 0.5, vel=0.35, track='vln', gain_db=-10, expr=[(0, -12), (3, -4), (13, -6)])
        E.note('vln_sus', 74, T(o + 32), 8 * 4 * b * 0.5, vel=0.35, track='vln', gain_db=-12, expr=[(0, -14), (3, -6), (13, -8)])
        for i, m in enumerate(KEPT * 2):
            E.note('harp', m, T(o + 33, i * 0.5), 1.5, vel=0.4, track='bells', gain_db=-9)
        # Kael's opening phrase, slow, on one horn
        slow = [(m, d * 2) for m, d in KAEL[0]]
        E.line('ihn', [(m - 12, d) for m, d in slow], T(o + 34), track='hn', vel=0.6, gain_db=-2)
        E.choir('choir', [55, 62], T(o + 34), 2 * 4 * b, vowel='oo', gain_db=-24, attack=1.5)
        # 37-40: Sovereign's wrong notes swell in the trombones; the clock comes back; everything leans on B
        for k in range(2):
            for i, m in enumerate(SOV):
                E.note('tbn_sus' if m < 56 else 'ihn', m, T(o + 36 + k * 1, 0), 4 * b, vel=0.75, track='tbn' if m < 56 else 'hn', gain_db=-4,
                       ens=2, expr=[(0, -18), (4 * b * 0.85, 0), (4 * b, -6)])
            E.note('chimes', 62 + k, T(o + 36 + k), 4.0, vel=0.6, track='bells', gain_db=-8)
        for k in range(4):
            bar = o + 36 + k
            ch = 'C' if k < 2 else 'B'
            E.note('cb_sus', root(ch, 28), T(bar), 4 * b, vel=0.6 + 0.08 * k, track='cb', gain_db=-3)
            ostinato(bar, ch if ch != 'C' else 'C', vel=0.5 + 0.12 * k, gain=-9 + 2.5 * k)
            if k >= 1: hi_ostinato(bar, 'Em' if k < 2 else 'B', vel=0.5 + 0.1 * k, gain=-12 + 2 * k)
            for s in range(0, 16, 4 if k < 2 else (2 if k == 2 else 1)):
                E.taiko('perc', T(bar, s / 4), gain_db=-16 + k * 2.5 + s * 0.2, pitch=1.0 + 0.1 * (s % 3))
            bass(bar, ch, gain=-22 + 1.5 * k, pattern='hold' if k < 2 else '8ths', cutoff=400 + 200 * k)
        E.note('tbn_sus', 47, T(o + 38), 8 * b, vel=0.8, track='tbn', gain_db=-3, ens=2, expr=[(0, -14), (8 * b, 0)])
        E.note('ihn', 63, T(o + 38), 8 * b, vel=0.8, track='hn', gain_db=-4, ens=3, expr=[(0, -14), (8 * b, 0)])
        E.note('ihn', 66, T(o + 38), 8 * b, vel=0.8, track='hn', gain_db=-5, ens=2, expr=[(0, -14), (8 * b, 0)])
        E.note('vln_trem', 83, T(o + 38), 8 * b, vel=0.7, track='vln', gain_db=-6, expr=[(0, -16), (8 * b, 0)])
        E.note('vln_trem', 78, T(o + 38), 8 * b, vel=0.7, track='vln', gain_db=-7, expr=[(0, -16), (8 * b, 0)])
        timp_roll(T(o + 38), T(o + 40), gain=-7)
        snare_roll(T(o + 39), T(o + 40, -0.02), gain=-10)
        E.riser('fx', T(o + 37), T(o + 40), gain_db=-15)
        swell_cymbal(T(o + 40), 'Long', gain=-10)

        # 41-48: the theme against the fifths. Violins and trumpets carry Kael; the low brass climbs the Creator's stack.
        prog_f = ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B']
        impact(T(o + 40), gain=1, gong=True)
        braam(T(o + 40), [28, 40, 47], 2 * b, gain=-3)
        theme(o + 40, KAEL + KAEL_ANS, 'vln_sus', 'vln', octave=0, vel=0.95, gain=2)
        theme(o + 40, KAEL + KAEL_ANS, 'vla_sus', 'vla', octave=-12, vel=0.85, gain=0)
        theme(o + 40, KAEL + KAEL_ANS, 'tpt_sus', 'tpt', octave=-12, vel=0.85, gain=-3, ens=2)
        theme(o + 40, KAEL + KAEL_ANS, 'ihn', 'hn', octave=-12, vel=0.9, gain=0, ens=3)
        for k, ch in enumerate(prog_f):
            bar = o + 40 + k
            ostinato(bar, ch, vel=0.9)
            hi_ostinato(bar, ch, vel=0.55, gain=-12)
            # the Creator's fifths from each chord root, quarter notes, rising under the theme
            r = root(ch, 40)
            for i in range(4):
                m = r - 12 + 7 * i if r - 12 + 7 * i >= 34 else r + 7 * i
                inst, trk = ('tba_stac', 'brs_s') if m < 40 else ('tbn_stac', 'brs_s')
                E.note(inst, m, T(bar, i), b * 0.8, vel=0.85, track=trk, gain_db=-2, ens=2)
            E.note('cb_sus', root(ch, 28), T(bar), 4 * b, vel=0.8, track='cb', gain_db=-2)
            E.note('tba_sus', root(ch, 28) + 12 if root(ch, 28) < 34 else root(ch, 28), T(bar), 4 * b, vel=0.75, track='tba', gain_db=-5)
            bass(bar, ch)
            pad(bar, ch, gain=-24, cutoff=3000)
            arp(bar, ch, gain=-24, octave=76, bright=3200)
            drums(bar, 'full', fill=(k == 7), hat16=True, gain=0.5)
            E.choir('choir', tones(ch, 64, 76)[:3], T(bar), 4 * b, vowel='ah', gain_db=-20, attack=0.2, release=0.6)
            glass(T(bar), [m + 36 for m in FIFTHS[:4]] if k % 4 == 0 else [], b * 0.5, gain=-4)
            if k == 3: impact(T(bar + 1), gain=-3)
        swell_cymbal(T(o + 48), 'Median', gain=-10)
        E.riser('fx', T(o + 47), T(o + 48), gain_db=-17)

        # 49-56: E major. His theme, finally whole.
        prog_g = ['E', 'C#m', 'B7', 'E', 'E', 'C#m', 'A', 'B']
        impact(T(o + 48), gain=1, gong=True)
        theme(o + 48, KAEL_MAJ + KAEL_MAJ_ANS, 'vln_sus', 'vln', octave=0, vel=1.0, gain=2)
        theme(o + 48, KAEL_MAJ + KAEL_MAJ_ANS, 'vla_sus', 'vla', octave=-12, vel=0.9, gain=0)
        theme(o + 48, KAEL_MAJ + KAEL_MAJ_ANS, 'ihn', 'hn', octave=-12, vel=0.95, gain=1, ens=3)
        theme(o + 48, KAEL_MAJ + KAEL_MAJ_ANS, 'tpt_sus', 'tpt', octave=0, vel=0.9, gain=-3, ens=2)
        for k, ch in enumerate(prog_g):
            bar = o + 48 + k
            ostinato(bar, ch, vel=0.9)
            hi_ostinato(bar, ch, vel=0.55, gain=-12)
            r = root(ch, 40)
            E.note('tbn_sus', r, T(bar), 4 * b, vel=0.85, track='tbn', gain_db=-2, ens=2)
            E.note('tbn_sus', tones(ch, r + 3, r + 9)[0], T(bar), 4 * b, vel=0.8, track='tbn', gain_db=-5, ens=2)
            E.note('cb_sus', root(ch, 28), T(bar), 4 * b, vel=0.8, track='cb', gain_db=-2)
            E.note('tba_sus', root(ch, 28) + 12 if root(ch, 28) < 34 else root(ch, 28), T(bar), 4 * b, vel=0.75, track='tba', gain_db=-5)
            bass(bar, ch, pattern='8ths')
            pad(bar, ch, gain=-23, cutoff=3400)
            arp(bar, ch, gain=-24, octave=76, bright=3600)
            drums(bar, 'full', fill=(k == 7), hat16=True, gain=1)
            E.choir('choir', tones(ch, 64, 76)[:3], T(bar), 4 * b, vowel='ah', gain_db=-19, attack=0.2, release=0.6)
            if k in (0, 4): E.note('chimes', 64, T(bar), 4.0, vel=0.7, track='bells', gain_db=-6)
            if k == 3: impact(T(bar + 1), gain=-2)
        swell_cymbal(T(o + 56), 'Short', gain=-11)

        # 57-64: back to E minor. Drive with Sovereign's cluster on the stabs; then the same build as the intro's last bar.
        prog_h = ['Em', 'Em', 'C', 'D', 'Em', 'C', 'B', 'B']
        impact(T(o + 56), gain=0, gong=False)
        for k, ch in enumerate(prog_h):
            bar = o + 56 + k
            if k < 7:
                ostinato(bar, ch, vel=0.9)
                hi_ostinato(bar, ch, vel=0.6, gain=-9)
                brass_stabs(bar, ch, vel=0.9, slots=(0, 3, 6, 8, 11, 14) if k % 2 else (0, 3, 6), gain=-2)
                bass(bar, ch)
                arp(bar, ch, gain=-25)
                drums(bar, 'full', fill=(k == 6), hat16=True)
            else:
                ostinato(bar, ch, vel=0.9, pattern=[0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, None, None, None, None])
                brass_stabs(bar, ch, vel=0.9, slots=(0, 3, 6, 8, 11), gain=-2)
                E.synth('bass', mtof(root(ch, 28)), T(bar), 3 * b, wave='saw', voices=3, detune=0.12, cutoff=lambda tt: 300 + 900 * tt, res=0.2,
                        amp_env=(0.01, 0.1, 0.9, 0.03), gain_db=-17, drive=1.0)
        for k in (1, 3, 5):
            for i, m in enumerate(SOV):
                E.note('hn_stac', m + 12 if m + 12 <= 77 else m, T(o + 56 + k, 3.5), b * 0.4, vel=0.9, track='brs_s', gain_db=-4)
                E.note('tbn_stac', m, T(o + 56 + k, 3.5), b * 0.4, vel=0.9, track='brs_s', gain_db=-4)
        theme(o + 60, [KAEL[0], KAEL[1]], 'ihn', 'hn', octave=-12, vel=0.85, gain=-1, ens=3)
        theme(o + 60, [KAEL[0], KAEL[1]], 'vln_sus', 'vln', octave=0, vel=0.8, gain=-2)
        # the last bar: rolls, riser, one beat of nothing (the same as the intro's, so the loop seam is invisible)
        bar = o + 63
        timp_roll(T(bar - 1), T(bar, 3), gain=-8)
        snare_roll(T(bar), T(bar, 3), gain=-10)
        E.riser('fx', T(bar - 1), T(bar, 3), gain_db=-15, f0=400, f1=9000)
        swell_cymbal(T(bar, 3), 'Short', gain=-11)
        for i, m in enumerate([40, 47, 52, 59, 64, 71]):
            E.note('tbn_sus' if m < 58 else 'ihn', m, T(bar) + i * b * 0.5, 3 * b - i * b * 0.5, vel=0.6, track='tbn' if m < 58 else 'hn',
                   gain_db=-5, expr=[(0, -12), (3 * b - i * b * 0.5, 0)])
        for i in range(12):
            E.taiko('perc', T(bar, i / 4), gain_db=-12 + i * 0.6, pitch=1.4 - i * 0.04)

    t0 = time.time()
    intro()
    for k in range(3):
        body(INTRO + k * BODY)
    print(f'notes placed in {time.time() - t0:.1f}s')
    return E


def render(stems=False, preview=False):
    E = build()
    verbs = {'hall': (make_ir(3.4, rt=(3.2, 2.7, 1.9, 1.0), predelay=0.024) * db(-2), [('hp', 180, 0.7, 0), ('lp', 9000, 0.7, 0)]),
             'plate': (make_ir(1.4, rt=(1.2, 1.3, 1.1, 0.7), predelay=0.008, seed=9), [('hp', 400, 0.7, 0)]),
             'delay': (make_delay_ir(E.beat), [('hp', 500, 0.7, 0), ('lp', 5000, 0.7, 0)])}
    master = {'eq': [('hp', 26, 0.7, 0), ('low', 55, 0.7, -1.5), ('high', 9000, 0.7, 2.0)],
              'glue': {'thresh': -16, 'ratio': 2.0, 'attack': 0.03, 'release': 0.25, 'knee': 8, 'makeup': 0},
              'sat': 0.25, 'lufs': -17.0, 'ceiling': -1.0, 'limit_push': 2.0}
    sd = os.path.join(OUT, 'stems') if stems else None
    if sd: os.makedirs(sd, exist_ok=True)
    t0 = time.time()
    full = E.mix(verbs, master, stems_dir=sd)
    print(f'mixed in {time.time() - t0:.1f}s')
    I = int(round(E.t(INTRO) * SR)); B = int(round(E.t(BODY) * SR))
    os.makedirs(OUT, exist_ok=True)
    sf.write(os.path.join(OUT, 'boss-full-timeline.wav'), full, SR)
    # file = intro, then the second pass of the body (its start already holds the body's own tails), then a short overrun
    xf = int(0.05 * SR)
    intro = full[:I].copy()
    loop = full[I + B: I + 2 * B].copy()
    over = full[I + 2 * B: I + 2 * B + SR].copy()
    # The intro's last 50 ms are the audio that precedes the loop end, crossfaded in over the 50 ms before that.
    # A decoder that shifts the whole file by its MP3 padding (~25 ms) then still loops without a seam.
    intro[-2 * xf:-xf] = intro[-2 * xf:-xf] * np.linspace(1, 0, xf)[:, None] + full[I + B - 2 * xf: I + B - xf] * np.linspace(0, 1, xf)[:, None]
    intro[-xf:] = full[I + B - xf: I + B]
    song = np.vstack([intro, loop, over])
    sf.write(os.path.join(OUT, 'boss-the-ninety-fifth.wav'), song, SR, subtype='PCM_24')
    # a listening copy: intro, body twice, and a soft fade
    lis = np.vstack([intro, loop, loop[: int(20 * SR)]])
    k = int(6 * SR); lis[-k:] *= np.linspace(1, 0, k)[:, None]
    sf.write(os.path.join(OUT, 'boss-listen.wav'), lis, SR)
    print(f'loop start {I / SR:.6f}s  loop end {(I + B) / SR:.6f}s  ({I} / {I + B} samples)  LUFS {lufs(song[:I + B]):.1f}')
    return I, B


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--stems', action='store_true'); ap.add_argument('--preview', action='store_true')
    a = ap.parse_args()
    render(stems=a.stems, preview=a.preview)
