import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu, X, ChevronDown } from 'lucide-react';
import { docsNavigation } from '@/config/docsNavigation';
import pennyseoLogo from '@/assets/pennyseo-logo.png';

function NavItem({ item, pathname }) {
  const [open, setOpen] = useState(true);

  // Single page (no sub-pages)
  if (item.path) {
    const isActive = pathname === item.path;
    return (
      <Link
        to={item.path}
        className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {item.title}
      </Link>
    );
  }

  // Section with sub-pages
  const hasActivePage = item.pages?.some((p) => pathname === p.path);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          hasActivePage
            ? 'text-indigo-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        {item.title}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200 pl-3">
          {item.pages.map((page) => {
            const isActive = pathname === page.path;
            return (
              <Link
                key={page.path}
                to={page.path}
                className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {page.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableOfContents() {
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');
  const location = useLocation();

  useEffect(() => {
    // Small delay to let the page render
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('h2[id]');
      const items = Array.from(elements).map((el) => ({
        id: el.id,
        text: el.textContent,
      }));
      setHeadings(items);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        On this page
      </p>
      {headings.map(({ id, text }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`block text-sm py-1 transition-colors ${
            activeId === id
              ? 'text-indigo-600 font-medium'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          {text}
        </a>
      ))}
    </nav>
  );
}

export default function DocsLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-center border-b border-slate-100 h-20 overflow-hidden px-4">
        <Link to="/dashboard">
          <img
            src={pennyseoLogo}
            alt="PennySEO"
            style={{ width: '200px', maxWidth: 'none' }}
            className="object-cover"
          />
        </Link>
      </div>

      {/* Back to app */}
      <div className="px-4 py-3 border-b border-slate-100">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to app
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {docsNavigation.map((item) => (
          <NavItem key={item.title} item={item} pathname={location.pathname} />
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu size={20} className="text-slate-600" />
        </button>
        <Link to="/dashboard">
          <img
            src={pennyseoLogo}
            alt="PennySEO"
            style={{ width: '160px', maxWidth: 'none' }}
            className="object-cover"
          />
        </Link>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col shadow-xl">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-30">
        {sidebarContent}
      </aside>

      {/* Main content + right TOC */}
      <div className="lg:ml-64 min-h-screen">
        <div className="flex">
          <div className="flex-1 min-w-0 max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl px-8 sm:px-12 py-12">
            <Outlet />
          </div>
          {/* Right sidebar — table of contents */}
          <aside className="hidden xl:block flex-shrink-0 w-48 pt-12 pr-4">
            <div className="sticky top-12">
              <TableOfContents />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
