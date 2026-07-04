// Legacy API base URL for admin dashboard components
// This mimics the original ../../api.js export
const _api = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
  : '';

export const API = _api;
