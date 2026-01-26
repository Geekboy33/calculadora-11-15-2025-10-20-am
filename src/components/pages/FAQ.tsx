// ═══════════════════════════════════════════════════════════════════════════════
// FAQ PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Shield, Coins, Lock, Globe, Zap, Users } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16' }
};

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // General
  {
    category: 'General',
    question: 'What is LemonMinted Protocol?',
    answer: 'LemonMinted Protocol is the first transparent minting platform for certified stablecoins on LemonChain. We enable 1:1 backed USD stablecoins (VUSD) with full transparency through our three-signature verification system, real-time reserve auditing, and immutable blockchain records.'
  },
  {
    category: 'General',
    question: 'What makes VUSD different from other stablecoins?',
    answer: 'VUSD is unique because: (1) Every token is backed 1:1 by certified USD reserves held at Digital Commercial Bank, (2) All minting requires three independent signatures (DAES, Bank, Protocol), (3) Real-time reserve verification is publicly accessible, (4) Full ISO 20022 compliance for institutional integration, and (5) Complete transparency through our blockchain explorer.'
  },
  {
    category: 'General',
    question: 'Which blockchain does VUSD use?',
    answer: 'VUSD operates on LemonChain, a high-performance EVM-compatible blockchain with sub-second finality, 3,000+ TPS capacity, and ultra-low gas fees. LemonChain uses a Delegated Proof-of-Stake (DPoS) consensus for energy efficiency and scalability.'
  },
  // Minting Process
  {
    category: 'Minting',
    question: 'How does the minting process work?',
    answer: 'The minting process follows these steps: (1) Lock Request: USD funds are locked at Digital Commercial Bank, (2) Triple Signature: DAES Operator, Bank Signer, and Protocol each verify and sign, (3) Mint Execution: Once all signatures are collected, VUSD tokens are minted to the beneficiary address, (4) Verification: A unique publication code is issued for public verification.'
  },
  {
    category: 'Minting',
    question: 'Why are three signatures required?',
    answer: 'The three-signature system ensures maximum security and transparency: The DAES signature verifies regulatory compliance, the Bank signature confirms reserve backing, and the Protocol signature validates the technical execution. No single party can mint VUSD unilaterally, preventing fraud and unauthorized minting.'
  },
  {
    category: 'Minting',
    question: 'How long does minting take?',
    answer: 'Typical minting times vary based on signature collection: Small transactions (<$100K): Usually 15-30 minutes, Medium transactions ($100K-$1M): 1-2 hours, Large transactions (>$1M): Up to 24 hours for enhanced compliance review. All times assume normal business hours for signature collection.'
  },
  {
    category: 'Minting',
    question: 'What are the minimum and maximum minting amounts?',
    answer: 'Minimum: $10,000 USD equivalent. Maximum: $100,000,000 USD per transaction. For amounts exceeding $100M, please contact our institutional desk for custom arrangements. There are no daily limits for verified institutional partners.'
  },
  // Security
  {
    category: 'Security',
    question: 'How is VUSD backed?',
    answer: 'Every VUSD token is backed 1:1 by USD reserves held in custody at Digital Commercial Bank (DCB). Reserves are verified through: Real-time API integration with DCB, Monthly third-party audits, On-chain proof-of-reserves updated every block, and Smart contract verification of lock/mint ratios.'
  },
  {
    category: 'Security',
    question: 'Are the smart contracts audited?',
    answer: 'Yes, all LemonMinted smart contracts undergo rigorous security audits by leading firms. Current audit status: LockBox Contract: Audited by CertiK (Jan 2026), VUSD Token Contract: Audited by Trail of Bits (Dec 2025), Signature Verification: Audited by OpenZeppelin (Dec 2025). Audit reports are available upon request.'
  },
  {
    category: 'Security',
    question: 'What happens if a signature key is compromised?',
    answer: 'Our multi-signature system provides protection: All three keys would need to be compromised simultaneously to pose a risk. Each signer has independent key management and recovery procedures. Time-locked operations allow for emergency intervention. Real-time monitoring alerts for unusual signing patterns.'
  },
  // Integration
  {
    category: 'Integration',
    question: 'How can I integrate VUSD into my application?',
    answer: 'Integration is straightforward: (1) Install our SDK: npm install @lemonminted/sdk, (2) Obtain API credentials from our partner portal, (3) Follow our Integration Guide for step-by-step setup, (4) Test on our testnet before production deployment. Full API documentation is available at /api-reference.'
  },
  {
    category: 'Integration',
    question: 'Is there a testnet available?',
    answer: 'Yes, LemonMinted Testnet mirrors the mainnet environment with test tokens. Testnet RPC: https://testnet-rpc.lemonchain.io, Faucet: https://faucet.lemonchain.io, Explorer: https://testnet-explorer.lemonchain.io. All API endpoints work identically on testnet.'
  },
  {
    category: 'Integration',
    question: 'What are the API rate limits?',
    answer: 'Rate limits vary by tier: Standard: 60 requests/min, 10K daily, Professional: 300 requests/min, 100K daily, Enterprise: Unlimited. Webhook notifications are available for real-time updates without polling.'
  },
  // Compliance
  {
    category: 'Compliance',
    question: 'Is KYC/AML required?',
    answer: 'For institutional partners minting or redeeming VUSD: Full KYC/AML verification is required. For end-users holding or transferring VUSD: No KYC required for basic usage. Our compliance framework follows FATF guidelines and local regulations where applicable.'
  },
  {
    category: 'Compliance',
    question: 'Is VUSD available in all countries?',
    answer: 'VUSD is available globally except in sanctioned jurisdictions (OFAC, UN, EU sanctions lists). Certain features may be restricted based on local regulations. Contact our compliance team for specific jurisdiction inquiries.'
  }
];

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))];
  
  const filteredFAQ = activeCategory === 'All' 
    ? faqData 
    : faqData.filter(item => item.category === activeCategory);

  const toggleItem = (index: number) => {
    const newOpen = new Set(openItems);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenItems(newOpen);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'General': return <Globe size={16} />;
      case 'Minting': return <Coins size={16} />;
      case 'Security': return <Shield size={16} />;
      case 'Integration': return <Zap size={16} />;
      case 'Compliance': return <Users size={16} />;
      default: return <HelpCircle size={16} />;
    }
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
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>FAQ</span>
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
            <HelpCircle size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: '16px' }}>
            Find answers to common questions about LemonMinted Protocol
          </p>
        </div>

        {/* Category Filter */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '32px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              style={{
                background: activeCategory === category ? colors.accent.primary : colors.bg.card,
                border: `1px solid ${activeCategory === category ? colors.accent.primary : colors.border.primary}`,
                borderRadius: '20px',
                padding: '8px 16px',
                color: activeCategory === category ? '#000' : colors.text.secondary,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              {category !== 'All' && getCategoryIcon(category)}
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredFAQ.map((item, index) => (
            <div
              key={index}
              style={{
                background: colors.bg.card,
                borderRadius: '12px',
                border: `1px solid ${openItems.has(index) ? colors.accent.primary + '50' : colors.border.primary}`,
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}
            >
              <button
                onClick={() => toggleItem(index)}
                style={{
                  width: '100%',
                  padding: '20px 24px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    color: colors.accent.primary,
                    background: `${colors.accent.primary}15`,
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex'
                  }}>
                    {getCategoryIcon(item.category)}
                  </span>
                  <span style={{ 
                    color: colors.text.primary, 
                    fontSize: '15px', 
                    fontWeight: '500',
                    lineHeight: '1.4'
                  }}>
                    {item.question}
                  </span>
                </div>
                <div style={{ color: colors.accent.primary, flexShrink: 0 }}>
                  {openItems.has(index) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              {openItems.has(index) && (
                <div style={{ 
                  padding: '0 24px 20px 62px',
                  color: colors.text.secondary,
                  fontSize: '14px',
                  lineHeight: '1.7'
                }}>
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div style={{ 
          marginTop: '60px',
          padding: '32px',
          background: colors.bg.card,
          borderRadius: '16px',
          border: `1px solid ${colors.border.primary}`,
          textAlign: 'center'
        }}>
          <h3 style={{ color: colors.text.primary, marginBottom: '12px', fontSize: '20px' }}>
            Still have questions?
          </h3>
          <p style={{ color: colors.text.secondary, marginBottom: '24px' }}>
            Our team is here to help. Get in touch for personalized support.
          </p>
          <a
            href="/contact"
            style={{
              display: 'inline-block',
              background: colors.accent.primary,
              color: '#000',
              padding: '14px 32px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Contact Support
          </a>
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

export default FAQ;
