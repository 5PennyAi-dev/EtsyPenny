import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import matter from 'gray-matter';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const base = 'src/content/docs';
const files = walk(base);
const slugs = new Set();
let errors = 0;

for (const f of files) {
  const rel = relative(base, f).split(sep).join('/').replace(/\.md$/, '');
  const raw = readFileSync(f, 'utf8');
  const { data, content } = matter(raw);
  const issues = [];
  if (!data.slug) issues.push('missing slug');
  if (!data.title) issues.push('missing title');
  if (!data.category) issues.push('missing category');
  if (typeof data.order !== 'number') issues.push('missing order');
  if (data.slug && data.slug !== rel) issues.push(`slug "${data.slug}" does not match filename "${rel}"`);
  if (slugs.has(data.slug)) issues.push('duplicate slug');
  slugs.add(data.slug);
  if (!content.trim()) issues.push('empty body');
  if (issues.length) {
    console.log('FAIL', f, '—', issues.join(', '));
    errors++;
  } else {
    console.log('OK  ', data.slug, '—', data.title);
  }
}

console.log('');
console.log(errors ? `${errors} failures` : `all ${files.length} articles valid`);
process.exit(errors ? 1 : 0);
