#!/usr/bin/env node
/**
 * One-off helper: expand lib/i18n/pages/*.ts from JSON blobs in scripts/i18n-data/
 * Run: node scripts/build-i18n-page-dicts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'i18n-data');
const outDir = path.join(__dirname, '..', 'lib', 'i18n', 'pages');

const PAGES = [
  ['products', 'PRODUCTS', 'tprod'],
  ['gallery', 'GALLERY', 'tgal'],
  ['weather', 'WEATHER', 'twth'],
  ['suppliers', 'SUPPLIERS', 'tsup'],
  ['pricing', 'PRICING', 'tprc'],
  ['portal', 'PORTAL', 'tpor'],
  ['tour-design', 'TOUR_DESIGN', 'ttd'],
];

for (const [file, constName, fnName] of PAGES) {
  const jsonPath = path.join(dataDir, `${file}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`skip ${file}: no ${jsonPath}`);
    continue;
  }
  const { en, vi } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const keys = Object.keys(en);
  const fmt = (obj) =>
    keys.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(obj[k] ?? en[k])},`).join('\n');
  const ts = `import type { AppLanguage } from '../stages';

export const ${constName} = {
  en: {
${fmt(en)}
  },
  vi: {
${fmt(vi)}
  },
} as const;

export type ${constName}Key = keyof typeof ${constName}.en;

export function ${fnName}(key: ${constName}Key, language: AppLanguage): string {
  return ${constName}[language][key] ?? ${constName}.en[key];
}
`;
  fs.writeFileSync(path.join(outDir, `${file}.ts`), ts);
  console.log(`wrote ${file}.ts (${keys.length} keys)`);
}
