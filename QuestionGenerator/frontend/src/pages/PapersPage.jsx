import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ToastContext } from '../App';
import QuestionPaperView from '../components/QuestionPaperView';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export default function PapersPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const addToast = useContext(ToastContext);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/papers`);
      const d = await r.json();
      if (d.success) setPapers(d.papers);
    } catch (e) {
      addToast('Failed to load papers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewPaper = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/api/papers/${id}`);
      const d = await r.json();
      if (d.success) setSelectedPaper(d.paper);
    } catch (e) {
      addToast('Failed to load paper details', 'error');
    }
  };

  const deletePaper = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this paper permanently?')) return;
    try {
      const r = await fetch(`${API_BASE}/api/papers/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) {
        addToast('Paper deleted', 'success');
        setPapers(prev => prev.filter(p => p.id !== id));
        if (selectedPaper?.id === id) setSelectedPaper(null);
      }
    } catch (err) {
      addToast('Failed to delete', 'error');
    }
  };

  return (
    <div className="container" style={{ paddingBottom: 64 }}>
      <div className="page-header">
        <h1>Paper Bank</h1>
        <p>Manage, view, and export your previously generated question papers.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedPaper ? '350px 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
        {/* List Column */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700 }}>Saved Papers</h2>
            <Link to="/generate" className="btn btn-sm btn-primary">+ New</Link>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            </div>
          ) : papers.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📄</div>
              <p>No papers saved yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {papers.map(p => (
                <div
                  key={p.id}
                  onClick={() => viewPaper(p.id)}
                  style={{
                    padding: 14,
                    background: selectedPaper?.id === p.id ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedPaper?.id === p.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {p.paperTitle || p.subject}
                    </h3>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                      onClick={(e) => deletePaper(p.id, e)}
                    >✕</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{p.examType}</span>
                    <span>{p.totalMarks} Marks</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8, opacity: 0.7 }}>
                    Generated on {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Column */}
        {selectedPaper && (
          <div>
            <QuestionPaperView paper={selectedPaper} />
          </div>
        )}
      </div>
    </div>
  );
}
