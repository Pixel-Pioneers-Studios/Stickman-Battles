#!/usr/bin/env python3
"""Read/replace a chapter's `narrative:` array in a story arc file, by chapter id.

Story arc files are hand-authored JS with mixed quoting, so string-matching whole
arrays is fragile at this scale. This locates the array by walking brackets from
the chapter's `id:` and rewrites only its contents, preserving indentation.

  narr.py dump <file> [id]        -> print narrative lines, one per output line
  narr.py set  <file> <id> <txt>  -> replace with the lines in <txt> (one per line,
                                     a blank line stays a beat break)
"""
import re, sys

def find_block(src, cid):
    m = re.search(r'^\s*id:\s*%d\s*,' % cid, src, re.M)
    if not m: raise SystemExit(f'no chapter id {cid}')
    # Bound the search to THIS chapter object: many chapters have no narrative
    # array at all (phase stubs, fight-only entries), and an unbounded forward
    # search silently returns the NEXT chapter's array — which would dump the
    # wrong text and, on `set`, overwrite the wrong chapter.
    nxt = re.search(r'^\s*id:\s*\d+\s*,', src[m.end():], re.M)
    end = m.end() + (nxt.start() if nxt else len(src) - m.end())
    k = src.find('narrative:', m.start(), end)
    if k < 0: raise SystemExit(f'chapter {cid} has no narrative array')
    o = src.index('[', k)
    d, i = 0, o
    while True:
        if src[i] == '[': d += 1
        elif src[i] == ']':
            d -= 1
            if d == 0: break
        i += 1
    return o + 1, i          # inner span of the array

def parse(inner):
    out = []
    for lm in re.finditer(r"""(['"])((?:\\.|(?!\1).)*)\1""", inner):
        q, body = lm.group(1), lm.group(2)
        out.append(body.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\'))
    return out

def emit(lines, indent):
    o = []
    for l in lines:
        b = l.replace('\\', '\\\\').replace("'", "\\'")
        o.append(f"{indent}'{b}',")
    return '\n' + '\n'.join(o) + '\n' + indent[:-2]

def ids_in(src):
    return [int(x) for x in re.findall(r'^\s*id:\s*(\d+)\s*,', src, re.M)]

f = sys.argv[2]
src = open(f).read()
if sys.argv[1] == 'dump':
    targets = [int(sys.argv[3])] if len(sys.argv) > 3 else ids_in(src)
    for cid in targets:
        try: a, b = find_block(src, cid)
        except SystemExit: continue
        print(f'@@@ {cid}')
        for l in parse(src[a:b]): print(l)
elif sys.argv[1] == 'set':
    cid = int(sys.argv[3])
    new = open(sys.argv[4]).read().split('\n')
    while new and new[-1] == '': new.pop()
    a, b = find_block(src, cid)
    indent = re.search(r'\n(\s*)\S', src[a:b]).group(1)
    open(f, 'w').write(src[:a] + emit(new, indent) + src[b:])
    print(f'{cid}: set {len(new)} lines')
