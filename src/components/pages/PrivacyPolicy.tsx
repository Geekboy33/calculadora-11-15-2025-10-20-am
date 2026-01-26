// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY POLICY PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Mail } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16' }
};

const PrivacyPolicy: React.FC = () => {
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
          fontSize: '14px',
          transition: 'color 0.2s'
        }}>
          <ArrowLeft size={18} />
          Back to Home
        </a>
        <div style={{ 
          width: '1px', 
          height: '24px', 
          background: colors.border.primary 
        }} />
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>
          Privacy Policy
        </span>
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
            <Shield size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Privacy Policy
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: '16px' }}>
            Last updated: January 2026
          </p>
        </div>

        <div style={{ 
          background: colors.bg.card, 
          borderRadius: '16px', 
          border: `1px solid ${colors.border.primary}`,
          padding: '40px'
        }}>
          <Section 
            icon={<Eye size={24} />}
            title="1. Information We Collect"
            content={`
              <p>LemonMinted Protocol collects minimal information necessary to provide our blockchain minting services:</p>
              <ul>
                <li><strong>Wallet Addresses:</strong> Public blockchain addresses used for transactions</li>
                <li><strong>Transaction Data:</strong> On-chain transaction records (publicly visible on blockchain)</li>
                <li><strong>Technical Data:</strong> IP addresses, browser type, and device information for security purposes</li>
                <li><strong>Communication Data:</strong> Information you provide when contacting support</li>
              </ul>
              <p>We do not collect personal identification information unless voluntarily provided for KYC/AML compliance with partner institutions.</p>
            `}
          />

          <Section 
            icon={<Database size={24} />}
            title="2. How We Use Your Information"
            content={`
              <p>Your information is used exclusively for:</p>
              <ul>
                <li>Processing and validating minting transactions</li>
                <li>Maintaining platform security and preventing fraud</li>
                <li>Complying with legal and regulatory requirements</li>
                <li>Improving our services and user experience</li>
                <li>Communicating important updates about the protocol</li>
              </ul>
              <p>We never sell your data to third parties.</p>
            `}
          />

          <Section 
            icon={<Lock size={24} />}
            title="3. Data Security"
            content={`
              <p>We implement industry-leading security measures:</p>
              <ul>
                <li><strong>AES-256-GCM Encryption:</strong> All sensitive data is encrypted at rest and in transit</li>
                <li><strong>Multi-Signature Verification:</strong> Critical operations require multiple authorizations</li>
                <li><strong>Regular Security Audits:</strong> Third-party audits of smart contracts and infrastructure</li>
                <li><strong>Zero-Knowledge Architecture:</strong> Minimal data retention policies</li>
              </ul>
            `}
          />

          <Section 
            icon={<Globe size={24} />}
            title="4. Blockchain Transparency"
            content={`
              <p>By nature of blockchain technology:</p>
              <ul>
                <li>All transactions are publicly visible on the LemonChain network</li>
                <li>Transaction history is immutable and cannot be deleted</li>
                <li>Wallet addresses are pseudonymous but not anonymous</li>
                <li>Smart contract interactions are permanently recorded</li>
              </ul>
              <p>We recommend using separate wallets for privacy-sensitive activities.</p>
            `}
          />

          <Section 
            icon={<Shield size={24} />}
            title="5. Your Rights"
            content={`
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data held by us (off-chain data only)</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of off-chain data (blockchain data cannot be deleted)</li>
                <li>Object to processing for marketing purposes</li>
                <li>Data portability for information you've provided</li>
              </ul>
            `}
          />

          <Section 
            icon={<Mail size={24} />}
            title="6. Contact Us"
            content={`
              <p>For privacy-related inquiries:</p>
              <ul>
                <li><strong>Email:</strong> privacy@lemonminted.io</li>
                <li><strong>Response Time:</strong> Within 30 business days</li>
              </ul>
              <p>For general support, please visit our <a href="/contact" style="color: #A3E635;">Contact Page</a>.</p>
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
          <a href="/terms-of-service" style={{ color: colors.text.secondary, textDecoration: 'none' }}>Terms of Service</a>
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
      style={{ 
        color: colors.text.secondary, 
        lineHeight: '1.8',
        fontSize: '15px'
      }}
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

export default PrivacyPolicy;
