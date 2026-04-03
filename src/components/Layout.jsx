import Sidebar from './Sidebar';
import BetaBanner from './BetaBanner';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="ml-64 min-h-screen pt-9">
        <BetaBanner />
        {children}
      </main>
    </div>
  );
};

export default Layout;
