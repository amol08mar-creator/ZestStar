'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft, CheckCircle, FileText, IndianRupee,
  Loader2, Pencil, Plus, RefreshCw, Trash2, Users, X, XCircle,
} from 'lucide-react';
import {
  fetchVendors, fetchInvoices, fetchInvoice, createInvoice, updateInvoice as updateInvoiceAPI,
  createVendor, updatePaymentStatus, cancelInvoice as cancelInvoiceAPI,
  submitInvoice as submitInvoiceAPI,
  type Vendor, type PurchaseInvoice, type CreateInvoicePayload,
} from '@/lib/api/purchases';

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n: number) { return new Intl.NumberFormat('en-IN').format(n); }
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function nextInvoiceNumber(invoices: PurchaseInvoice[]): string {
  const nums = invoices.map(i => parseInt(i.invoice_number.replace(/\D/g, '')) || 0);
  const next = (Math.max(0, ...nums) + 1).toString().padStart(3, '0');
  return `INV-${next}`;
}

const PAYMENT_BADGE: Record<string, string> = {
  unpaid: 'bg-red-50 text-red-700 border-red-200',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
};
const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-400 border-red-100',
};

interface LineItem { tempId: string; product_id: string; product_name: string; quantity: number; unit_cost: number; }
type View = 'list' | 'create' | 'detail';

// ── Main Component ────────────────────────────────────────────────
interface Props {
  token: string;
  initialView?: 'list' | 'create';
  initialProduct?: { id: string; name: string };
}

