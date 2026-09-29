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
const turkishAllowlist = new Set(['Çiçekana', 'Çiçekana Teknoloji ve Medya Hizmetleri', 'Blog']);
const sourceValues = new Map(Object.entries(source).flatMap(([namespace, value]) => Object.entries(value as Json).map(([key, text]) => [`${namespace}.${key}`, text])));
let failed = false;
for (const locale of locales) {
  const keys = flatten(read(locale));
  const missing = [...sourceKeys].filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !sourceKeys.has(key));
  const identical = keys.filter((key) => {
    const value = key.split('.').reduce<unknown>((current, part) => (current as Json)?.[part], read(locale));
    const sourceValue = sourceValues.get(key);
    return locale !== 'tr' && typeof value === 'string' && value === sourceValue && ![...turkishAllowlist].some((brand) => value.includes(brand));
  });
  if (missing.length || extra.length || identical.length) {
    failed = true;
    console.error(`${locale}: missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'} identical=${identical.join(',') || '-'}`);
  }
  console.log(`${locale}: ${keys.length} keys, translated=${keys.length - identical.length}, identical=${identical.length}`);
}
if (failed) process.exit(1);
console.log(`i18n check passed: ${locales.length} locales, ${sourceKeys.size} keys`);
