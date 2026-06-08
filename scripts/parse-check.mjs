#!/usr/bin/env node
// Syntax-checks the <script> block(s) in index.html without executing them.
// Used by the GitHub Action and handy to run locally:  node scripts/parse-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
const html = readFileSync(file, 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

if (blocks.length === 0) {
  console.error('FAIL: no <script> block found in index.html');
  process.exit(1);
}

let lines = 0;
blocks.forEach((m, i) => {
  const code = m[1];
  lines += code.split('\n').length;
  try {
    new vm.Script(code, { filename: `index.html<script[${i}]>` });
  } catch (e) {
    console.error(`FAIL: parse error in script block ${i}: ${e.message}`);
    process.exit(1);
  }
});

console.log(`OK — ${blocks.length} script block(s) parse, ${lines} lines`);
