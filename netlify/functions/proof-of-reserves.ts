import type { Handler } from '@netlify/functions';

// Claves desde variables de entorno (configurar en Netlify)
const DAES_API_KEY = process.env.DAES_API_KEY || '';
const DAES_SECRET_KEY = process.env.DAES_SECRET_KEY || '';
const API_BASE = process.env.API_BASE || 'http://localhost:8788';

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { endpoint, method = 'GET', body: requestBody } = JSON.parse(event.body || '{}');

    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_REQUEST', message: 'endpoint is required' })
      };
    }

    // Hacer la petición al servidor API con las claves desde env
    const url = `${API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAES_API_KEY}`,
        'X-Secret-Key': DAES_SECRET_KEY,
      },
      body: method !== 'GET' && requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };

  } catch (err: any) {
    console.error('[Netlify Function] Error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: err?.message || 'Internal Error' })
    };
  }
};

