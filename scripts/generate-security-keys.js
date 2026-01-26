#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LEMONMINTED - SECURITY KEY GENERATOR
 * Generates cryptographically secure keys for production deployment
 * 
 * Usage: node scripts/generate-security-keys.js
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const crypto = require('crypto');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🔐 LEMONMINTED SECURITY KEY GENERATOR');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

// Generate secure random hex strings
const generateSecureKey = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

// Generate keys
const encryptionKey = generateSecureKey(32); // 256-bit key
const hmacSecret = generateSecureKey(32);     // 256-bit secret
const webhookSecret = generateSecureKey(24);   // 192-bit secret

console.log('📋 Copy these values to your .env file:\n');
console.log('───────────────────────────────────────────────────────────────────────────────');
console.log(`VITE_ENCRYPTION_KEY=${encryptionKey}`);
console.log(`VITE_HMAC_SECRET=${hmacSecret}`);
console.log(`VITE_WEBHOOK_SECRET=${webhookSecret}`);
console.log('───────────────────────────────────────────────────────────────────────────────\n');

console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. Never share these keys publicly');
console.log('   2. Never commit .env file to version control');
console.log('   3. Store backups securely (password manager recommended)');
console.log('   4. Rotate keys periodically (every 90 days recommended)');
console.log('   5. Use different keys for staging and production\n');

console.log('✅ Keys generated successfully!\n');
