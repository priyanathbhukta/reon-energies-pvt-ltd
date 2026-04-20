const _api = import.meta.env.VITE_API_URL;
if (!_api) {
  console.error(
    '❌ VITE_API_URL is not set! ' +
    'Go to Vercel → Project Settings → Environment Variables and add VITE_API_URL ' +
    'pointing to your Render backend URL (e.g. https://reon-energies-pvt-ltd.onrender.com).'
  );
}
export const API = _api || '';
