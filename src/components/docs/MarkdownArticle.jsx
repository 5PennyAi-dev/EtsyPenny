import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import matter from 'gray-matter';
import * as LucideIcons from 'lucide-react';
import { FileText, Lightbulb, AlertTriangle } from 'lucide-react';

const rawModules = import.meta.glob('/src/content/docs/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function pathToSlug(path) {
  return path
    .replace(/^\/src\/content\/docs\//, '')
    .replace(/\.md$/, '');
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const articles = Object.entries(rawModules)
  .map(([path, raw]) => {
    const parsed = matter(raw);
    const frontmatterSlug = parsed.data.slug || pathToSlug(path);
    return {
      slug: frontmatterSlug,
      path,
      frontmatter: parsed.data,
      body: parsed.content,
    };
  })
  .sort((a, b) => {
    const ca = a.frontmatter.category || '';
    const cb = b.frontmatter.category || '';
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.frontmatter.order ?? 0) - (b.frontmatter.order ?? 0);
  });

export function getAllArticles() {
  return articles;
}

export function getArticleBySlug(slug) {
  return articles.find((a) => a.slug === slug) || null;
}

export function getArticlesByCategory() {
  const map = new Map();
  for (const article of articles) {
    const cat = article.frontmatter.category || 'General';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(article);
  }
  return map;
}

/**
 * Remark plugin: turn textDirective/leafDirective/containerDirective nodes
 * into HAST-style nodes with data.hName/hProperties so ReactMarkdown routes
 * them through our components override.
 */
function remarkDirectiveHandler() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === 'textDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'containerDirective'
      ) {
        const data = node.data || (node.data = {});
        data.hName = `directive-${node.name}`;
        data.hProperties = {
          ...(node.attributes || {}),
          'data-directive': node.name,
          'data-directive-type': node.type,
        };
      }
    });
  };
}

/** Inline :IconName: marker support (used by smart-badge lists). */
function remarkInlineIcons() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!node.value || typeof node.value !== 'string') return;
      const regex = /:([A-Z][A-Za-z0-9]+):/g;
      if (!regex.test(node.value)) return;
      regex.lastIndex = 0;
      const out = [];
      let lastIndex = 0;
      let m;
      while ((m = regex.exec(node.value)) !== null) {
        if (m.index > lastIndex) {
          out.push({ type: 'text', value: node.value.slice(lastIndex, m.index) });
        }
        out.push({
          type: 'html',
          value: '',
          data: {
            hName: 'directive-icon',
            hProperties: { name: m[1] },
          },
        });
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < node.value.length) {
        out.push({ type: 'text', value: node.value.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...out);
      return index + out.length;
    });
  };
}

