const fs = require('fs');
const path = require('path');
// These are the double-encoded UTF-8 sequences for Turkish characters
const REPLACEMENTS = [
  { hex: 'c384c5b8', to: 'ğ' }, // ğ
  { hex: 'c383c2bc', to: 'ü' }, // ü
  { hex: 'c385c5b8', to: 'ş' }, // ş
  { hex: 'c384c2b1', to: 'ı' }, // ı
  { hex: 'c383c2b6', to: 'ö' }, // ö
  { hex: 'c383c2a7', to: 'ç' }, // ç
  { hex: 'c384c2b0', to: 'İ' }, // İ
  { hex: 'c385c5be', to: 'Ş' }, // Ş
  { hex: 'c384c5be', to: 'Ğ' }, // Ğ
  { hex: 'c383c593', to: 'Ü' }, // Ü
  { hex: 'c383c296', to: 'Ö' }, // Ö
  { hex: 'c383c287', to: 'Ç' }, // Ç
  { hex: 'e29c85',   to: '✅' },
  { hex: 'e282ba',   to: '₺' },
  { hex: 'e28094',   to: '—' },
  { hex: 'e29494',   to: '└' },
  { hex: 'e29480',   to: '─' }
];
function fixFile(p) {
  let buffer = fs.readFileSync(p);
  let modified = false;
  for (const rep of REPLACEMENTS) {
    const fromBuf = Buffer.from(rep.hex, 'hex');
    const toBuf = Buffer.from(rep.to, 'utf8');
    
    let index = buffer.indexOf(fromBuf);
    while (index !== -1) {
      buffer = Buffer.concat([
        buffer.slice(0, index),
        toBuf,
        buffer.slice(index + fromBuf.length)
      ]);
      modified = true;
      index = buffer.indexOf(fromBuf, index + toBuf.length);
    }
  }
  if (modified) {
    fs.writeFileSync(p, buffer);
    console.log(`FIXED: ${p}`);
  }
}
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (f === 'node_modules' || f === '.next' || f === '.git' || f === '.gemini') continue;
    
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (f.match(/\.(ts|tsx|js|mjs)$/)) {
      fixFile(p);
    }
  }
}
console.log('Starting binary-level encoding fix...');
walk('.');
console.log('Encoding fix completed.');
