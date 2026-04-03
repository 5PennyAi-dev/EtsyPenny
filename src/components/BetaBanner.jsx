import { useState } from 'react';
import FeedbackModal from './feedback/FeedbackModal';

const BetaBanner = () => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-64 right-0 z-40 h-9 bg-indigo-50 border-b border-indigo-100 flex items-center justify-center px-4">
        <span className="text-xs sm:text-sm text-indigo-700">
          PennySEO is in Beta — your feedback helps us improve
        </span>
        <button
          onClick={() => setShowFeedback(true)}
          className="absolute right-4 text-xs sm:text-sm text-indigo-600 font-medium hover:text-indigo-800 underline underline-offset-2 transition-colors"
        >
          Give feedback →
        </button>
      </div>
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
};

export default BetaBanner;
