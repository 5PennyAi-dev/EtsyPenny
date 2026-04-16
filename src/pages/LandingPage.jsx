import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Camera, BarChart3, Award, Upload, Sparkles, TrendingUp, Loader2, Send, ArrowRight } from 'lucide-react';
// TODO: re-enable if needed — waitlist uses supabase
// import { supabase } from '@/lib/supabase';
import axios from 'axios';
import logo from '../assets/pennyseo-logo.png';
import dashboardPreview from '../assets/dashboard_preview.jpg';
import fivePennyLogo from '../assets/5pennyAi_logo.png';

const LandingPage = () => {
  // TODO: re-enable if needed — waitlist state
  // const [email, setEmail] = useState('');
  // const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

  const handleContact = async (e) => {
    e.preventDefault();
    setContactStatus('loading');
    try {
      await axios.post('/api/feedback', {
        user_id: null,
        name: contactName.trim(),
        email: contactEmail.trim(),
        type: 'question',
        message: contactMessage.trim(),
      });
      setContactStatus('success');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch {
      setContactStatus('error');
    }
  };

  // TODO: re-enable if needed — waitlist handler
  // const handleJoinWaitlist = async (e) => {
  //   e.preventDefault();
  //   if (!email || !email.includes('@')) return;
  //   setStatus('loading');
  //   const { error } = await supabase
  //     .from('waitlist')
  //     .insert({ email: email.toLowerCase().trim() });
  //   if (error) {
  //     if (error.code === '23505') {
  //       setStatus('success');
  //     } else {
  //       setStatus('error');
  //     }
  //   } else {
  //     setStatus('success');
  //   }
  //   setEmail('');
  // };

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
          <Link to="/docs/getting-started" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Docs
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/pricing" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
            Pricing
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-4 py-1.5 rounded-lg transition-colors">
            Sign in
          </Link>
          <Link to="/login?mode=sign_up" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-6">
            🚀 Now in Open Beta
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Stop <span className="text-indigo-600">guessing</span> which tags to use.
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            Upload your product photo. Get a fully optimized Etsy listing — title, tags, and description — scored by real search volume, buyer intent, and competition. Copy, paste, sell.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link
              to="/login?mode=sign_up"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] flex items-center gap-2"
            >
              Get started free <ArrowRight size={18} />
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</Link>
          </p>
          <p className="mt-2 text-sm text-slate-400">Free to try · 15 tokens included · No credit card required</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Upload, title: 'Upload Your Product Photo', desc: "Our AI reads your product's style, colors, typography, and target audience in seconds. No forms to fill — just drop your image." },
            { icon: Sparkles, title: 'Get Scored Keywords & a Ready-Made Listing', desc: 'Receive AI-generated titles, tags, and descriptions. Every keyword scored by real Google search volume, buyer intent, product fit, and competition.' },
            { icon: TrendingUp, title: 'Copy to Etsy & Rank Higher', desc: 'Export your optimized tags and listing. Paste them into your Etsy shop and watch your visibility grow.' },
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
                <Camera size={24} />
              </div>
              <h3 className="text-xl font-bold">Your Photo Is the Brief</h3>
              <p className="text-slate-600">You don't type keywords. You upload a photo. Our AI reads aesthetic, typography, color palette, and target audience — then builds your entire keyword strategy from what it sees.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold">Real Search Data, Not Estimates</h3>
              <p className="text-slate-600">Every keyword is backed by live Google search volume, CPC, and competition data. You see actual buyer demand — not scraped approximations from marketplace pages.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <Award size={24} />
              </div>
              <h3 className="text-xl font-bold">Keywords Scored, Not Just Listed</h3>
              <p className="text-slate-600">Each keyword gets a composite score across four axes: search volume, buyer intent, relevance to your product, and competition level. Pick the winners, skip the noise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-2">Have a question?</h2>
          <p className="text-slate-500 text-center mb-10">We'd love to hear from you.</p>

          {contactStatus === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <p className="text-slate-700 font-semibold">Thanks! We'll get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="space-y-4">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Your email"
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Your message"
                required
                rows={4}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
              {contactStatus === 'error' && (
                <p className="text-sm text-rose-600">Something went wrong. Please try again.</p>
              )}
              <button
                type="submit"
                disabled={contactStatus === 'loading'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {contactStatus === 'loading' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-400 text-sm">
        &copy; 2026 5PennyAi. All rights reserved. <br />
        <span className="italic">Designed for Online Sellers. by 5PennyAi.</span>
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
