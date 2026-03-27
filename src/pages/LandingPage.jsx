import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Search, Target, Zap, Star, Upload, Store, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import logo from '../assets/pennyseo-logo.png';
import dashboardPreview from '../assets/dashboard_preview.jpg';
import fivePennyLogo from '../assets/5pennyAi_logo.png';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim() });

    if (error) {
      if (error.code === '23505') {
        setStatus('success'); // Don't reveal if email already exists
      } else {
        setStatus('error');
      }
    } else {
      setStatus('success');
    }

    setEmail('');
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
        <div className="hidden md:flex items-center gap-4">
          <Link to="/pricing" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Pricing
          </Link>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
            Powered by <img src={fivePennyLogo} alt="5PennyAi" className="h-5 object-contain" />
          </span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-6">
            🚀 Coming Soon for Marketplace Sellers
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Product SEO is no longer a <span className="text-indigo-600">guessing game.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            The first AI-powered tool that <span className="font-bold text-slate-800">sees</span> your product mockups to predict market trends. Rank higher, save time, and sell more.
          </p>

          {status === 'success' ? (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3">
              <CheckCircle /> You're on the list! We'll be in touch soon.
            </div>
          ) : (
            <>
              <form onSubmit={handleJoinWaitlist} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  required
                  className="flex-1 px-5 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                />
                <button
                  disabled={status === 'loading'}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  {status === 'loading' ? (
                    <><Loader2 size={18} className="animate-spin" /> Joining...</>
                  ) : (
                    <>Join Waitlist <Zap size={18} fill="currentColor" /></>
                  )}
                </button>
              </form>
              {status === 'error' && (
                <p className="mt-2 text-sm text-rose-500">Something went wrong, please try again.</p>
              )}
            </>
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

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-extrabold text-center mb-12">How PennySEO Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: Upload, title: 'Upload Your Product Image', desc: 'Upload a mockup or product photo. Our AI analyzes visual elements like colors, typography, and style.' },
            { icon: Store, title: 'Connect Your Shop', desc: 'Link your shop profile to personalize SEO recommendations to match your brand voice and identity.' },
            { icon: Sparkles, title: 'Get Optimized SEO Tags', desc: 'Receive AI-generated titles, descriptions, and keyword tags scored by volume, competition, and buyer intent.' },
            { icon: TrendingUp, title: 'Publish & Rank Higher', desc: 'Apply the optimized tags to your listings and watch your visibility grow.' },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <Icon size={28} />
              </div>
              <div className="text-sm font-bold text-indigo-600">Step {i + 1}</div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-slate-600 text-sm">{desc}</p>
            </div>
          ))}
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
        &copy; 2026 5PennyAi. All rights reserved. <br />
        <span className="italic">Designed for Online Sellers, by AI Enthusiasts.</span>
        <div className="mt-4 space-x-4">
          <a href="https://www.iubenda.com/privacy-policy/39387054" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline">Privacy Policy</a>
          <a href="https://www.iubenda.com/privacy-policy/39387054/cookie-policy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline">Cookie Policy</a>
          <Link to="/terms" className="hover:text-slate-600 underline">Terms of Service</Link>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          The term "Etsy" is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
