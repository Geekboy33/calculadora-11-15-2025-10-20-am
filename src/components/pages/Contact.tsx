// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT PAGE - LemonMinted Protocol
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageSquare, Building2, Clock, Send, CheckCircle, Globe, Headphones } from 'lucide-react';

const colors = {
  bg: { primary: '#030706', secondary: '#080C0A', card: '#0A0E0C' },
  border: { primary: '#1A2420', accent: '#A3E635' },
  text: { primary: '#FFFFFF', secondary: '#94A3B8', muted: '#64748B', accent: '#A3E635' },
  accent: { primary: '#A3E635', secondary: '#84CC16' }
};

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setSubmitted(true);
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
        <span style={{ color: colors.accent.primary, fontWeight: '600' }}>Contact Us</span>
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
            <MessageSquare size={40} style={{ color: colors.accent.primary }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            marginBottom: '16px',
            background: `linear-gradient(135deg, ${colors.text.primary}, ${colors.accent.primary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Contact Us
          </h1>
          <p style={{ color: colors.text.secondary, fontSize: '16px' }}>
            Get in touch with our team for support or partnership inquiries
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          {/* Contact Info */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <ContactCard
                icon={<Mail size={24} />}
                title="General Inquiries"
                description="For general questions about the protocol"
                contact="info@lemonminted.io"
                type="email"
              />
              <ContactCard
                icon={<Headphones size={24} />}
                title="Technical Support"
                description="For API and integration assistance"
                contact="support@lemonminted.io"
                type="email"
              />
              <ContactCard
                icon={<Building2 size={24} />}
                title="Institutional Partners"
                description="For large-scale partnerships"
                contact="partners@lemonminted.io"
                type="email"
              />
              <ContactCard
                icon={<Globe size={24} />}
                title="Global Offices"
                description="Headquarters"
                contact="Dubai, UAE"
                type="text"
              />
            </div>

            <div style={{ 
              marginTop: '32px',
              padding: '24px',
              background: colors.bg.card,
              borderRadius: '12px',
              border: `1px solid ${colors.border.primary}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Clock size={20} style={{ color: colors.accent.primary }} />
                <h4 style={{ color: colors.text.primary, fontSize: '16px' }}>Response Times</h4>
              </div>
              <div style={{ color: colors.text.secondary, fontSize: '14px', lineHeight: '1.8' }}>
                <p><strong style={{ color: colors.text.primary }}>General Inquiries:</strong> 24-48 hours</p>
                <p><strong style={{ color: colors.text.primary }}>Technical Support:</strong> 4-8 hours</p>
                <p><strong style={{ color: colors.text.primary }}>Partnership:</strong> 1-3 business days</p>
                <p><strong style={{ color: colors.text.primary }}>Emergency:</strong> &lt; 1 hour (for critical issues)</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div style={{ 
            background: colors.bg.card, 
            borderRadius: '16px', 
            border: `1px solid ${colors.border.primary}`,
            padding: '32px'
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: `${colors.accent.primary}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}>
                  <CheckCircle size={40} style={{ color: colors.accent.primary }} />
                </div>
                <h3 style={{ color: colors.text.primary, marginBottom: '12px', fontSize: '24px' }}>
                  Message Sent!
                </h3>
                <p style={{ color: colors.text.secondary, marginBottom: '24px' }}>
                  Thank you for reaching out. We'll get back to you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.accent.primary}`,
                    color: colors.accent.primary,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ color: colors.text.primary, marginBottom: '24px', fontSize: '20px' }}>
                  Send us a message
                </h3>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <FormInput
                      label="Name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                    <FormInput
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <FormInput
                    label="Company (Optional)"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      color: colors.text.secondary, 
                      fontSize: '13px', 
                      marginBottom: '8px' 
                    }}>
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: colors.bg.secondary,
                        border: `1px solid ${colors.border.primary}`,
                        borderRadius: '8px',
                        color: colors.text.primary,
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="partnership">Partnership</option>
                      <option value="integration">API Integration</option>
                      <option value="compliance">Compliance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      color: colors.text.secondary, 
                      fontSize: '13px', 
                      marginBottom: '8px' 
                    }}>
                      Message
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      rows={5}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: colors.bg.secondary,
                        border: `1px solid ${colors.border.primary}`,
                        borderRadius: '8px',
                        color: colors.text.primary,
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      background: colors.accent.primary,
                      border: 'none',
                      borderRadius: '8px',
                      color: '#000',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    <Send size={18} />
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
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

const ContactCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  contact: string;
  type: 'email' | 'text';
}> = ({ icon, title, description, contact, type }) => (
  <div style={{ 
    background: colors.bg.card, 
    borderRadius: '12px', 
    border: `1px solid ${colors.border.primary}`,
    padding: '24px',
    display: 'flex',
    gap: '16px'
  }}>
    <div style={{ 
      color: colors.accent.primary,
      background: `${colors.accent.primary}15`,
      padding: '12px',
      borderRadius: '10px',
      height: 'fit-content'
    }}>
      {icon}
    </div>
    <div>
      <h4 style={{ color: colors.text.primary, marginBottom: '4px', fontSize: '16px' }}>{title}</h4>
      <p style={{ color: colors.text.muted, fontSize: '13px', marginBottom: '8px' }}>{description}</p>
      {type === 'email' ? (
        <a 
          href={`mailto:${contact}`}
          style={{ color: colors.accent.primary, textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
        >
          {contact}
        </a>
      ) : (
        <span style={{ color: colors.text.secondary, fontSize: '14px' }}>{contact}</span>
      )}
    </div>
  </div>
);

const FormInput: React.FC<{
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}> = ({ label, type, value, onChange, required }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ 
      display: 'block', 
      color: colors.text.secondary, 
      fontSize: '13px', 
      marginBottom: '8px' 
    }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: colors.bg.secondary,
        border: `1px solid ${colors.border.primary}`,
        borderRadius: '8px',
        color: colors.text.primary,
        fontSize: '14px',
        outline: 'none'
      }}
    />
  </div>
);

export default Contact;