export default function AdminPurchasesPanel({ token, initialView, initialProduct }: Props) {
  const [view, setView] = useState<View>(initialView ?? 'list');
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitConfirmId, setSubmitConfirmId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterStatus) params.status = filterStatus;
    if (filterPayment) params.payment_status = filterPayment;

    Promise.all([
      fetchInvoices(token, params),
      fetchVendors(token),
    ]).then(([inv, v]) => {
      setInvoices(inv.invoices);
      setTotal(inv.total);
      setVendors(v);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, filterStatus, filterPayment]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(invoice: PurchaseInvoice) {
    setDetailLoading(true);
    setView('detail');
    const full = await fetchInvoice(token, invoice.id).catch(() => invoice);
    setSelectedInvoice(full);
    setDetailLoading(false);
  }

  async function handlePaymentChange(id: string, status: 'unpaid' | 'partial' | 'paid') {
    await updatePaymentStatus(token, id, status).catch(() => {});
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, payment_status: status } : i));
    if (selectedInvoice?.id === id) setSelectedInvoice(s => s ? { ...s, payment_status: status } : s);
  }

  async function handleSubmitDraft(id: string) {
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitInvoiceAPI(token, id);
      const full = await fetchInvoice(token, id);
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'submitted' as const } : i));
      if (selectedInvoice?.id === id) setSelectedInvoice(full);
      setSubmitConfirmId(null);
      load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit invoice');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this invoice? Stock will be reversed.')) return;
    await cancelInvoiceAPI(token, id).catch(() => {});
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'cancelled' as const } : i));
    if (selectedInvoice?.id === id) setSelectedInvoice(s => s ? { ...s, status: 'cancelled' as const } : s);
  }

  const totalAmount = invoices.filter(i => i.status === 'submitted').reduce((s, i) => s + i.total_amount, 0);
  const unpaidCount = invoices.filter(i => i.payment_status === 'unpaid' && i.status === 'submitted').length;

  // ── List View ─────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>Purchase Invoices</h1>
            <p className="text-xs text-muted">{total} invoice{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="p-2 border border-border rounded-xl text-muted hover:text-dark disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setView('create')} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: FileText,     label: 'Total Invoices',   value: fmt(total),           color: 'text-primary',    bg: 'bg-primary-light' },
          { icon: IndianRupee,  label: 'Total Purchases',  value: `₹${fmt(totalAmount)}`, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: XCircle,      label: 'Unpaid',           value: fmt(unpaidCount),     color: 'text-red-600',    bg: 'bg-red-50' },
          { icon: Users,        label: 'Vendors',          value: fmt(vendors.length),  color: 'text-accent',     bg: 'bg-yellow-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">{label}</p>
              <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${color} leading-none`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { label: 'All', val: '' },
          { label: 'Submitted', val: 'submitted' },
          { label: 'Draft', val: 'draft' },
          { label: 'Cancelled', val: 'cancelled' },
        ].map(({ label, val }) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${filterStatus === val ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-border hover:text-dark'}`}>
            {label}
          </button>
        ))}
        <span className="text-border">|</span>
        {[
          { label: 'Any Payment', val: '' },
          { label: 'Unpaid', val: 'unpaid' },
          { label: 'Partial', val: 'partial' },
          { label: 'Paid', val: 'paid' },
        ].map(({ label, val }) => (
          <button key={val} onClick={() => setFilterPayment(val)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${filterPayment === val ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-border hover:text-dark'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-cream rounded-xl animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No invoices yet</p>
            <p className="text-xs mt-1">Click &quot;New Invoice&quot; to record your first purchase</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-cream/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Invoice #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Date</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Items</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Total</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Payment</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-cream/40 transition-colors cursor-pointer" onClick={() => openDetail(inv)}>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-dark text-xs">{inv.invoice_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-dark text-sm">{inv.vendor_name}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted">{fmtDate(inv.invoice_date)}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-dark">{inv.item_count ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-dark">₹{fmt(inv.total_amount)}</p>
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell" onClick={e => e.stopPropagation()}>
                      {inv.status === 'submitted' ? (
                        <select value={inv.payment_status} onChange={e => handlePaymentChange(inv.id, e.target.value as 'unpaid'|'partial'|'paid')}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer bg-white focus:outline-none"
                          style={{ color: inv.payment_status === 'paid' ? '#15803d' : inv.payment_status === 'partial' ? '#854d0e' : '#991b1b' }}
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                      ) : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === 'draft' && (
                          <>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              const full = await fetchInvoice(token, inv.id).catch(() => inv);
                              setSelectedInvoice(full);
                              setEditingInvoice(full);
                              setView('create');
                            }}
                              className="p-1.5 text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                              title="Edit draft invoice">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              setSubmitConfirmId(inv.id);
                              setSubmitError('');
                              await openDetail(inv);
                            }}
                              disabled={submitting}
                              className="p-1.5 text-muted hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Submit invoice & update stock">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {inv.status !== 'cancelled' && (
                          <button onClick={() => handleCancel(inv.id)}
                            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel invoice">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── Create / Edit View ───────────────────────────────────────
  if (view === 'create') return (
    <CreateInvoiceForm
      token={token}
      vendors={vendors}
      suggestedNumber={nextInvoiceNumber(invoices)}
      editInvoice={editingInvoice ?? undefined}
      prefilledProduct={!editingInvoice ? initialProduct : undefined}
      onSuccess={async (inv) => {
        const full = await fetchInvoice(token, inv.id).catch(() => inv);
        setSelectedInvoice(full);
        setEditingInvoice(null);
        setView('detail');
        load();
      }}
      onBack={() => {
        if (editingInvoice) { setEditingInvoice(null); setView('detail'); }
        else setView('list');
      }}
      onVendorCreated={(v) => setVendors(prev => [...prev, v])}
    />
  );

  // ── Detail View ───────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-dark" />
        </button>
        <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
          {selectedInvoice ? `Invoice ${selectedInvoice.invoice_number}` : 'Invoice Detail'}
        </h1>
      </div>

      {detailLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : selectedInvoice ? (
        <InvoiceDetail invoice={selectedInvoice}
          submitting={submitting}
          submitConfirmId={submitConfirmId}
          submitError={submitError}
          onPaymentChange={(status) => handlePaymentChange(selectedInvoice.id, status)}
          onCancel={() => handleCancel(selectedInvoice.id)}
          onEdit={() => { setEditingInvoice(selectedInvoice); setView('create'); }}
          onSubmitRequest={() => { setSubmitConfirmId(selectedInvoice.id); setSubmitError(''); }}
          onSubmitConfirm={() => handleSubmitDraft(selectedInvoice.id)}
          onSubmitCancel={() => { setSubmitConfirmId(null); setSubmitError(''); }} />
      ) : null}
    </div>
  );
}

// ── Create Invoice Form ───────────────────────────────────────────
function CreateInvoiceForm({ token, vendors, suggestedNumber, editInvoice, prefilledProduct, onSuccess, onBack, onVendorCreated }: {
  token: string;
  vendors: Vendor[];
  suggestedNumber: string;
  editInvoice?: PurchaseInvoice;
  prefilledProduct?: { id: string; name: string };
  onSuccess: (inv: PurchaseInvoice) => void;
  onBack: () => void;
  onVendorCreated: (v: Vendor) => void;
}) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const today = new Date().toISOString().slice(0, 10);
  const isEdit = !!editInvoice;

  const [vendorId, setVendorId] = useState(editInvoice?.vendor_id ?? '');
  const [vendorName, setVendorName] = useState(editInvoice?.vendor_name ?? '');
  const [contactPerson, setContactPerson] = useState(() => {
    if (!editInvoice?.vendor_id) return '';
    return vendors.find(v => v.id === editInvoice.vendor_id)?.contact_person ?? '';
  });
  const [phone, setPhone] = useState(() => {
    if (!editInvoice?.vendor_id) return '';
    return vendors.find(v => v.id === editInvoice.vendor_id)?.phone ?? '';
  });
  const [invoiceNumber, setInvoiceNumber] = useState(editInvoice?.invoice_number ?? suggestedNumber);
  const [invoiceDate, setInvoiceDate] = useState(editInvoice?.invoice_date ?? today);
  const [receivedDate, setReceivedDate] = useState(editInvoice?.received_date ?? '');
  const [paymentDue, setPaymentDue] = useState(editInvoice?.payment_due_date ?? '');
  const [taxAmount, setTaxAmount] = useState(editInvoice?.tax_amount ?? 0);
  const [notes, setNotes] = useState(editInvoice?.notes ?? '');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid'>(editInvoice?.payment_status ?? 'unpaid');
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (editInvoice?.purchase_invoice_items) {
      return editInvoice.purchase_invoice_items.map(item => ({
        tempId: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }));
    }
    if (prefilledProduct) {
      return [{ tempId: Date.now().toString(), product_id: prefilledProduct.id, product_name: prefilledProduct.name, quantity: 1, unit_cost: 0 }];
    }
    return [];
  });
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<{ id: string; name: string; price: number; image_url: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Product search autocomplete
  useEffect(() => {
    if (productSearch.length < 2) { setProductResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API_URL}/products/suggestions?q=${encodeURIComponent(productSearch)}`)
        .then(r => r.json())
        .then(j => setProductResults(j?.data?.suggestions ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch, API_URL]);

  function selectVendor(id: string, name: string) {
    const v = vendors.find(v => v.id === id);
    setVendorId(id);
    setVendorName(name);
    setContactPerson(v?.contact_person ?? '');
    setPhone(v?.phone ?? '');
  }

  function addLine(product: { id: string; name: string; price: number }) {
    setLines(prev => [...prev, { tempId: Date.now().toString(), product_id: product.id, product_name: product.name, quantity: 1, unit_cost: product.price }]);
    setProductSearch('');
    setProductResults([]);
  }

  function removeLine(tempId: string) { setLines(prev => prev.filter(l => l.tempId !== tempId)); }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const grandTotal = subtotal + taxAmount;

  async function handleSubmit(status: 'draft' | 'submitted') {
    if (!vendorName.trim()) { setError('Vendor name is required'); return; }
    if (!invoiceNumber.trim()) { setError('Invoice number is required'); return; }
    if (!invoiceDate) { setError('Invoice date is required'); return; }
    if (lines.length === 0) { setError('Add at least one product'); return; }

    setSaving(true);
    setError('');
    try {
      let finalVendorId = vendorId;
      if (!vendorId && vendorName.trim() && !isEdit) {
        const newVendor = await createVendor(token, { name: vendorName.trim(), contact_person: contactPerson || undefined, phone: phone || undefined });
        finalVendorId = newVendor.id;
        onVendorCreated(newVendor);
      }

      const payload: CreateInvoicePayload = {
        vendor_id: finalVendorId || undefined,
        vendor_name: vendorName.trim(),
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        received_date: receivedDate || undefined,
        payment_status: paymentStatus,
        payment_due_date: paymentDue || undefined,
        tax_amount: taxAmount,
        notes: notes || undefined,
        status,
        items: lines.map(l => ({ product_id: l.product_id, product_name: l.product_name, quantity: l.quantity, unit_cost: l.unit_cost })),
      };

      const invoice = isEdit
        ? await updateInvoiceAPI(token, editInvoice!.id, payload)
        : await createInvoice(token, payload);
      onSuccess(invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-dark" />
        </button>
        <h1 className="font-bold text-dark text-xl" style={{ fontFamily: 'var(--font-serif)' }}>
          {isEdit ? `Edit Draft — ${editInvoice!.invoice_number}` : 'New Purchase Invoice'}
        </h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Vendor & Invoice Details */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <p className="text-xs font-bold text-muted uppercase tracking-widest">Vendor & Invoice Details</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Vendor *</label>
            <select value={vendorId} onChange={e => e.target.value ? selectVendor(e.target.value, vendors.find(v => v.id === e.target.value)?.name ?? '') : (setVendorId(''), setVendorName(''))}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary">
              <option value="">— New Vendor / Type Below —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {!vendorId && (
              <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Vendor name *"
                className="mt-2 w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Contact Person</label>
              <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Name"
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..."
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Invoice Number *</label>
            <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm font-mono focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Received Date</label>
            <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Payment Due Date</label>
            <input type="date" value={paymentDue} onChange={e => setPaymentDue(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <p className="text-xs font-bold text-muted uppercase tracking-widest">Line Items ({lines.length})</p>

        {lines.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 text-xs text-muted font-semibold">Product</th>
                  <th className="text-center pb-2 text-xs text-muted font-semibold w-20">Qty</th>
                  <th className="text-center pb-2 text-xs text-muted font-semibold w-28">Unit Cost (₹)</th>
                  <th className="text-right pb-2 text-xs text-muted font-semibold w-24">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line) => (
                  <tr key={line.tempId}>
                    <td className="py-2 pr-3">
                      <p className="text-sm font-medium text-dark">{line.product_name}</p>
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={1} value={line.quantity}
                        onChange={e => setLines(prev => prev.map(l => l.tempId === line.tempId ? { ...l, quantity: parseInt(e.target.value) || 1 } : l))}
                        className="w-full px-2 py-1 border border-border rounded-lg text-xs text-center focus:outline-none focus:border-primary" />
                    </td>
                    <td className="py-2 px-1">
                      <input type="number" min={0} value={line.unit_cost}
                        onChange={e => setLines(prev => prev.map(l => l.tempId === line.tempId ? { ...l, unit_cost: parseInt(e.target.value) || 0 } : l))}
                        className="w-full px-2 py-1 border border-border rounded-lg text-xs text-center focus:outline-none focus:border-primary" />
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <p className="text-sm font-semibold text-dark">₹{fmt(line.quantity * line.unit_cost)}</p>
                    </td>
                    <td className="py-2 pl-1">
                      <button onClick={() => removeLine(line.tempId)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product search */}
        <div className="relative">
          <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
            placeholder="Search products to add..."
            className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
          {productResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white border border-border rounded-xl shadow-lg mt-1 max-h-44 overflow-y-auto">
              {productResults.map(p => (
                <button key={p.id} onClick={() => addLine(p)}
                  className="w-full text-left px-3 py-2 hover:bg-cream transition-colors text-sm flex items-center justify-between">
                  <span>{p.name}</span>
                  <span className="text-muted text-xs">₹{p.price}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes & Totals */}
      <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Notes / Remarks</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Batch number, terms, remarks..."
              className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="font-semibold text-dark">₹{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-muted shrink-0">Tax / GST (₹)</span>
              <input type="number" min={0} value={taxAmount} onChange={e => setTaxAmount(parseInt(e.target.value) || 0)}
                className="w-24 px-2 py-1 border border-border rounded-lg text-xs text-right focus:outline-none focus:border-primary" />
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span className="text-dark">Total</span>
              <span className="text-primary">₹{fmt(grandTotal)}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Payment Status</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as typeof paymentStatus)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary">
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button onClick={onBack} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        {!isEdit && (
          <button onClick={() => handleSubmit('draft')} disabled={saving}
            className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Draft'}
          </button>
        )}
        {isEdit ? (
          <button onClick={() => handleSubmit('draft')} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Save Changes
          </button>
        ) : (
          <button onClick={() => handleSubmit('submitted')} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit Invoice & Update Stock
          </button>
        )}
      </div>
    </div>
  );
}

// ── Invoice Detail View ───────────────────────────────────────────
function InvoiceDetail({ invoice, submitting, submitConfirmId, submitError, onPaymentChange, onCancel, onEdit, onSubmitRequest, onSubmitConfirm, onSubmitCancel }: {
  invoice: PurchaseInvoice;
  submitting: boolean;
  submitConfirmId: string | null;
  submitError: string;
  onPaymentChange: (status: 'unpaid' | 'partial' | 'paid') => void;
  onCancel: () => void;
  onEdit: () => void;
  onSubmitRequest: () => void;
  onSubmitConfirm: () => void;
  onSubmitCancel: () => void;
}) {
  const items = invoice.purchase_invoice_items ?? [];
  const awaitingConfirm = submitConfirmId === invoice.id;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-mono text-lg font-bold text-dark">{invoice.invoice_number}</p>
            <p className="text-sm text-muted">{invoice.vendor_name}</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[invoice.status]}`}>{invoice.status}</span>
            {invoice.status === 'draft' && !awaitingConfirm && (
              <>
                <button onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-cream text-dark text-xs font-semibold rounded-xl transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Draft
                </button>
                <button onClick={onSubmitRequest}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Submit & Update Stock
                </button>
              </>
            )}
            {invoice.status === 'draft' && awaitingConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Confirm submit?</span>
                <button onClick={onSubmitConfirm} disabled={submitting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Yes, Submit
                </button>
                <button onClick={onSubmitCancel} disabled={submitting}
                  className="px-3 py-1.5 border border-border text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancel
                </button>
              </div>
            )}
            {invoice.status !== 'cancelled' && !awaitingConfirm && (
              <button onClick={onCancel} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors" title="Cancel invoice">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {submitError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">{submitError}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><p className="text-muted mb-0.5">Invoice Date</p><p className="font-semibold text-dark">{fmtDate(invoice.invoice_date)}</p></div>
          {invoice.received_date && <div><p className="text-muted mb-0.5">Received</p><p className="font-semibold text-dark">{fmtDate(invoice.received_date)}</p></div>}
          {invoice.payment_due_date && <div><p className="text-muted mb-0.5">Due Date</p><p className="font-semibold text-dark">{fmtDate(invoice.payment_due_date)}</p></div>}
          <div>
            <p className="text-muted mb-0.5">Payment</p>
            {invoice.status === 'submitted' ? (
              <select value={invoice.payment_status} onChange={e => onPaymentChange(e.target.value as 'unpaid'|'partial'|'paid')}
                className={`text-[11px] font-bold rounded-full border px-2 py-0.5 cursor-pointer bg-white focus:outline-none ${PAYMENT_BADGE[invoice.payment_status]}`}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            ) : <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${PAYMENT_BADGE[invoice.payment_status]}`}>{invoice.payment_status}</span>}
          </div>
        </div>

        {invoice.notes && <p className="mt-4 text-xs text-muted bg-cream rounded-xl p-3">{invoice.notes}</p>}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-bold text-dark">Items ({items.length})</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-cream/50">
              <th className="text-left px-4 py-2 text-xs font-semibold text-muted">Product</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-muted">Qty</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-muted hidden md:table-cell">Unit Cost</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-muted">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.products?.image_url && (
                      <Image src={item.products.image_url} alt={item.product_name} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-medium text-dark text-sm">{item.product_name}</p>
                      {item.products?.weight && <p className="text-xs text-muted">{item.products.weight}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center"><span className="font-semibold text-dark">{item.quantity}</span></td>
                <td className="px-3 py-3 text-right hidden md:table-cell"><span className="text-sm text-muted">₹{fmt(item.unit_cost)}</span></td>
                <td className="px-4 py-3 text-right"><span className="text-sm font-bold text-dark">₹{fmt(item.total_cost)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-border space-y-1 bg-cream/30">
          <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="font-semibold text-dark">₹{fmt(invoice.subtotal)}</span></div>
          {invoice.tax_amount > 0 && <div className="flex justify-between text-sm"><span className="text-muted">Tax / GST</span><span className="font-semibold text-dark">₹{fmt(invoice.tax_amount)}</span></div>}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
            <span className="text-dark">Total</span>
            <span className="text-primary">₹{fmt(invoice.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
