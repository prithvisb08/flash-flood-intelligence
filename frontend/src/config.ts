const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

export const API_BASE_URL = `http://${hostname}:8000`;
export const WS_BASE_URL = `ws://${hostname}:8000`;
