"""The Ninety-Fifth, v2: the boss theme rebuilt to sound like a threat. E Phrygian, 150 BPM.

v1 (boss_theme.py) was judged "adventurous, not bosslike, too upbeat": its i-VI-VII loop, violin arpeggios and
E-major climax are adventure language, and ears.py agreed (menace margin -0.074). v2 aims at the user's bar,
the boss tracks of Geometry Dash and Undertale: one stuttering hook that sticks after one listen, a relentless low
groove, synth lead and growl bass in front of the orchestra, and harmony that never settles:
  Phrygian     F over E: the half step above the tonic is the whole piece's colour
  tritone      Bb against E in the bells, braams and stabs
  mediants     Cm and Ab against E minor in the B section, no VI-VII-i lift
  Sovereign    his wrong notes, D D# A A#, swelling in the breakdown
No major-key section; the climax goes up a half step to F Phrygian instead.

Layout: an 8-bar intro that plays once, then a 56-bar body that loops sample-accurately.
  body  1-8 riff      9-16 hook        17-24 the villain line (mediants)   25-32 hook, tutti, double time
       33-40 breakdown and build      41-48 hook a half step up (F)        49-56 riff returns, turnaround

    .venv/bin/python boss_theme_v2.py [--stems]
"""
import argparse, math, os, time
import numpy as np
import soundfile as sf
from engine import Engine, make_ir, make_delay_ir, mtof, lufs, db, SR

BPM = 150
INTRO, BODY = 8, 56
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
NAME = os.environ.get('V2_NAME', 'boss2')
KNOB = set(os.environ.get('V2_KNOBS', 'darklead,hookstabs').split(','))   # A/B experiments; the default pair won on ears.py (Nov 18)

CHORD = {  # pitch classes, root first
    'Em': [4, 7, 11], 'F': [5, 9, 0], 'Bb': [10, 2, 5], 'C': [0, 4, 7], 'B': [11, 3, 6], 'B7': [11, 3, 6, 9],
    'Cm': [0, 3, 7], 'Ab': [8, 0, 3], 'G': [7, 11, 2], 'F#dim': [6, 9, 0], 'E5': [4, 11], 'Am': [9, 0, 4],
    'Fm': [5, 8, 0], 'Gb': [6, 10, 1], 'B5': [11, 6], 'C5': [0, 7], 'Bb5': [10, 5], 'C7': [0, 4, 7, 10], 'F5': [5, 0],
}

# The hook. 3-3-2 sixteenths: a stutter on the tonic, the Phrygian step up, then a fall that lands on the tritone.
HOOK = [
    [(76, .75), (76, .75), (77, .5), (76, .75), (74, .75), (71, .5)],      # E E F E D B
    [(72, .75), (71, .75), (70, .5), (71, 2.0)],                           # C B Bb B
    [(76, .75), (76, .75), (77, .5), (76, .75), (79, .75), (77, .5)],      # E E F E G F
    [(76, .5), (75, .5), (76, .5), (83, .5), (82, 2.0)],                   # E D# E B Bb
    [(76, .75), (76, .75), (77, .5), (76, .75), (74, .75), (71, .5)],
    [(72, .75), (71, .75), (70, .5), (71, 1.0), (74, .5), (76, .5)],      # ... B D E
    [(79, .75), (77, .75), (76, .5), (77, .75), (79, .75), (82, .5)],      # G F E F G Bb
    [(83, 1.0), (82, .5), (79, .5), (76, 2.0)],                            # B Bb G E
]
HOOK_CH = ['Em', 'Em', 'F', 'Bb', 'Em', 'Em', 'F', 'Em']   # the hook's held B over C was a bright maj7; it stays on i
if os.environ.get('V2_POWER'):  # A/B knob: power chords (no thirds) under the hook
    HOOK_CH = ['E5', 'E5', 'F5', 'Bb5', 'E5', 'E5', 'F5', 'E5']

# The riff under everything: E on the 3-3-2 accents, the F and Bb as the bar turns.
RIFF = [
    [0, None, None, 0, None, None, 0, None, 0, None, None, 0, None, None, 0, 0],
    [0, None, None, 0, None, None, 0, None, 0, None, None, 0, None, 1, None, 0],
    [0, None, None, 0, None, None, 0, None, 0, None, None, 0, None, None, 0, 0],
    [0, None, None, 0, None, None, 1, None, 1, None, None, 6, None, 5, None, 1],
]

# Under the drops the bass stops leaving gaps: sixteenths, octave jumps on the 3-3-2, the half step up at the turn.
RIFF_DRIVE = [
    [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12],
    [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 1, 1, 13, 1],
]


def shift_of(ch):
    return (CHORD[ch][0] - 4) % 12


# Drop 2's first half: half-time stomp. Guitar, bass and kick hit together; they leave beat 3 (index 8) empty for the snare.
RIFF_STOMP = [
    [0, None, None, 0, None, None, 0, 0, None, None, 0, None, 0, None, 0, None],
    [0, None, None, 0, None, None, 0, 0, None, None, 0, None, 1, 1, 6, 5],
]
STOMP_KICKS = [(0, 0.75, 1.5, 1.75, 2.5, 3.0, 3.5), (0, 0.75, 1.5, 1.75, 2.5, 3.0, 3.25, 3.5, 3.75)]


# The villain line (B section): horns over E minor's chromatic mediants.
VILLAIN = [
    [(67, 3), (68, 1)], [(67, 2), (63, 2)],          # Cm:  G Ab G Eb
    [(71, 3), (72, 1)], [(71, 2), (67, 2)],          # Em:  B C B G
    [(72, 3), (75, 1)], [(74, 2), (71, 2)],          # Ab, G
    [(72, 2), (69, 1), (66, 1)], [(75, 4)],          # F#dim, B
]
VILLAIN_CH = ['Cm', 'Cm', 'Em', 'Em', 'Ab', 'G', 'F#dim', 'B']
SOV = [50, 51, 57, 58]                 # D D# A A#
ACC = [0, 3, 6, 8, 11, 14]


def pcs_in(ch, lo, hi, shift=0):
    p = [(c + shift) % 12 for c in CHORD[ch]]
    return [m for m in range(lo, hi + 1) if m % 12 in p]


def root(ch, lo=28, shift=0):
    r = (CHORD[ch][0] + shift) % 12
    return lo + ((r - lo) % 12)


