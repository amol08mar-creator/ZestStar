'use client';
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Trash2, Pencil, CalendarDays, Zap } from 'lucide-react';
import { fetchAdminSlots, generateSlots, createSlot, updateSlot, deleteSlot } from '@/lib/api/slots';
import type { DeliverySlot } from '@/lib/types';

function formatTime(t: string) {
  const [h] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour} ${period}`;
}

interface Props { token: string; }

export default function DeliverySlotsManager({ token }: Props) {
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);
  const [form, setForm] = useState({ date: '', time_start: '09:00', time_end: '11:00', capacity: 10, is_enabled: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Generate modal
  const [generateDate, setGenerateDate] = useState('');
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminSlots(token, dateFilter || undefined);
      setSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [dateFilter]); // eslint-disable-line

  function openCreate() {
    setEditingSlot(null);
    setForm({ date: new Date().toISOString().split('T')[0], time_start: '09:00', time_end: '11:00', capacity: 10, is_enabled: true });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(slot: DeliverySlot) {
    setEditingSlot(slot);
    setForm({ date: slot.date, time_start: slot.time_start.slice(0, 5), time_end: slot.time_end.slice(0, 5), capacity: slot.capacity, is_enabled: slot.is_enabled });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.date) { setFormError('Date is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingSlot) {
        await updateSlot(token, editingSlot.id, form);
      } else {
        await createSlot(token, { ...form, is_enabled: form.is_enabled });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this slot?')) return;
    try {
      await deleteSlot(token, id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleGenerate() {
    if (!generateDate) return;
    setGenerating(true);
    try {
      await generateSlots(token, generateDate);
      setGenerateDate('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Delivery Slots
            </h1>
            <p className="text-xs text-muted">{slots.length} slot{slots.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Slot
          </button>
        </div>
      </div>

      {/* Filters + Generate */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
          placeholder="Filter by date"
        />
        <div className="flex gap-2 flex-1">
          <input
            type="date"
            value={generateDate}
            onChange={(e) => setGenerateDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
            placeholder="Generate for date"
          />
          <button
            onClick={handleGenerate}
            disabled={!generateDate || generating}
            className="flex items-center gap-2 bg-accent hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            <Zap className="w-4 h-4" />
            {generating ? 'Generating…' : 'Generate 6 Slots'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Table */}
      {loading && slots.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm">Loading slots…</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="font-semibold mb-1">No slots yet</p>
          <p className="text-sm">Use "Generate 6 Slots" to create a full day of slots, or add individually.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Time</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Capacity</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Booked</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slots.map((slot) => {
                const remaining = slot.capacity - slot.booked;
                const isFull = remaining <= 0;
                return (
                  <tr key={slot.id} className="bg-white hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-dark">
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-dark">
                      {formatTime(slot.time_start)} – {formatTime(slot.time_end)}
                    </td>
                    <td className="px-4 py-3 text-center text-muted">{slot.capacity}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={isFull ? 'text-red-600 font-semibold' : 'text-muted'}>{slot.booked}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!slot.is_enabled ? (
                        <span className="text-xs font-semibold text-muted bg-gray-100 px-2 py-0.5 rounded-full">Disabled</span>
                      ) : isFull ? (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Full</span>
                      ) : (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{remaining} left</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(slot)} className="p-1.5 text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(slot.id)} className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-dark">{editingSlot ? 'Edit Slot' : 'Add Slot'}</h2>
            {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Date *</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-dark mb-1">Start Time *</label>
                <input type="time" value={form.time_start} onChange={(e) => setForm((f) => ({ ...f, time_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark mb-1">End Time *</label>
                <input type="time" value={form.time_end} onChange={(e) => setForm((f) => ({ ...f, time_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="slot_enabled" checked={form.is_enabled} onChange={(e) => setForm((f) => ({ ...f, is_enabled: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <label htmlFor="slot_enabled" className="text-sm font-medium text-dark">Enabled</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors">
                {saving ? 'Saving…' : editingSlot ? 'Save Changes' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
