/**
 * Login Component - DAES Wealth Authentication
 * Diseño: Emirates NBD / JP Morgan Wealth Management
 * Tema: Wealth Dark Premium
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

  // Credenciales
  const VALID_USERNAME = 'admin';
  const VALID_PASSWORD = 'DAES2025';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular validación
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
    <div className="min-h-screen flex items-center justify-center p-6" style={{
      backgroundColor: 'var(--bg-main)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(79, 141, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(79, 141, 255, 0.03) 0%, transparent 50%)'
    }}>
      <div className="w-full max-w-md">
        {/* Logo y Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6" style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-lighter))',
            boxShadow: '0 8px 32px rgba(79, 141, 255, 0.3)'
          }}>
            <Building2 className="w-10 h-10" style={{ color: 'var(--text-inverse)' }} />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ 
            color: 'var(--text-primary)',
            fontWeight: 'var(--font-bold)'
          }}>
            Digital Commercial Bank
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
            DAES CoreBanking System
          </p>
        </div>

        {/* Card de Login */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--border-subtle)',
          padding: '2.5rem'
        }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                marginBottom: '0.5rem'
              }}>
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
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
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-base)',
                    outline: 'none',
                    transition: 'all var(--transition-base)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 141, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-subtle)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
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
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-base)',
                    outline: 'none',
                    transition: 'all var(--transition-base)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--border-focus)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 141, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-subtle)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: 'var(--status-error-bg)',
                border: '1px solid var(--status-error-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--status-error-text)' }} />
                <p style={{ color: 'var(--status-error-text)', fontSize: 'var(--text-sm)' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-semibold)',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: (isLoading || !username || !password) ? 0.5 : 1,
                transition: 'all var(--transition-base)',
                boxShadow: 'var(--shadow-md)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && username && password) {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              <Shield className="w-4 h-4" />
              <span>Secure Authentication • AES-256 Encrypted</span>
            </div>
            <div className="flex items-center justify-center gap-4" style={{ fontSize: 'var(--text-xs)' }}>
              <span style={{
                backgroundColor: 'var(--status-success-bg)',
                color: 'var(--status-success-text)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--status-success-border)',
                fontWeight: 'var(--font-semibold)'
              }}>
                ISO 27001
              </span>
              <span style={{
                backgroundColor: 'var(--status-info-bg)',
                color: 'var(--status-info-text)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--status-info-border)',
                fontWeight: 'var(--font-semibold)'
              }}>
                SOC 2
              </span>
              <span style={{
                backgroundColor: 'var(--status-success-bg)',
                color: 'var(--status-success-text)',
                padding: '0.25rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--status-success-border)',
                fontWeight: 'var(--font-semibold)'
              }}>
                PCI DSS
              </span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center mt-8" style={{ 
          color: 'var(--text-muted)', 
          fontSize: 'var(--text-xs)' 
        }}>
          © 2025 Digital Commercial Bank Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
