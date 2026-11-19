"""Offline orchestral + hybrid-synth renderer for the game's score.

Real instruments come from the CC0 VSCO-2-CE and VCSL sample libraries (fetch_samples.sh, then index_samples.py).
Synth voices, drums, choir and effects are synthesised here. Mixing is per track (EQ, compression, saturation,
sidechain, pan, reverb sends) into a master chain normalised to a loudness target.

A score is a Python function that places notes on an Engine; see boss_theme.py.
"""
import json, math, os
import numpy as np
import soundfile as sf
from numba import njit
from scipy.signal import lfilter, oaconvolve, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, 'samples')
SR = 44100
TAU = 2 * math.pi


def mtof(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def db(x):
    return 10 ** (x / 20)


# ─────────────────────────────── DSP kernels ───────────────────────────────

@njit(cache=True)
def _hermite_read(x, start, ratio, n):
    """Read n samples of mono x from fractional position start, stepping ratio, cubic Hermite."""
    out = np.zeros(n, dtype=np.float32)
    L = x.shape[0]
    pos = start
    for i in range(n):
        k = int(pos)
        if k + 2 >= L:
            break
        f = pos - k
        xm1 = x[k - 1] if k >= 1 else x[k]
        x0 = x[k]; x1 = x[k + 1]; x2 = x[k + 2]
        c1 = 0.5 * (x1 - xm1)
        c2 = xm1 - 2.5 * x0 + 2.0 * x1 - 0.5 * x2
        c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1)
        out[i] = ((c3 * f + c2) * f + c1) * f + x0
        pos += ratio
    return out


@njit(cache=True)
def _polyblep(t, dt):
    if t < dt:
        t /= dt
        return t + t - t * t - 1.0
    if t > 1.0 - dt:
        t = (t - 1.0) / dt
        return t * t + t + t + 1.0
    return 0.0


@njit(cache=True)
def osc_saw(freq, sr, phase0):
    n = freq.shape[0]
    out = np.zeros(n, dtype=np.float32)
    p = phase0
    for i in range(n):
        dt = freq[i] / sr
        out[i] = 2.0 * p - 1.0 - _polyblep(p, dt)
        p += dt
        if p >= 1.0:
            p -= 1.0
    return out


@njit(cache=True)
def osc_square(freq, sr, phase0, pw):
    n = freq.shape[0]
    out = np.zeros(n, dtype=np.float32)
    p = phase0
    for i in range(n):
        dt = freq[i] / sr
        v = 1.0 if p < pw else -1.0
        v += _polyblep(p, dt)
        q = p - pw
        if q < 0.0:
            q += 1.0
        v -= _polyblep(q, dt)
        out[i] = v
        p += dt
        if p >= 1.0:
            p -= 1.0
    return out


@njit(cache=True)
def osc_sine(freq, sr, phase0):
    n = freq.shape[0]
    out = np.zeros(n, dtype=np.float32)
    p = phase0
    for i in range(n):
        out[i] = math.sin(2 * math.pi * p)
        p += freq[i] / sr
        if p >= 1.0:
            p -= 1.0
    return out


@njit(cache=True)
def svf(x, cutoff, res, sr, mode):
    """Zero-delay-feedback state-variable filter with per-sample cutoff. mode 0 LP, 1 BP, 2 HP."""
    n = x.shape[0]
    out = np.zeros(n, dtype=np.float32)
    ic1 = 0.0; ic2 = 0.0
    k = 2.0 - 2.0 * res
    for i in range(n):
        fc = cutoff[i]
        if fc > sr * 0.45:
            fc = sr * 0.45
        if fc < 10.0:
            fc = 10.0
        g = math.tan(math.pi * fc / sr)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            out[i] = v2
        elif mode == 1:
            out[i] = v1
        else:
            out[i] = x[i] - k * v1 - v2
    return out


@njit(cache=True)
def compressor_gain(det, sr, thresh_db, ratio, attack, release, knee_db):
    """Gain (linear) for a feed-forward compressor driven by a mono detector signal."""
    n = det.shape[0]
    g = np.ones(n, dtype=np.float32)
    aa = math.exp(-1.0 / (attack * sr))
    ar = math.exp(-1.0 / (release * sr))
    env = 0.0
    for i in range(n):
        x = abs(det[i])
        if x > env:
            env = aa * env + (1 - aa) * x
        else:
            env = ar * env + (1 - ar) * x
        lev = 20 * math.log10(env + 1e-9)
        over = lev - thresh_db
        if over <= -knee_db / 2:
            red = 0.0
        elif over >= knee_db / 2:
            red = over * (1 - 1 / ratio)
        else:
            t = over + knee_db / 2
            red = (1 - 1 / ratio) * t * t / (2 * knee_db)
        g[i] = 10 ** (-red / 20)
    return g


