// ═══════════════════════════════════════════════════════════════════════════════
// COOKIE POLICY PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowLeft, Cookie, Settings, Shield, BarChart3, Globe } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16' }
};

const CookiePolicy: React.FC = () => {
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
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>Cookie Policy</span>
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
            <Cookie size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Cookie Policy
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
            icon={<Cookie size={24} />}
            title="1. What Are Cookies"
            content={`
              <p>Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience by remembering your preferences and understanding how you use our platform.</p>
              <p>LemonMinted Protocol uses minimal cookies, prioritizing your privacy while maintaining essential functionality.</p>
            `}
          />

          <Section 
            icon={<Shield size={24} />}
            title="2. Essential Cookies"
            content={`
              <p>These cookies are necessary for the website to function properly:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr style="border-bottom: 1px solid #1A2420;">
                  <th style="text-align: left; padding: 12px; color: #A3E635;">Cookie</th>
                  <th style="text-align: left; padding: 12px; color: #A3E635;">Purpose</th>
                  <th style="text-align: left; padding: 12px; color: #A3E635;">Duration</th>
                </tr>
                <tr style="border-bottom: 1px solid #1A2420;">
                  <td style="padding: 12px;">session_id</td>
                  <td style="padding: 12px;">Maintains your login session</td>
                  <td style="padding: 12px;">Session</td>
                </tr>
                <tr style="border-bottom: 1px solid #1A2420;">
                  <td style="padding: 12px;">wallet_connected</td>
                  <td style="padding: 12px;">Remembers wallet connection state</td>
                  <td style="padding: 12px;">24 hours</td>
                </tr>
                <tr style="border-bottom: 1px solid #1A2420;">
                  <td style="padding: 12px;">language</td>
                  <td style="padding: 12px;">Stores your language preference</td>
                  <td style="padding: 12px;">1 year</td>
                </tr>
                <tr>
                  <td style="padding: 12px;">csrf_token</td>
                  <td style="padding: 12px;">Security token for form submissions</td>
                  <td style="padding: 12px;">Session</td>
                </tr>
              </table>
              <p>These cookies cannot be disabled as they are essential for security and functionality.</p>
            `}
          />

          <Section 
            icon={<BarChart3 size={24} />}
            title="3. Analytics Cookies"
            content={`
              <p>We use privacy-respecting analytics to understand how visitors interact with our platform:</p>
              <ul>
                <li><strong>No personal data collection:</strong> We don't track individuals</li>
                <li><strong>Aggregated data only:</strong> Statistics are anonymized</li>
                <li><strong>No third-party sharing:</strong> Data stays with us</li>
                <li><strong>Self-hosted analytics:</strong> We don't use Google Analytics or similar services</li>
              </ul>
              <p>You can opt-out of analytics cookies through your browser settings.</p>
            `}
          />

          <Section 
            icon={<Settings size={24} />}
            title="4. Managing Cookies"
            content={`
              <p>You can control cookies through your browser settings:</p>
              <ul>
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
              </ul>
              <p>Note: Blocking essential cookies may affect website functionality.</p>
            `}
          />

          <Section 
            icon={<Globe size={24} />}
            title="5. Third-Party Services"
            content={`
              <p>Our platform integrates with third-party services that may set their own cookies:</p>
              <ul>
                <li><strong>Wallet Providers:</strong> MetaMask, WalletConnect may store connection data</li>
                <li><strong>Blockchain RPC:</strong> LemonChain node connections</li>
              </ul>
              <p>We recommend reviewing the privacy policies of these services for more information.</p>
            `}
          />

          <Section 
            icon={<Shield size={24} />}
            title="6. Updates to This Policy"
            content={`
              <p>We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated revision date.</p>
              <p>For questions about our cookie practices, contact: <a href="mailto:privacy@lemonminted.io">privacy@lemonminted.io</a></p>
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
          <a href="/terms-of-service" style={{ color: colors.text.secondary, textDecoration: 'none' }}>Terms of Service</a>
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

export default CookiePolicy;
