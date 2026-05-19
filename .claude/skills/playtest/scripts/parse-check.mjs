#!/usr/bin/env node
// Standalone parse-check for BRAWL ARENA.html. Exits non-zero on parse error.
// Iterates EVERY inline <script> block (i.e. <script>…</script> with no `src`)
// so adding the 3D preview script alongside the main game script doesn't hide
// errors in the second block. Same regex shape lives in the PostToolUse hook.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '..', '..', '..', '..', 'BRAWL ARENA.html');

let src;
try { src = readFileSync(target, 'utf8'); }
catch (e) {
  console.error(`could not read ${target}: ${e.message}`);
  process.exit(2);
}

// Match `<script>` tags WITHOUT a src= attribute, capturing their body.
const blocks = [...src.matchAll(/<script(\b[^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m => !/\bsrc\s*=/.test(m[1]))
  .map((m, i) => ({ idx: i, body: m[2] }));

if (blocks.length === 0) {
  console.error('no inline <script> block found in BRAWL ARENA.html');
  process.exit(2);
}

let totalLines = 0, ok = true;
for (const b of blocks) {
  try {
    new vm.Script(b.body, { filename: `script-block-${b.idx}.js` });
    totalLines += b.body.split('\n').length;
  } catch (e) {
    ok = false;
    console.error(`PARSE ERROR in script block #${b.idx}: ${e.message}`);
  }
}

if (ok) {
  console.log(`OK — ${blocks.length} inline script block(s) parse cleanly (${totalLines} total lines)`);
  process.exit(0);
} else {
  process.exit(1);
}
