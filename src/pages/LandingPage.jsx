import React, { useState } from 'react';
import { CheckCircle, Search, Target, Zap, Star } from 'lucide-react';
import logo from '../assets/pennyseo-logo.png';
import dashboardPreview from '../assets/dashboard_preview.jpg';
import fivePennyLogo from '../assets/5pennyAi_logo.png';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic for email capture would go here
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="p-6 max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center h-16 overflow-hidden">
          <img 
            src={logo} 
            alt="PennySEO" 
            style={{ width: '220px', maxWidth: 'none', marginLeft: '-15px' }} 
            className="object-cover"
          />
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500">
          Powered by <img src={fivePennyLogo} alt="5PennyAi" className="h-5 object-contain" />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-6">
            🚀 Coming Soon to Etsy Sellers
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Etsy SEO is no longer a <span className="text-indigo-600">guessing game.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            The first AI-powered tool that <span className="font-bold text-slate-800">sees</span> your product mockups to predict market trends. Rank higher, save time, and sell more.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email address"
                required
                className="flex-1 px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 shrink-0">
                Join Waitlist <Zap size={18} fill="currentColor" />
              </button>
            </form>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3">
              <CheckCircle /> Thanks! We'll notify you the moment we launch.
            </div>
          )}
          <p className="mt-4 text-sm text-slate-400">Join 100+ sellers waiting for early access.</p>
        </div>

        {/* Dashboard Preview Overlay */}
        <div className="relative">
          <div className="absolute -inset-4 bg-indigo-500/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
             <img 
               src={dashboardPreview} 
               alt="PennySEO Dashboard Preview" 
               className="w-full h-auto"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-bold">AI-Powered Visual Insights</h3>
              <p className="text-slate-600">Advanced AI technology analyzes your mockups to automatically detect the perfect niche and generate tags backed by real-time SEO stats.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold">Precision Strategy Tuner</h3>
              <p className="text-slate-600">Take control of your visibility. Balance search volume, niche relevance, and competition to target high-value market opportunities.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <Star size={24} />
              </div>
              <h3 className="text-xl font-bold">Keyword Favorites</h3>
              <p className="text-slate-600">Build your own library of high-performing keywords. Create custom presets and streamline your workflow across your product catalog.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-400 text-sm">
        © 2026 5PennyAi. All rights reserved. <br />
        <span className="italic">Designed for Etsy Sellers, by AI Enthusiasts.</span>
      </footer>
    </div>
  );
};

export default LandingPage;
