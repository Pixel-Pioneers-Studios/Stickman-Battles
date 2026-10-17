// minify.js — minify every script under <dir>/js in place (js/vendor is left alone).
//
// Usage:  node tools/package/minify.js <stage dir>
//
// Called by build-school.sh on the staged copy, never on the repo. Scripts share
// state through top-level globals and inline onclick handlers in index.html, so
// top-level names are never renamed; only locals are. Function and class names
// are kept because some code branches on constructor.name.
'use strict';
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const OPTIONS = {
  ecma: 2020,
  module: false,
  toplevel: false,
  keep_classnames: true,
  keep_fnames: true,
  compress: { passes: 1 },
  mangle: true,
  format: { comments: false },
};

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor') out = out.concat(walk(p)); }
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

(async () => {
  const stage = process.argv[2];
  if (!stage) { console.error('usage: minify.js <stage dir>'); process.exit(1); }
  const files = walk(path.join(stage, 'js'));
  let before = 0, after = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    let res;
    try { res = await minify(src, OPTIONS); }
    catch (err) { console.error('minify failed: ' + path.relative(stage, f) + ': ' + err.message); process.exit(1); }
    fs.writeFileSync(f, res.code);
    before += src.length; after += res.code.length;
  }
  console.log('minified ' + files.length + ' scripts: ' + (before / 1e6).toFixed(1) + ' MB -> ' + (after / 1e6).toFixed(1) + ' MB');
})();
