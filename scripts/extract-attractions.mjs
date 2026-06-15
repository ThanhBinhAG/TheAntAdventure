import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const marker = 'const ATTRACTION_DATA = ';
const idx = html.indexOf(marker);
if (idx < 0) throw new Error('ATTRACTION_DATA not found');

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
fs.writeFileSync(
  'lib/seeds/attractions.ts',
  `/* Auto-extracted from index.html — do not edit manually */\n\nexport const ATTRACTION_DATA = ${arr};\n\nexport type Attraction = (typeof ATTRACTION_DATA)[number];\n`
);
console.log('lib/seeds/attractions.ts written');
