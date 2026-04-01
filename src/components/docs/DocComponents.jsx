import { Lightbulb, AlertTriangle } from 'lucide-react';

export function DocPage({ title, subtitle, children }) {
  return (
    <div>
      <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xl text-slate-500 mb-8">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-8" />}
      <div className="text-lg text-slate-700 leading-relaxed space-y-8">
        {children}
      </div>
    </div>
  );
}

export function Section({ title, label, children }) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <section className="scroll-mt-8">
      <h2
        id={id}
        className="text-2xl font-semibold text-slate-900 mb-1 pt-2"
      >
        {label && (
          <span className="text-sm font-bold uppercase tracking-wide text-indigo-600 block mb-1">
            {label}
          </span>
        )}
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function Step({ number, title, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold mt-0.5">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <div className="text-slate-700 space-y-3">{children}</div>
      </div>
    </div>
  );
}

export function Tip({ children }) {
  return (
    <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <Lightbulb size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-slate-700 text-base">{children}</div>
    </div>
  );
}

export function Warning({ children }) {
  return (
    <div className="flex gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
      <AlertTriangle size={20} className="text-rose-600 flex-shrink-0 mt-0.5" />
      <div className="text-slate-700 text-base">{children}</div>
    </div>
  );
}

export function TokenTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="py-3 pr-6 text-sm font-semibold text-slate-900">Action</th>
            <th className="py-3 text-sm font-semibold text-slate-900">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-3 pr-6 text-base text-slate-700">{row.action}</td>
              <td className="py-3 text-base font-medium text-slate-900">{row.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DefList({ items, icon: Icon }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-4 bg-white rounded-lg border border-slate-200"
        >
          {Icon && (
            <Icon size={18} className="text-indigo-500 flex-shrink-0 mt-1" />
          )}
          {item.icon && !Icon && (
            <item.icon size={18} className={item.iconClass || 'text-indigo-500 flex-shrink-0 mt-1'} />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{item.term}</p>
            <p className="text-base text-slate-600 mt-0.5">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineCode({ children }) {
  return (
    <code className="px-1.5 py-0.5 bg-slate-100 text-indigo-700 rounded text-[0.9em] font-medium">
      {children}
    </code>
  );
}
