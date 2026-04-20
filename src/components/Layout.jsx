import Sidebar from './Sidebar';
import BetaBanner from './BetaBanner';
import { HelpChatProvider } from '@/context/HelpChatContext';
import HelpChatBubble from './help/HelpChatBubble';
import HelpChatPanel from './help/HelpChatPanel';

const Layout = ({ children }) => {
  return (
    <HelpChatProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="ml-64 min-h-screen pt-9">
          <BetaBanner />
          {children}
        </main>
        <HelpChatBubble />
        <HelpChatPanel />
      </div>
    </HelpChatProvider>
  );
};

export default Layout;
