// frontend/src/pages/QuotationPage.jsx
// Drop this page into your React Router:
//   <Route path="/quotations" element={<QuotationPage />} />
import React, { useState } from 'react';
import QuotationForm from '../components/QuotationForm';
import QuotationList from '../components/QuotationList';
import { useQuotations } from '../hooks/useQuotations';
import { quotationAPI }  from '../api/quotations';

const C = {
  navy:'#1B2D5B', orange:'#E8611A', teal:'#1A8FA0',
  light:'#F4F6FA', border:'#D8DDE8', text:'#1A1A2E', mid:'#4A4A6A',
};

/* ── Success card shown after PDF generation ─────────────────────────────── */
function SuccessCard({ quotation, onNew, onList }) {
  return (
    <div style={{ textAlign:'center', padding:'40px 20px',
                  fontFamily:'system-ui,sans-serif' }}>
      <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
      <h2 style={{ color:C.navy, margin:'0 0 6px' }}>Quotation Generated!</h2>
      <p style={{ color:C.mid, fontSize:14, margin:'0 0 20px' }}>
        <strong>{quotation.offer_no}</strong> — for{' '}
        <strong>{quotation.customer_name}</strong>
      </p>
      <p style={{ color:C.mid, fontSize:13, marginBottom:28 }}>
        The PDF is being generated. It will be available to download in a few seconds.
      </p>
      <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
        <a href={quotationAPI.downloadURL(quotation.id)}
           target="_blank" rel="noreferrer"
           style={{ padding:'11px 26px', background:C.teal, color:'white',
                    border:'none', borderRadius:8, fontWeight:700,
                    fontSize:13, textDecoration:'none', cursor:'pointer' }}>
          ⬇ Download PDF
        </a>
        <button onClick={onNew}
                style={{ padding:'11px 26px', background:C.orange, color:'white',
                          border:'none', borderRadius:8, fontWeight:700,
                          fontSize:13, cursor:'pointer' }}>
          + New Quotation
        </button>
        <button onClick={onList}
                style={{ padding:'11px 26px', background:'white',
                          border:`1.5px solid ${C.border}`, borderRadius:8,
                          fontWeight:600, fontSize:13, cursor:'pointer',
                          color:C.text }}>
          ☰ All Quotations
        </button>
      </div>
    </div>
  );
}

/* ── Detail view for a selected quotation ────────────────────────────────── */
function QuotationDetail({ quotation, onBack }) {
  const q = quotation;
  const rows = [
    ['Offer No.',          q.offer_no],
    ['Issue Date',         q.issue_date && new Date(q.issue_date).toLocaleDateString('en-IN')],
    ['Valid Till',         q.valid_till && new Date(q.valid_till).toLocaleDateString('en-IN')],
    ['Customer Name',      q.customer_name],
    ['Address',            q.address],
    ['Contact',            q.contact_number],
    ['Email',              q.email],
    ['State',              q.state],
    ['Project Category',   q.project_category],
    ['Roof Type',          q.roof_type],
    ['DISCOM',             q.electricity_provider],
    ['Monthly Bill',       q.monthly_bill ? '₹ '+q.monthly_bill : ''],
    ['Power Factor',       q.power_factor],
    ['Capacity',           q.capacity],
    ['Module Technology',  q.module_technology],
    ['Inverter Type',      q.inverter_type],
    ['Brands',             q.brands],
    ['Power Evacuation',   q.power_evacuation],
    ['Project Type',       q.project_type],
    ['Base Price',         q.base_price ? '₹ '+q.base_price : ''],
    ['GST @ 5%',          q.gst_amount  ? '₹ '+q.gst_amount  : ''],
    ['Total Price',        q.total_price ? '₹ '+q.total_price : ''],
  ];

  return (
    <div style={{ fontFamily:'system-ui,sans-serif' }}>
      <button onClick={onBack}
              style={{ marginBottom:16, background:'white', border:`1.5px solid ${C.border}`,
                        borderRadius:7, padding:'7px 16px', cursor:'pointer',
                        fontSize:13, fontWeight:600, color:C.text }}>
        ← Back to list
      </button>
      <div style={{ background:C.navy, borderRadius:10, padding:'14px 20px',
                    marginBottom:20, display:'flex', justifyContent:'space-between',
                    alignItems:'center' }}>
        <div>
          <div style={{ color:'white', fontWeight:700, fontSize:16 }}>
            {q.offer_no}
          </div>
          <div style={{ color:'#AABBDD', fontSize:12 }}>{q.customer_name}</div>
        </div>
        <a href={quotationAPI.downloadURL(q.id)}
           target="_blank" rel="noreferrer"
           style={{ padding:'8px 18px', background:C.orange, color:'white',
                    border:'none', borderRadius:7, fontWeight:700,
                    fontSize:13, textDecoration:'none' }}>
          ⬇ Download PDF
        </a>
      </div>

      <div style={{ background:'white', border:`1.5px solid ${C.border}`,
                    borderRadius:10, overflow:'hidden' }}>
        {rows.filter(([,v])=>v).map(([label, value], i) => (
          <div key={label}
               style={{ display:'flex', background: i%2===0?'white':C.light,
                         borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
            <div style={{ width:'38%', padding:'8px 14px',
                          fontWeight:700, color:C.teal }}>{label}</div>
            <div style={{ flex:1, padding:'8px 14px', color:C.text }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═════════════════════════════════════════════════════════════════════════════ */
export default function QuotationPage() {
  const [view,      setView]      = useState('list');  // list | form | success | detail
  const [created,   setCreated]   = useState(null);
  const [selected,  setSelected]  = useState(null);
  const { loading, error, createQuotation, clearError } = useQuotations();

  const handleSubmit = async (formData) => {
    clearError();
    try {
      const q = await createQuotation(formData);
      setCreated(q);
      setView('success');
    } catch { /* error handled in hook */ }
  };

  const tabs = [
    { id:'list', label:'📋 All Quotations' },
    { id:'form', label:'➕ New Quotation' },
  ];

  return (
    <div style={{ maxWidth:920, margin:'0 auto', padding:'24px 16px',
                  fontFamily:'system-ui,sans-serif' }}>

      {/* Page title */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, color:C.navy, fontSize:22, fontWeight:800 }}>
          Solar Quotation Generator
        </h1>
        <p style={{ margin:'4px 0 0', color:C.mid, fontSize:13 }}>
          REON Energies Pvt Ltd — Automated PDF quotation system
        </p>
      </div>

      {/* Tab bar (only on list / form views) */}
      {(view==='list'||view==='form') && (
        <div style={{ display:'flex', gap:4, marginBottom:20,
                      borderBottom:`2px solid ${C.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setView(t.id); clearError(); }}
                    style={{ padding:'9px 20px', border:'none', borderRadius:'7px 7px 0 0',
                              background: view===t.id ? C.navy : 'transparent',
                              color: view===t.id ? 'white' : C.mid,
                              fontWeight: view===t.id ? 700 : 500,
                              fontSize:13, cursor:'pointer', transition:'all .2s' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {view === 'list'    && (
        <QuotationList
          onNew={() => setView('form')}
          onView={(q) => { setSelected(q); setView('detail'); }}
        />
      )}
      {view === 'form'    && (
        <QuotationForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      )}
      {view === 'success' && created && (
        <SuccessCard
          quotation={created}
          onNew={() => { setCreated(null); setView('form'); }}
          onList={() => setView('list')}
        />
      )}
      {view === 'detail'  && selected && (
        <QuotationDetail
          quotation={selected}
          onBack={() => setView('list')}
        />
      )}
    </div>
  );
}