def build():
    total_bars = INTRO + 3 * BODY + 2
    gates = []   # (t0, t1) windows cut to silence before a drop; the reverb sends still ring through them
    E = Engine(BPM, total_bars * 240 / BPM + 6.0)
    b = E.beat
    T = E.t

    # ── tracks ──
    E.track('vln', pan=-0.42, sends={'hall': 0.34}, eq=[('hp', 160, 0.7, 0), ('peak', 3200, 0.9, -1.5)])
    E.track('vln_s', pan=-0.38, sends={'hall': 0.24}, eq=[('hp', 180, 0.7, 0)])
    E.track('vla', pan=-0.08, sends={'hall': 0.32}, eq=[('hp', 120, 0.7, 0), ('peak', 500, 1.0, -1.5)])
    E.track('vc', pan=0.3, sends={'hall': 0.3}, eq=[('hp', 50, 0.7, 0), ('peak', 300, 1.0, -2)])
    E.track('low_s', pan=0.2, sends={'hall': 0.16}, eq=[('hp', 40, 0.7, 0), ('peak', 280, 1.0, -2), ('peak', 2500, 1.0, 3)],
            comp={'thresh': -20, 'ratio': 3, 'attack': 0.003, 'release': 0.07, 'makeup': 2}, sat=0.5)
    E.track('cb', pan=0.42, sends={'hall': 0.24}, eq=[('hp', 30, 0.7, 0), ('peak', 250, 1.0, -2)])
    E.track('hn', pan=-0.22, sends={'hall': 0.4}, eq=[('hp', 80, 0.7, 0), ('peak', 400, 1.0, -1.5), ('high', 6000, 0.7, -2)])
    E.track('tbn', pan=0.28, sends={'hall': 0.32}, eq=[('hp', 50, 0.7, 0)], sat=0.3)
    E.track('tpt', pan=0.12, sends={'hall': 0.3}, eq=[('hp', 150, 0.7, 0), ('high', 7000, 0.7, -2)])
    E.track('tba', pan=0.36, sends={'hall': 0.26}, eq=[('hp', 28, 0.7, 0)])
    E.track('brs_s', pan=0.08, sends={'hall': 0.26}, eq=[('hp', 60, 0.7, 0), ('peak', 320, 1.0, -2)],
            comp={'thresh': -18, 'ratio': 3, 'attack': 0.003, 'release': 0.08, 'makeup': 2}, sat=0.6)
    E.track('timp', pan=-0.1, sends={'hall': 0.3}, eq=[('hp', 40, 0.7, 0)])
    E.track('perc', pan=0.0, sends={'hall': 0.2}, eq=[('hp', 32, 0.7, 0), ('peak', 400, 1.0, -3), ('peak', 90, 1.2, 2)],
            comp={'thresh': -16, 'ratio': 3, 'attack': 0.003, 'release': 0.12, 'makeup': 2}, sat=0.4)
    E.track('drm', pan=0.0, sends={'hall': 0.06, 'plate': 0.12}, eq=[('hp', 35, 0.7, 0), ('peak', 110, 1.0, 2), ('high', 5000, 0.7, -5)],
            comp={'thresh': -14, 'ratio': 4, 'attack': 0.002, 'release': 0.08, 'makeup': 2}, sat=0.5)
    E.track('hats', pan=0.18, sends={'plate': 0.06}, eq=[('hp', 5000, 0.7, 0)])
    E.track('cym', pan=-0.05, sends={'hall': 0.25}, eq=[('hp', 300, 0.7, 0), ('high', 9000, 0.7, -2)])
    E.track('bass', sends={}, eq=[('hp', 32, 0.7, 0), ('peak', 120, 1.0, 2), ('peak', 900, 1.2, 2), ('lp', 4500, 0.7, 0)],
            duck=0.5, duck_release=0.12, mono_below=200, sat=1.2,
            comp={'thresh': -18, 'ratio': 4, 'attack': 0.002, 'release': 0.06, 'makeup': 2})
    E.track('sub', sends={}, eq=[('lp', 110, 0.7, 0)], duck=0.75, duck_release=0.15, width=0.0)
    E.track('lead', pan=0.0, width=1.1, sends={'hall': 0.16, 'delay': 0.16}, eq=[('hp', 220, 0.7, 0), ('peak', 2600, 1.0, 2)],
            comp={'thresh': -16, 'ratio': 3, 'attack': 0.004, 'release': 0.1, 'makeup': 1}, sat=0.4)
    # rhythm guitar, double-tracked hard left and right: plucked strings into a high-gain amp (sat) and a 4x12 cabinet (post_eq)
    for nm, pn in (('gtrL', -0.85), ('gtrR', 0.85)):
        E.track(nm, pan=pn, sends={'hall': 0.05}, eq=[('hp', 90, 0.7, 0), ('peak', 900, 0.8, 6)], sat=30,
                post_eq=[('lp', 5200, 0.7, 0), ('lp', 5200, 0.7, 0), ('peak', 110, 1.0, 4), ('peak', 420, 1.0, -4), ('peak', 2400, 1.0, 2), ('hp', 70, 0.7, 0)],
                duck=0.25, duck_release=0.1)
    E.track('pno', pan=-0.1, width=0.9, sends={'hall': 0.28}, eq=[('hp', 28, 0.7, 0), ('peak', 250, 1.0, -2), ('peak', 3000, 1.0, 2)],
            comp={'thresh': -18, 'ratio': 2.5, 'attack': 0.004, 'release': 0.12, 'makeup': 1})
    E.track('pno_hi', pan=0.15, width=1.2, sends={'hall': 0.45, 'delay': 0.12}, eq=[('hp', 200, 0.7, 0)])
    E.track('pad', width=1.3, sends={'hall': 0.3}, eq=[('hp', 260, 0.7, 0), ('lp', 6000, 0.7, 0)], duck=0.45, duck_release=0.2)
    E.track('choir', width=1.1, sends={'hall': 0.55}, eq=[('hp', 200, 0.7, 0), ('peak', 3000, 1.0, -3)])
    E.track('bells', width=1.2, sends={'hall': 0.5, 'delay': 0.1}, eq=[('hp', 200, 0.7, 0)])
    E.track('fx', width=1.2, sends={'hall': 0.3}, eq=[('hp', 40, 0.7, 0)])
    E.track('hit', sends={'hall': 0.25}, eq=[('hp', 25, 0.7, 0)], sat=0.3)

    MIX = {'perc': -9, 'drm': -5, 'hit': -6, 'bass': -4, 'sub': -5, 'hats': 7, 'timp': 6, 'lead': 0, 'bells': 3, 'low_s': -1, 'gtrL': -20, 'gtrR': -20, 'pno_hi': 5}
    MIX['drm'] += float(os.environ.get('V2_DRM', 0))
    for k, v in MIX.items(): E.tracks[k].gain = v

    # ── voices ──
    def lead(bar, lines, shift=0, gain=-15, octave=0, chip=True):
        t = T(bar)
        for line in lines:
            for m, d in line:
                if m is not None:
                    f = mtof(m + shift + octave)
                    dur = d * b * (0.9 if d < 1 else 0.97)
                    vib = (lambda tt, f=f, d=d: f * (1 + (0.007 if d >= 1 else 0.0) * np.sin(TAU5 * tt) * np.clip((tt - 0.18) / 0.3, 0, 1)))
                    dark = 'darklead' in KNOB
                    E.synth('lead', vib, t, dur, wave='saw', voices=3, detune=0.11 if not dark else 0.16, spread=0.55,
                            cutoff=(lambda tt: 1500 + 5000 * np.exp(-tt * 7)) if not dark else (lambda tt: 900 + 2600 * np.exp(-tt * 9)),
                            res=0.22, amp_env=(0.003, 0.12, 0.75, 0.07), gain_db=gain + (2 if dark else 0), drive=0.7 if not dark else 2.2)
                    if chip and not dark:
                        E.synth('lead', vib, t, dur, wave='pulse', voices=1, cutoff=6000, amp_env=(0.002, 0.08, 0.6, 0.05), gain_db=gain - 7)
                t += d * b

    def melody(bar, lines, inst, track, shift=0, octave=0, vel=0.8, gain=0.0, ens=1, legato=True):
        notes = [(m + shift + octave, d) for line in lines for m, d in line]
        kw = {'ens': ens} if ens > 1 else {}
        E.line(inst, notes, T(bar), track=track, vel=vel, gain_db=gain, legato=legato, **kw)

    def spic_double(bar, lines, inst='vln_spic', track='vln_s', shift=0, octave=0, gain=-3, vel=0.85):
        t = T(bar)
        for line in lines:
            for m, d in line:
                if m is not None:
                    E.note(inst, m + shift + octave, t, min(d, 0.75) * b, vel=vel, track=track, gain_db=gain)
                t += d * b

    def chug(bar, pat, shift=0, gain=-13, cutoff=500, sub=True, strings=True, rootm=28):
        """The growl: two detuned saws and a square through a snapping low pass, hard driven."""
        r = rootm + shift
        for i, iv in enumerate(pat):
            if iv is None: continue
            acc = i in ACC or iv != 0
            nxt = next((j for j in range(i + 1, 16) if pat[j] is not None), 16)
            dur = min(nxt - i, 3) * b / 4 * 0.82
            f = mtof(r + iv)
            E.synth('bass', f, T(bar, i / 4), dur, wave='saw', voices=2, detune=0.16,
                    cutoff=lambda tt, c=cutoff, a=acc: c * (1 + (5.0 if a else 2.5) * np.exp(-tt * 22)), res=0.35,
                    amp_env=(0.002, 0.06, 0.85, 0.03), gain_db=gain + (0 if acc else -3), drive=2.5)
            E.synth('bass', f * 2, T(bar, i / 4), dur, wave='square', voices=1,
                    cutoff=lambda tt, c=cutoff: c * 2 * (1 + 3 * np.exp(-tt * 30)), res=0.2,
                    amp_env=(0.002, 0.05, 0.6, 0.03), gain_db=gain - 8, drive=1.5)
            if strings:
                E.note('vc_spic', r + 12 + iv, T(bar, i / 4), b / 4, vel=0.9 if acc else 0.6, track='low_s', gain_db=-2 if acc else -6)
                if acc: E.note('cb_spic', r + 12 + iv if r + iv < 28 else r + iv, T(bar, i / 4), b / 4, vel=0.9, track='low_s', gain_db=-3)
        if sub:
            E.synth('sub', mtof(r), T(bar), 4 * b * 0.98, wave='sine', amp_env=(0.004, 0.1, 1.0, 0.05), gain_db=-12)

    def wobble(bar, m, beats=4, rate=2.0, gain=-12, depth=2600):
        """Breakdown bass: one held note with its filter swinging at `rate` cycles per beat."""
        w = TAU * rate / b
        E.synth('bass', mtof(m), T(bar), beats * b, wave='saw', voices=3, detune=0.2, sub=0.6,
                cutoff=lambda tt: 180 + depth * (0.5 - 0.5 * np.cos(w * tt)) ** 1.6, res=0.5,
                amp_env=(0.005, 0.1, 0.95, 0.05), gain_db=gain, drive=3.0)
        E.synth('sub', mtof(m), T(bar), beats * b, wave='sine', amp_env=(0.004, 0.1, 1.0, 0.05), gain_db=-12)

    def stabs(bar, ch, slots=(0, 3, 6), shift=0, vel=0.9, gain=-2, tritone=False):
        r = root(ch, 40, shift)
        for s in slots:
            t = T(bar, s / 4)
            top = r + (6 if tritone else 7)
            E.note('tbn_stac', r, t, b * 0.45, vel=vel, track='brs_s', gain_db=gain, ens=2)
            E.note('tbn_stac', top, t, b * 0.45, vel=vel, track='brs_s', gain_db=gain - 1)
            E.note('hn_stac', r + 12, t, b * 0.45, vel=vel, track='brs_s', gain_db=gain - 1, ens=2)
            E.note('tba_stac', r - 12 if r - 12 >= 33 else r, t, b * 0.45, vel=vel, track='brs_s', gain_db=gain - 1)

    def low_brass(bar, ch, beats=4, shift=0, vel=0.8, gain=-3):
        r = root(ch, 40, shift)
        E.note('tbn_sus', r, T(bar), beats * b, vel=vel, track='tbn', gain_db=gain, ens=2)
        third = pcs_in(ch, r + 3, r + 9, shift)
        if third: E.note('tbn_sus', third[0], T(bar), beats * b, vel=vel * 0.9, track='tbn', gain_db=gain - 3, ens=2)
        E.note('tba_sus', r - 12 if r - 12 >= 33 else r, T(bar), beats * b, vel=vel, track='tba', gain_db=gain - 1)
        E.note('cb_sus', root(ch, 28, shift), T(bar), beats * b, vel=vel, track='cb', gain_db=gain)

    def strings_pad(bar, ch, beats=4, shift=0, vel=0.6, gain=-5, trem=True):
        inst = 'vln_trem' if trem else 'vln_sus'
        for m in pcs_in(ch, 67, 84, shift)[-3:]:
            E.note(inst, m, T(bar), beats * b, vel=vel, track='vln', gain_db=gain - 3)
        for m in pcs_in(ch, 55, 66, shift)[:2]:
            E.note('vla_sus', m, T(bar), beats * b, vel=vel, track='vla', gain_db=gain - 3)

    def pad(bar, ch, beats=4, shift=0, gain=-25, cutoff=1600):
        for m in pcs_in(ch, 52, 71, shift):
            E.synth('pad', mtof(m), T(bar), beats * b, wave='saw', voices=5, detune=0.2, spread=0.9, cutoff=cutoff, res=0.15,
                    amp_env=(0.15, 0.3, 0.85, 0.5), gain_db=gain)

    def choir(bar, ch, beats=4, shift=0, vowel='ah', gain=-20, lo=57, hi=72):
        E.choir('choir', pcs_in(ch, lo, hi, shift)[:3], T(bar), beats * b, vowel=vowel, gain_db=gain, attack=0.25, release=0.7)

    def gtr(bar, pat, shift=0, gain=0.0):
        """Rhythm guitar on a riff pattern: palm-muted chugs, open power chords on the accents. Both takes."""
        r = 40 + shift
        if r > 46: r -= 12
        for tr in ('gtrL', 'gtrR'):
            for i, iv in enumerate(pat):
                if iv is None: continue
                acc = i in ACC or iv != 0
                nxt = next((j for j in range(i + 1, 16) if pat[j] is not None), 16)
                m = r + iv
                notes = [m, m + 7, m + 12] if acc else [m, m + 7]
                E.guitar(tr, notes, T(bar, i / 4), (nxt - i) * b / 4 * (0.95 if acc else 0.75), mute=not acc,
                         vel=0.95 if acc else 0.7, gain_db=gain)

    def gtr_hold(bar, ch, beats=4, shift=0, gain=-2.0):
        r = 40 + (shift_of(ch) + shift) % 12
        if r > 46: r -= 12
        for tr in ('gtrL', 'gtrR'):
            E.guitar(tr, [r, r + 7, r + 12], T(bar), beats * b, vel=0.9, gain_db=gain)

    def hammers(bar, pat, shift=0, gain=0.0):
        """Piano: low octaves struck on the riff's accents, the doom-piano attack under the growl."""
        r = 28 + shift
        if r > 34: r -= 12
        for i, iv in enumerate(pat):
            if iv is None or i not in ACC: continue
            m = r + iv if iv < 12 else r + iv - 12
            v = 0.95 if i in (0, 8) else 0.8
            E.note('piano', m, T(bar, i / 4), b * 0.7, vel=v, track='pno', gain_db=gain, release=0.3)
            E.note('piano', m + 12, T(bar, i / 4), b * 0.7, vel=v, track='pno', gain_db=gain - 2, release=0.3)

    def pre_drop(bar, gain=0.0):
        """The bar before a drop: the snare climbs from sixteenths to thirty-seconds, a reversed crash pulls into the
        downbeat, and the last half beat is cut to silence (gate() in build) so the drop lands out of nothing."""
        for i in range(8):
            E.snare('drm', T(bar, i / 4), gain_db=gain - 20 + i * 0.8, tone=150, layer=(i % 2 == 0))
        for i in range(12):
            E.snare('drm', T(bar, 2 + i / 8), gain_db=gain - 14 + i * 0.6, tone=160, layer=(i % 3 == 0))
        for s in (0, 1, 2, 2.5, 3, 3.25):
            E.taiko('fx', T(bar, s), gain_db=gain - 12, pitch=1.9 + s * 0.12)   # high toms only: the lows wait for the drop
        E.sample_hit('cym', 'vsco/Percussion/cymbal-crash1_ff_rr1.wav', T(bar + 1), gain_db=gain - 7, rev=True)
        E.riser('fx', T(bar - 1), T(bar, 3.5), gain_db=-14, f0=300, f1=10000)
        gates.append((T(bar, 3.5), T(bar + 1), None))
        gates.append((T(bar) + 0.02, T(bar, 3.5), ('bass', 'sub', 'low_s', 'gtrL', 'gtrR', 'perc', 'tba', 'cb', 'hit')))   # the low end drops out so the drop brings it back

    def drums(bar, style='drop', fill=False, gain=0.0, crash=False):
        # Kit voiced dark on purpose (ablate.py, Nov 18): a clap backbeat, 16th hats and four-on-the-floor with open
        # offbeat hats read as upbeat dance music and cost the mix ~0.04 margin; the taiko alone read the most menacing.
        last = fill
        if style != 'half':
            for s in ACC:
                if last and s >= 8: continue
                E.taiko('perc', T(bar, s / 4), gain_db=gain - (4 if s in (0, 8) else 9), pitch=1.0 if s in (0, 8) else 1.2)
        if crash:
            E.sample_hit('cym', f'vsco/Percussion/cymbal-crash1_ff_rr{1 + bar % 2}.wav', T(bar, 0) - 0.005, gain_db=gain - 12)
        if style == 'slam':
            # the drop kit: kicks on the beat plus the 3-3-2 pushes, a double-kick burst every second bar,
            # snare backbeat over taiko with ghost notes, sixteenth hats
            for s in (0, 0.75, 1.5, 2, 2.75, 3.5) + ((3.75,) if bar % 2 else ()):
                if last and s >= 2: continue
                E.kick('drm', T(bar, s), gain_db=gain - (1 if s in (0, 2) else 4), f_hi=155, f_lo=44, decay=0.3, click=0.7)
            if bar % 2 and not last:
                for s in (3.0, 3.125, 3.25, 3.375):
                    E.kick('drm', T(bar, s), gain_db=gain - 8, f_hi=160, f_lo=50, decay=0.12, click=0.8)
            for s in (1, 3):
                if last and s == 3: continue
                E.snare('drm', T(bar, s), gain_db=gain - 2, tone=160, noise_decay=0.16)
                E.taiko('perc', T(bar, s), gain_db=gain - 5, pitch=1.35)
            for s in (1.75, 2.25):
                E.snare('drm', T(bar, s), gain_db=gain - 19, tone=170, layer=False)
            for i in range(16):
                if last and i >= 8: continue
                E.hat('hats', T(bar, i / 4), gain_db=gain - (20 if i % 2 == 0 else 26), open_=(i == 14 and not last))
        elif style == 'stomp':
            # half time: everything hits together with the riff, the snare alone on beat 3
            for s in STOMP_KICKS[bar % 2]:
                if last and s >= 2: continue
                E.kick('drm', T(bar, s), gain_db=gain - (1 if s == 0 else 3), f_hi=150, f_lo=42, decay=0.3, click=0.8)
            E.snare('drm', T(bar, 2), gain_db=gain - 1, tone=145, noise_decay=0.22)
            E.taiko('perc', T(bar, 2), gain_db=gain - 3, pitch=1.1)
            E.taiko('perc', T(bar, 0), gain_db=gain - 3, pitch=0.8)
            E.sample_hit('cym', f'vsco/Percussion/cymbal-crash1_ff_rr{1 + bar % 2}.wav', T(bar, 2) - 0.005, gain_db=gain - 16)
            for i in range(8):
                E.hat('hats', T(bar, i / 2), gain_db=gain - (21 if i % 2 else 25), open_=(i % 2 == 1))
        elif style == 'blast':
            # sixteenth double kick under a backbeat, a crash on every beat
            for i in range(16):
                if last and i >= 8: continue
                E.kick('drm', T(bar, i / 4), gain_db=gain - (2 if i % 4 == 0 else 7), f_hi=160, f_lo=48, decay=0.14, click=0.8)
            for s in (1, 3):
                if last and s == 3: continue
                E.snare('drm', T(bar, s), gain_db=gain - 2, tone=160, noise_decay=0.16)
                E.taiko('perc', T(bar, s), gain_db=gain - 5, pitch=1.35)
            for s in range(4):
                if last and s >= 2: continue
                E.sample_hit('cym', f'vsco/Percussion/cymbal-crash1_ff_rr{1 + s % 2}.wav', T(bar, s) - 0.005, gain_db=gain - (13 if s == 0 else 19))
        elif style in ('drop', 'drive'):
            kicks = (0, 0.75, 2.5) if style == 'drop' else (0, 0.25, 0.5, 0.75, 1.5, 2, 2.25, 2.5, 2.75, 3.5)
            for s in kicks:
                if last and s >= 2: continue
                E.kick('drm', T(bar, s), gain_db=gain - (4 if s in (0, 2) else 7), f_hi=130, f_lo=42, decay=0.28)
            for s in (1, 3):
                if last and s == 3: continue
                E.snare('drm', T(bar, s), gain_db=gain - 5, tone=150, noise_decay=0.14)
                E.taiko('perc', T(bar, s), gain_db=gain - 6, pitch=1.35)
            for i in range(8):
                if last and i >= 4: continue
                E.hat('hats', T(bar, i / 2), gain_db=gain - (24 if i % 2 else 29))
            if style == 'drive' and not last:
                E.sample_hit('cym', f'vsco/Percussion/cymbal-crash1_ff_rr{1 + bar % 2}.wav', T(bar, 0), gain_db=gain - 20)
        elif style == 'half':
            E.kick('drm', T(bar, 0), gain_db=gain - 3, f_hi=120, f_lo=40, decay=0.4); E.kick('drm', T(bar, 1.75), gain_db=gain - 7, f_hi=120, f_lo=40)
            E.snare('drm', T(bar, 2), gain_db=gain - 4, tone=140, noise_decay=0.2)
            E.taiko('perc', T(bar, 0), gain_db=gain - 5, pitch=0.85); E.taiko('perc', T(bar, 2), gain_db=gain - 6, pitch=1.1)
            for i in range(4):
                E.hat('hats', T(bar, i + 0.5), gain_db=gain - 27)
        if last:
            for i in range(8):
                E.taiko('perc', T(bar, 2 + i / 4), gain_db=gain - 8 + i * 0.6, pitch=1.5 - i * 0.07)
                E.snare('drm', T(bar, 2 + i / 4), gain_db=gain - 15 + i * 1.2, layer=(i % 2 == 0), tone=150)

    def impact(t, gain=0.0, gong=False, crash=True):
        E.taiko('hit', t, gain_db=gain - 2, pitch=0.8, key=True)
        E.kick('hit', t, gain_db=gain - 4, f_hi=120, f_lo=36, decay=0.6, key=False)
        E.sub_drop('hit', t, dur=2.0, gain_db=gain - 9)
        if crash:
            k = int(E.rng.integers(1, 3))
            E.sample_hit('cym', f'vsco/Percussion/cymbal-crash1_ff_rr{k}.wav', t - 0.005, gain_db=gain - 9)
        if gong:
            E.sample_hit('cym', 'vsco/Percussion/gongHit_f.wav', t, gain_db=gain - 8)
        E.sample_hit('timp', 'vsco/Percussion/Timpani/Timpani1_Hit_v3_rr1_Sum.wav', t, gain_db=gain - 6)

    def braam(t, notes, dur, gain=0.0):
        for m in notes:
            inst = 'tba_sus' if m < 40 else ('tbn_sus' if m < 58 else 'ihn')
            E.note(inst, m, t, dur, vel=0.95, track={'tba_sus': 'tba', 'tbn_sus': 'tbn', 'ihn': 'hn'}[inst], gain_db=gain - 2, ens=2,
                   expr=[(0, 0), (0.4, -3), (dur, -7)])
        for m in notes[:3]:
            E.synth('pad', mtof(m), t, dur, wave='saw', voices=4, detune=0.25, spread=0.8,
                    cutoff=lambda tt: 200 + 2400 * np.exp(-tt * 2.5), res=0.3, amp_env=(0.01, 0.6, 0.5, 0.8), gain_db=gain - 16, drive=2.0)

    def swell_cymbal(t_end, kind='Median', gain=-10):
        rel = f'vsco/Percussion/susCymb1-cresc-{kind}_v1.wav'
        L, R, _ = E.bank.load(rel)
        pk = int(np.argmax(np.abs(L)))
        E.sample_hit('cym', rel, t_end - pk / SR, gain_db=gain, length=pk / SR + 0.05, fade=0.04)

    def timp_roll(t0, t1, gain=-8):
        rel = 'vsco/Percussion/Timpani/Rolls/Timpani1_Roll_v5_rr1_Sum.wav'
        L, R, _ = E.bank.load(rel)
        E.sample_hit('timp', rel, t0, gain_db=gain, length=min(t1 - t0, len(L) / SR), fade=0.05)

    def snare_build(bar0, bars, gain=-6):
        """Snare on quarters, then eighths, then sixteenths, rising: the build before a drop."""
        for k in range(bars):
            step = [1.0, 0.5, 0.25, 0.125][min(3, k * 4 // bars)]
            n = int(round(4 / step))
            for i in range(n):
                g = gain - 12 + 12 * ((k * 4 + i * step) / (bars * 4))
                E.snare('drm', T(bar0 + k, i * step), gain_db=g, layer=(i % 2 == 0))

    def toll(t, notes=(64, 70), gain=-6):
        for i, m in enumerate(notes):
            E.note('chimes', m, t + i * 2 * b, 5.0, vel=0.7, track='bells', gain_db=gain)

    # ── intro (plays once) ──
    def intro():
        E.reseed(13)
        # a bell tolls E then Bb (the tritone), the hook creeps in at half speed on the music box, the choir sits on the tritone
        E.synth('sub', mtof(28), T(0), 6 * 4 * b, wave='sine', amp_env=(3.0, 0.1, 1.0, 1.0), gain_db=-18)
        E.note('cb_sus', 28, T(0), 6 * 4 * b, vel=0.5, track='cb', expr=[(0, -18), (7, -4), (10, -6)])
        E.note('vc_sus', 34, T(0), 6 * 4 * b, vel=0.5, track='vc', expr=[(0, -20), (8, -6), (10, -6)])
        for k in range(3):
            toll(T(2 * k), gain=-6 + k)
        t = T(0)
        for line in HOOK[:2]:
            for m, d in line:
                E.note('glock', m + 12, t, 2.0, vel=0.45, track='bells', gain_db=-12)
                E.note('harp', m, t, 2.0, vel=0.55, track='bells', gain_db=-6)
                t += d * b * 2
        E.choir('choir', [52, 58], T(1), 5 * 4 * b, vowel='oo', gain_db=-19, attack=4.0, release=1.0)
        for m in (83, 84):  # a semitone cluster high in the violins, creeping up
            E.note('vln_trem', m, T(2), 4 * 4 * b, vel=0.5, track='vln', gain_db=-9, expr=[(0, -20), (6, -4)])
        # the heartbeat, accelerating
        for k in range(4):
            E.taiko('perc', T(2 + k), gain_db=-12 + k, pitch=0.85); E.taiko('perc', T(2 + k, 0.5), gain_db=-16 + k, pitch=0.85)
            if k >= 2:
                E.taiko('perc', T(2 + k, 2), gain_db=-12 + k, pitch=0.85); E.taiko('perc', T(2 + k, 2.5), gain_db=-16 + k, pitch=0.85)
        # bars 4-5: the riff arrives under a closed filter
        for k in range(2):
            chug(4 + k, RIFF[k], gain=-16 + 2 * k, cutoff=180 + 160 * k, strings=(k == 1))
        E.riser('fx', T(3), T(6), gain_db=-17, f0=150, f1=6000)
        swell_cymbal(T(6), 'Long', gain=-11)
        # bar 6: the braam, on the tritone
        impact(T(6), gain=1, gong=True)
        braam(T(6), [28, 40, 46, 52, 58], 4 * b, gain=3)
        E.choir('choir', [64, 70, 76], T(6), 4 * b, vowel='ah', gain_db=-16, attack=0.06, release=1.2)
        chug(6, RIFF[0], gain=-13, cutoff=500)
        # bar 7: hits on the riff's turn, rolls, then one beat of nothing
        chug(7, RIFF[3][:12] + [None] * 4, gain=-13, cutoff=600)
        stabs(7, 'E5', slots=(0, 3, 6, 8, 11), tritone=True, gain=-2)
        timp_roll(T(7), T(7, 3), gain=-8)
        snare_build(7, 1, gain=-4)
        E.riser('fx', T(7), T(7, 3), gain_db=-15, f0=400, f1=9000)
        swell_cymbal(T(7, 3), 'Short', gain=-11)

    # ── body (loops) ──
    def body(o):
        E.reseed(31)
        # 1-8: the riff. Growl bass, low strings, brass stabs on the tritone at the turn.
        impact(T(o), gain=0, gong=True)
        for k in range(8):
            bar = o + k
            pat = RIFF[k % 4] if k < 7 else RIFF[3][:14] + [None, None]
            chug(bar, pat, gain=-13 if k >= 4 else -15)
            stabs(bar, 'E5', slots=(0, 3, 6) if k % 4 != 3 else (0, 3, 6, 8, 11, 13), tritone=(k % 4 == 3), gain=-4)
            if k >= 4: gtr(bar, [iv if (i in ACC or iv) else None for i, iv in enumerate(pat)] if pat else pat, gain=-5)
            if k >= 4: hammers(bar, pat, gain=-3)
            if k < 7: drums(bar, 'half' if k < 4 else 'drop', gain=-2)
            else: pre_drop(bar)
            if k >= 4: strings_pad(bar, 'Em' if k % 2 == 0 else 'F', vel=0.5, gain=-8)
        braam(T(o + 4), [28, 40, 47, 65], 4 * b, gain=-3)
        E.choir('choir', [52, 59], T(o + 4), 4 * 4 * b, vowel='ah', gain_db=-22, attack=0.8)
        toll(T(o), gain=-10)
        # 9-16: DROP 1, the hook. Synth lead, violins spiccato an octave down, horns staccato on the stutters.
        impact(T(o + 8), gain=1, gong=True)
        lead(o + 8, HOOK)
        spic_double(o + 8, HOOK, octave=-12, gain=-4)
        for k, ch in enumerate(HOOK_CH):
            bar = o + 8 + k
            pat = RIFF_DRIVE[k % 2]
            chug(bar, pat, shift=shift_of(ch), gain=-14, cutoff=650)
            gtr(bar, pat, shift=shift_of(ch), gain=-2)
            hammers(bar, pat, shift=shift_of(ch))
            low_brass(bar, ch, vel=0.7, gain=-7)
            pad(bar, ch, gain=-26)
            drums(bar, 'slam', fill=(k == 7), crash=(k % 2 == 0))
            if 'hookstabs' in KNOB: stabs(bar, ch if ch != 'Bb' else 'E5', slots=(0, 3, 6), tritone=(ch == 'Bb'), gain=-6)
            if 'hookchoir' in KNOB: choir(bar, ch, vowel='ah', gain=-20)
        E.riser('fx', T(o + 15), T(o + 16), gain_db=-18)
        swell_cymbal(T(o + 16), 'Median', gain=-12)

        # 17-24: the villain line. Horns in unison over the mediants; the strings saw underneath; half-time drums.
        impact(T(o + 16), gain=0, gong=True)
        melody(o + 16, VILLAIN, 'ihn', 'hn', octave=-12, vel=0.95, gain=4, ens=3)
        melody(o + 16, VILLAIN, 'tbn_sus', 'tbn', octave=-24, vel=0.85, gain=-2, ens=2)
        melody(o + 16, VILLAIN, 'vc_sus', 'vc', octave=-12, vel=0.8, gain=-3)
        for k, ch in enumerate(VILLAIN_CH):
            bar = o + 16 + k
            r = root(ch, 28)
            pat = [0, None, 0, 0, None, 0, 0, None, 0, None, 0, 0, None, 0, 12, 0]
            chug(bar, pat, gain=-17, cutoff=420, rootm=r if r >= 28 else r + 12)
            strings_pad(bar, ch, vel=0.55, gain=-6)
            choir(bar, ch, vowel='ah', gain=-20)
            E.note('cb_sus', root(ch, 28), T(bar), 4 * b, vel=0.75, track='cb', gain_db=-2)
            gtr_hold(bar, ch, gain=-5)
            E.note('piano', root(ch, 28), T(bar), 4 * b, vel=0.9, track='pno', gain_db=-2, release=0.8)
            E.note('piano', root(ch, 28) + 12, T(bar), 4 * b, vel=0.9, track='pno', gain_db=-4, release=0.8)
            if k < 7: drums(bar, 'half' if k < 6 else 'drop')
            else: pre_drop(bar)
            if k % 2 == 1:
                stabs(bar, ch, slots=(12, 14), gain=-4)
        timp_roll(T(o + 22), T(o + 23, 3.5), gain=-8)

        # 25-32: the hook, tutti and double time: lead + violins at pitch + trumpets, four-on-the-floor.
        impact(T(o + 24), gain=1, gong=True)
        lead(o + 24, HOOK, gain=-14)
        spic_double(o + 24, HOOK, gain=-3)
        spic_double(o + 24, HOOK, inst='vla_spic', track='vln_s', octave=-12, gain=-5)
        for i, line in enumerate(HOOK):
            # trumpets take the long notes, horns the stutters
            t = T(o + 24 + i)
            for m, d in line:
                if d >= 1.0:
                    E.note('tpt_sus', m - 12 if m > 80 else m, t, d * b, vel=0.9, track='tpt', gain_db=-3, ens=2, expr=[(0, -2), (d * b, 2)])
                else:
                    E.note('hn_stac', m - 12, t, d * b * 0.6, vel=0.85, track='brs_s', gain_db=-6, ens=2)
                t += d * b
        for k, ch in enumerate(HOOK_CH):
            bar = o + 24 + k
            # drop 2 is its own shape: four bars of half-time stomp, then four of blast beat
            pat = RIFF_STOMP[k % 2] if k < 4 else RIFF_DRIVE[k % 2]
            chug(bar, pat, shift=shift_of(ch), gain=-12 if k < 4 else -13, cutoff=800 if k < 4 else 700)
            gtr(bar, pat, shift=shift_of(ch), gain=0 if k < 4 else -1)
            hammers(bar, pat, shift=shift_of(ch))
            low_brass(bar, ch, vel=0.85, gain=-4)
            choir(bar, ch, vowel='ah', gain=-19, lo=60, hi=76)
            pad(bar, ch, gain=-24, cutoff=2400)
            drums(bar, 'stomp' if k < 4 else 'blast', fill=(k == 7), gain=0.5)
            if k == 4: impact(T(bar), gain=-2, gong=False)
            if 'hookstabs' in KNOB: stabs(bar, ch if ch != 'Bb' else 'E5', slots=(0, 3, 6), tritone=(ch == 'Bb'), gain=-6)
        swell_cymbal(T(o + 32), 'Short', gain=-12)

        # 33-40: breakdown. Half time, the wobble, Sovereign's wrong notes swelling; the hook on the music box; then the build.
        impact(T(o + 32), gain=-1, gong=True)
        E.downlifter('fx', T(o + 32), dur=3.0, gain_db=-17)
        gtr_hold(o + 32, 'E5', beats=8, gain=-1)
        for k in range(4):
            bar = o + 32 + k
            wobble(bar, 28 if k != 3 else 29, rate=[1, 1, 2, 2][k] * 0.5 if k < 2 else 1.0, gain=-14)
            drums(bar, 'half', gain=-2)
            E.choir('choir', [52, 58] if k % 2 == 0 else [53, 58], T(bar), 4 * b, vowel='oo', gain_db=-21, attack=0.5)
        for k in range(2):
            for m in SOV:
                E.note('tbn_sus' if m < 56 else 'ihn', m, T(o + 32 + 2 * k), 8 * b, vel=0.8, track='tbn' if m < 56 else 'hn', gain_db=-4,
                       ens=2, expr=[(0, -18), (8 * b * 0.85, 0), (8 * b, -6)])
        # the hook alone on high piano, a soft octave under it; the music box is a ghost behind
        t = T(o + 32)
        for line in HOOK[:4]:
            for m, d in line:
                # at pitch, above Sovereign's cluster (an octave down sat inside it and muddied; ears.py heard no difference)
                E.note('piano', m, t, d * b, vel=0.6, track='pno_hi', gain_db=0, release=0.5)
                E.note('glock', m + 12, t, 1.5, vel=0.4, track='bells', gain_db=-19)
                t += d * b
        if 'pnoleft' in KNOB:
            # the left hand: low E and F together, the half step struck as a cluster on each bar
            for k in range(4):
                for mm, g in ((28, -2), (40, -3), (41, -4)):
                    E.note('piano', mm, T(o + 32 + k), 4 * b, vel=0.9, track='pno_hi', gain_db=g, release=1.0)
        toll(T(o + 32), gain=-8); toll(T(o + 34), notes=(65, 70), gain=-8)
        # 37-40: build. The riff returns under a rising filter, the snare climbs, everything leans on B
        for k in range(4):
            bar = o + 36 + k
            chug(bar, RIFF[k], gain=-16 + k, cutoff=220 + 140 * k, strings=(k >= 2))
            for s in ACC:
                E.taiko('perc', T(bar, s / 4), gain_db=-15 + k * 2.5, pitch=1.0 + 0.05 * k)
            if k < 3: E.kick('drm', T(bar, 0), gain_db=-6)
            if k >= 2: gtr(bar, [0] * 16 if k == 2 else [0] * 14 + [None, None], gain=-6 + 2 * (k - 2))
        snare_build(o + 36, 3, gain=-6)
        pre_drop(o + 39)
        E.note('tbn_sus', 47, T(o + 38), 8 * b, vel=0.85, track='tbn', gain_db=-3, ens=2, expr=[(0, -14), (8 * b, 0)])
        E.note('tbn_sus', 53, T(o + 38), 8 * b, vel=0.85, track='tbn', gain_db=-4, ens=2, expr=[(0, -14), (8 * b, 0)])
        E.note('ihn', 63, T(o + 38), 8 * b, vel=0.85, track='hn', gain_db=-4, ens=3, expr=[(0, -14), (8 * b, 0)])
        for m in (83, 84, 86):
            E.note('vln_trem', m, T(o + 38), 8 * b, vel=0.75, track='vln', gain_db=-6, expr=[(0, -16), (8 * b, 0)])
        timp_roll(T(o + 38), T(o + 39, 3.5), gain=-7)
        E.riser('fx', T(o + 37), T(o + 39), gain_db=-16)

        # 41-48: the hook a half step up, in F. Everything at once.
        impact(T(o + 40), gain=2, gong=True)
        braam(T(o + 40), [29, 41, 47, 53], 2 * b, gain=-2)
        lead(o + 40, HOOK, shift=1, gain=-13)
        lead(o + 40, HOOK, shift=1, octave=-12, gain=-21, chip=False)
        spic_double(o + 40, HOOK, shift=1, gain=-2)
        melody(o + 40, HOOK, 'ihn', 'hn', shift=1, octave=-12, vel=0.85, gain=-3, ens=3, legato=False)
        for k, ch in enumerate(HOOK_CH):
            bar = o + 40 + k
            pat = RIFF_DRIVE[k % 2]
            chug(bar, pat, shift=(shift_of(ch) + 1) % 12, gain=-12, cutoff=750)
            gtr(bar, pat, shift=(shift_of(ch) + 1) % 12, gain=0)
            hammers(bar, pat, shift=(shift_of(ch) + 1) % 12, gain=1)
            low_brass(bar, ch, shift=1, vel=0.9, gain=-3)
            choir(bar, ch, shift=1, vowel='ah', gain=-18, lo=60, hi=77)
            pad(bar, ch, shift=1, gain=-23, cutoff=2800)
            strings_pad(bar, ch, shift=1, vel=0.6, gain=-7)
            drums(bar, 'slam', fill=(k == 7), crash=(k % 2 == 0), gain=1)
            if k == 3: impact(T(bar + 1), gain=-3)
        swell_cymbal(T(o + 48), 'Median', gain=-10)
        E.riser('fx', T(o + 47), T(o + 48), gain_db=-16)

        # 49-56: back down to E. The riff with the villain line's head over it, then the turnaround (same shape as the intro's last bar).
        impact(T(o + 48), gain=0, gong=False)
        melody(o + 48, [VILLAIN[2], VILLAIN[3]], 'ihn', 'hn', octave=-12, vel=0.95, gain=5, ens=3)
        melody(o + 52, [VILLAIN[2], VILLAIN[3]], 'tpt_sus', 'tpt', octave=0, vel=0.85, gain=-4, ens=2)
        melody(o + 52, [VILLAIN[2], VILLAIN[3]], 'ihn', 'hn', octave=-12, vel=0.95, gain=5, ens=3)
        for k in range(8):
            bar = o + 48 + k
            if k < 7:
                chug(bar, RIFF[k % 4])
                gtr(bar, RIFF[k % 4], gain=-1)
                hammers(bar, RIFF[k % 4], gain=-2)
                stabs(bar, 'E5', slots=(0, 3, 6) if k % 4 != 3 else (0, 3, 6, 8, 11, 13), tritone=(k % 4 == 3), gain=-6)
                drums(bar, 'slam' if k < 4 else 'drop', fill=(k == 3), crash=(k == 0))
                strings_pad(bar, 'Em', vel=0.55, gain=-7)
            else:
                chug(bar, RIFF[3][:12] + [None] * 4, gain=-13, cutoff=600)
                gtr(bar, RIFF[3][:12] + [None] * 4, gain=-1)
                stabs(bar, 'E5', slots=(0, 3, 6, 8, 11), tritone=True, gain=-2)
        bar = o + 55
        timp_roll(T(bar), T(bar, 3), gain=-8)
        snare_build(bar, 1, gain=-4)
        E.riser('fx', T(bar - 1), T(bar, 3), gain_db=-15, f0=400, f1=9000)
        swell_cymbal(T(bar, 3), 'Short', gain=-11)

    t0 = time.time()
    intro()
    for k in range(3):
        body(INTRO + k * BODY)
    fade = int(0.006 * SR)
    for g0, g1, only in gates:
        s0, s1 = int(g0 * SR), int(g1 * SR) - int(0.004 * SR)
        for name, tr in E.tracks.items():
            if name in ('fx', 'cym') or (only and name not in only): continue
            tr.buf[s0:s0 + fade] *= np.linspace(1, 0, fade)[:, None]
            tr.buf[s0 + fade:s1] = 0
    print(f'notes placed in {time.time() - t0:.1f}s')
    return E


TAU5 = 2 * math.pi * 5.5
TAU = 2 * math.pi


def render(stems=False):
    E = build()
    verbs = {'hall': (make_ir(3.0, rt=(2.8, 2.4, 1.7, 0.9), predelay=0.02) * db(-2), [('hp', 200, 0.7, 0), ('lp', 9000, 0.7, 0)]),
             'plate': (make_ir(1.2, rt=(1.0, 1.1, 1.0, 0.6), predelay=0.008, seed=9), [('hp', 400, 0.7, 0)]),
             'delay': (make_delay_ir(E.beat), [('hp', 500, 0.7, 0), ('lp', 5000, 0.7, 0)])}
    master = {'eq': [('hp', 26, 0.7, 0), ('low', 60, 0.7, -1.0), ('high', 9000, 0.7, 1.5)],
              'glue': {'thresh': -16, 'ratio': 2.0, 'attack': 0.02, 'release': 0.2, 'knee': 8, 'makeup': 0},
              'sat': 0.35, 'lufs': -16.0, 'ceiling': -1.0, 'limit_push': 2.0}
    sd = os.path.join(OUT, 'stems2') if stems else None
    if sd: os.makedirs(sd, exist_ok=True)
    t0 = time.time()
    full = E.mix(verbs, master, stems_dir=sd)
    print(f'mixed in {time.time() - t0:.1f}s')
    I = int(round(E.t(INTRO) * SR)); B = int(round(E.t(BODY) * SR))
    os.makedirs(OUT, exist_ok=True)
    sf.write(os.path.join(OUT, f'{NAME}-full-timeline.wav'), full, SR)
    xf = int(0.05 * SR)
    intro = full[:I].copy()
    loop = full[I + B: I + 2 * B].copy()
    over = full[I + 2 * B: I + 2 * B + SR].copy()
    intro[-2 * xf:-xf] = intro[-2 * xf:-xf] * np.linspace(1, 0, xf)[:, None] + full[I + B - 2 * xf: I + B - xf] * np.linspace(0, 1, xf)[:, None]
    intro[-xf:] = full[I + B - xf: I + B]
    song = np.vstack([intro, loop, over])
    sf.write(os.path.join(OUT, f'{NAME}-the-ninety-fifth.wav'), song, SR, subtype='PCM_24')
    lis = np.vstack([intro, loop, loop[: int(20 * SR)]])
    k = int(6 * SR); lis[-k:] *= np.linspace(1, 0, k)[:, None]
    sf.write(os.path.join(OUT, f'{NAME}-listen.wav'), lis, SR)
    print(f'loop start {I / SR:.6f}s  loop end {(I + B) / SR:.6f}s  ({I} / {I + B} samples)  LUFS {lufs(song[:I + B]):.1f}')
    return I, B


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--stems', action='store_true')
    a = ap.parse_args()
    render(stems=a.stems)
