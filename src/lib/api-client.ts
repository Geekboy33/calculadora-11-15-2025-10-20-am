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
    // En desarrollo local, usar servidor directo
    if (import.meta.env.DEV) {
      const API_BASE = 'http://localhost:8788';
      const DAES_API_KEY = 'por_1763215039421_v9p76zcxqxd';
      const DAES_SECRET_KEY = 'sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs';
      
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

