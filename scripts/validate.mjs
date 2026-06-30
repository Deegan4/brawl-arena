#!/usr/bin/env node
// Convenience validator: parse-check the <script> block, then remind to render.
//   node scripts/validate.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const out = execFileSync('node', [join(root, 'scripts', 'parse-check.mjs')], { encoding: 'utf8' }).trim();
  console.log(out);
} catch (err) {
  process.stderr.write((err.stdout?.toString() || '') + (err.stderr?.toString() || ''));
  process.exit(1);
}

// Gate on Meshy asset-manifest integrity — catches prompt-drift / orphaned task_ids before any
// spend. Skipped gracefully if the asset pipeline isn't present.
if (existsSync(join(root, 'assets', 'meshy', 'manifest.json'))) {
  try {
    const out = execFileSync('node', [join(root, 'scripts', 'gen-meshy.mjs'), '--lint'], { encoding: 'utf8' }).trim();
    console.log(out);
  } catch (err) {
    process.stderr.write((err.stdout?.toString() || '') + (err.stderr?.toString() || ''));
    process.exit(1);
  }
}
// Name-drift gate — the in-game <title>, the README H1, and the GitHub repo name must agree, so
// the game's name can't silently fork across the three places it lives (as it did before the rename).
try {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1]?.trim();
  const logo  = (html.match(/class="logo">([^<]+?)<small/) || [])[1]?.trim();
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const h1 = (readme.match(/^#\s+(?:🧟\s*)?(.+)$/m) || [])[1]?.trim();
  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = { title, logo, 'README H1': h1 };
  let repo = null;
  try { repo = JSON.parse(execFileSync('gh', ['repo', 'view', '--json', 'name'], { encoding: 'utf8' })).name; } catch { /* offline / no gh — skip repo check */ }
  const display = norm(title);
  const drift = [];
  for (const [k, v] of Object.entries(names)) if (norm(v) !== display) drift.push(`${k}="${v}" ≠ <title>="${title}"`);
  // repo name is a slug (last-pulse); compare slug-normalized
  if (repo && norm(repo) !== display) drift.push(`repo="${repo}" ≠ <title>="${title}" (slug)`);
  if (drift.length) { drift.forEach(d => console.error('✗ name drift:', d)); process.exit(1); }
  console.log(`✓ name consistent: "${title}"` + (repo ? ` (repo ${repo})` : ' (repo check skipped — no gh)'));
} catch (err) {
  console.error('✗ name-drift check failed:', err.message); process.exit(1);
}

console.log('Next: render headless to verify visually (~430x932) with the bundled Chromium at');
console.log('  /opt/pw-browsers/chromium-1194/chrome-linux/chrome — see CLAUDE.md "Validation".');
