import { Copy, Check, Flame, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const ResultsDisplay = ({ results }) => {
  if (!results) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* 1. Title Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Optimized Title</h3>
          <CopyButton text={results.title} />
        </div>
        <p className="text-lg font-medium text-slate-900 leading-snug">
          {results.title}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. Tags Section (Left Column) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Keywords (13)</h3>
             <CopyButton text={results.tags.join(', ')} />
          </div>
          <div className="flex flex-wrap gap-2">
            {results.tags.map((tag, i) => (
              <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-full border border-indigo-100">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 3. Description Section (Right Column) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-2">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Optimized Description</h3>
             <CopyButton text={results.description} />
          </div>
          <div className="prose prose-sm prose-slate max-w-none text-slate-600 whitespace-pre-line h-64 overflow-y-auto pr-2 custom-scrollbar">
            {results.description}
          </div>
        </div>
      </div>

      {/* 4. SEO Analytics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
           <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
             <TrendingUp size={18} className="text-indigo-600" />
             Competition Analysis
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left w-1/3">Keyword</th>
                <th className="px-6 py-3">Volume / mo</th>
                <th className="px-6 py-3">Competition</th>
                <th className="px-6 py-3">Opportunity Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.analytics.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-left font-medium text-slate-900">{row.keyword}</td>
                  <td className="px-6 py-3 text-slate-600">{row.volume.toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${row.competition === 'Low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        row.competition === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      {row.competition === 'Low' ? 'Low' : row.competition === 'Medium' ? 'Medium' : 'High'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-1 font-bold text-slate-700">
                      {row.score}
                      <Flame size={14} className={`${
                        row.score >= 80 ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                      }`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ResultsDisplay;
