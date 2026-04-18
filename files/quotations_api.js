// frontend/src/api/quotations.js
// Thin wrapper around fetch() for the quotation API
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

async function _req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const quotationAPI = {
  create:     (data)          => _req('POST',   '/quotations',              data),
  list:       (params = {})   => _req('GET',    '/quotations?' + new URLSearchParams(params).toString()),
  get:        (id)            => _req('GET',    `/quotations/${id}`),
  update:     (id, data)      => _req('PATCH',  `/quotations/${id}`,        data),
  delete:     (id)            => _req('DELETE', `/quotations/${id}`),
  regenerate: (id)            => _req('POST',   `/quotations/${id}/regenerate`),
  downloadURL:(id)            => `${BASE}/quotations/${id}/download`,
};
