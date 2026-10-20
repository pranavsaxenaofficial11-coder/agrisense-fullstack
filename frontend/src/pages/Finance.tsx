import React, { useEffect, useState } from 'react';
import { financeApi } from '../api/services';
import { FinanceRecord, FinanceSummary } from '../types';
import { LoadingState, ErrorState } from '../components/common/UIStates';
import { Plus, TrendingUp, TrendingDown, DollarSign, FileText, Printer, Share2, Trash2, CheckCircle, X } from 'lucide-react';

interface InvoiceItem {
  crop: string;
  grade: string;
  qty: number;
  unit: string;
  rate: number;
  tax: number;
}

interface SavedInvoice {
  id: string;
  date: string;
  terms: string;
  sellerFarm: string;
  sellerName: string;
  sellerPhone: string;
  sellerGst: string;
  sellerLoc: string;
  buyerFirm: string;
  buyerName: string;
  buyerPhone: string;
  buyerGst: string;
  buyerLoc: string;
  truck: string;
  upi: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  freight: number;
  hamali: number;
  discount: number;
  grandTotal: number;
  words: string;
}

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoice' | 'history'>('ledger');
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Invoice state
  const [invNum, setInvNum] = useState(`AGRI-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invTerms, setInvTerms] = useState('Immediate / Cash on Delivery');

  const [sellerFarm, setSellerFarm] = useState('AgriSense High-Tech Smart Farm');
  const [sellerName, setSellerName] = useState('Pranav Saxena');
  const [sellerPhone, setSellerPhone] = useState('+91 98765 43210');
  const [sellerGst, setSellerGst] = useState('PB-KISAN-99214');
  const [sellerLoc, setSellerLoc] = useState('Village Samrala, District Ludhiana, Punjab');

  const [buyerFirm, setBuyerFirm] = useState('Punjab Agro Grain Merchants / Azadpur Mandi');
  const [buyerName, setBuyerName] = useState('Ramesh Kumar (Commission Agent)');
  const [buyerPhone, setBuyerPhone] = useState('+91 98110 55443');
  const [buyerGst, setBuyerGst] = useState('03AAAAA0000A1Z5');
  const [buyerLoc, setBuyerLoc] = useState('Shop 44, New Grain Market, Ludhiana');

  const [truck, setTruck] = useState('PB 10 CT 4421');
  const [upi, setUpi] = useState('pranavsaxena@upi · HDFC Bank A/C 501002441234');
  const [freight, setFreight] = useState(1500);
  const [hamali, setHamali] = useState(600);
  const [discount, setDiscount] = useState(0);

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { crop: 'Wheat (Sharbati Grade A)', grade: 'Grade A', qty: 50, unit: 'Quintal', rate: 2450, tax: 1.5 },
    { crop: 'Basmati Rice 1121', grade: 'Super Export', qty: 25, unit: 'Quintal', rate: 3800, tax: 1.5 }
  ]);

  const [savedInvoices, setSavedInvoices] = useState<SavedInvoice[]>(() => {
    try {
      const stored = localStorage.getItem('agrisense_saved_invoices');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [previewInvoice, setPreviewInvoice] = useState<SavedInvoice | null>(null);

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

  // Indian currency numbering words converter
  const numberToIndianWords = (num: number) => {
    num = Math.round(num);
    if (num === 0) return 'Rupees Zero Only';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function inWords(n: number): string {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
      return '';
    }
    let str = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const rem = num;
    if (crore > 0) str += inWords(crore) + ' Crore ';
    if (lakh > 0) str += inWords(lakh) + ' Lakh ';
    if (thousand > 0) str += inWords(thousand) + ' Thousand ';
    if (rem > 0) str += inWords(rem);
    return 'Rupees ' + str.trim() + ' Only';
  };

  // Invoice calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    invoiceItems.forEach((it) => {
      const rowBase = (it.qty || 0) * (it.rate || 0);
      const rowTax = rowBase * ((it.tax || 0) / 100);
      subtotal += rowBase;
      taxTotal += rowTax;
    });
    const grandTotal = Math.max(0, subtotal + taxTotal + freight + hamali - discount);
    return {
      subtotal,
      taxTotal,
      grandTotal,
      words: numberToIndianWords(grandTotal)
    };
  };

  const totals = calculateTotals();

  const handleAddItem = () => {
    setInvoiceItems([...invoiceItems, { crop: 'Vegetables / Grains', grade: 'Grade A', qty: 10, unit: 'Quintal', rate: 2000, tax: 1.5 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length <= 1) {
      alert('Invoice must contain at least one crop line item.');
      return;
    }
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceItems(updated);
  };

  const handleSaveInvoice = () => {
    const newInv: SavedInvoice = {
      id: invNum,
      date: invDate,
      terms: invTerms,
      sellerFarm,
      sellerName,
      sellerPhone,
      sellerGst,
      sellerLoc,
      buyerFirm,
      buyerName,
      buyerPhone,
      buyerGst,
      buyerLoc,
      truck,
      upi,
      items: [...invoiceItems],
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      freight,
      hamali,
      discount,
      grandTotal: totals.grandTotal,
      words: totals.words
    };

    const updated = [newInv, ...savedInvoices.filter((x) => x.id !== newInv.id)];
    setSavedInvoices(updated);
    try {
      localStorage.setItem('agrisense_saved_invoices', JSON.stringify(updated));
    } catch (_) {}

    // Auto-record into ledger as income
    if (totals.grandTotal > 0) {
      financeApi.addRecord({
        entry_type: 'income',
        category: 'Crop Sales',
        amount: Math.round(totals.grandTotal),
        description: `Mandi Sale Invoice ${newInv.id} to ${newInv.buyerFirm}`,
        entry_date: newInv.date
      }).then(() => fetchData()).catch(() => {});
    }

    alert(`Invoice ${newInv.id} saved and synced to your Farm Ledger!`);
    setActiveTab('history');
  };

  const handleShareWhatsApp = (inv?: SavedInvoice) => {
    const target = inv || {
      id: invNum,
      date: invDate,
      sellerFarm,
      sellerName,
      buyerFirm,
      items: invoiceItems,
      grandTotal: totals.grandTotal,
      words: totals.words,
      upi
    };

    const text = `*AGRISENSE AGRICULTURAL SALE INVOICE: ${target.id}*\n` +
      `Date: ${target.date}\n` +
      `From: ${target.sellerFarm} (${target.sellerName})\n` +
      `To: ${target.buyerFirm}\n` +
      `---------------------------\n` +
      target.items.map((it: any) => `• ${it.crop}: ${it.qty} ${it.unit} @ ₹${it.rate}/${it.unit}`).join('\n') +
      `\n---------------------------\n` +
      `*Grand Total: ₹${Math.round(target.grandTotal).toLocaleString('en-IN')}*\n` +
      `(${target.words})\n` +
      `Payment Details: ${target.upi}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading && !summary) return <LoadingState message="Calculating farm ledger..." />;
  if (error && !summary) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Farm Financial Ledger & Custom Invoicing</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Precision tracking of input costs, mandi sales, and automated tax invoices</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('ledger')}
            className={activeTab === 'ledger' ? 'agri-btn-primary' : 'agri-btn-outline'}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            📊 Ledger & Profit
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={activeTab === 'invoice' ? 'agri-btn-primary' : 'agri-btn-outline'}
            style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={14} /> Custom Invoice
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={activeTab === 'history' ? 'agri-btn-primary' : 'agri-btn-outline'}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            📁 Past Invoices ({savedInvoices.length})
          </button>
        </div>
      </div>

      {activeTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                <span className={`badge ${summary.net_profit >= 0 ? 'badge-success' : 'badge-danger'}`} style={{ alignSelf: 'flex-start' }}>
                  {summary.net_profit >= 0 ? 'Positive Cashflow' : 'Operating Deficit'}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowModal(true)} className="agri-btn-primary">
              <Plus size={16} /> Record Ledger Transaction
            </button>
          </div>

          <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Transaction Ledger History</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Type</th>
                    <th style={{ padding: '8px' }}>Category</th>
                    <th style={{ padding: '8px' }}>Description</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-dim)' }}>{r.entry_date}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge ${r.entry_type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                          {r.entry_type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{r.category}</td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{r.description || '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.entry_type === 'income' ? '#34d399' : '#fb7185' }}>
                        {r.entry_type === 'income' ? '+' : '−'}₹{r.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. CUSTOM INVOICE GENERATOR VIEW */}
      {activeTab === 'invoice' && (
        <div className="agri-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Agricultural Mandi & Tax Invoice</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official GST/Mandi compliant bill for direct crop sales to merchants, mills, and buyers</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPreviewInvoice({
                  id: invNum,
                  date: invDate,
                  terms: invTerms,
                  sellerFarm,
                  sellerName,
                  sellerPhone,
                  sellerGst,
                  sellerLoc,
                  buyerFirm,
                  buyerName,
                  buyerPhone,
                  buyerGst,
                  buyerLoc,
                  truck,
                  upi,
                  items: invoiceItems,
                  subtotal: totals.subtotal,
                  taxTotal: totals.taxTotal,
                  freight,
                  hamali,
                  discount,
                  grandTotal: totals.grandTotal,
                  words: totals.words
                })}
                className="agri-btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} /> Preview & Print Invoice
              </button>
            </div>
          </div>

          {/* Invoice Header Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Invoice Number</label>
              <input
                type="text"
                value={invNum}
                onChange={(e) => setInvNum(e.target.value)}
                style={{ width: '100%', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px 10px', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Invoice Date</label>
              <input
                type="date"
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                style={{ width: '100%', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px 10px', borderRadius: '6px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Payment Terms</label>
              <select
                value={invTerms}
                onChange={(e) => setInvTerms(e.target.value)}
                style={{ width: '100%', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px 10px', borderRadius: '6px', color: '#fff' }}
              >
                <option>Immediate / Cash on Delivery</option>
                <option>UPI / Instant Bank Transfer</option>
                <option>Net 7 Days</option>
                <option>Net 15 Days</option>
                <option>Advance 50%, Balance on Delivery</option>
              </select>
            </div>
          </div>

          {/* Seller vs Buyer */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#34d399', fontWeight: 700 }}>
                Seller Details (Your Farm)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Farm Name"
                  value={sellerFarm}
                  onChange={(e) => setSellerFarm(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Farmer Name"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Kisan ID / GSTIN"
                  value={sellerGst}
                  onChange={(e) => setSellerGst(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="Address / Mandi Location"
                  value={sellerLoc}
                  onChange={(e) => setSellerLoc(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#38bdf8', fontWeight: 700 }}>
                Buyer / Mandi Trader Details
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Trader Firm / Company Name"
                  value={buyerFirm}
                  onChange={(e) => setBuyerFirm(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Buyer Phone"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Buyer GSTIN / Mandi License"
                  value={buyerGst}
                  onChange={(e) => setBuyerGst(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="Delivery Destination Address"
                  value={buyerLoc}
                  onChange={(e) => setBuyerLoc(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Produce Items Sold</h4>
              <button onClick={handleAddItem} className="agri-btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                <Plus size={14} /> Add Crop Row
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>#</th>
                    <th style={{ padding: '6px' }}>Produce / Crop</th>
                    <th style={{ padding: '6px' }}>Grade</th>
                    <th style={{ padding: '6px' }}>Qty</th>
                    <th style={{ padding: '6px' }}>Unit</th>
                    <th style={{ padding: '6px' }}>Rate (₹)</th>
                    <th style={{ padding: '6px' }}>Tax %</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Total (₹)</th>
                    <th style={{ padding: '6px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '6px', color: 'var(--text-dim)' }}>{idx + 1}</td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="text"
                          value={item.crop}
                          onChange={(e) => handleUpdateItem(idx, 'crop', e.target.value)}
                          style={{ width: '140px', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', color: '#fff' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <select
                          value={item.grade}
                          onChange={(e) => handleUpdateItem(idx, 'grade', e.target.value)}
                          style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', color: '#fff' }}
                        >
                          <option>Grade A</option>
                          <option>Super Export</option>
                          <option>FAQ</option>
                          <option>Organic</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleUpdateItem(idx, 'qty', parseFloat(e.target.value) || 0)}
                          style={{ width: '70px', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', color: '#fff' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                          style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', color: '#fff' }}
                        >
                          <option>Quintal</option>
                          <option>Kg</option>
                          <option>Bags</option>
                          <option>Crates</option>
                        </select>
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          style={{ width: '80px', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', color: '#fff' }}
                        />
                      </td>
                      <td style={{ padding: '6px' }}>
                        <input
                          type="number"
                          value={item.tax}
                          onChange={(e) => handleUpdateItem(idx, 'tax', parseFloat(e.target.value) || 0)}
                          style={{ width: '55px', background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '6px', borderRadius: '4px', color: '#fff' }}
                        />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#f1f5f3' }}>
                        ₹{Math.round(item.qty * item.rate * (1 + (item.tax || 0) / 100)).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logistics & Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Logistics & Payment Method</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Truck / Vehicle No."
                  value={truck}
                  onChange={(e) => setTruck(e.target.value)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                <input
                  type="number"
                  placeholder="Freight Charges (₹)"
                  value={freight}
                  onChange={(e) => setFreight(parseFloat(e.target.value) || 0)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="Hamali / Loading (₹)"
                  value={hamali}
                  onChange={(e) => setHamali(parseFloat(e.target.value) || 0)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
                <input
                  type="number"
                  placeholder="Discount (₹)"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
              <input
                type="text"
                placeholder="UPI ID / Bank Settlement Details"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Items Subtotal:</span>
                <strong>₹{Math.round(totals.subtotal).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mandi Cess & Tax:</span>
                <strong>₹{Math.round(totals.taxTotal).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Freight & Hamali:</span>
                <strong>₹{Math.round(freight + hamali).toLocaleString('en-IN')}</strong>
              </div>
              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#fb7185' }}>
                  <span>Discount:</span>
                  <strong>−₹{Math.round(discount).toLocaleString('en-IN')}</strong>
                </div>
              )}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>GRAND TOTAL:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>₹{Math.round(totals.grandTotal).toLocaleString('en-IN')}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {totals.words}
              </span>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={handleSaveInvoice} className="agri-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  💾 Save & Sync Ledger
                </button>
                <button onClick={() => handleShareWhatsApp()} className="agri-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Share2 size={14} /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. PAST SAVED INVOICES VIEW */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!savedInvoices.length ? (
            <div className="agri-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '14px' }}>No past invoices saved yet.</p>
              <button onClick={() => setActiveTab('invoice')} className="agri-btn-primary">
                Create First Custom Invoice
              </button>
            </div>
          ) : (
            savedInvoices.map((inv, idx) => (
              <div key={idx} className="agri-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{inv.id}</strong>
                    <span className="badge badge-success">₹{Math.round(inv.grandTotal).toLocaleString('en-IN')}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Buyer: <strong style={{ color: '#f1f5f3' }}>{inv.buyerFirm}</strong> • Date: {inv.date}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Items: {inv.items.map((it) => `${it.qty} ${it.unit} ${it.crop}`).join(', ')}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setPreviewInvoice(inv)} className="agri-btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                    🖨️ View & Print
                  </button>
                  <button onClick={() => handleShareWhatsApp(inv)} className="agri-btn-outline" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                    📲 WhatsApp
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Printable Invoice Modal / Dialog */}
      {previewInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '640px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: '#ffffff',
            color: '#111827',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: "'Poppins', sans-serif"
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #059669', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', margin: 0 }}>AGRISENSE SMART FARMS</h2>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{previewInvoice.sellerFarm}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{previewInvoice.sellerLoc}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Phone: {previewInvoice.sellerPhone} • ID: {previewInvoice.sellerGst}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>TAX INVOICE / MANDI BILL</div>
                <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{previewInvoice.id}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Date: <strong>{previewInvoice.date}</strong></div>
              </div>
            </div>

            {/* Buyer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f9fafb', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem' }}>
              <div>
                <strong style={{ textTransform: 'uppercase', color: '#4b5563', fontSize: '0.7rem' }}>BILLED TO:</strong>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{previewInvoice.buyerFirm}</div>
                <div>{previewInvoice.buyerName}</div>
                <div>{previewInvoice.buyerLoc}</div>
                <div>Phone: {previewInvoice.buyerPhone}</div>
              </div>
              <div>
                <strong style={{ textTransform: 'uppercase', color: '#4b5563', fontSize: '0.7rem' }}>DISPATCH & TERMS:</strong>
                <div>Vehicle No: <strong>{previewInvoice.truck || 'Direct Farm Gate'}</strong></div>
                <div>Payment Terms: {previewInvoice.terms}</div>
                <div>Place of Supply: Punjab / Inter-state Mandi</div>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#059669', color: '#fff' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Tax %</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {previewInvoice.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 8px' }}><strong>{it.crop}</strong> ({it.grade})</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{it.qty} {it.unit}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{it.rate.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{it.tax || 0}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                      ₹{Math.round(it.qty * it.rate * (1 + (it.tax || 0) / 100)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Words */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }}>
              <div style={{ maxWidth: '280px', fontSize: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#4b5563' }}>AMOUNT IN WORDS:</span>
                <p style={{ color: '#059669', fontWeight: 600, marginTop: '2px' }}>{previewInvoice.words}</p>
                <div style={{ marginTop: '8px' }}>
                  <strong>Settlement Info:</strong>
                  <div>{previewInvoice.upi}</div>
                </div>
              </div>

              <div style={{ width: '200px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span><strong>₹{Math.round(previewInvoice.subtotal).toLocaleString('en-IN')}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mandi Cess:</span><strong>₹{Math.round(previewInvoice.taxTotal).toLocaleString('en-IN')}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Freight & Hamali:</span><strong>₹{Math.round(previewInvoice.freight + previewInvoice.hamali).toLocaleString('en-IN')}</strong></div>
                <div style={{ height: '1px', background: '#e5e7eb', margin: '4px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                  <span>Total:</span>
                  <span>₹{Math.round(previewInvoice.grandTotal).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '10px', borderTop: '1px dashed #d1d5db', fontSize: '0.75rem', color: '#6b7280' }}>
              <div>Buyer Stamp & Signature</div>
              <div style={{ textAlign: 'right' }}>Authorized Signatory: <strong>{previewInvoice.sellerName}</strong></div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                🖨️ Print / Save as PDF
              </button>
              <button
                onClick={() => setPreviewInvoice(null)}
                style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Ledger Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="agri-card" style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Record Farm Cashflow</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, entry_type: 'expense' })}
                  className={form.entry_type === 'expense' ? 'agri-btn-danger' : 'agri-btn-outline'}
                >
                  − Expense
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, entry_type: 'income' })}
                  className={form.entry_type === 'income' ? 'agri-btn-primary' : 'agri-btn-outline'}
                >
                  ＋ Income
                </button>
              </div>

              <input
                type="text"
                placeholder="Category (e.g. Fertilizer, Seeds, Crop Sale)"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ background: '#090d0b', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: '8px', color: '#fff' }}
              />

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
                placeholder="Description / Notes"
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
export default FinancePage;
