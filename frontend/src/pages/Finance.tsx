import React, { useEffect, useState } from 'react';
import { financeApi } from '../api/services';
import { FinanceRecord, FinanceSummary } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const FinancePage: React.FC = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    entry_type: 'expense' as 'income' | 'expense',
    category: 'Fertilizer',
    amount: 5000,
    description: '',
    entry_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recs, sum] = await Promise.all([
        financeApi.getRecords(),
        financeApi.getSummary()
      ]);
      setRecords(recs);
      setSummary(sum);
    } catch (err: any) {
      setError(err.message || 'Failed to load farm finances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeApi.addRecord(form);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save transaction');
    }
  };

  if (loading && !summary) return <LoadingState message="Calculating farm ledger..." />;
  if (error && !summary) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Farm Financial Ledger & Profitability</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Precision tracking of input costs vs harvest earnings</p>
        </div>
        <button onClick={() => setShowModal(true)} className="agri-btn-primary">
          <Plus size={16} /> Record Transaction
        </button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Farm Revenue</span>
            <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
              ₹{summary.total_income.toLocaleString('en-IN')}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> Harvest sales & PMKSY subsidy
            </span>
          </div>

          <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Input Costs</span>
            <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fb7185' }}>
              ₹{summary.total_expenses.toLocaleString('en-IN')}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Top Cost: <strong style={{ color: 'var(--text-main)' }}>{summary.top_expense_category}</strong>
            </span>
          </div>

          <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Farm Margin</span>
            <h3 className="mono-val" style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.net_profit >= 0 ? '#10b981' : '#f43f5e' }}>
              ₹{summary.net_profit.toLocaleString('en-IN')}
            </h3>
            <span className="badge badge-success" style={{ alignSelf: 'flex-start' }}>Positive Cashflow</span>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="agri-card">
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Recent Cashflow Records</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Description</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="mono-val" style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>{r.entry_date}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span className={`badge ${r.entry_type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                      {r.entry_type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', fontWeight: 500 }}>{r.category}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>{r.description}</td>
                  <td className="mono-val" style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: r.entry_type === 'income' ? '#34d399' : '#fb7185' }}>
                    {r.entry_type === 'income' ? '+' : '-'}₹{r.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Record Cash Transaction</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={form.entry_type}
                  onChange={(e) => setForm({ ...form, entry_type: e.target.value as any })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="expense">Expense (Input Cost)</option>
                  <option value="income">Income (Revenue)</option>
                </select>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
                >
                  <option value="Seeds">Seeds</option>
                  <option value="Fertilizer">Fertilizer</option>
                  <option value="Pesticides">Crop Protection</option>
                  <option value="Labor">Labor</option>
                  <option value="Diesel/Power">Electricity / Fuel</option>
                  <option value="Harvest Sale">Harvest Produce Sale</option>
                  <option value="Subsidy">Govt Subsidy</option>
                </select>
              </div>
              <input
                type="number"
                placeholder="Amount (₹)"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <input
                type="text"
                placeholder="Description (e.g. 5 bags Vermicompost)"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <input
                type="date"
                required
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="agri-btn-outline">Cancel</button>
                <button type="submit" className="agri-btn-primary">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
