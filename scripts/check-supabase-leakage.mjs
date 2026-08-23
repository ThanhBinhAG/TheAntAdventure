#!/usr/bin/env node
/**
 * Fail CI if production browser assets leak Supabase hostnames / public env / API paths.
 * Scans `.next/static` (client chunks). Server chunks under `.next/server` are excluded.
 *
 * Usage: node scripts/check-supabase-leakage.mjs
 * Expects `next build` to have run first.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const STATIC_DIR = join(ROOT, '.next', 'static');

const PATTERNS = [
  { name: 'NEXT_PUBLIC_SUPABASE', re: /NEXT_PUBLIC_SUPABASE/ },
  { name: '/auth/v1', re: /\/auth\/v1/ },
  { name: '/rest/v1', re: /\/rest\/v1/ },
  { name: '/storage/v1', re: /\/storage\/v1/ },
];

function collectFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, out);
    else if (/\.(js|css|html|txt|map)$/i.test(name)) out.push(full);
  }
  return out;
}

function hostnameFromEnv() {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  try {
    if (!raw) return null;
    return new URL(raw).hostname || null;
  } catch {
    return null;
  }
}

if (!existsSync(STATIC_DIR)) {
  console.error(
    'check-supabase-leakage: missing .next/static — run `npm run build` first.',
  );
  process.exit(1);
}

const host = hostnameFromEnv();
const patterns = [...PATTERNS];
if (host && host !== 'localhost' && host !== '127.0.0.1') {
  patterns.push({
    name: `hostname:${host}`,
    re: new RegExp(host.replace(/\./g, '\\.'), 'i'),
  });
}

const files = collectFiles(STATIC_DIR);
const hits = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const { name, re } of patterns) {
    if (re.test(text)) {
      hits.push({ file: relative(ROOT, file), pattern: name });
    }
  }
}

if (hits.length) {
  console.error('Supabase leakage detected in browser assets:');
  for (const hit of hits.slice(0, 40)) {
    console.error(`  - ${hit.pattern} in ${hit.file}`);
  }
  if (hits.length > 40) console.error(`  …and ${hits.length - 40} more`);
  process.exit(1);
}

console.log(
  `check-supabase-leakage: ok (${files.length} files under .next/static).`,
);
