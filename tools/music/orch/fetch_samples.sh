#!/bin/bash
# Download the CC0 sample sets this renderer uses (~960 MB) into samples/, then index them.
#   VSCO-2-CE and VCSL (Versilian Studios, CC0): the files listed in sample-list.txt
#   University of Iowa MIS horn (free for any use): chromatic ff notes + the mf/pp chromatic runs
set -e
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || { python3 -m venv .venv && .venv/bin/pip install -q numpy scipy soundfile matplotlib numba; }
.venv/bin/python - <<'PY'
import os, subprocess, urllib.parse, concurrent.futures as cf
jobs = []
for line in open('sample-list.txt'):
    repo, p = line.rstrip('\n').split('\t')
    base = {'vsco': 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/', 'vcsl': 'https://raw.githubusercontent.com/sgossner/VCSL/master/'}[repo]
    jobs.append((base + urllib.parse.quote(p), f'samples/{repo}/{p}'))
ia = 'https://theremin.music.uiowa.edu/'
names = ['Bb1', 'B1'] + [n + str(o) for o in (2, 3, 4) for n in ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']] + ['C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5']
for n in names:
    jobs.append((ia + urllib.parse.quote(f'sound files/MIS Pitches - 2014/Brass/Horn/Horn.ff.{n}.stereo.aif'), f'samples/iowa/horn/Horn.ff.{n}.stereo.aif'))
for r in ['pp.Bb1B1', 'pp.C4B4', 'pp.C5F5', 'mf.Bb1B1', 'mf.C2B2', 'mf.C4B4', 'mf.C5F5']:
    jobs.append((ia + urllib.parse.quote(f'sound files/MIS/Brass/frenchhorn/Horn.{r}.aiff'), f'samples/iowa/hornruns/Horn.{r}.aiff'))
def get(j):
    url, out = j
    if os.path.exists(out) and os.path.getsize(out) > 1000: return 0
    os.makedirs(os.path.dirname(out), exist_ok=True)
    return subprocess.run(['curl', '-sfL', '--retry', '3', '-m', '120', '-o', out, url], stdin=subprocess.DEVNULL).returncode
with cf.ThreadPoolExecutor(8) as ex: fails = sum(1 for r in ex.map(get, jobs) if r)
print(f'{len(jobs)} files, {fails} failed')
PY
.venv/bin/python split_runs.py
.venv/bin/python index_samples.py
