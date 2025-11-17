/**
 * API Client for Secure Requests
 * Uses Netlify Functions to keep secrets server-side
 */

export async function secureAPIRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
) {
  try {
    // En desarrollo local, usar servidor directo con claves de env
    if (import.meta.env.DEV) {
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8788';
      const DAES_API_KEY = import.meta.env.VITE_DAES_API_KEY || 'por_dev_key';
      const DAES_SECRET_KEY = import.meta.env.VITE_DAES_SECRET_KEY || 'sk_dev_secret';
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAES_API_KEY}`,
          'X-Secret-Key': DAES_SECRET_KEY,
        },
        body: method !== 'GET' && body ? JSON.stringify(body) : undefined,
      });
      
      return await response.json();
    }
    
    // En producción, usar Netlify Function (claves en servidor)
    const response = await fetch('/.netlify/functions/proof-of-reserves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, method, body }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('[API Client] Error:', err);
    throw err;
  }
}

