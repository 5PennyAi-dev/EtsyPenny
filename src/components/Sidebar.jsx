import { LayoutDashboard, LayoutGrid, LineChart, FlaskConical, ShoppingBag, Settings, User, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import pennyseoLogo from '../assets/pennyseo-logo.png';

const Sidebar = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Product Studio', icon: LayoutGrid, path: '/studio' },
    { name: 'SEO History', icon: LineChart, path: '/history' },
    { name: 'SEO Lab', icon: FlaskConical, path: '/lab' },
    { name: 'My Shop', icon: ShoppingBag, path: '/shop' },
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
      <div className="p-6 border-b border-slate-100">
        <img src={pennyseoLogo} alt="PennySEO" className="w-full h-auto" />
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
    </div>
  );
};

export default Sidebar;
