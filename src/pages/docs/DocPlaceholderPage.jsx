import { Link, useLocation } from 'react-router-dom';
import { DocPage } from '@/components/docs/DocComponents';
import { FileText } from 'lucide-react';

export default function DocPlaceholderPage() {
  const location = useLocation();

  // Derive a readable page name from the URL path
  const segments = location.pathname.replace('/docs/', '').split('/');
  const lastSegment = segments[segments.length - 1] || 'Page';
  const pageName = lastSegment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <DocPage title={pageName}>
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
    </DocPage>
  );
}
