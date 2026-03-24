import React, { useState, useEffect, useContext } from 'react';
import { ToastContext } from '../App';
import { exportQuestionPaperPDF, exportAnswerKeyPDF } from '../utils/pdfExport';
import QuestionPaperView from '../components/QuestionPaperView';

const QUESTION_TYPES = [
  { value: 'mcq',       label: 'Multiple Choice (MCQ)' },
  { value: 'short',     label: 'Short Answer' },
  { value: 'long',      label: 'Long Answer' },
  { value: 'truefalse', label: 'True or False' },
  { value: 'fillblank', label: 'Fill in the Blanks' },
];

const DEFAULT_SECTIONS = [
  { name: 'Section A', questionType: 'mcq',   count: 10, marksEach: 1 },
  { name: 'Section B', questionType: 'short',  count: 5,  marksEach: 2 },
  { name: 'Section C', questionType: 'long',   count: 3,  marksEach: 10 },
];

const DEFAULT_BLOOMS = {
  Knowledge: 20, Understanding: 25, Application: 25,
  Analysis: 15, Evaluation: 10, Creation: 5,
};

const API_BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export default function GeneratePage() {
  const addToast = useContext(ToastContext);
  const [formData, setFormData] = useState({
    subject: '', topic: '', syllabus: '',
    difficulty: 'Medium', examType: 'Unit Test',
    institution: '', duration: '3 Hours',
  });
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [blooms, setBlooms] = useState(DEFAULT_BLOOMS);
  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState(null);
  const [criteriaTemplates, setCriteriaTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/criteria`)
      .then(r => r.json())
      .then(d => { if (d.success) setCriteriaTemplates(d.criteria); })
      .catch(() => {});
  }, []);

  const totalMarks = sections.reduce((s, sec) => s + sec.count * sec.marksEach, 0);
  const bloomsSum = Object.values(blooms).reduce((a, b) => a + b, 0);

  const handleField = e => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSectionChange = (idx, field, value) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: field === 'count' || field === 'marksEach' ? Number(value) : value } : s));
  };

  const addSection = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setSections(prev => [...prev, { name: `Section ${letters[prev.length]}`, questionType: 'short', count: 5, marksEach: 2 }]);
  };

  const removeSection = idx => setSections(prev => prev.filter((_, i) => i !== idx));

  const applyTemplate = (templateId) => {
    const t = criteriaTemplates.find(c => c.id === parseInt(templateId));
    if (!t) return;
    setBlooms(t.bloomsDistribution);
    setSections(t.sections);
    setSelectedTemplate(templateId);
    addToast(`Applied template: ${t.name}`, 'success');
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) { addToast('Subject is required.', 'error'); return; }
    if (bloomsSum !== 100) { addToast(`Bloom's distribution must sum to 100%. Currently: ${bloomsSum}%`, 'error'); return; }

    setLoading(true);
    setPaper(null);
    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, sections, bloomsDistribution: blooms }),
      });
      const raw = await res.text();
      const contentType = res.headers.get('content-type') || '';

      let data;
      if (raw && contentType.toLowerCase().includes('application/json')) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error('Server returned invalid JSON. Check backend logs.');
        }
      } else if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          const snippet = raw.length > 300 ? `${raw.slice(0, 300)}...` : raw;
          throw new Error(`Server returned non-JSON response (HTTP ${res.status}). ${snippet}`);
        }
      } else {
        throw new Error(`Empty response from server (HTTP ${res.status}). Check backend logs.`);
      }

      if (!res.ok || !data?.success) throw new Error(data?.error || `Generation failed (HTTP ${res.status})`);
      setPaper(data.paper);
      addToast('Question paper generated successfully!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!paper) return;
    try {
      const res = await fetch(`${API_BASE}/api/papers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paper),
      });
      const data = await res.json();
      if (data.success) addToast('Paper saved to bank!', 'success');
    } catch { addToast('Failed to save paper.', 'error'); }
  };

  return (
    <div className="container" style={{ paddingBottom: 64 }}>
      <div className="page-header">
        <h1>Generate Question Paper</h1>
        <p>Configure your exam parameters, Bloom's criteria, and let Gemini AI do the rest.</p>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Gemini AI is generating your question paper...</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>This may take 15–45 seconds depending on question count.</p>
        </div>
      )}

      <form onSubmit={handleGenerate}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* ── Left Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Exam Details */}
            <div className="card">
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>📋 Exam Details</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {criteriaTemplates.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Quick Apply Template</label>
                    <select className="form-control" value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}>
                      <option value="">— Select a template —</option>
                      {criteriaTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input id="subject" name="subject" className="form-control" value={formData.subject} onChange={handleField} placeholder="e.g. Mathematics, Physics, History" required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Topic / Chapter</label>
                    <input id="topic" name="topic" className="form-control" value={formData.topic} onChange={handleField} placeholder="e.g. Thermodynamics" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exam Type</label>
                    <select id="examType" name="examType" className="form-control" value={formData.examType} onChange={handleField}>
                      <option>Unit Test</option>
                      <option>Semester Exam</option>
                      <option>Midterm</option>
                      <option>Annual Exam</option>
                      <option>Internal Assessment</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select id="difficulty" name="difficulty" className="form-control" value={formData.difficulty} onChange={handleField}>
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                      <option>Mixed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <select id="duration" name="duration" className="form-control" value={formData.duration} onChange={handleField}>
                      <option>30 Minutes</option>
                      <option>1 Hour</option>
                      <option>1.5 Hours</option>
                      <option>2 Hours</option>
                      <option>3 Hours</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Institution Name</label>
                  <input id="institution" name="institution" className="form-control" value={formData.institution} onChange={handleField} placeholder="e.g. Sri Venkateswara College" />
                </div>
                <div className="form-group">
                  <label className="form-label">Syllabus / Topics Covered</label>
                  <textarea id="syllabus" name="syllabus" className="form-control" value={formData.syllabus} onChange={handleField} placeholder="Describe the syllabus or paste chapter names here..." />
                </div>
              </div>
            </div>

            {/* Blooms Taxonomy */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700 }}>🧠 Bloom's Taxonomy Distribution</h2>
                <span style={{ fontSize: '0.8rem', color: bloomsSum === 100 ? 'var(--accent-green)' : 'var(--accent-rose)' }}>
                  {bloomsSum}% / 100%
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                Set how many marks (%) should come from each cognitive level.
              </p>
              <div className="blooms-grid">
                {Object.entries(blooms).map(([cat, val]) => (
                  <div key={cat} className="bloom-row">
                    <div className="bloom-label-row">
                      <span className={`badge badge-${cat.toLowerCase()}`}>{cat}</span>
                      <span className="bloom-value">{val}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={val}
                      onChange={e => setBlooms(prev => ({ ...prev, [cat]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column: Sections ── */}
          <div className="card" style={{ alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700 }}>📝 Paper Sections</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total: <strong style={{ color: 'var(--accent-secondary)' }}>{totalMarks} Marks</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sections.map((sec, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--accent-secondary)' }}>{sec.name || `Section ${idx + 1}`}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(108,99,255,0.1)', padding: '3px 8px', borderRadius: 99 }}>
                        {sec.count} × {sec.marksEach} = {sec.count * sec.marksEach} marks
                      </span>
                      {sections.length > 1 && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeSection(idx)}>✕</button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group">
                      <label className="form-label">Section Name</label>
                      <input className="form-control" value={sec.name} onChange={e => handleSectionChange(idx, 'name', e.target.value)} placeholder="Section A" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Question Type</label>
                      <select className="form-control" value={sec.questionType} onChange={e => handleSectionChange(idx, 'questionType', e.target.value)}>
                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. of Questions</label>
                      <input type="number" className="form-control" min={1} max={30} value={sec.count} onChange={e => handleSectionChange(idx, 'count', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Marks Each</label>
                      <input type="number" className="form-control" min={1} max={50} value={sec.marksEach} onChange={e => handleSectionChange(idx, 'marksEach', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary w-full" onClick={addSection}>+ Add Section</button>
            </div>

            <hr className="section-divider" style={{ margin: '24px 0' }} />

            <button id="generate-btn" type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? '⏳ Generating…' : '✨ Generate Question Paper'}
            </button>
          </div>
        </div>
      </form>

      {/* ── Generated Paper View ── */}
      {paper && (
        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSave}>💾 Save to Bank</button>
            <button className="btn btn-success" onClick={() => exportAnswerKeyPDF(paper)}>🗝️ Download Answer Key PDF</button>
            <button className="btn btn-primary" onClick={() => exportQuestionPaperPDF(paper)}>📄 Download Question Paper PDF</button>
          </div>
          <QuestionPaperView paper={paper} />
        </div>
      )}
    </div>
  );
}
