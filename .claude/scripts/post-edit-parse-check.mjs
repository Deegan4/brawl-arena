#!/usr/bin/env node
// PostToolUse hook: parse-check EVERY inline <script> block in BRAWL ARENA.html.
// Reads the hook payload (JSON on stdin) per the Claude Code hook spec,
// inspects tool_input.file_path, and if it points at BRAWL ARENA.html,
// extracts each <script>…</script> body (skipping src= imports) and parses
// it with vm.Script. Parsing only — the code is never executed. Exits 2
// with a structured "block" message when any block fails to parse.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let payload = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) payload += chunk;

let parsed;
try { parsed = JSON.parse(payload || '{}'); }
catch { process.exit(0); }   // non-JSON payload: no-op

const filePath = parsed?.tool_input?.file_path
              ?? parsed?.tool_response?.filePath
              ?? '';
if (!filePath.endsWith('BRAWL ARENA.html')) process.exit(0);

let src;
try { src = readFileSync(filePath, 'utf8'); }
catch (e) {
  console.error(`[parse-check] could not read ${filePath}: ${e.message}`);
  process.exit(0);
}

// Find every <script ...>…</script> tag and filter to inline ones (no src=).
const blocks = [...src.matchAll(/<script(\b[^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m => !/\bsrc\s*=/.test(m[1]))
  .map((m, i) => ({ idx: i, body: m[2] }));

if (blocks.length === 0) {
  const out = { decision: 'block', reason: 'No inline <script> block found in BRAWL ARENA.html — file may be malformed.' };
  console.log(JSON.stringify(out));
  process.exit(2);
}

const failures = [];
for (const b of blocks) {
  try {
    new vm.Script(b.body, { filename: `brawl-script-block-${b.idx}.js` });
  } catch (e) {
    failures.push(`script block #${b.idx}: ${e.message}`);
  }
}

if (failures.length) {
  const out = {
    decision: 'block',
    reason: `BRAWL ARENA.html script parse failed — ${failures.join('; ')}`,
  };
  console.log(JSON.stringify(out));
  process.exit(2);
}
process.exit(0);
