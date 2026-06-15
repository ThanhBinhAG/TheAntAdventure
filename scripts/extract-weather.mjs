import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const names = ['BEST_BY', 'DESTINATIONS', 'DEFAULT_WEATHER', 'TEMP_RANGES'];

let out = `/* Auto-extracted weather data from index.html */

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const WR = {
  E:{label:'Excellent',icon:'🌞',bg:'#E8F5EE',fg:'#1a5c38',score:4},
  G:{label:'Good',icon:'🌤',bg:'#E3F2FD',fg:'#1565C0',score:3},
  F:{label:'Fair',icon:'⛅',bg:'#FEF3C7',fg:'#D97706',score:2},
  P:{label:'Poor',icon:'🌧',bg:'#FDECEA',fg:'#C0392B',score:1},
};

`;

function extractConst(name) {
  const marker = `const ${name} = `;
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error(`Missing ${name}`);
  let i = idx + marker.length;
  const ch = html[i];
  const open = ch === '[' ? '[' : '{';
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

for (const n of names) {
  out += `export const ${n} = ${extractConst(n)};\n\n`;
}

fs.mkdirSync('lib/seeds', { recursive: true });
fs.writeFileSync('lib/seeds/weather.ts', out);
console.log('lib/seeds/weather.ts written');
