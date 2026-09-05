const fallbackHostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const defaultApiUrl = `http://${fallbackHostname}:8000`;

// In production, we'll use the Vercel environment variable. Locally, it falls back to localhost:8000
export const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

// Ensure WebSocket uses wss:// if the API URL is https://
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
