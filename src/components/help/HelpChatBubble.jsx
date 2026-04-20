import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useHelpChat } from '@/context/HelpChatContext';

const SEEN_KEY = 'pennyseo.helpChat.halo.seen';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function HelpChatBubble() {
  const { isOpen, toggle } = useHelpChat();
  const [showHalo, setShowHalo] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      setShowHalo(true);
      sessionStorage.setItem(SEEN_KEY, '1');
      const t = setTimeout(() => setShowHalo(false), 3000);
      return () => clearTimeout(t);
    } catch {
      // sessionStorage unavailable — just skip the halo
    }
  }, []);

  if (isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40">
      <div className="relative">
        {showHalo && (
          <span
            className="absolute inset-0 rounded-full bg-indigo-500 opacity-75 animate-ping"
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          onClick={() => {
            setShowHalo(false);
            toggle();
          }}
          onMouseEnter={() => setShowHalo(false)}
          aria-label="Open help chat"
          className="relative w-14 h-14 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <MessageCircle size={24} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
