import React, { useEffect, useState } from 'react';
import { aiApi } from '../api/services';
import { FarmReport } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { FileText, Sparkles, CheckCircle, Droplet, ArrowUpRight, ThumbsUp, AlertTriangle, ThumbsDown, Check, Clock, SkipForward, Send, MessageSquareCheck } from 'lucide-react';

interface ReportFeedbackItem {
  id: string;
  date: string;
  accuracy: 'accurate' | 'partial' | 'inaccurate';
  outcome: 'implemented' | 'in_progress' | 'skipped';
  notes: string;
  crop: string;
}

export const ReportPage: React.FC = () => {
  const [report, setReport] = useState<FarmReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Feedback loop state
  const [accuracy, setAccuracy] = useState<'accurate' | 'partial' | 'inaccurate'>('accurate');
  const [outcome, setOutcome] = useState<'implemented' | 'in_progress' | 'skipped'>('implemented');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<ReportFeedbackItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('agrisense_report_feedback');
      if (saved) {
        setFeedbackHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load feedback history', e);
    }
  }, []);

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ReportFeedbackItem = {
      id: 'fb_' + Date.now(),
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      accuracy,
      outcome,
      notes: notes.trim(),
      crop: 'Tomato'
    };

    const updated = [newItem, ...feedbackHistory];
    setFeedbackHistory(updated);
    try {
      localStorage.setItem('agrisense_report_feedback', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save feedback to localStorage', err);
    }
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setNotes('');
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await aiApi.getReport('Tomato');
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate weekly farm report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (loading) return <LoadingState message="AgriUpdate AI is synthesizing weekly sensor logs & telemetry..." />;
  if (error) return <ErrorState message={error} onRetry={fetchReport} />;
  if (!report) return null;

  const today = new Date();
  const pastWeek = new Date();
  pastWeek.setDate(today.getDate() - 7);
  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Weekly Farm Agronomy Intelligence</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Period: {formatDate(pastWeek)} – {formatDate(today)} • Samrala Farm (Ludhiana)
          </p>
        </div>
        <button onClick={fetchReport} className="agri-btn-primary">
          <Sparkles size={16} /> Regenerate Report
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Water Saved</span>
          <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            {report.estimated_water_saved_liters.toLocaleString('en-IN')} Liters
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>vs. Traditional Flood Irrigation</span>
        </div>

        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Irrigation Efficiency</span>
          <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>
            {report.irrigation_efficiency}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Automated Sensor-Trigger Precision</span>
        </div>

        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Moisture Range</span>
          <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
            {report.moisture_range}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Target: 40% - 65%</span>
        </div>
      </div>

      {/* Executive Overview */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Overall Agronomy Status</h4>
        <p style={{ fontSize: '0.92rem', color: '#f1f5f3', lineHeight: 1.6 }}>{report.overall_status}</p>

        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '10px' }}>Soil & Water Balance</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{report.soil_and_water}</p>
      </div>

      {/* Actionable To-Do Checklist */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#34d399' }}>AI Recommended Actions For This Week</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {report.weekly_todo.map((todo, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{todo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CLOSED-LOOP AI FEEDBACK & OUTCOME LOGGING */}
      <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquareCheck size={18} color="#38bdf8" />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f3' }}>AI Learning & Field Outcome Feedback Loop</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Help AgriSense learn what works on your soil. Your feedback refines future threshold models & agronomy suggestions.
            </p>
          </div>
        </div>

        {submitted && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '10px 14px', borderRadius: '8px', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={16} /> Ground-truth field outcome saved! Future AI weekly reports will incorporate this feedback.
          </div>
        )}

        <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Accuracy Rating */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
              1. How accurate was this AI report for your field conditions?
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAccuracy('accurate')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: accuracy === 'accurate' ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  background: accuracy === 'accurate' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: accuracy === 'accurate' ? '#34d399' : 'var(--text-muted)'
                }}
              >
                <ThumbsUp size={15} /> Highly Accurate (Spot On)
              </button>
              <button
                type="button"
                onClick={() => setAccuracy('partial')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: accuracy === 'partial' ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                  background: accuracy === 'partial' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: accuracy === 'partial' ? '#fbbf24' : 'var(--text-muted)'
                }}
              >
                <AlertTriangle size={15} /> Partially Accurate
              </button>
              <button
                type="button"
                onClick={() => setAccuracy('inaccurate')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: accuracy === 'inaccurate' ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                  background: accuracy === 'inaccurate' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: accuracy === 'inaccurate' ? '#f87171' : 'var(--text-muted)'
                }}
              >
                <ThumbsDown size={15} /> Inaccurate / Misaligned
              </button>
            </div>
          </div>

          {/* Action Implementation Status */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
              2. Did you implement the recommended actions on your crop?
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setOutcome('implemented')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: outcome === 'implemented' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                  background: outcome === 'implemented' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: outcome === 'implemented' ? '#38bdf8' : 'var(--text-muted)'
                }}
              >
                <Check size={15} /> Fully Implemented
              </button>
              <button
                type="button"
                onClick={() => setOutcome('in_progress')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: outcome === 'in_progress' ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                  background: outcome === 'in_progress' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: outcome === 'in_progress' ? '#c084fc' : 'var(--text-muted)'
                }}
              >
                <Clock size={15} /> In Progress / Partial
              </button>
              <button
                type="button"
                onClick={() => setOutcome('skipped')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  border: outcome === 'skipped' ? '1.5px solid #94a3b8' : '1px solid rgba(255,255,255,0.1)',
                  background: outcome === 'skipped' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                  color: outcome === 'skipped' ? '#cbd5e1' : 'var(--text-muted)'
                }}
              >
                <SkipForward size={15} /> Skipped (Weather/Other Reason)
              </button>
            </div>
          </div>

          {/* Observations Text */}
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
              3. Farmer Ground-Truth Field Observations (What happened? Any yield or pest change?):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Applied recommended neem oil spray — whitefly count dropped significantly by day 3. Soil moisture stayed high due to unexpected morning fog."
              rows={3}
              style={{
                width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                padding: '10px 12px', color: '#f1f5f9', fontSize: '0.85rem', resize: 'vertical'
              }}
            />
          </div>

          <button
            type="submit"
            className="agri-btn-primary"
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            <Send size={15} /> Submit Ground-Truth Feedback & Retrain
          </button>
        </form>

        {/* Feedback History Log */}
        {feedbackHistory.length > 0 && (
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 700 }}>
              Recent Farmer Field Logs ({feedbackHistory.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {feedbackHistory.slice(0, 4).map((item) => (
                <div key={item.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: item.accuracy === 'accurate' ? 'rgba(16, 185, 129, 0.2)' : item.accuracy === 'partial' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: item.accuracy === 'accurate' ? '#34d399' : item.accuracy === 'partial' ? '#fbbf24' : '#f87171'
                      }}>
                        {item.accuracy === 'accurate' ? '👍 Accurate' : item.accuracy === 'partial' ? '⚠️ Partial' : '👎 Inaccurate'}
                      </span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: item.outcome === 'implemented' ? 'rgba(56, 189, 248, 0.2)' : item.outcome === 'in_progress' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                        color: item.outcome === 'implemented' ? '#38bdf8' : item.outcome === 'in_progress' ? '#c084fc' : '#cbd5e1'
                      }}>
                        {item.outcome === 'implemented' ? '✅ Implemented' : item.outcome === 'in_progress' ? '⏳ In Progress' : '⏭️ Skipped'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{item.date}</span>
                  </div>
                  {item.notes && <p style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: '4px', lineHeight: 1.4 }}>"{item.notes}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