@njit(cache=True)
def limiter_gain(peak, sr, ceiling, lookahead, release):
    """Brickwall gain from a mono peak signal: hold the minimum over a lookahead window, smooth the attack."""
    n = peak.shape[0]
    la = int(lookahead * sr)
    need = np.ones(n, dtype=np.float32)
    for i in range(n):
        p = peak[i]
        if p > ceiling:
            need[i] = ceiling / p
    # running minimum over the lookahead window (forward-looking)
    hold = np.ones(n, dtype=np.float32)
    from_idx = 0
    # simple O(n * la / stride) approach with a monotone deque
    dq = np.zeros(n, dtype=np.int64)
    head = 0; tail = 0
    for i in range(n + la):
        if i < n:
            while tail > head and need[dq[tail - 1]] >= need[i]:
                tail -= 1
            dq[tail] = i; tail += 1
        j = i - la
        if j >= 0:
            while dq[head] < j:
                head += 1
            hold[j] = need[dq[head]]
    out = np.ones(n, dtype=np.float32)
    ar = math.exp(-1.0 / (release * sr))
    aa = math.exp(-1.0 / (lookahead * sr / 3.0))
    g = 1.0
    for i in range(n):
        target = hold[i]
        if target < g:
            g = aa * g + (1 - aa) * target
            if g > target / 0.97 and False:
                g = target
        else:
            g = ar * g + (1 - ar) * target
        out[i] = g
    return out


@njit(cache=True)
def ks_string(f, n, sr, fb, damp, seed, exc_bright):
    """Karplus-Strong plucked string: a noise burst circulating in a delay line of sr/f samples with a one-pole
    damping filter (its phase delay is compensated). fb sets the decay (palm mute ~0.97, open ~0.996)."""
    np.random.seed(seed)
    D = sr / f - damp / (1.0 - damp)
    if D < 2.0:
        D = 2.0
    ex = int(sr / f)
    y = np.zeros(n)
    lp = 0.0
    xp = 0.0
    for i in range(n):
        x = 0.0
        if i < ex:
            r = np.random.random() * 2.0 - 1.0
            xp = exc_bright * r + (1.0 - exc_bright) * xp
            x = xp
        p = i - D
        d = 0.0
        if p >= 0.0:
            k = int(p)
            fr = p - k
            d = y[k] * (1.0 - fr) + y[k + 1] * fr if k + 1 < i else y[k]
        lp = damp * lp + (1.0 - damp) * d
        y[i] = x + fb * lp
    return y


# ─────────────────────────────── filters / EQ ───────────────────────────────

def biquad(kind, f, sr=SR, q=0.707, gain_db=0.0):
    A = 10 ** (gain_db / 40)
    w = TAU * f / sr
    c, s = math.cos(w), math.sin(w)
    al = s / (2 * q)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'bp':
        b = [al, 0, -al]; a = [1 + al, -2 * c, 1 - al]
    elif kind == 'peak':
        b = [1 + al * A, -2 * c, 1 - al * A]; a = [1 + al / A, -2 * c, 1 - al / A]
    elif kind == 'low':
        sq = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    elif kind == 'high':
        sq = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]; a = np.array(a) / a[0]
    return b, a


def eq(x, bands):
    """x: (n, 2). bands: list of (kind, freq, q, gain_db)."""
    for kind, f, q, g in bands:
        b, a = biquad(kind, f, q=q, gain_db=g)
        x = lfilter(b, a, x, axis=0)
    return x.astype(np.float32)


