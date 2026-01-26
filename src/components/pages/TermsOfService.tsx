// ═══════════════════════════════════════════════════════════════════════════════
// TERMS OF SERVICE PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeft, FileText, Scale, AlertTriangle, Users, Gavel, Globe } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16' }
};

const TermsOfService: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.bg.primary,
      color: colors.text.primary,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 40px',
        borderBottom: `1px solid ${colors.border.primary}`,
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: colors.text.secondary,
          textDecoration: 'none',
          fontSize: '14px'
        }}>
          <ArrowLeft size={18} />
          Back to Home
        </a>
        <div style={{ width: '1px', height: '24px', background: colors.border.primary }} />
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>Terms of Service</span>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '60px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${colors.accent.primary}20, ${colors.accent.secondary}10)`,
            border: `1px solid ${colors.accent.primary}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <FileText size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Terms of Service
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: '16px' }}>
            Effective Date: January 2026
          </p>
        </div>

        <div style={{ 
          background: colors.bg.card, 
          borderRadius: '16px', 
          border: `1px solid ${colors.border.primary}`,
          padding: '40px'
        }}>
          <Section 
            icon={<Scale size={24} />}
            title="1. Acceptance of Terms"
            content={`
              <p>By accessing or using the LemonMinted Protocol ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>
              <p>These terms apply to all users, including institutional partners, individual users, and API integrators.</p>
            `}
          />

          <Section 
            icon={<Users size={24} />}
            title="2. Eligibility"
            content={`
              <p>To use our Service, you must:</p>
              <ul>
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding agreements</li>
                <li>Not be located in a jurisdiction where cryptocurrency services are prohibited</li>
                <li>Not be on any sanctions lists (OFAC, UN, EU)</li>
                <li>Complete any required KYC/AML verification for institutional features</li>
              </ul>
            `}
          />

          <Section 
            icon={<FileText size={24} />}
            title="3. Service Description"
            content={`
              <p>LemonMinted Protocol provides:</p>
              <ul>
                <li><strong>VUSD Minting:</strong> Creation of USD-backed stablecoins on LemonChain</li>
                <li><strong>Treasury Lock Services:</strong> Secure locking of fiat reserves</li>
                <li><strong>Multi-Signature Authorization:</strong> Three-signature verification for all minting</li>
                <li><strong>API Access:</strong> Programmatic integration for institutional partners</li>
                <li><strong>Blockchain Explorer:</strong> Public verification of all transactions</li>
              </ul>
              <p>All VUSD tokens are 1:1 backed by certified USD reserves held at Digital Commercial Bank.</p>
            `}
          />

          <Section 
            icon={<AlertTriangle size={24} />}
            title="4. Risk Disclosure"
            content={`
              <p><strong>IMPORTANT:</strong> You acknowledge and accept the following risks:</p>
              <ul>
                <li><strong>Smart Contract Risk:</strong> Despite audits, smart contracts may contain vulnerabilities</li>
                <li><strong>Market Risk:</strong> Cryptocurrency values can fluctuate significantly</li>
                <li><strong>Regulatory Risk:</strong> Laws governing cryptocurrencies may change</li>
                <li><strong>Technical Risk:</strong> Network congestion, forks, or outages may affect service</li>
                <li><strong>Irreversibility:</strong> Blockchain transactions cannot be reversed once confirmed</li>
              </ul>
              <p>You are solely responsible for your investment decisions.</p>
            `}
          />

          <Section 
            icon={<Gavel size={24} />}
            title="5. Prohibited Activities"
            content={`
              <p>You agree NOT to:</p>
              <ul>
                <li>Use the Service for money laundering or terrorist financing</li>
                <li>Circumvent any security measures or access controls</li>
                <li>Attempt to manipulate or exploit smart contracts</li>
                <li>Use automated systems to abuse the Service</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
              </ul>
              <p>Violation may result in immediate termination and legal action.</p>
            `}
          />

          <Section 
            icon={<Globe size={24} />}
            title="6. Limitation of Liability"
            content={`
              <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
              <ul>
                <li>The Service is provided "AS IS" without warranties of any kind</li>
                <li>We are not liable for any indirect, incidental, or consequential damages</li>
                <li>Our total liability shall not exceed the fees paid by you in the past 12 months</li>
                <li>We are not responsible for third-party services, including blockchain networks</li>
              </ul>
            `}
          />

          <Section 
            icon={<Scale size={24} />}
            title="7. Governing Law"
            content={`
              <p>These Terms shall be governed by and construed in accordance with international commercial law principles. Any disputes shall be resolved through binding arbitration in accordance with the rules of the International Chamber of Commerce (ICC).</p>
              <p>For questions about these Terms, contact: <a href="mailto:legal@lemonminted.io">legal@lemonminted.io</a></p>
            `}
          />
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '40px',
        borderTop: `1px solid ${colors.border.primary}`,
        textAlign: 'center',
        color: colors.text.muted,
        fontSize: '14px'
      }}>
        <p>© 2026 LemonMinted Protocol. All rights reserved.</p>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
          <a href="/privacy-policy" style={{ color: colors.text.secondary, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/cookie-policy" style={{ color: colors.text.secondary, textDecoration: 'none' }}>Cookie Policy</a>
        </div>
      </footer>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; content: string }> = ({ icon, title, content }) => (
  <div style={{ marginBottom: '40px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{ color: colors.accent.primary }}>{icon}</div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: colors.text.primary }}>{title}</h2>
    </div>
    <div 
      style={{ color: colors.text.secondary, lineHeight: '1.8', fontSize: '15px' }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
    <style>{`
      div ul { margin: 16px 0; padding-left: 24px; }
      div li { margin: 8px 0; }
      div strong { color: #FFFFFF; }
      div a { color: #A3E635; text-decoration: none; }
      div a:hover { text-decoration: underline; }
    `}</style>
  </div>
);

export default TermsOfService;
