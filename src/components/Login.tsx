/**
 * Login Component - DAES Dark Theme
 * Diseño: Fondo negro, texto blanco, iconos azules
 * Tema: Dark Mode - Negro con acentos azules
 */

import { useState } from 'react';
import { Lock, User, Eye, EyeOff, Shield, Building2 } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const VALID_USERNAME = 'operator';
  const VALID_PASSWORD = 'Eldiosdelacero34@';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem('daes_authenticated', 'true');
      localStorage.setItem('daes_user', username);
      localStorage.setItem('daes_login_time', new Date().toISOString());
      onLogin();
    } else {
      setError('Invalid credentials. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: '#000000',
      fontFamily: 'Inter, sans-serif'
    }}>
      <style>{`
        input::placeholder {
          color: #6B7280 !important;
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #1A4DB3 0%, #003B7C 100%)',
            boxShadow: '0 8px 24px rgba(26, 77, 179, 0.25)',
            marginBottom: '1.5rem'
          }}>
            <Building2 style={{ width: '40px', height: '40px', color: '#FFFFFF' }} />
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}>
            Digital Commercial Bank
          </h1>
          <a 
            href="https://digcommbank.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#1A4DB3', 
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'block',
              marginBottom: '0.5rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3464C9'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#1A4DB3'}
          >
            https://digcommbank.com/
          </a>
          <p style={{ color: '#D1D5DB', fontSize: '1rem' }}>
            DAES CoreBanking System
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#0d0d0d',
          borderRadius: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
          border: '1px solid #1a1a1a',
          padding: '2.5rem'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Username */}
            <div>
              <label style={{
                display: 'block',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#1A4DB3'
                }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '3rem',
                    paddingRight: '1rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    backgroundColor: '#141414',
                    border: '1px solid #1a1a1a',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1A4DB3';
                    e.target.style.boxShadow = '0 0 0 3px rgba(26, 77, 179, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#1a1a1a';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#1A4DB3'
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{
                    width: '100%',
                    paddingLeft: '3rem',
                    paddingRight: '3rem',
                    paddingTop: '0.875rem',
                    paddingBottom: '0.875rem',
                    backgroundColor: '#141414',
                    border: '1px solid #1a1a1a',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1A4DB3';
                    e.target.style.boxShadow = '0 0 0 3px rgba(26, 77, 179, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#1a1a1a';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#1A4DB3'
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #E85C5C',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                gap: '0.75rem'
              }}>
                <p style={{ color: '#E85C5C', fontSize: '0.875rem' }}>{error}</p>
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #1A4DB3 0%, #003B7C 100%)',
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '12px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !username || !password) ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(26, 77, 179, 0.25)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && username && password) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #003B7C 0%, #002A5C 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(26, 77, 179, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1A4DB3 0%, #003B7C 100%)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 77, 179, 0.25)';
              }}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Compliance */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#D1D5DB', fontSize: '0.75rem' }}>
              <Shield style={{ width: '16px', height: '16px', color: '#1A4DB3' }} />
              <span>Secure Authentication • AES-256</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{
                backgroundColor: '#141414',
                color: '#59C27A',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #59C27A',
                fontWeight: 600
              }}>ISO 27001</span>
              <span style={{
                backgroundColor: '#141414',
                color: '#1A4DB3',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #1A4DB3',
                fontWeight: 600
              }}>SOC 2</span>
              <span style={{
                backgroundColor: '#141414',
                color: '#59C27A',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #59C27A',
                fontWeight: 600
              }}>PCI DSS</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '2rem', color: '#D1D5DB', fontSize: '0.75rem' }}>
          © 2025 Digital Commercial Bank Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
