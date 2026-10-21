"""
tools/brain/clone_train.py — fits a brain-format net to the user's replays (behavior cloning). DEV ONLY.

Input: data/brain-clone/data.json from tools/brain/clone-data.js (per replay: observations and the
user's action per decision). Output: a checkpoint js/smb-brain.js loads like any other ({pi, iter}),
an opponent that plays like the user for train.js --hunters.

The net starts from a brain checkpoint (--init, default data/brain/latest.json): the same layers and
GRU memory, so it already reads the game and only has to learn the user's choices. Memory runs
through each whole replay: training pieces of SEQ decisions start from the memory the net would have
at that point (recomputed each epoch from the replay's start), as torch_ppo.py does.

Held-out replays (--val) pick the epoch count; the final net is then refit on every replay.

Usage: tools/brain/.venv/bin/python tools/brain/clone_train.py [--init=data/brain/latest.json]
       [--data=data/brain-clone/data.json] [--out=data/brain-clone/latest.json] [--epochs=60]
       [--val=smb_replay_sovereign_2026-10-17.smbreplay,...]
"""
import base64, json, os, sys
import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, os.path.dirname(__file__))
from torch_ppo import MLP  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
args = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '1') for a in sys.argv[1:] if a.startswith('--'))
INIT = os.path.join(ROOT, args.get('init', 'data/brain/latest.json'))
DATA = os.path.join(ROOT, args.get('data', 'data/brain-clone/data.json'))
OUT = os.path.join(ROOT, args.get('out', 'data/brain-clone/latest.json'))
EPOCHS = int(args.get('epochs', 60))
VAL = args.get('val', 'smb_replay_sovereign_2026-10-17.smbreplay,smb_replay_sovereign_2026-09-23 (1).smbreplay').split(',')
SEQ, LR = 128, 3e-4
torch.manual_seed(1)
torch.set_num_threads(4)

f32 = lambda s: np.frombuffer(base64.b64decode(s), dtype=np.float32).copy()
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a, dtype=np.float32).tobytes()).decode()

data = json.load(open(DATA))
HEADS = data['HEADS']
eps = []
for e in data['episodes']:
    o = f32(e['obs']).reshape(e['n'], data['OBS_DIM'])
    a = np.array(e['acts'], dtype=np.int64).reshape(e['n'], 4)
    eps.append({'name': e['name'], 'obs': torch.from_numpy(o), 'acts': torch.from_numpy(a)})

init = json.load(open(INIT))
pj = init.get('pi', init)
H = pj['gru']['H'] if pj.get('gru') else 0


def fresh():
    net = MLP(pj['sizes'], H)
    parts = []
    for l in range(len(pj['sizes']) - 1):
        parts += [f32(pj['W'][l]), f32(pj['b'][l])]
    if H:
        parts += [f32(pj['gru'][k]) for k in ('Wi', 'Wh', 'bi', 'bh', 'M')]
    net.load_flat(np.concatenate(parts))
    return net


def logits_of(net, ep):
    """Whole replay in one pass: logits [n, A]."""
    h0 = torch.zeros(1, H)
    if H:
        out, _ = net.seq(ep['obs'].unsqueeze(0), h0)
        return out[0]
    return net(ep['obs'])


def head_stats(net, eps_):
    """Mean NLL per decision and per-head accuracy (top choice) over eps_."""
    nll, n, hit = 0.0, 0, np.zeros(4)
    with torch.no_grad():
        for ep in eps_:
            lg, o = logits_of(net, ep), 0
            for h, k in enumerate(HEADS):
                lp = torch.log_softmax(lg[:, o:o + k], 1)
                a = ep['acts'][:, h]
                nll -= lp.gather(1, a[:, None]).sum().item()
                hit[h] += (lp.argmax(1) == a).sum().item()
                o += k
            n += len(ep['acts'])
    return nll / n, hit / n


