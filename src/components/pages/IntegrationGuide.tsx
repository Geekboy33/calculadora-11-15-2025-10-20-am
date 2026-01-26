// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION GUIDE PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Code, Terminal, Settings, CheckCircle, Copy, Check, ArrowRight, Layers, Zap } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C', code: '#0D1210' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16', blue: '#3B82F6' }
};

const IntegrationGuide: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(1);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const steps = [
    { num: 1, title: 'Setup', description: 'Install SDK and configure' },
    { num: 2, title: 'Connect', description: 'Authenticate with API' },
    { num: 3, title: 'Lock', description: 'Create USD lock' },
    { num: 4, title: 'Sign', description: 'Multi-signature approval' },
    { num: 5, title: 'Mint', description: 'Generate VUSD tokens' }
  ];

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
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>Integration Guide</span>
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
            <BookOpen size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Integration Guide
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: '16px', maxWidth: '600px', margin: '0 auto' }}>
            Step-by-step guide to integrate LemonMinted Protocol into your application
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '8px', 
          marginBottom: '48px',
          flexWrap: 'wrap'
        }}>
          {steps.map((step, index) => (
            <React.Fragment key={step.num}>
              <button
                onClick={() => setActiveStep(step.num)}
                style={{
                  background: activeStep === step.num ? colors.accent.primary : colors.bg.card,
                  border: `1px solid ${activeStep === step.num ? colors.accent.primary : colors.border.primary}`,
                  borderRadius: '12px',
                  padding: '16px 24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  color: activeStep === step.num ? '#000' : colors.text.muted,
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  STEP {step.num}
                </div>
                <div style={{ 
                  color: activeStep === step.num ? '#000' : colors.text.primary,
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {step.title}
                </div>
              </button>
              {index < steps.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', color: colors.border.primary }}>
                  <ArrowRight size={20} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ 
          background: colors.bg.card, 
          borderRadius: '16px', 
          border: `1px solid ${colors.border.primary}`,
          padding: '40px'
        }}>
          {activeStep === 1 && (
            <>
              <StepHeader icon={<Terminal size={28} />} title="Step 1: Setup & Installation" />
              <p style={{ color: colors.text.secondary, marginBottom: '24px', lineHeight: '1.7' }}>
                Install the LemonMinted SDK using npm or yarn. The SDK supports TypeScript out of the box.
              </p>
              
              <CodeBlock
                id="install-npm"
                title="Using npm"
                code="npm install @lemonminted/sdk"
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />
              
              <CodeBlock
                id="install-yarn"
                title="Using yarn"
                code="yarn add @lemonminted/sdk"
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />

              <CodeBlock
                id="env-setup"
                title="Environment Variables (.env)"
                code={`LEMONMINTED_API_KEY=your_api_key_here
LEMONMINTED_PLATFORM_ID=your_platform_id
LEMONMINTED_NETWORK=mainnet  # or testnet`}
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />
            </>
          )}

          {activeStep === 2 && (
            <>
              <StepHeader icon={<Settings size={28} />} title="Step 2: Connect & Authenticate" />
              <p style={{ color: colors.text.secondary, marginBottom: '24px', lineHeight: '1.7' }}>
                Initialize the SDK with your credentials and connect to the LemonMinted API.
              </p>
              
              <CodeBlock
                id="init-sdk"
                title="Initialize SDK (TypeScript)"
                code={`import { LemonMinted } from '@lemonminted/sdk';

const client = new LemonMinted({
  apiKey: process.env.LEMONMINTED_API_KEY,
  platformId: process.env.LEMONMINTED_PLATFORM_ID,
  network: 'mainnet', // or 'testnet'
});

// Test connection
const status = await client.health.check();
console.log('Connected:', status.connected);
console.log('Network:', status.network);
console.log('Block Height:', status.blockHeight);`}
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />
            </>
          )}

          {activeStep === 3 && (
            <>
              <StepHeader icon={<Layers size={28} />} title="Step 3: Create USD Lock" />
              <p style={{ color: colors.text.secondary, marginBottom: '24px', lineHeight: '1.7' }}>
                Create a lock request to reserve USD for VUSD minting. The lock must be approved by all three signers.
              </p>
              
              <CodeBlock
                id="create-lock"
                title="Create Lock Request"
                code={`const lock = await client.locks.create({
  amount: '1000000.00',  // 1 million USD
  currency: 'USD',
  beneficiary: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE34',
  bankName: 'Digital Commercial Bank',
  reference: 'TREASURY-2026-001',
  metadata: {
    purpose: 'Treasury Reserve',
    department: 'Finance'
  }
});

console.log('Lock ID:', lock.lockId);
console.log('Authorization Code:', lock.authorizationCode);
console.log('Status:', lock.status); // 'pending'
console.log('Expires:', lock.expiresAt);`}
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />
            </>
          )}

          {activeStep === 4 && (
            <>
              <StepHeader icon={<CheckCircle size={28} />} title="Step 4: Multi-Signature Approval" />
              <p style={{ color: colors.text.secondary, marginBottom: '24px', lineHeight: '1.7' }}>
                Three signatures are required: DAES Operator, Bank Signer, and Protocol. 
                Subscribe to status updates to track approval progress.
              </p>
              
              <CodeBlock
                id="subscribe-status"
                title="Subscribe to Lock Status"
                code={`// Real-time status updates
const subscription = client.locks.subscribe(lock.lockId, (update) => {
  console.log('Status:', update.status);
  console.log('Signatures:', update.signatures);
  
  if (update.signatures.daes) {
    console.log('✓ DAES signed at', update.signatures.daes.timestamp);
  }
  if (update.signatures.bank) {
    console.log('✓ Bank signed at', update.signatures.bank.timestamp);
  }
  if (update.signatures.protocol) {
    console.log('✓ Protocol signed at', update.signatures.protocol.timestamp);
  }
  
  if (update.status === 'approved') {
    console.log('🎉 All signatures received! Ready to mint.');
    subscription.unsubscribe();
  }
});

// Or poll for status
const status = await client.locks.getStatus(lock.lockId);`}
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />
            </>
          )}

          {activeStep === 5 && (
            <>
              <StepHeader icon={<Zap size={28} />} title="Step 5: Mint VUSD Tokens" />
              <p style={{ color: colors.text.secondary, marginBottom: '24px', lineHeight: '1.7' }}>
                Once all signatures are collected, execute the mint to receive VUSD tokens on LemonChain.
              </p>
              
              <CodeBlock
                id="execute-mint"
                title="Execute Mint"
                code={`const mint = await client.mint.execute({
  lockId: lock.lockId,
  authorizationCode: lock.authorizationCode,
  beneficiary: '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE34'
});

console.log('🎉 Mint Successful!');
console.log('Mint ID:', mint.mintId);
console.log('Amount VUSD:', mint.amountVusd);
console.log('Publication Code:', mint.publicationCode);
console.log('Transaction Hash:', mint.txHash);
console.log('Block Number:', mint.blockNumber);

// Verify the mint
const verification = await client.verify(mint.publicationCode);
console.log('Verified:', verification.verified);
console.log('Certificate URL:', verification.certificateUrl);`}
                copiedCode={copiedCode}
                onCopy={copyToClipboard}
              />

              <div style={{ 
                marginTop: '32px', 
                padding: '20px', 
                background: `${colors.accent.primary}10`, 
                borderRadius: '12px',
                border: `1px solid ${colors.accent.primary}30`
              }}>
                <h4 style={{ color: colors.accent.primary, marginBottom: '12px' }}>
                  Complete Integration Example
                </h4>
                <p style={{ color: colors.text.secondary, fontSize: '14px' }}>
                  For a complete working example, visit our{' '}
                  <a href="https://github.com/lemonminted/examples" target="_blank" rel="noopener noreferrer" style={{ color: colors.accent.primary }}>
                    GitHub Examples Repository
                  </a>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '24px' 
        }}>
          <button
            onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
            disabled={activeStep === 1}
            style={{
              background: colors.bg.card,
              border: `1px solid ${colors.border.primary}`,
              borderRadius: '8px',
              padding: '12px 24px',
              color: activeStep === 1 ? colors.text.muted : colors.text.primary,
              cursor: activeStep === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ArrowLeft size={16} />
            Previous
          </button>
          <button
            onClick={() => setActiveStep(Math.min(5, activeStep + 1))}
            disabled={activeStep === 5}
            style={{
              background: activeStep === 5 ? colors.bg.card : colors.accent.primary,
              border: `1px solid ${activeStep === 5 ? colors.border.primary : colors.accent.primary}`,
              borderRadius: '8px',
              padding: '12px 24px',
              color: activeStep === 5 ? colors.text.muted : '#000',
              cursor: activeStep === 5 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600'
            }}
          >
            Next
            <ArrowRight size={16} />
          </button>
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

const StepHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
    <div style={{ color: colors.accent.primary }}>{icon}</div>
    <h2 style={{ fontSize: '24px', fontWeight: '600', color: colors.text.primary }}>{title}</h2>
  </div>
);

const CodeBlock: React.FC<{
  id: string;
  title: string;
  code: string;
  copiedCode: string | null;
  onCopy: (code: string, id: string) => void;
}> = ({ id, title, code, copiedCode, onCopy }) => (
  <div style={{ marginBottom: '20px' }}>
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

export default IntegrationGuide;
