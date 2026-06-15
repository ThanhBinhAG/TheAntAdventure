import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const marker = 'const TAA_TOURS = ';
const idx = html.indexOf(marker);
if (idx < 0) throw new Error('TAA_TOURS not found');

let i = idx + marker.length;
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
    } else if (c === '[') depth++;
    else if (c === ']') depth--;
  }
  i++;
}

const arr = html.slice(idx + marker.length, i).trim();
const out = `/* Auto-extracted from index.html — do not edit manually */

export const TAA_TOURS = ${arr};

export type TaaTour = (typeof TAA_TOURS)[number];
`;

fs.writeFileSync('lib/seeds/taa-tours.ts', out);
console.log('lib/seeds/taa-tours.ts written');
