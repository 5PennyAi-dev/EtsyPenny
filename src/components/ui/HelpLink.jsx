import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export default function HelpLink({ to, label, tooltip = 'Learn more' }) {
  return (
    <Link
      to={to}
      className="hidden sm:inline-flex items-center gap-1 group/help relative text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      <HelpCircle className="w-3.5 h-3.5" />
      {label && <span className="text-xs">{label}</span>}
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/help:opacity-100 group-hover/help:visible transition-all pointer-events-none z-50">
        {tooltip}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </span>
    </Link>
  );
}
