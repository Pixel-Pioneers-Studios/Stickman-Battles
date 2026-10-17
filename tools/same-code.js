// Usage: node tools/same-code.js old.js new.js
// Exits 0 if the two files tokenize identically, i.e. only comments or
// whitespace differ. Use it to check comment-only cleanups.
'use strict';
const fs = require('fs');
const acorn = require('acorn');

function tokens(file) {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const t of acorn.tokenizer(src, { ecmaVersion: 'latest', allowHashBang: true })) {
    out.push(t.type.label + ':' + src.slice(t.start, t.end));
  }
  return out;
}

const [a, b] = process.argv.slice(2).map(tokens);
const n = Math.max(a.length, b.length);
for (let i = 0; i < n; i++) {
  if (a[i] !== b[i]) {
    console.error(`differs at token ${i}: ${a[i]}  vs  ${b[i]}`);
    process.exit(1);
  }
}
console.log(`same code (${a.length} tokens)`);
