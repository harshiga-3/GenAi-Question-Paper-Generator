import React, { useState, useEffect, useContext } from 'react';
import { ToastContext } from '../App';

const BLOOMS_KEYS = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Evaluation', 'Creation'];
const API_BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export default function CriteriaPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToast = useContext(ToastContext);

  useEffect(() => {
    fetchCriteria();
  }, []);

  const fetchCriteria = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/criteria`);
      const d = await r.json();
      if (d.success) setTemplates(d.criteria);
    } catch (e) {
      addToast('Failed to load criteria', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const r = await fetch(`${API_BASE}/api/criteria/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        addToast('Template deleted', 'success');
      }
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="container" style={{ paddingBottom: 64 }}>
      <div className="page-header">
        <h1>Criteria Configuration</h1>
        <p>Define standard Bloom's Taxonomy distributions and section templates for different exam types.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => addToast('Not implemented in prototype. You can customize templates on the Generate page!', 'success')}>
          + New Template
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
      ) : (
        <div className="grid-2">
          {templates.map(t => (
            <div key={t.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700 }}>{t.name}</h2>
                  {t.isDefault && <span className="badge badge-knowledge">Default</span>}
                </div>
                {!t.isDefault && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t.id)}>Delete</button>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Bloom's Distribution</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {BLOOMS_KEYS.map(cat => (
                    <div key={cat} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cat}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{t.bloomsDistribution[cat]}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>Default Sections</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {t.sections.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '6px 0', borderBottom: idx < t.sections.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{s.name} <span style={{ color: 'var(--text-muted)' }}>({s.questionType})</span></span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{s.count} Qs × {s.marksEach}M</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
