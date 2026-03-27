import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/pennyseo-logo.png';
import fivePennyLogo from '../assets/5pennyAi_logo.png';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="p-6 max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center h-16 overflow-hidden">
          <img
            src={logo}
            alt="PennySEO"
            style={{ width: '220px', maxWidth: 'none', marginLeft: '-15px' }}
            className="object-cover"
          />
        </Link>
        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500">
          Powered by <img src={fivePennyLogo} alt="5PennyAi" className="h-5 object-contain" />
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-400 mb-8">Last updated: March 24, 2026</p>

          <div className="prose prose-slate max-w-none space-y-6">
            <p>
              PennySEO ("we", "our", or "us") operates the website https://www.pennyseo.ai (the "Service").
              This Privacy Policy explains how we collect, use, and protect your information.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">1. Information We Collect</h2>
            <p>
              <strong>Account Information:</strong> When you create an account, we collect your email address and basic
              profile information through our authentication provider (Supabase Auth).
            </p>
            <p>
              <strong>Shop Data:</strong> If you connect your shop via the Etsy API, we access read-only shop
              information including your shop name, description, and policies. We use OAuth 2.0 authentication and
              only request the minimum permissions necessary (shops_r scope).
            </p>
            <p>
              <strong>Usage Data:</strong> We collect standard usage data such as pages visited and features used to
              improve our Service.
            </p>
            <p>
              <strong>Uploaded Content:</strong> Product images you upload for SEO analysis are stored securely and
              are only accessible to your account.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide and personalize SEO recommendations based on your shop's brand identity</li>
              <li>To generate optimized titles, descriptions, and tags for your product listings</li>
              <li>To improve and maintain our Service</li>
              <li>To communicate important updates about your account</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-3">3. Data Storage and Security</h2>
            <p>
              Your data is stored securely in Supabase (PostgreSQL) with Row-Level Security (RLS) enabled, ensuring
              each user can only access their own data. All data transmission uses HTTPS encryption. Product images
              are stored in secure cloud storage buckets with access controls.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Supabase: Authentication and database hosting</li>
              <li>Vercel: Application hosting</li>
              <li>Etsy Open API v3: Read-only shop data access (with your explicit OAuth consent)</li>
              <li>Google Gemini AI: Image analysis and SEO text generation (images are processed but not stored by Google beyond the API call)</li>
            </ul>
            <p>
              We do NOT sell, rent, or share your personal data or shop information with advertisers or data brokers.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">5. Etsy API Data</h2>
            <p>When you connect your Etsy shop:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We only access data you explicitly authorize via OAuth 2.0</li>
              <li>We request read-only access (shops_r scope)</li>
              <li>We do not modify, create, or delete any data on your Etsy account</li>
              <li>You can revoke access at any time through your Etsy account settings</li>
              <li>Shop data cached locally is refreshed periodically and can be deleted upon request</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-3">6. Data Retention</h2>
            <p>
              Your data is retained as long as your account is active. You may request deletion of your account and
              all associated data at any time by contacting us at support@pennyseo.ai.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Revoke Etsy API access at any time</li>
              <li>Export your data</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-3">8. Cookies</h2>
            <p>
              We use essential cookies for authentication and session management. We do not use advertising or
              tracking cookies.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">9. Children's Privacy</h2>
            <p>Our Service is not intended for users under 18 years of age.</p>

            <h2 className="text-xl font-bold mt-8 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              posting the new policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-bold mt-8 mb-3">11. Contact</h2>
            <p>For privacy-related questions or data requests, contact us at:</p>
            <p>
              Email: <a href="mailto:support@pennyseo.ai" className="text-indigo-600 hover:underline">support@pennyseo.ai</a><br />
              Website: <a href="https://www.pennyseo.ai" className="text-indigo-600 hover:underline">https://www.pennyseo.ai</a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-400 text-sm">
        © 2026 5PennyAi. All rights reserved. <br />
        <span className="italic">Designed for Etsy Sellers, by AI Enthusiasts.</span>
        <div className="mt-4 space-x-4">
          <a href="https://www.iubenda.com/privacy-policy/39387054" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline">Privacy Policy</a>
          <Link to="/terms" className="hover:text-slate-600 underline">Terms of Service</Link>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          The term "Etsy" is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.
        </p>
      </footer>
    </div>
  );
};

export default PrivacyPage;
