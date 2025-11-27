/**
 * Login Component - DAES Wealth Light
 * Diseño: Emirates NBD Wealth (de las imágenes proporcionadas)
 * Tema: Light Mode - Azul claro suave
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

  const VALID_USERNAME = 'admin';
  const VALID_PASSWORD = 'DAES2025';

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
      background: 'linear-gradient(180deg, #EEF4FF 0%, #F5F7FA 100%)',
      fontFamily: 'Inter, sans-serif'
    }}>
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
            color: '#0E1525',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}>
            Digital Commercial Bank
          </h1>
          <p style={{ color: '#4A4F55', fontSize: '1rem' }}>
            DAES CoreBanking System
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 2px 8px rgba(0, 59, 124, 0.08)',
          border: '1px solid #E2E6EE',
          padding: '2.5rem'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Username */}
            <div>
              <label style={{
                display: 'block',
                color: '#4A4F55',
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
                  color: '#C7CCD6'
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
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E6EE',
                    borderRadius: '12px',
                    color: '#0E1525',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1A4DB3';
                    e.target.style.boxShadow = '0 0 0 3px rgba(26, 77, 179, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E6EE';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                color: '#4A4F55',
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
                  color: '#C7CCD6'
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
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E6EE',
                    borderRadius: '12px',
                    color: '#0E1525',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1A4DB3';
                    e.target.style.boxShadow = '0 0 0 3px rgba(26, 77, 179, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E6EE';
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
                    color: '#C7CCD6'
                  }}
                >
                  {showPassword ? <EyeOff style={{ width: '20px', height: '20px' }} /> : <Eye style={{ width: '20px', height: '20px' }} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                gap: '0.75rem'
              }}>
                <p style={{ color: '#DC2626', fontSize: '0.875rem' }}>{error}</p>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#C7CCD6', fontSize: '0.75rem' }}>
              <Shield style={{ width: '16px', height: '16px' }} />
              <span>Secure Authentication • AES-256</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BBF7D0',
                fontWeight: 600
              }}>ISO 27001</span>
              <span style={{
                backgroundColor: '#EEF4FF',
                color: '#1A4DB3',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BFDBFE',
                fontWeight: 600
              }}>SOC 2</span>
              <span style={{
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid #BBF7D0',
                fontWeight: 600
              }}>PCI DSS</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '2rem', color: '#C7CCD6', fontSize: '0.75rem' }}>
          © 2025 Digital Commercial Bank Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
