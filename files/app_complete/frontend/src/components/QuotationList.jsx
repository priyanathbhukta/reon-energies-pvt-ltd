// frontend/src/components/QuotationList.jsx
import React, { useEffect, useState } from 'react';
import { quotationAPI } from '../api/quotations';

const C = {
  navy: '#1B2D5B', orange: '#E8611A', teal: '#1A8FA0',
  light: '#F4F6FA', border: '#D8DDE8', text: '#1A1A2E', mid: '#4A4A6A',
};

const STATUS_BADGE = {
  draft:    { bg:'#FFF3E0', color:'#E65100', label:'Draft' },
  sent:     { bg:'#E3F2FD', color:'#0D47A1', label:'Sent' },
  accepted: { bg:'#E8F5E9', color:'#1B5E20', label:'Accepted' },
  rejected: { bg:'#FFEBEE', color:'#B71C1C', label:'Rejected' },
  expired:  { bg:'#F3E5F5', color:'#4A148C', label:'Expired' },
};

function Badge({ status }) {
  const s = STATUS_BADGE[status] || { bg:C.light, color:C.mid, label:status };
  return (
    <span style={{ background:s.bg, color:s.color, borderRadius:4,
                   padding:'2px 8px', fontSize:11, fontWeight:700 }}>
      {s.label}
    </span>
  );
}

export default function QuotationList({ onNew, onView }) {
  const [data,    setData]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const [delId,   setDelId]   = useState(null);

  const load = async (p=1, q='') => {
    setLoading(true);
    try {
      const res = await quotationAPI.list({ page:p, limit:15, search:q });
      setData(res.data); setTotal(res.total);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(page, search); }, [page]);

  const handleSearch = e => {
    setSearch(e.target.value);
    setPage(1);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => load(1, e.target.value), 400);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quotation and its PDF?')) return;
    setDelId(id);
    try {
      await quotationAPI.delete(id);
      load(page, search);
    } catch(e) { alert(e.message); }
    finally { setDelId(null); }
  };

  const handleRegenerate = async (id) => {
    if (!window.confirm('Regenerate PDF for this quotation?')) return;
    try {
      await quotationAPI.regenerate(id);
      alert('PDF regenerated successfully!');
    } catch(e) { alert('Failed: ' + e.message); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:16, alignItems:'center' }}>
        <input
          value={search} onChange={handleSearch}
          placeholder="Search by customer name or offer no…"
          style={{ flex:1, padding:'9px 14px', border:`1.5px solid ${C.border}`,
                   borderRadius:8, fontSize:13, outline:'none' }}
        />
        <button onClick={onNew}
                style={{ padding:'9px 20px', background:C.orange, color:'white',
                          border:'none', borderRadius:8, fontWeight:700,
                          fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>
          + New Quotation
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ fontSize:12, color:C.mid, marginBottom:12 }}>
        {total} quotation{total !== 1 ? 's' : ''} found
        {loading && <span style={{ marginLeft:8, color:C.teal }}>Loading…</span>}
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:C.navy }}>
              {['Offer No.','Customer','Capacity','Total Price','Status',
                'Issue Date','Valid Till','Actions'].map(h => (
                <th key={h} style={{ padding:'9px 12px', color:'white',
                                     textAlign:'left', fontWeight:600,
                                     fontSize:12, whiteSpace:'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:40,
                                           color:C.mid, fontSize:13 }}>
                No quotations yet. Click <b>+ New Quotation</b> to get started.
              </td></tr>
            )}
            {data.map((q, i) => (
              <tr key={q.id}
                  style={{ background: i%2===0?'white':C.light,
                            borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:'8px 12px', fontWeight:700, color:C.teal }}>
                  {q.offer_no}
                </td>
                <td style={{ padding:'8px 12px', maxWidth:180,
                             overflow:'hidden', textOverflow:'ellipsis',
                             whiteSpace:'nowrap' }}>
                  {q.customer_name}
                </td>
                <td style={{ padding:'8px 12px', color:C.navy, fontWeight:600 }}>
                  {q.capacity}
                </td>
                <td style={{ padding:'8px 12px', fontWeight:600 }}>
                  ₹ {q.total_price}
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <Badge status={q.status} />
                </td>
                <td style={{ padding:'8px 12px', color:C.mid, fontSize:12 }}>
                  {q.issue_date ? new Date(q.issue_date).toLocaleDateString('en-IN') : '—'}
                </td>
                <td style={{ padding:'8px 12px', color:C.mid, fontSize:12 }}>
                  {q.valid_till ? new Date(q.valid_till).toLocaleDateString('en-IN') : '—'}
                </td>
                <td style={{ padding:'8px 12px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    {/* View */}
                    <button onClick={() => onView && onView(q)}
                            title="View details"
                            style={btnStyle('#E3F2FD','#0D47A1')}>👁</button>
                    {/* Download PDF */}
                    <a href={quotationAPI.downloadURL(q.id)}
                       target="_blank" rel="noreferrer"
                       title="Download PDF"
                       style={{ ...btnStyle('#E8F5E9','#1B5E20'),
                                textDecoration:'none' }}>⬇</a>
                    {/* Regenerate */}
                    <button onClick={() => handleRegenerate(q.id)}
                            title="Regenerate PDF"
                            style={btnStyle('#FFF3E0','#E65100')}>🔄</button>
                    {/* Delete */}
                    <button onClick={() => handleDelete(q.id)}
                            disabled={delId===q.id}
                            title="Delete"
                            style={btnStyle('#FFEBEE','#B71C1C')}>
                      {delId===q.id ? '…' : '🗑'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', gap:6, justifyContent:'center',
                      marginTop:16, alignItems:'center' }}>
          <button onClick={() => setPage(p => Math.max(1,p-1))}
                  disabled={page===1} style={pgBtn(page===1)}>←</button>
          {Array.from({length:totalPages},(_, i)=>i+1)
            .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=2)
            .reduce((acc, p, i, arr) => {
              if (i>0 && arr[i-1]!==p-1) acc.push('…');
              acc.push(p); return acc;
            }, [])
            .map((p, i) => typeof p === 'number'
              ? <button key={i} onClick={() => setPage(p)}
                        style={{ ...pgBtn(false),
                                 background: p===page ? C.navy : 'white',
                                 color:      p===page ? 'white' : C.text }}>
                  {p}
                </button>
              : <span key={i} style={{ color:C.mid }}>…</span>
            )}
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))}
                  disabled={page===totalPages} style={pgBtn(page===totalPages)}>→</button>
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg, color) => ({
  background:bg, color, border:'none', borderRadius:5,
  padding:'5px 9px', cursor:'pointer', fontSize:13,
});
const pgBtn = disabled => ({
  padding:'6px 12px', border:`1px solid ${C.border}`,
  borderRadius:6, background:'white', cursor: disabled?'not-allowed':'pointer',
  opacity: disabled ? 0.4 : 1, fontSize:13,
});
