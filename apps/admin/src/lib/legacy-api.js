// Legacy API base URL for admin dashboard components
// This mimics the original ../../api.js export
const _api = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
  : '';

export const API = _api;

export async function parseJsonSafely(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (_) {
      throw new Error(`Invalid JSON response from server (${response.status} ${response.statusText})`);
    }
  }
  const text = await response.text().catch(() => '');
  const match = text.match(/<pre>([\s\S]*?)<\/pre>/i);
  const cleanMsg = match ? match[1] : text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  throw new Error(cleanMsg.slice(0, 160) || `Server error (${response.status} ${response.statusText})`);
}
