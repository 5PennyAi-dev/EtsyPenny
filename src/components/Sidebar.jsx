import { useState } from 'react';
import { LayoutDashboard, LayoutList, Shirt, LineChart, FlaskConical, ShoppingBag, Settings, User, LogOut, ShieldAlert, CreditCard, Coins, MessageSquareText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBulkProgress } from '../context/BulkProgressContext';
import FeedbackModal from './feedback/FeedbackModal';
import pennyseoLogo from '../assets/pennyseo-logo.png';

const Sidebar = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { bulkProgress } = useBulkProgress();
  const [showFeedback, setShowFeedback] = useState(false);
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'SEO Listings', icon: LayoutList, path: '/listings' },
    { name: 'SEO Studio', icon: Shirt, path: '/studio' },
    { name: 'SEO History', icon: LineChart, path: '/history' },
    { name: 'SEO Lab', icon: FlaskConical, path: '/lab' },
    { name: 'My Shop', icon: ShoppingBag, path: '/shop' },
    { name: 'Billing', icon: CreditCard, path: '/billing' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const handleLogout = async () => {
    try {
        await signOut();
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  return (
    <div className="h-screen w-64 bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center justify-center p-0 border-b border-slate-100 h-24 overflow-hidden">
        <img 
          src={pennyseoLogo} 
          alt="PennySEO" 
          style={{ width: '240px', maxWidth: 'none', marginLeft: '-10px' }} 
          className="object-cover"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              {item.name}
              {item.name === 'My Shop' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin Section (Bottom) */}
      <div className="p-4 border-t border-slate-100 space-y-1">
        <Link
          to="/admin/system"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/admin/system'
              ? 'bg-rose-50 text-rose-600'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <ShieldAlert size={20} className={location.pathname === '/admin/system' ? 'text-rose-600' : 'text-slate-400'} />
          Admin
        </Link>
      </div>

      {/* Token Badge */}
      <div className="px-4 pb-1">
        <Link to="/billing" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-700">
            {(profile?.tokens_monthly_balance ?? 0) + (profile?.tokens_bonus_balance ?? 0)} tokens
          </span>
          {((profile?.tokens_monthly_balance ?? 0) + (profile?.tokens_bonus_balance ?? 0)) < 10 && (
            <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-semibold">Low</span>
          )}
        </Link>
      </div>

      {/* Bulk Progress Indicator */}
      {bulkProgress.running && (
        <div style={{
          margin: '4px 16px 4px',
          padding: '10px 12px',
          background: '#f0fdf4',
          borderRadius: 8,
          border: '1px solid #bbf7d0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#065f46' }}>
              {bulkProgress.action}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
            {bulkProgress.current} of {bulkProgress.total} processed
            {bulkProgress.errors > 0 && (
              <span style={{ color: '#dc2626', marginLeft: 6 }}>
                ({bulkProgress.errors} failed)
              </span>
            )}
          </div>
          <div style={{ height: 3, background: '#dcfce7', borderRadius: 999 }}>
            <div style={{
              height: 3,
              background: '#22c55e',
              borderRadius: 999,
              width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="px-4 pb-1">
        <button
          onClick={() => setShowFeedback(true)}
          className="flex items-center gap-2 px-4 py-2 w-full rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-sm"
        >
          <MessageSquareText size={16} />
          <span>Give feedback</span>
        </button>
      </div>

      {/* Legal */}
      <div className="px-4 pb-1">
        <div className="flex items-center gap-3 px-4 text-xs text-slate-400">
          <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
          <span>·</span>
          <a href="https://www.iubenda.com/privacy-policy/39387054" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 transition-colors">Privacy</a>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors overflow-hidden">
            {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                <User size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
};

export default Sidebar;