def k_weight(x):
    b1, a1 = biquad('high', 1681.97, q=0.7071, gain_db=4.0)
    b2, a2 = biquad('hp', 38.13, q=0.5003)
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x):
    """ITU-R BS.1770-4 integrated loudness of a stereo array."""
    y = k_weight(x.astype(np.float64))
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.mean(y[i:i + blk] ** 2, axis=0).sum() for i in range(0, len(y) - blk, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[l > -70]
    if not len(g): return -70.0
    rel = -0.691 + 10 * np.log10(g.mean()) - 10
    g2 = ms[(l > -70) & (l > rel)]
    return float(-0.691 + 10 * np.log10(g2.mean()))


def short_term_lufs(x, win=3.0, hop=1.0):
    y = k_weight(x.astype(np.float64))
    blk, h = int(win * SR), int(hop * SR)
    return [(i / SR, -0.691 + 10 * np.log10(np.mean(y[i:i + blk] ** 2, axis=0).sum() + 1e-12)) for i in range(0, len(y) - blk, h)]


# ─────────────────────────────── reverb ───────────────────────────────

def make_ir(seconds=3.2, rt=(3.0, 2.6, 1.8, 0.9), predelay=0.022, seed=7, er=True, width=1.0):
    """Stereo hall impulse response: band-wise decaying noise with early reflections."""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    bands = [(None, 250), (250, 1500), (1500, 5000), (5000, None)]
    ir = np.zeros((n, 2))
    for (lo, hi), r in zip(bands, rt):
        noise = rng.standard_normal((n, 2))
        if lo and hi: sos = butter(4, [lo, hi], 'bandpass', fs=SR, output='sos')
        elif lo: sos = butter(4, lo, 'highpass', fs=SR, output='sos')
        else: sos = butter(4, hi, 'lowpass', fs=SR, output='sos')
        nb = sosfilt(sos, noise, axis=0)
        env = np.exp(-6.9078 * t / r)
        ir += nb * env[:, None]
    # soft onset of the diffuse tail
    ir *= np.minimum(1, t / 0.035)[:, None] ** 1.5
    if er:
        for k in range(14):
            d = 0.006 + rng.random() * 0.075
            i = int(d * SR)
            g = (0.9 - d * 6) * (0.6 + 0.4 * rng.random())
            ir[i, 0] += g * (1 if rng.random() > 0.5 else -1) * (0.5 + 0.5 * rng.random())
            ir[i + int(rng.random() * 40), 1] += g * (1 if rng.random() > 0.5 else -1) * (0.5 + 0.5 * rng.random())
    pd = int(predelay * SR)
    ir = np.vstack([np.zeros((pd, 2)), ir])
    mid = ir.mean(axis=1, keepdims=True); side = (ir[:, :1] - ir[:, 1:]) / 2
    ir = np.hstack([mid + side * width, mid - side * width])
    ir /= np.sqrt((ir ** 2).sum() / 2)
    return ir.astype(np.float32)


def make_delay_ir(beat, taps=6, fb=0.45, seed=3):
    """Ping-pong dotted-eighth echoes as a sparse stereo impulse response."""
    d = beat * 0.75
    n = int(d * (taps + 1) * SR) + 1
    ir = np.zeros((n, 2), dtype=np.float32)
    for k in range(1, taps + 1):
        ir[int(k * d * SR), (k + 1) % 2] = fb ** (k - 1)
    return ir


# ─────────────────────────────── sampler ───────────────────────────────

INSTRUMENTS = {
    # key: (index name, lead seconds, legato start offset, default release, gain dB)
    'vln_sus':  ('vln_sus', 0.07, 0.16, 0.35, 0),
    'vln_spic': ('vln_spic', 0.012, 0.0, 0.08, 0),
    'vln_trem': ('vln_trem', 0.04, 0.12, 0.3, -2),
    'vla_sus':  ('vla_sus', 0.07, 0.16, 0.35, 0),
    'vla_spic': ('vla_spic', 0.012, 0.0, 0.08, 0),
    'vc_sus':   ('vc_sus', 0.07, 0.16, 0.35, 0),
    'vc_spic':  ('vc_spic', 0.012, 0.0, 0.08, 0),
    'cb_sus':   ('cb_sus', 0.07, 0.16, 0.35, 0),
    'cb_spic':  ('cb_spic', 0.012, 0.0, 0.08, 0),
    'hn_sus':   ('hn_sus', 0.045, 0.12, 0.3, 0),
    'hn_stac':  ('hn_stac', 0.01, 0.0, 0.1, 0),
    'tbn_sus':  ('tbn_sus', 0.04, 0.12, 0.3, 0),
    'tbn_stac': ('tbn_stac', 0.01, 0.0, 0.1, 0),
    'tpt_sus':  ('tpt_sus', 0.035, 0.1, 0.3, 0),
    'tpt_stac': ('tpt_stac', 0.008, 0.0, 0.1, 0),
    'tba_sus':  ('tba_sus', 0.045, 0.12, 0.3, 0),
    'tba_stac': ('tba_stac', 0.01, 0.0, 0.1, 0),
    'ihn':      ('ihn', 0.03, 0.1, 0.28, 0),
    'harp':     ('harp', 0.004, 0.0, 1.5, 0),
    'glock':    ('glock', 0.002, 0.0, 2.0, 0),
    'chimes':   ('chimes', 0.004, 0.0, 4.0, 0),
    'piano':    ('piano', 0.003, 0.0, 1.2, 0),
}


class SampleBank:
    def __init__(self):
        self.index = json.load(open(os.path.join(SAMPLES, 'index.json')))
        self.cache = {}
        self.rr = {}

    def load(self, rel):
        if rel in self.cache: return self.cache[rel]
        x, sr = sf.read(os.path.join(SAMPLES, rel), dtype='float32', always_2d=True)
        assert sr == SR, (rel, sr)
        if x.shape[1] == 1: x = np.hstack([x, x])
        mono = np.abs(x).max(axis=1)
        pk = mono.max() + 1e-9
        on = int(np.argmax(mono > pk * 0.02))
        on = max(0, on - int(0.004 * SR))
        x = x[on:]
        seg = x[: int(min(len(x), SR * 0.8))]
        rms = float(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        self.cache[rel] = (np.ascontiguousarray(x[:, 0]), np.ascontiguousarray(x[:, 1]), rms)
        return self.cache[rel]

    def extended(self, rel, need):
        """The sample with its sustain looped (crossfaded) until it is at least need samples long."""
        L, R, rms = self.load(rel)
        if len(L) >= need: return L, R
        key = (rel, 'ext', need // SR + 1)
        if key in self.cache: return self.cache[key][:2]
        a, b = int(len(L) * 0.45), int(len(L) * 0.85)
        xf = min(int(0.08 * SR), (b - a) // 3)
        outs = []
        for x in (L, R):
            seg = x[a:b].copy()
            y = list(x[:b - xf])
            fade = np.linspace(0, 1, xf, dtype=np.float32)
            tail = x[b - xf:b]
            while len(y) < (need // SR + 1) * SR + SR:
                y.extend(tail * (1 - fade) + seg[:xf] * fade)
                y.extend(seg[xf:len(seg) - xf])
                tail = seg[len(seg) - xf:]
            y.extend(tail * (1 - fade) + x[b:b + xf] * fade if b + xf <= len(x) else tail)
            outs.append(np.asarray(y, dtype=np.float32))
        self.cache[key] = (outs[0], outs[1], rms)
        return outs[0], outs[1]

    def pick(self, inst, note, vel, alt=0):
        """Nearest sample in the velocity layer. alt > 0 asks for a different recording for an ensemble copy:
        another round robin if there is one, else a neighbouring layer, else the next-nearest note."""
        rows = self.index[inst]
        layers = sorted(set(r['vel'] for r in rows))
        li = min(len(layers) - 1, int(vel * len(layers) * 0.999))
        layer = layers[li]
        cand = [r for r in rows if r['vel'] == layer]
        best = min(abs(r['note'] - note) for r in cand)
        near = [r for r in cand if abs(r['note'] - note) == best]
        key = (inst, layer, near[0]['note'])
        k = self.rr.get(key, 0); self.rr[key] = k + 1
        if alt and len(near) == 1:
            if len(layers) > 1:
                lj = li - alt if li - alt >= 0 else min(len(layers) - 1, li + alt)
                if lj != li:
                    c2 = [r for r in rows if r['vel'] == layers[lj]]
                    b2 = min(abs(r['note'] - note) for r in c2)
                    if b2 <= best + 1:
                        return [r for r in c2 if abs(r['note'] - note) == b2][0], layer, li, len(layers)
            by = sorted(cand, key=lambda r: (abs(r['note'] - note), r['note']))
            notes = []
            for r in by:
                if r['note'] not in [q['note'] for q in notes]: notes.append(r)
            if len(notes) > alt and abs(notes[alt]['note'] - note) <= 3:
                return notes[alt], layer, li, len(layers)
        return near[(k + alt) % len(near)], layer, li, len(layers)


# ─────────────────────────────── engine ───────────────────────────────

class Track:
    def __init__(self, name, n, **kw):
        self.name = name
        self.buf = np.zeros((n, 2), dtype=np.float32)
        self.pan = kw.get('pan', 0.0)
        self.width = kw.get('width', 1.0)
        self.gain = kw.get('gain', 0.0)
        self.sends = kw.get('sends', {'hall': 0.15})
        self.eq = kw.get('eq', [])
        self.comp = kw.get('comp', None)          # dict(thresh, ratio, attack, release, knee, makeup)
        self.sat = kw.get('sat', 0.0)             # drive
        self.duck = kw.get('duck', 0.0)           # sidechain depth 0..1 from the kick key
        self.duck_release = kw.get('duck_release', 0.18)
        self.mono_below = kw.get('mono_below', 0)
        self.post_eq = kw.get('post_eq', [])      # after saturation: a guitar cabinet after the amp


class Engine:
    def __init__(self, bpm, seconds, seed=1):
        self.bpm = bpm
        self.beat = 60.0 / bpm
        self.n = int(seconds * SR)
        self.tracks = {}
        self.bank = SampleBank()
        self.rng = np.random.default_rng(seed)
        self.kicks = []                    # times of sidechain key hits
        self.legato_last = {}              # track/voice → (end sample index) for legato crossfade
        self.markers = []
        self.log = []                      # (inst, midi, start s, dur s, vel, track) for every sampled note

    def reseed(self, seed):
        self.rng = np.random.default_rng(seed)
        self.bank.rr = {}

    def sub(self):
        """A child generator that costs one draw, so variable-length noise can't shift the shared stream."""
        return np.random.default_rng(int(self.rng.integers(1 << 62)))

    def late(self, t):
        return t - 1.0 > self.n / SR

    # time helpers
    def t(self, bar, beat=0.0):
        return (bar * 4 + beat) * self.beat

    def track(self, name, **kw):
        if name not in self.tracks:
            self.tracks[name] = Track(name, self.n, **kw)
        return self.tracks[name]

    def add(self, track, start_s, stereo, gain=1.0):
        tr = self.tracks[track]
        s = int(round(start_s * SR))
        if s < 0:
            stereo = stereo[-s:]; s = 0
        e = min(self.n, s + len(stereo))
        if e <= s: return
        tr.buf[s:e] += stereo[: e - s] * gain

    # ── sampled notes ──
    def note(self, inst, note, t, dur, vel=0.7, track=None, gain_db=0.0, release=None, attack=0.0,
             legato=False, expr=None, human=True, pan=0.0, offset=0.0, ens=1, alt=0):
        if ens > 1:
            # a section from a soloist: copies on other round robins, a few cents and milliseconds apart
            for k in range(ens):
                c = (k - (ens - 1) / 2) / max(1, (ens - 1) / 2)
                self.note(inst, note + c * 0.07, t + abs(c) * 0.012, dur, vel=vel, track=track,
                          gain_db=gain_db - 10 * math.log10(ens) + 1.5, release=release, attack=attack, legato=legato,
                          expr=expr, human=human, pan=pan + c * 0.25, offset=offset, ens=1, alt=k)
            return
        if self.late(t): return
        key, lead, leg_off, rel_def, inst_gain = INSTRUMENTS[inst]
        track = track or inst
        self.log.append((inst, float(note), t, dur, vel, track))
        rel = rel_def if release is None else release
        if human:
            t += self.rng.normal(0, 0.006)
            vel = float(np.clip(vel + self.rng.normal(0, 0.03), 0.02, 1.0))
        row, layer, li, nl = self.bank.pick(key, int(round(note)), vel, alt)
        L, R, rms = self.bank.load(row['file'])
        ratio = 2 ** ((note - row['note'] + row.get('tune', 0.0)) / 12)
        start = offset * SR
        if legato:
            start = leg_off * SR
            lead = 0.0
        t0 = t - lead
        total = dur + lead + rel
        n = int(total * SR)
        need = int(start + n * ratio) + 8
        if need > len(L):
            L, R = self.bank.extended(row['file'], need)
        l = _hermite_read(L, start, ratio, n)
        r = _hermite_read(R, start, ratio, n)
        # level: normalise the sample, then a velocity curve within and across layers
        norm = np.clip(0.08 / rms, db(-14), db(14))
        lay_db = -10 * (1 - (li + 1) / nl) if nl > 1 else 0
        vel_db = -18 * (1 - vel) ** 1.4
        g = norm * db(lay_db * 0.5 + vel_db + gain_db + inst_gain)
        env = np.ones(n, dtype=np.float32)
        hold = int((dur + lead) * SR)
        a = int(max(attack, 0.03 if legato else 0.0) * SR)
        if a > 0:
            env[:a] = np.linspace(0, 1, a) ** (1.0 if legato else 2.0)
        if hold < n:
            k = n - hold
            env[hold:] *= np.exp(-np.arange(k) / (rel * SR / 4.6))
        env[-64:] *= np.linspace(1, 0, 64)
        if expr is not None:
            # expr: list of (seconds from note start, dB)
            xs = np.array([p[0] for p in expr]) + lead
            ys = np.array([p[1] for p in expr])
            env *= db(np.interp(np.arange(n) / SR, xs, ys)).astype(np.float32)
        st = np.stack([l * env, r * env], axis=1) * g
        if pan:
            st = self._pan(st, pan)
        self.track(track)
        self.add(track, t0, st)

    def _pan(self, st, pan):
        p = (pan + 1) * math.pi / 4
        return np.stack([st[:, 0] * math.cos(p) * 1.414, st[:, 1] * math.sin(p) * 1.414], axis=1).astype(np.float32)

    def line(self, inst, notes, t0, track=None, legato=True, vel=0.7, gain_db=0.0, overlap=0.06, release=None, **kw):
        """A legato line: notes = [(midi, beats)], midi None is a rest."""
        t = t0; prev = None
        for i, (m, beats) in enumerate(notes):
            d = beats * self.beat
            if m is not None:
                v = vel(i) if callable(vel) else vel
                # inside a legato phrase the note hands off quickly to the next one; the last note rings out
                nxt = notes[i + 1][0] if i + 1 < len(notes) else None
                rel = 0.08 if (legato and nxt is not None) else release
                self.note(inst, m, t, d + overlap, vel=v, track=track, gain_db=gain_db,
                          legato=(legato and prev is not None), release=rel, **kw)
            prev = m
            t += d
        return t

    # ── synth voices ──
    def synth(self, track, freq_fn, t, dur, wave='saw', voices=1, detune=0.0, spread=0.0, cutoff=None, res=0.1,
              amp_env=(0.005, 0.1, 1.0, 0.1), gain_db=-12, fmode=0, sub=0.0, drive=0.0, noise=0.0):
        """Generic subtractive voice. freq_fn(t_array) → Hz. cutoff: float or fn(t_array) Hz."""
        if self.late(t): return
        a, d, s, r = amp_env
        n = int((dur + r) * SR)
        tt = np.arange(n) / SR
        f0 = freq_fn(tt) if callable(freq_fn) else np.full(n, freq_fn)
        out = np.zeros((n, 2), dtype=np.float32)
        for v in range(voices):
            off = (v - (voices - 1) / 2) / max(1, (voices - 1) / 2) if voices > 1 else 0.0
            f = (f0 * (2 ** (detune * off / 12))).astype(np.float64)
            ph = self.rng.random()
            if wave == 'saw': o = osc_saw(f, SR, ph)
            elif wave == 'square': o = osc_square(f, SR, ph, 0.5)
            elif wave == 'pulse': o = osc_square(f, SR, ph, 0.25)
            elif wave == 'tri': o = np.cumsum(osc_square(f, SR, ph, 0.5) * (4 * f / SR)).astype(np.float32); o -= np.convolve(o, np.ones(2048) / 2048, 'same')
            else: o = osc_sine(f, SR, ph)
            pan = off * spread
            out[:, 0] += o * math.cos((pan + 1) * math.pi / 4) * 1.414
            out[:, 1] += o * math.sin((pan + 1) * math.pi / 4) * 1.414
        out /= math.sqrt(voices)
        if noise:
            out += self.sub().standard_normal((n, 2)).astype(np.float32) * noise
        if sub:
            so = osc_sine(f0.astype(np.float64) / 2, SR, 0.0) * sub
            out += so[:, None]
        if cutoff is not None:
            c = cutoff(tt) if callable(cutoff) else np.full(n, float(cutoff))
            c = c.astype(np.float64)
            out = np.stack([svf(out[:, 0].astype(np.float64), c, res, SR, fmode), svf(out[:, 1].astype(np.float64), c, res, SR, fmode)], axis=1).astype(np.float32)
        if drive:
            out = (np.tanh(out * (1 + drive)) / np.tanh(1 + drive)).astype(np.float32)
        env = np.ones(n, dtype=np.float32)
        ai, di = int(a * SR), int(d * SR)
        hold = int(dur * SR)
        if ai: env[:ai] = np.linspace(0, 1, ai)
        if di: env[ai:ai + di] = np.linspace(1, s, len(env[ai:ai + di]))
        env[ai + di:hold] = s
        if hold < n: env[hold:] = s * np.exp(-np.arange(n - hold) / (max(r, 0.002) * SR / 4.6))
        env[-32:] *= np.linspace(1, 0, 32)
        self.track(track)
        self.add(track, t, out * env[:, None] * db(gain_db))

    # ── electric guitar (plucked strings; the amp and cabinet are the track's sat + post_eq) ──
    def guitar(self, track, notes, t, dur, mute=False, vel=0.8, gain_db=0.0, strum=0.006):
        """One strum of `notes` (midi). mute: palm-muted, short and dark. Mono; pan it with the track."""
        if self.late(t): return
        rel = 0.03 if mute else 0.08
        n = int((dur + rel) * SR)
        out = np.zeros(n)
        rng = self.sub()
        for k, m in enumerate(notes):
            fb = 0.965 if mute else 0.9965
            damp = 0.55 if mute else 0.28
            y = ks_string(mtof(m) * (1 + 0.0015 * (rng.random() - 0.5)), n, float(SR), fb, damp,
                          int(rng.integers(1 << 30)), 0.55 if mute else 0.85)
            o = int(k * strum * SR)
            out[o:] += y[: n - o]
        env = np.ones(n)
        h = int(dur * SR)
        if h < n: env[h:] = np.exp(-np.arange(n - h) / (rel * SR / 4.6))
        x = (out * env * vel / math.sqrt(len(notes))).astype(np.float32)
        self.track(track)
        self.add(track, t + rng.normal(0, 0.003), np.stack([x, x], 1) * db(gain_db))

    # ── drums & percussion ──
    def sample_hit(self, track, rel, t, gain_db=0.0, rate=1.0, rev=False, length=None, fade=0.0):
        if self.late(t): return
        L, R, rms = self.bank.load(rel)
        n = int((length or len(L) / rate / SR) * SR)
        l = _hermite_read(L, 0.0, rate, n); r = _hermite_read(R, 0.0, rate, n)
        st = np.stack([l, r], axis=1)
        if fade:
            k = int(fade * SR); st[-k:] *= np.linspace(1, 0, k)[:, None]
        if rev:
            st = st[::-1].copy()
            t -= len(st) / SR
        self.track(track)
        self.add(track, t, st * db(gain_db))

    def kick(self, track, t, gain_db=-6, f_hi=160, f_lo=46, decay=0.35, click=0.4, key=True):
        n = int((decay + 0.05) * SR); tt = np.arange(n) / SR
        f = f_lo + (f_hi - f_lo) * np.exp(-tt * 28)
        ph = np.cumsum(f) / SR
        body = np.sin(TAU * ph) * np.exp(-tt / decay * 3.2)
        cl = self.rng.standard_normal(n) * np.exp(-tt * 400) * click
        b, a = biquad('bp', 3200, q=0.8); cl = lfilter(b, a, cl)
        x = np.tanh((body + cl) * 1.6) / np.tanh(1.6)
        self.track(track)
        self.add(track, t, np.stack([x, x], 1).astype(np.float32) * db(gain_db))
        if key: self.kicks.append(t)

    def taiko(self, track, t, gain_db=-6, pitch=1.0, key=False):
        """Big low drum: synthetic membrane layered with the concert bass drum sample."""
        n = int(1.2 * SR); tt = np.arange(n) / SR
        f = (62 + 70 * np.exp(-tt * 30)) * pitch
        body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-tt * 5.5)
        nz = self.rng.standard_normal(n) * np.exp(-tt * 45)
        b, a = biquad('lp', 900, q=0.7); nz = lfilter(b, a, nz) * 0.9
        x = np.tanh((body + nz) * 1.4) / np.tanh(1.4)
        self.track(track)
        self.add(track, t, np.stack([x, x], 1).astype(np.float32) * db(gain_db))
        k = int(self.rng.integers(1, 3))
        v = 5 + int(self.rng.integers(0, 3))
        self.sample_hit(track, f'vsco/Percussion/BDrumNewhit_v{v}_rr{k}_Sum.wav', t - 0.004, gain_db=gain_db + 4, rate=pitch * 1.06, length=1.4, fade=0.3)
        if key: self.kicks.append(t)

    def snare(self, track, t, gain_db=-8, tone=190, noise_decay=0.18, layer=True):
        n = int(0.4 * SR); tt = np.arange(n) / SR
        body = np.sin(TAU * np.cumsum(tone * (1 + 0.5 * np.exp(-tt * 40))) / SR) * np.exp(-tt * 22)
        nz = self.rng.standard_normal(n) * np.exp(-tt / noise_decay * 2.5)
        b, a = biquad('hp', 1400, q=0.7); nz = lfilter(b, a, nz)
        b, a = biquad('peak', 5200, q=1.0, gain_db=4); nz = lfilter(b, a, nz)
        x = np.tanh((body * 0.9 + nz * 0.75) * 1.5) / np.tanh(1.5)
        st = np.stack([x, x], 1).astype(np.float32)
        self.track(track)
        self.add(track, t, st * db(gain_db))
        if layer:
            v = [5, 7, 9][int(self.rng.integers(0, 3))]; k = int(self.rng.integers(1, 3))
            self.sample_hit(track, f'vsco/Percussion/Snare2-HitSN_v{v}_rr{k}_Sum.wav', t, gain_db=gain_db + 2, length=0.5, fade=0.15)

    def hat(self, track, t, gain_db=-20, open_=False):
        """Metallic hat: six detuned squares (808 ratios) through band and high pass."""
        dec = 0.32 if open_ else 0.045
        n = int((dec * 3 + 0.02) * SR); tt = np.arange(n) / SR
        fr = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]
        x = np.zeros(n)
        for f in fr:
            x += np.sign(np.sin(TAU * f * 1.7 * tt + self.rng.random() * 6))
        b, a = biquad('bp', 9000, q=0.9); x = lfilter(b, a, x)
        b, a = biquad('hp', 7000, q=0.7); x = lfilter(b, a, x)
        x = x * np.exp(-tt / dec * 2.3) * 0.25
        st = np.stack([x * 0.85, x], 1).astype(np.float32)
        self.track(track)
        self.add(track, t, st * db(gain_db))

    def clap(self, track, t, gain_db=-12):
        n = int(0.35 * SR); tt = np.arange(n) / SR
        nz = self.rng.standard_normal(n)
        env = np.zeros(n)
        for k, o in enumerate([0, 0.011, 0.022, 0.031]):
            i = int(o * SR); env[i:] += np.exp(-(tt[: n - i]) * (140 if k < 3 else 16)) * (0.8 if k < 3 else 1.0)
        b, a = biquad('bp', 1250, q=1.1); x = lfilter(b, a, nz * env)
        st = np.stack([x, x], 1).astype(np.float32)
        self.track(track); self.add(track, t, st * db(gain_db))

    # ── effects ──
    def riser(self, track, t0, t1, gain_db=-14, f0=300, f1=8000):
        n = int((t1 - t0) * SR); tt = np.linspace(0, 1, n)
        nz = self.sub().standard_normal((n, 2))
        c = f0 * (f1 / f0) ** (tt ** 1.6)
        x = np.stack([svf(nz[:, 0], c, 0.55, SR, 1), svf(nz[:, 1], c, 0.55, SR, 1)], 1)
        tone = osc_saw((110 * 2 ** (tt * 3)).astype(np.float64), SR, 0.0)
        tone = svf(tone.astype(np.float64), c * 0.6, 0.3, SR, 0)
        x = x + tone[:, None] * 0.25
        x *= (tt ** 2.2)[:, None]
        self.track(track); self.add(track, t0, x.astype(np.float32) * db(gain_db))

    def downlifter(self, track, t0, dur=2.0, gain_db=-16):
        n = int(dur * SR); tt = np.linspace(0, 1, n)
        nz = self.sub().standard_normal((n, 2))
        c = 9000 * (120 / 9000) ** (tt ** 0.6)
        x = np.stack([svf(nz[:, 0], c, 0.4, SR, 1), svf(nz[:, 1], c, 0.4, SR, 1)], 1)
        x *= ((1 - tt) ** 2)[:, None]
        self.track(track); self.add(track, t0, x.astype(np.float32) * db(gain_db))

    def sub_drop(self, track, t, dur=1.6, gain_db=-8, f0=90, f1=32):
        n = int(dur * SR); tt = np.arange(n) / SR
        f = f1 + (f0 - f1) * np.exp(-tt * 3.2)
        x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-tt / dur * 2.5)
        x = np.tanh(x * 1.5)
        self.track(track); self.add(track, t, np.stack([x, x], 1).astype(np.float32) * db(gain_db))

    def choir(self, track, notes, t, dur, vowel='ah', gain_db=-20, attack=0.6, release=1.2, voices=6):
        """Formant choir: per note, a cluster of jittered pulse voices through three vowel formants."""
        if self.late(t): return
        F = {'ah': [(800, 80, 0), (1150, 90, -6), (2900, 120, -20)], 'oh': [(450, 70, 0), (800, 80, -9), (2830, 100, -22)],
             'oo': [(325, 50, 0), (700, 60, -14), (2530, 170, -26)], 'eh': [(400, 60, 0), (1700, 90, -10), (2600, 100, -16)]}[vowel]
        n = int((dur + release) * SR); tt = np.arange(n) / SR
        out = np.zeros((n, 2))
        rng = self.sub()
        for m in notes:
            f0 = mtof(m)
            for v in range(voices):
                vib = 1 + 0.004 * np.sin(TAU * (4.6 + rng.random()) * tt + rng.random() * 6) * np.minimum(1, tt / 0.8)
                drift = 1 + 0.0035 * (rng.random() - 0.5) * 2
                o = osc_saw((f0 * drift * vib).astype(np.float64), SR, rng.random()).astype(np.float64)
                o = lfilter([1], [1, -0.6], o)  # glottal tilt
                y = np.zeros(n)
                for fc, bw, gdb in F:
                    fcv = fc * (1 + 0.02 * (rng.random() - 0.5))
                    b, a = biquad('bp', fcv, q=fcv / bw)
                    y += lfilter(b, a, o) * db(gdb)
                breath = rng.standard_normal(n) * 0.02
                b, a = biquad('bp', 2500, q=0.7); y += lfilter(b, a, breath)
                p = (rng.random() - 0.5) * 1.4
                out[:, 0] += y * math.cos((p + 1) * math.pi / 4)
                out[:, 1] += y * math.sin((p + 1) * math.pi / 4)
        env = np.minimum(1, tt / attack) ** 1.5
        hold = int(dur * SR)
        env[hold:] *= np.exp(-np.arange(n - hold) / (release * SR / 4.6))
        out *= env[:, None] / math.sqrt(voices * len(notes))
        self.track(track); self.add(track, t, out.astype(np.float32) * db(gain_db))

    # ─────────────── mixdown ───────────────
    def _duck_env(self, depth, release):
        g = np.ones(self.n, dtype=np.float32)
        if not depth: return g
        att = int(0.004 * SR); rl = int(release * SR * 1.6)
        shape = np.concatenate([np.linspace(1, 1 - depth, att), 1 - depth * np.exp(-np.arange(rl) / (release * SR / 3.0))])
        for t in self.kicks:
            s = int(t * SR) - att // 2
            if s < 0 or s >= self.n: continue
            e = min(self.n, s + len(shape))
            g[s:e] = np.minimum(g[s:e], shape[: e - s])
        return g

    def mix(self, verbs, master, stems_dir=None):
        """verbs: {name: (ir, eq bands)}. master: dict. Returns stereo float32."""
        bus = np.zeros((self.n, 2), dtype=np.float32)
        sends = {k: np.zeros((self.n, 2), dtype=np.float32) for k in verbs}
        for name, tr in self.tracks.items():
            x = tr.buf
            if tr.eq: x = eq(x, tr.eq)
            if tr.mono_below:
                b, a = biquad('lp', tr.mono_below); lo = lfilter(b, a, x, axis=0)
                lo_m = lo.mean(axis=1, keepdims=True)
                x = (x - lo + lo_m).astype(np.float32)
            if tr.comp:
                c = tr.comp
                det = np.abs(x).max(axis=1).astype(np.float64)
                g = compressor_gain(det, SR, c['thresh'], c['ratio'], c.get('attack', 0.01), c.get('release', 0.15), c.get('knee', 6.0))
                x = x * g[:, None] * db(c.get('makeup', 0.0))
            if tr.sat:
                d = tr.sat
                x = (np.tanh(x * (1 + d)) / np.tanh(1 + d)).astype(np.float32)
            if tr.post_eq: x = eq(x, tr.post_eq)
            if tr.duck:
                x = x * self._duck_env(tr.duck, tr.duck_release)[:, None]
            if tr.width != 1.0:
                m = x.mean(axis=1, keepdims=True); s = (x[:, :1] - x[:, 1:]) / 2
                x = np.hstack([m + s * tr.width, m - s * tr.width])
            if tr.pan:
                p = (tr.pan + 1) * math.pi / 4
                x = np.stack([x[:, 0] * math.cos(p) * 1.414, x[:, 1] * math.sin(p) * 1.414], 1)
            x = (x * db(tr.gain)).astype(np.float32)
            if stems_dir:
                sf.write(os.path.join(stems_dir, name + '.wav'), x, SR, subtype='FLOAT')
            bus += x
            for k, amt in tr.sends.items():
                if amt: sends[k] += x * amt
        for k, (ir, bands) in verbs.items():
            src = sends[k]
            if bands: src = eq(src, bands)
            wet = np.stack([oaconvolve(src[:, 0], ir[:, 0])[: self.n], oaconvolve(src[:, 1], ir[:, 1])[: self.n]], 1).astype(np.float32)
            if stems_dir:
                sf.write(os.path.join(stems_dir, 'verb_' + k + '.wav'), wet, SR, subtype='FLOAT')
            bus += wet
        return self.master(bus, master)

    def master(self, x, m):
        x = eq(x, m.get('eq', []))
        if m.get('glue'):
            c = m['glue']
            det = np.abs(x).max(axis=1).astype(np.float64)
            g = compressor_gain(det, SR, c['thresh'], c['ratio'], c.get('attack', 0.03), c.get('release', 0.25), c.get('knee', 6.0))
            x = x * g[:, None] * db(c.get('makeup', 0.0))
        # pre-gain toward target loudness, then clip lightly and limit
        cur = lufs(x)
        x = x * db(m['lufs'] - cur + m.get('limit_push', 1.5))
        if m.get('sat'):
            d = m['sat']; x = np.tanh(x * (1 + d)) / np.tanh(1 + d) * (1 + d * 0.15)
        ceiling = db(m.get('ceiling', -1.2))
        pk = np.abs(x).max(axis=1).astype(np.float64)
        g = limiter_gain(pk, SR, ceiling, 0.004, 0.12)
        x = x * g[:, None]
        x = np.clip(x, -ceiling, ceiling)
        cur = lufs(x)
        x = x * db(m['lufs'] - cur)
        x = np.clip(x, -ceiling, ceiling)
        return x.astype(np.float32)