function InternalOrExternalLink({ href, children, ...props }) {
  if (href && href.startsWith('/')) {
    return (
      <Link
        to={href}
        className="text-indigo-600 hover:text-indigo-800 font-medium"
        {...props}
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-800 font-medium"
      {...props}
    >
      {children}
    </a>
  );
}

function extractText(children) {
  if (children == null) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (typeof children === 'object' && children.props) return extractText(children.props.children);
  return '';
}

function Heading2({ children, ...props }) {
  const text = extractText(children);
  const id = slugify(text);
  return (
    <h2
      id={id}
      className="text-2xl font-semibold text-slate-900 mb-1 pt-2 scroll-mt-8"
      {...props}
    >
      {children}
    </h2>
  );
}

function Section({ label, title, children }) {
  const titleText = title || '';
  const id = slugify(titleText);
  return (
    <section className="scroll-mt-8">
      <h2 id={id} className="text-2xl font-semibold text-slate-900 mb-1 pt-2">
        {label && (
          <span className="text-sm font-bold uppercase tracking-wide text-indigo-600 block mb-1">
            {label}
          </span>
        )}
        {titleText}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Callout({ variant, icon: Icon, children }) {
  const styles = {
    tip: 'bg-amber-50 border-amber-200',
    warning: 'bg-rose-50 border-rose-200',
  };
  const iconColor = {
    tip: 'text-amber-600',
    warning: 'text-rose-600',
  };
  return (
    <div className={`flex gap-3 p-4 border rounded-lg ${styles[variant]}`}>
      <Icon size={20} className={`${iconColor[variant]} flex-shrink-0 mt-0.5`} />
      <div className="text-slate-700 text-base [&>p]:mb-0 [&>p+p]:mt-2">{children}</div>
    </div>
  );
}

function HowToImprove({ children }) {
  return (
    <div className="border-l-4 border-indigo-300 pl-4 py-1 bg-indigo-50/50 rounded-r-lg">
      <div className="text-base text-slate-700 [&>p]:inline [&>p]:mb-0">
        <span className="font-semibold text-indigo-700">How to improve: </span>
        {children}
      </div>
    </div>
  );
}

function flattenChildren(children) {
  const arr = Array.isArray(children) ? children : [children];
  const out = [];
  for (const c of arr) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' && c.trim() === '') continue;
    out.push(c);
  }
  return out;
}

function findListItems(children) {
  const flat = flattenChildren(children);
  for (const c of flat) {
    if (c && typeof c === 'object' && c.type === 'ul') {
      const lis = flattenChildren(c.props.children);
      return lis.filter((li) => li && typeof li === 'object' && li.type === 'li');
    }
  }
  return [];
}

function DefListDirective({ icon, children }) {
  const IconComp = icon ? LucideIcons[icon] : null;
  const items = findListItems(children);

  if (items.length === 0) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-3">
      {items.map((li, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200"
        >
          {IconComp && (
            <IconComp size={18} className="text-indigo-500 flex-shrink-0 mt-1" />
          )}
          <div className="min-w-0 text-base text-slate-700 [&>p]:mb-0">
            {li.props.children}
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQDirective({ children }) {
  const arr = Array.isArray(children) ? children : [children];
  const items = [];
  let current = null;

  for (const child of arr) {
    if (!child) continue;
    if (child.type === 'h3') {
      if (current) items.push(current);
      current = { question: extractText(child.props.children), answer: [] };
    } else if (current) {
      current.answer.push(child);
    }
  }
  if (current) items.push(current);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="p-6 bg-white rounded-lg border border-slate-200">
          <p className="text-lg font-semibold text-slate-900 mb-2">{item.question}</p>
          <div className="text-base text-slate-600 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
            {item.answer}
          </div>
        </div>
      ))}
    </div>
  );
}

function IconInline({ name }) {
  const Icon = name && LucideIcons[name];
  if (!Icon) return null;
  const colorMap = {
    Flame: 'text-orange-500',
    Leaf: 'text-emerald-500',
    Star: 'text-amber-500',
  };
  return (
    <Icon
      size={18}
      className={`inline-block align-text-bottom mr-1 ${colorMap[name] || 'text-indigo-500'}`}
    />
  );
}

function ArticleImage({ src, alt }) {
  const parts = typeof alt === 'string' ? alt.split(' — ') : [];
  const altText = parts[0] || alt || '';
  const caption = parts.length > 1 ? parts.slice(1).join(' — ') : null;
  return (
    <figure className="my-6">
      <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <img src={src} alt={altText} className="w-full h-auto" />
      </div>
      {caption && (
        <figcaption className="text-sm text-slate-500 mt-2 text-center">{caption}</figcaption>
      )}
    </figure>
  );
}

const components = {
  h1: ({ children, ...props }) => (
    <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: Heading2,
  h3: ({ children, ...props }) => (
    <h3 className="text-lg font-semibold text-slate-900 mb-2" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="text-lg text-slate-700 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc pl-6 space-y-2 text-slate-700" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal pl-6 space-y-2 text-slate-700" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => <li {...props}>{children}</li>,
  a: ({ href, children, ...props }) => (
    <InternalOrExternalLink href={href} {...props}>
      {children}
    </InternalOrExternalLink>
  ),
  code: ({ inline, children, ...props }) => {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-[0.9em] font-medium" {...props}>
          {children}
        </code>
      );
    }
    return (
      <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 overflow-x-auto mb-4">
        <code {...props}>{children}</code>
      </pre>
    );
  },
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-600 mb-4" {...props}>
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead {...props}>{children}</thead>
  ),
  tr: ({ children, ...props }) => (
    <tr className="border-b border-slate-100" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th className="py-3 pr-6 text-sm font-semibold text-slate-900 border-b-2 border-slate-200" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="py-3 pr-6 text-base text-slate-700" {...props}>
      {children}
    </td>
  ),
  img: ArticleImage,
  hr: (props) => <hr className="my-8 border-slate-200" {...props} />,

  'directive-tip': ({ children }) => (
    <Callout variant="tip" icon={Lightbulb}>{children}</Callout>
  ),
  'directive-warning': ({ children }) => (
    <Callout variant="warning" icon={AlertTriangle}>{children}</Callout>
  ),
  'directive-howto': ({ children }) => <HowToImprove>{children}</HowToImprove>,
  'directive-section': ({ label, title, children }) => (
    <Section label={label} title={title}>
      {children}
    </Section>
  ),
  'directive-deflist': ({ icon, children }) => (
    <DefListDirective icon={icon}>{children}</DefListDirective>
  ),
  'directive-faq': ({ children }) => <FAQDirective>{children}</FAQDirective>,
  'directive-icon': ({ name }) => <IconInline name={name} />,
};

export default function MarkdownArticle({ slug: slugProp }) {
  const location = useLocation();
  const slug = useMemo(() => {
    if (slugProp) return slugProp;
    return location.pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
  }, [slugProp, location.pathname]);

  const article = slug ? getArticleBySlug(slug) : null;

  if (!article) {
    const segments = slug ? slug.split('/') : [];
    const last = segments[segments.length - 1] || 'Page';
    const pageName = last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">{pageName}</h1>
        <div className="mb-8" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
            <FileText size={28} className="text-slate-400" />
          </div>
          <p className="text-xl text-slate-500 mb-2">This page is coming soon.</p>
          <p className="text-base text-slate-400 mb-6">
            We're working on documenting this feature.
          </p>
          <Link
            to="/docs/getting-started"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            ← Back to Getting Started
          </Link>
        </div>
      </div>
    );
  }

  const { title, subtitle } = article.frontmatter;

  return (
    <div>
      <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">{title}</h1>
      {subtitle ? (
        <p className="text-xl text-slate-500 mb-8">{subtitle}</p>
      ) : (
        <div className="mb-8" />
      )}
      <div className="text-lg text-slate-700 leading-relaxed space-y-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkDirective, remarkDirectiveHandler, remarkInlineIcons]}
          components={components}
        >
          {article.body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
