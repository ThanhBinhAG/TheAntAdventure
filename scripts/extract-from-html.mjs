/**
 * Extract CSS and seed data from index.html for Next.js migration.
 * Run: node scripts/extract-from-html.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractStyleBlocks() {
  const headEnd = html.indexOf('</head>');
  const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 50000);
  const blocks = [];
  const re = /<style>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(head)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks.join('\n\n');
}

function extractConstValue(name) {
  const marker = `const ${name} = `;
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error(`Missing: ${name}`);
  let i = idx + marker.length;
  while (i < html.length && /\s/.test(html[i])) i++;

  const ch = html[i];
  if (ch === '[' || ch === '{') {
    const open = ch;
    const close = ch === '[' ? ']' : '}';
    let depth = 1;
    i++;
    let inStr = false;
    let strCh = '';
    while (i < html.length && depth > 0) {
      const c = html[i];
      if (inStr) {
        if (c === '\\') {
          i += 2;
          continue;
        }
        if (c === strCh) inStr = false;
      } else {
        if (c === '"' || c === "'" || c === '`') {
          inStr = true;
          strCh = c;
        } else if (c === open) depth++;
        else if (c === close) depth--;
      }
      i++;
    }
    return html.slice(idx + marker.length, i).trim();
  }

  // Expression ending with semicolon (e.g. AA_HOTELS.map(...))
  let depth = 0;
  let inStr = false;
  let strCh = '';
  while (i < html.length) {
    const c = html[i];
    if (inStr) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === strCh) inStr = false;
    } else {
      if (c === '"' || c === "'" || c === '`') {
        inStr = true;
        strCh = c;
      } else if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === ';' && depth === 0) break;
    }
    i++;
  }
  return html.slice(idx + marker.length, i).trim();
}

const seedMap = {
  'products.ts': [{ export: 'AA_PRODUCTS', const: 'AA_PRODUCTS' }],
  'hotels.ts': [
    { export: 'AA_HOTELS', const: 'AA_HOTELS' },
    {
      export: 'SEED_HOTELS',
      const: 'SEED_HOTELS',
      optional: true,
    },
  ],
  'customers.ts': [{ export: 'SEED_CUSTOMERS', const: 'SEED_CUSTOMERS' }],
  'comms.ts': [{ export: 'SEED_COMMS', const: 'SEED_COMMS' }],
  'leads.ts': [{ export: 'SEED_LEADS', const: 'SEED_LEADS' }],
  'agents.ts': [{ export: 'SEED_AGENTS', const: 'SEED_AGENTS' }],
  'bookings.ts': [{ export: 'SEED_BOOKINGS', const: 'SEED_BOOKINGS' }],
  'guides.ts': [{ export: 'SEED_GUIDES', const: 'SEED_GUIDES' }],
  'finance.ts': [
    { export: 'SEED_FINANCE', const: 'SEED_FINANCE' },
    { export: 'SEED_AR', const: 'SEED_AR' },
    { export: 'SEED_AP', const: 'SEED_AP' },
  ],
  'suppliers.ts': [
    { export: 'SEED_CRUISES', const: 'SEED_CRUISES' },
    { export: 'SEED_TRANSPORT', const: 'SEED_TRANSPORT' },
    { export: 'SEED_RESTAURANTS', const: 'SEED_RESTAURANTS' },
    { export: 'SEED_SPECIAL_SUPPLIERS', const: 'SEED_SPECIAL_SUPPLIERS' },
  ],
  'tax.ts': [{ export: 'SEED_TAX', const: 'SEED_TAX' }],
  'staff.ts': [{ export: 'SEED_STAFF', const: 'SEED_STAFF' }],
  'photos.ts': [{ export: 'SEED_PHOTOS', const: 'SEED_PHOTOS' }],
  'tasks.ts': [{ export: 'SEED_TASKS', const: 'SEED_TASKS' }],
  'calEvents.ts': [{ export: 'SEED_CAL_EVENTS', const: 'SEED_CAL_EVENTS' }],
  'devNotes.ts': [{ export: 'SEED_DEV_NOTES', const: 'SEED_DEV_NOTES' }],
  'messages.ts': [{ export: 'SEED_MESSAGES', const: 'SEED_MESSAGES' }],
  'feedback.ts': [{ export: 'SEED_FEEDBACK', const: 'SEED_FEEDBACK' }],
  'contracts.ts': [{ export: 'SEED_CONTRACTS', const: 'SEED_CONTRACTS' }],
};

const seedsDir = path.join(root, 'lib', 'seeds');
fs.mkdirSync(seedsDir, { recursive: true });

const cssDir = path.join(root, 'app');
fs.mkdirSync(cssDir, { recursive: true });

let css = extractStyleBlocks();
css = css.replace(/#app\{/g, '.crm-app,#app{');

const nextOverrides = `
/* ── Next.js overrides (do not remove) ── */
:root{--td:#1a2e23}
html,body{width:100%;max-width:none;margin:0;padding:0}
.crm-app,#app{display:flex;min-height:100vh;height:100vh;width:100%;max-width:none}
a.sbi,a.qnav-btn{text-decoration:none;color:inherit}
.fg input,.fg select,.fg textarea,.modal input,.modal select,.modal textarea{width:100%}
input,select,textarea{width:auto}
.search-row input{max-width:240px;width:auto}
.dash-filter-bar{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.dash-filter-bar select{padding:6px 10px;border:1px solid var(--b);border-radius:7px;font-family:inherit;font-size:12px;width:auto;flex:0 1 auto}
.dash-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.dash-kpi-card{background:#fff;border:1px solid var(--b);border-radius:10px;min-width:0}
.dash-kpi-hd{padding:10px 16px;border-bottom:1px solid var(--b)}
.dash-kpi-body{padding:14px 16px}
.dash-kpi-val{font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-weight:700;white-space:nowrap;line-height:1.15}
.dash-grid{display:grid;grid-template-columns:2fr 1fr;gap:14px}
.dash-grid-left,.dash-grid-right{display:flex;flex-direction:column;gap:14px;min-width:0}
.chart-wrap{position:relative;height:200px;width:100%}
@media(max-width:800px){
  .dash-kpi-grid{grid-template-columns:1fr 1fr!important}
  .dash-grid{grid-template-columns:1fr!important}
  .dash-grid-left,.dash-grid-right{display:flex!important;flex-direction:column!important;width:100%!important}
}
@media(max-width:480px){
  .dash-kpi-grid{grid-template-columns:1fr!important}
}
`;

css += nextOverrides;

fs.writeFileSync(path.join(cssDir, 'globals.css'), css, 'utf8');
console.log('Wrote app/globals.css');

for (const [file, entries] of Object.entries(seedMap)) {
  const lines = ['/* Auto-extracted from index.html — do not edit manually */', ''];
  for (const entry of entries) {
    try {
      const value = extractConstValue(entry.const);
      lines.push(`export const ${entry.export} = ${value};`);
      lines.push('');
    } catch (e) {
      if (entry.optional) continue;
      throw e;
    }
  }
  fs.writeFileSync(path.join(seedsDir, file), lines.join('\n'), 'utf8');
  console.log('Wrote lib/seeds/' + file);
}

const indexExports = Object.keys(seedMap)
  .map((f) => f.replace('.ts', ''))
  .map((name) => `export * from './${name}';`)
  .join('\n');
fs.writeFileSync(path.join(seedsDir, 'index.ts'), indexExports + '\n', 'utf8');
console.log('Wrote lib/seeds/index.ts');
console.log('Done.');
