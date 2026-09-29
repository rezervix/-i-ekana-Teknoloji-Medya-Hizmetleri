import fs from 'node:fs';
import path from 'node:path';
import {locales} from '../src/i18n/routing';

type Json = Record<string, unknown>;
const root = process.cwd();
const read = (locale: string) => JSON.parse(fs.readFileSync(path.join(root, 'messages', `${locale}.json`), 'utf8')) as Json;
const flatten = (value: Json, prefix = ''): string[] => Object.entries(value).flatMap(([key, child]) => {
  const next = prefix ? `${prefix}.${key}` : key;
  return child && typeof child === 'object' && !Array.isArray(child) ? flatten(child as Json, next) : [next];
});
const source = read('tr');
const sourceKeys = new Set(flatten(source));
let failed = false;
for (const locale of locales) {
  const keys = flatten(read(locale));
  const missing = [...sourceKeys].filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !sourceKeys.has(key));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${locale}: missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'}`);
  }
  console.log(`${locale}: ${keys.length} keys`);
}
if (failed) process.exit(1);
console.log(`i18n check passed: ${locales.length} locales, ${sourceKeys.size} keys`);
