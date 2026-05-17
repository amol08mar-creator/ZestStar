'use client';
import { useEffect, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react';
import {
  fetchServiceableAreas,
  createServiceableArea,
  updateServiceableArea,
  deleteServiceableArea,
  toggleServiceableArea,
  type ServiceableArea,
} from '@/lib/api/delivery';

interface FormState { pincode: string; area_name: string; is_active: boolean; }
const EMPTY_FORM: FormState = { pincode: '', area_name: '', is_active: true };

export default function AdminServiceableAreasPanel({ token }: { token: string }) {
  const [areas, setAreas] = useState<ServiceableArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      setAreas(await fetchServiceableAreas(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(a: ServiceableArea) {
    setEditingId(a.id);
    setForm({ pincode: a.pincode, area_name: a.area_name ?? '', is_active: a.is_active });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.pincode.trim()) { setFormError('Pincode is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const updated = await updateServiceableArea(token, editingId, {
          pincode: form.pincode.trim(),
          area_name: form.area_name.trim() || undefined,
        });
        setAreas((prev) => prev.map((a) => a.id === editingId ? updated : a));
      } else {
        const created = await createServiceableArea(token, {
          pincode: form.pincode.trim(),
          area_name: form.area_name.trim() || undefined,
          is_active: form.is_active,
        });
        setAreas((prev) => [...prev, created].sort((a, b) => a.pincode.localeCompare(b.pincode)));
      }
      setShowForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(a: ServiceableArea) {
    try {
      const updated = await toggleServiceableArea(token, a.id);
      setAreas((prev) => prev.map((x) => x.id === a.id ? updated : x));
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await deleteServiceableArea(token, id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-dark">Serviceable Areas</h2>
            <p className="text-xs text-muted">{areas.length} pincode{areas.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Pincode
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-dark text-sm">{editingId ? 'Edit Pincode' : 'Add Pincode'}</p>
            <button onClick={() => setShowForm(false)} className="p-1 text-muted hover:text-dark">
              <X className="w-4 h-4" />
            </button>
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Pincode *</label>
              <input
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="e.g. 411001"
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Area Name <span className="font-normal text-muted">(optional)</span></label>
              <input
                value={form.area_name}
                onChange={(e) => setForm((f) => ({ ...f, area_name: e.target.value }))}
                placeholder="e.g. Koregaon Park, Pune"
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          {!editingId && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <span className="text-sm text-dark">Active (visible to customers)</span>
            </label>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !form.pincode.trim()} className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />)}
        </div>
      ) : areas.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-8 text-center text-muted">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">No serviceable areas configured yet</p>
          <p className="text-xs mt-1">Add pincodes to restrict delivery to specific areas</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-cream">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Pincode</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Area</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {areas.map((a) => (
                <tr key={a.id} className="hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-dark">{a.pincode}</td>
                  <td className="px-4 py-3 text-muted">{a.area_name ?? <span className="italic text-xs">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => handleToggle(a)} title={a.is_active ? 'Deactivate' : 'Activate'} className="p-1.5 text-muted hover:text-primary transition-colors">
                        {a.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(a)} title="Edit" className="p-1.5 text-muted hover:text-primary transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a.id)} title="Delete" className="p-1.5 text-muted hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        💡 If no pincodes are configured, delivery area is unrestricted. Customers will not see serviceability checks until at least one pincode is added.
      </p>
    </div>
  );
}