def pieces(net, eps_):
    """Training pieces (obs, acts, h0) of SEQ decisions, h0 = the net's memory at the piece start."""
    out = []
    with torch.no_grad():
        for ep in eps_:
            T = len(ep['acts'])
            hs = net.seq(ep['obs'].unsqueeze(0), torch.zeros(1, H))[1][0] if H else None
            for s in range(0, T, SEQ):
                h0 = hs[s - 1] if (H and s > 0) else torch.zeros(H)
                out.append((ep['obs'][s:s + SEQ], ep['acts'][s:s + SEQ], h0))
    return out


def fit(net, train, epochs, val=None):
    opt = torch.optim.Adam(net.parameters(), lr=LR)
    best = (1e9, 0)
    for epoch in range(1, epochs + 1):
        net.train()
        ps = pieces(net, train)
        perm = torch.randperm(len(ps)).tolist()
        for i in range(0, len(perm), 8):
            loss, cnt = 0.0, 0
            for j in perm[i:i + 8]:
                x, a, h0 = ps[j]
                lg = net.seq(x.unsqueeze(0), h0.unsqueeze(0))[0][0] if H else net(x)
                o = 0
                for h, k in enumerate(HEADS):
                    loss = loss + F.cross_entropy(lg[:, o:o + k], a[:, h], reduction='sum')
                    o += k
                cnt += len(a)
            opt.zero_grad()
            (loss / cnt).backward()
            torch.nn.utils.clip_grad_norm_(net.parameters(), 1.0)
            opt.step()
        if val is not None and (epoch % 5 == 0 or epoch == 1):
            v, acc = head_stats(net, val)
            tr, _ = head_stats(net, train)
            print(f'epoch {epoch:3d}  train nll {tr:.3f}  val nll {v:.3f}  val acc move/jump/shield/button {" ".join(f"{x:.2f}" for x in acc)}', flush=True)
            if v < best[0]:
                best = (v, epoch)
    return best


train = [e for e in eps if e['name'] not in VAL]
val = [e for e in eps if e['name'] in VAL]
print(f'{len(train)} train replays ({sum(len(e["acts"]) for e in train)} decisions), {len(val)} held out ({sum(len(e["acts"]) for e in val)})')

# Baselines on the held-out replays: always the most common action, and the brain itself.
cnt = [np.bincount(np.concatenate([e['acts'][:, h].numpy() for e in train]), minlength=k) for h, k in enumerate(HEADS)]
maj = [(sum((e['acts'][:, h] == int(c.argmax())).sum().item() for e in val) / sum(len(e['acts']) for e in val)) for h, c in enumerate(cnt)]
prior = [c / c.sum() for c in cnt]
pnll = -sum(sum(np.log(prior[h][e['acts'][:, h].numpy()]).sum() for e in val) for h in range(4)) / sum(len(e['acts']) for e in val)
print(f'baseline frequencies only: val nll {pnll:.3f}  majority acc {" ".join(f"{x:.2f}" for x in maj)}')
b, bacc = head_stats(fresh(), val)
print(f'baseline brain {init.get("iter")}: val nll {b:.3f}  acc {" ".join(f"{x:.2f}" for x in bacc)}')

if val:
    best_v, best_ep = fit(fresh(), train, EPOCHS, val)
    print(f'best held-out nll {best_v:.3f} at epoch {best_ep}')
else:
    best_ep = EPOCHS

net = fresh()
fit(net, eps, best_ep)
pi = {'sizes': pj['sizes'], 'W': [], 'b': []}
for l in net.layers:
    pi['W'].append(b64(l.weight.detach().numpy()))
    pi['b'].append(b64(l.bias.detach().numpy()))
if H:
    g = net.gru
    pi['gru'] = {'H': H, 'Wi': b64(g.weight_ih_l0.detach().numpy()), 'Wh': b64(g.weight_hh_l0.detach().numpy()),
                 'bi': b64(g.bias_ih_l0.detach().numpy()), 'bh': b64(g.bias_hh_l0.detach().numpy()),
                 'M': b64(net.mem.weight.detach().numpy())}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'pi': pi, 'iter': f'clone-of-user-from-{init.get("iter")}', 'clone': {'epochs': best_ep, 'replays': [e['name'] for e in eps]}}, open(OUT, 'w'))
print(f'wrote {os.path.relpath(OUT, ROOT)} ({best_ep} epochs on all {len(eps)} replays)')
