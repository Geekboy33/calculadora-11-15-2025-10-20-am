/**
 * Login Component - DAES Dark Theme
 * Diseño: Fondo negro, texto blanco, iconos azules
 * Migrado a CSS Modules con mejoras de accesibilidad
 */

import { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, Shield, Building2, AlertTriangle } from 'lucide-react';
import { loginSecurity } from '../lib/login-security';
import styles from './Login.module.css';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Credenciales válidas (password hash SHA-256)
  const VALID_USERNAME = 'operator';
  const VALID_PASSWORD_HASH = 'a226ff8eadee0fb1594b2e1665b90593b3f28d971d2cadd844f772c1570a7d63';

  // Verificar bloqueo al cargar
  useEffect(() => {
    const checkBlocked = () => {
      const blockStatus = loginSecurity.isBlocked(username || 'default');
      if (blockStatus.blocked && blockStatus.blockedUntil) {
        setBlockedUntil(blockStatus.blockedUntil);
        const now = Date.now();
        const blockedTime = blockStatus.blockedUntil.getTime();
        if (blockedTime > now) {
          const minutes = Math.ceil((blockedTime - now) / 60000);
          setError(`Account temporarily blocked. Try again in ${minutes} minute(s).`);
        }
      } else {
        setBlockedUntil(null);
      }
    };

    checkBlocked();
    const interval = setInterval(checkBlocked, 1000);
    return () => clearInterval(interval);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setRemainingAttempts(null);

    try {
      // Usar módulo de seguridad para autenticación
      const result = await loginSecurity.authenticate(
        username,
        password,
        VALID_USERNAME,
        VALID_PASSWORD_HASH
      );

      if (result.success) {
        // Login exitoso
        localStorage.setItem('daes_authenticated', 'true');
        localStorage.setItem('daes_user', username);
        localStorage.setItem('daes_login_time', new Date().toISOString());
        onLogin();
      } else {
        // Login fallido
        setError(result.error || 'Invalid credentials. Please try again.');
        setIsLoading(false);
        
        if (result.blocked && result.blockedUntil) {
          setBlockedUntil(result.blockedUntil);
        }
        
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
        }
      }
    } catch (err) {
      console.error('[Login] Security error:', err);
      setError('Security error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const isBlocked = blockedUntil !== null && blockedUntil.getTime() > Date.now();
  const isDisabled = isLoading || !username || !password || isBlocked;

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginWrapper}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <Building2 aria-hidden="true" />
          </div>
          <h1 className={styles.title}>
            Digital Commercial Bank
          </h1>
          <a 
            href="https://digcommbank.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.websiteLink}
            aria-label="Visit Digital Commercial Bank website"
          >
            https://digcommbank.com/
          </a>
          <p className={styles.subtitle}>
            DAES CoreBanking System
          </p>
        </div>

        {/* Card */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Username */}
            <div className={styles.fieldGroup}>
              <label htmlFor="username" className={styles.label}>
                Username
              </label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className={styles.input}
                  aria-label="Username input"
                  aria-required="true"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className={styles.fieldGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className={`${styles.input} ${styles.passwordInput}`}
                  aria-label="Password input"
                  aria-required="true"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.errorContainer} role="alert" aria-live="polite">
                <AlertTriangle className={styles.errorIcon} aria-hidden="true" />
                <div className={styles.errorContent}>
                  <p className={styles.errorMessage}>{error}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className={styles.errorDetails}>
                      {remainingAttempts} attempt(s) remaining before account lockout.
                    </p>
                  )}
                  {blockedUntil && (
                    <p className={styles.errorDetails}>
                      Blocked until: {blockedUntil.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={isDisabled}
              className={styles.submitButton}
              aria-label="Sign in to Digital Commercial Bank"
              aria-busy={isLoading}
            >
              {isLoading 
                ? 'Authenticating...' 
                : isBlocked
                  ? 'Account Blocked'
                  : 'Sign In'}
            </button>
          </form>

          {/* Compliance */}
          <div className={styles.complianceSection}>
            <div className={styles.complianceHeader}>
              <Shield aria-hidden="true" />
              <span>Secure Authentication • AES-256</span>
            </div>
            <div className={styles.badgesContainer}>
              <span className={`${styles.badge} ${styles.badgeISO}`} aria-label="ISO 27001 Certified">
                ISO 27001
              </span>
              <span className={`${styles.badge} ${styles.badgeSOC}`} aria-label="SOC 2 Type II Certified">
                SOC 2
              </span>
              <span className={`${styles.badge} ${styles.badgePCI}`} aria-label="PCI DSS Compliant">
                PCI DSS
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className={styles.footer}>
          © 2025 Digital Commercial Bank Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
