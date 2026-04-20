import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const files = walk('src/content/docs');
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkDirective);

let errors = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const { content } = matter(raw);
  try {
    const tree = processor.parse(content);
    processor.runSync(tree);
    const directiveNames = new Set();
    const visit = (node) => {
      if (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') {
        directiveNames.add(`${node.type}:${node.name}`);
      }
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
    console.log('OK  ', f, '— directives:', [...directiveNames].join(', ') || '(none)');
  } catch (err) {
    console.log('FAIL', f, '—', err.message);
    errors++;
  }
}
console.log('');
console.log(errors ? `${errors} failures` : `${files.length} files parsed cleanly`);
process.exit(errors ? 1 : 0);
