// ═══════════════════════════════════════════════════════════════════════════════
// API REFERENCE PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, Code, Key, Lock, Send, Database, CheckCircle, Copy, Check } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C', code: '#0D1210' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16', blue: '#3B82F6', purple: '#A855F7', orange: '#F59E0B' }
};

const APIReference: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>API Reference</span>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 40px' }}>
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
            <Code size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            API Reference
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Complete documentation for integrating with the LemonMinted Protocol API
          </p>
        </div>

        {/* Base URL */}
        <div style={{ 
          background: colors.bg.card, 
          borderRadius: '12px', 
          border: `1px solid ${colors.border.primary}`,
          padding: '24px',
          marginBottom: '32px'
        }}>
          <h3 style={{ color: colors.accent.primary, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>BASE URL</h3>
          <code style={{ 
            background: colors.bg.code, 
            padding: '12px 16px', 
            borderRadius: '8px', 
            display: 'block',
            color: colors.accent.primary,
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            https://api.lemonminted.io/v1
          </code>
        </div>

        {/* Authentication */}
        <APISection
          icon={<Key size={24} />}
          title="Authentication"
          description="All API requests require authentication using Bearer tokens."
        >
          <CodeBlock
            id="auth-header"
            title="Request Header"
            language="http"
            code={`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
X-Platform-ID: YOUR_PLATFORM_ID`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
        </APISection>

        {/* Create Lock */}
        <APISection
          icon={<Lock size={24} />}
          title="Create Lock"
          description="Lock USD reserves to initiate VUSD minting process."
          method="POST"
          endpoint="/locks"
        >
          <CodeBlock
            id="create-lock-request"
            title="Request Body"
            language="json"
            code={`{
  "amount": "1000000.00",
  "currency": "USD",
  "beneficiary": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE34",
  "bank_name": "Digital Commercial Bank",
  "reference": "LOCK-2026-001",
  "metadata": {
    "purpose": "Treasury Reserve",
    "authorization_code": "AUTH-XXXX-XXXX"
  }
}`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
          <CodeBlock
            id="create-lock-response"
            title="Response"
            language="json"
            code={`{
  "success": true,
  "data": {
    "lock_id": "LOCK-2026-0001-A3E6",
    "status": "pending",
    "amount": "1000000.00",
    "currency": "USD",
    "authorization_code": "AUTH-LMN-2026-XXXX",
    "created_at": "2026-01-21T10:30:00Z",
    "expires_at": "2026-01-22T10:30:00Z",
    "signatures": {
      "daes": null,
      "bank": null,
      "protocol": null
    }
  }
}`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
        </APISection>

        {/* Get Lock Status */}
        <APISection
          icon={<Database size={24} />}
          title="Get Lock Status"
          description="Retrieve the current status of a lock request."
          method="GET"
          endpoint="/locks/{lock_id}"
        >
          <CodeBlock
            id="get-lock-response"
            title="Response"
            language="json"
            code={`{
  "success": true,
  "data": {
    "lock_id": "LOCK-2026-0001-A3E6",
    "status": "approved",
    "amount": "1000000.00",
    "currency": "USD",
    "signatures": {
      "daes": {
        "signer": "0x1234...5678",
        "timestamp": "2026-01-21T11:00:00Z",
        "tx_hash": "0xabc..."
      },
      "bank": {
        "signer": "0x8765...4321",
        "timestamp": "2026-01-21T11:05:00Z",
        "tx_hash": "0xdef..."
      },
      "protocol": {
        "signer": "0x9999...0000",
        "timestamp": "2026-01-21T11:10:00Z",
        "tx_hash": "0xghi..."
      }
    },
    "blockchain": {
      "network": "LemonChain",
      "chain_id": 1007,
      "contract": "0x7C5B..."
    }
  }
}`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
        </APISection>

        {/* Execute Mint */}
        <APISection
          icon={<Send size={24} />}
          title="Execute Mint"
          description="Mint VUSD tokens after lock approval (requires all 3 signatures)."
          method="POST"
          endpoint="/mint"
        >
          <CodeBlock
            id="mint-request"
            title="Request Body"
            language="json"
            code={`{
  "lock_id": "LOCK-2026-0001-A3E6",
  "authorization_code": "AUTH-LMN-2026-XXXX",
  "beneficiary": "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE34"
}`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
          <CodeBlock
            id="mint-response"
            title="Response"
            language="json"
            code={`{
  "success": true,
  "data": {
    "mint_id": "MINT-2026-0001",
    "lock_id": "LOCK-2026-0001-A3E6",
    "amount_vusd": "1000000.00",
    "publication_code": "PUB-LMN-2026-XXXX",
    "tx_hash": "0x789abc...",
    "block_number": 12345678,
    "beneficiary": "0x742d35Cc...",
    "minted_at": "2026-01-21T12:00:00Z",
    "explorer_url": "https://explorer.lemonchain.io/tx/0x789abc..."
  }
}`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
        </APISection>

        {/* Verify */}
        <APISection
          icon={<CheckCircle size={24} />}
          title="Verify Transaction"
          description="Verify a minting transaction using the publication code."
          method="GET"
          endpoint="/verify/{publication_code}"
        >
          <CodeBlock
            id="verify-response"
            title="Response"
            language="json"
            code={`{
  "success": true,
  "verified": true,
  "data": {
    "publication_code": "PUB-LMN-2026-XXXX",
    "amount": "1000000.00",
    "currency": "VUSD",
    "backing": "USD",
    "ratio": "1:1",
    "lock_verified": true,
    "signatures_verified": 3,
    "blockchain_confirmed": true,
    "certificate_url": "https://lemonminted.io/certificate/PUB-..."
  }
}`}
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
          />
        </APISection>

        {/* Rate Limits */}
        <div style={{ 
          background: colors.bg.card, 
          borderRadius: '16px', 
          border: `1px solid ${colors.border.primary}`,
          padding: '32px',
          marginTop: '40px'
        }}>
          <h3 style={{ color: colors.text.primary, marginBottom: '20px', fontSize: '20px' }}>Rate Limits</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.accent.primary }}>Tier</th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.accent.primary }}>Requests/min</th>
                <th style={{ textAlign: 'left', padding: '12px', color: colors.accent.primary }}>Daily Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
                <td style={{ padding: '12px', color: colors.text.secondary }}>Standard</td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>60</td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>10,000</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${colors.border.primary}` }}>
                <td style={{ padding: '12px', color: colors.text.secondary }}>Professional</td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>300</td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>100,000</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', color: colors.text.secondary }}>Enterprise</td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>Unlimited</td>
                <td style={{ padding: '12px', color: colors.text.secondary }}>Unlimited</td>
              </tr>
            </tbody>
          </table>
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
      </footer>
    </div>
  );
};

const APISection: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  method?: string;
  endpoint?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, method, endpoint, children }) => (
  <div style={{ 
    background: colors.bg.card, 
    borderRadius: '16px', 
    border: `1px solid ${colors.border.primary}`,
    padding: '32px',
    marginBottom: '24px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <div style={{ color: colors.accent.primary }}>{icon}</div>
      <h2 style={{ fontSize: '22px', fontWeight: '600', color: colors.text.primary }}>{title}</h2>
    </div>
    <p style={{ color: colors.text.secondary, marginBottom: '20px' }}>{description}</p>
    {method && endpoint && (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '20px',
        background: colors.bg.code,
        padding: '12px 16px',
        borderRadius: '8px'
      }}>
        <span style={{ 
          background: method === 'GET' ? colors.accent.blue : colors.accent.primary,
          color: '#000',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '700'
        }}>{method}</span>
        <code style={{ color: colors.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
          {endpoint}
        </code>
      </div>
    )}
    {children}
  </div>
);

const CodeBlock: React.FC<{
  id: string;
  title: string;
  language: string;
  code: string;
  copiedCode: string | null;
  onCopy: (code: string, id: string) => void;
}> = ({ id, title, language, code, copiedCode, onCopy }) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: '8px'
    }}>
      <span style={{ color: colors.text.muted, fontSize: '12px', fontWeight: '600' }}>{title}</span>
      <button
        onClick={() => onCopy(code, id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: copiedCode === id ? colors.accent.primary : colors.text.muted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px'
        }}
      >
        {copiedCode === id ? <Check size={14} /> : <Copy size={14} />}
        {copiedCode === id ? 'Copied!' : 'Copy'}
      </button>
    </div>
    <pre style={{ 
      background: colors.bg.code, 
      padding: '16px', 
      borderRadius: '8px',
      overflow: 'auto',
      border: `1px solid ${colors.border.primary}`
    }}>
      <code style={{ 
        color: colors.text.secondary, 
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '13px',
        lineHeight: '1.6'
      }}>
        {code}
      </code>
    </pre>
  </div>
);

export default APIReference;
