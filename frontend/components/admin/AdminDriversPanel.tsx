'use client';
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Truck, X } from 'lucide-react';
import {
  createDriver, fetchDrivers, toggleDriver, updateDriver,
  VEHICLE_LABELS, type Driver, type DriverForm,
} from '@/lib/api/drivers';

const VEHICLE_OPTIONS: { value: 'bike' | 'scooter' | 'car'; label: string }[] = [
  { value: 'bike', label: '🚲 Bike' },
  { value: 'scooter', label: '🛵 Scooter' },
  { value: 'car', label: '🚗 Car' },
];

const EMPTY_FORM: DriverForm = { name: '', phone: '', vehicle_type: 'bike', is_active: true };

// ── Driver Modal ───────────────────────────────────────────────────────────────
function DriverModal({
  driver,
  token,
  onClose,
  onSaved,
}: {
  driver: Driver | null;
  token: string;
  onClose: () => void;
  onSaved: (d: Driver) => void;
}) {
  const [form, setForm] = useState<DriverForm>(
    driver
      ? { name: driver.name, phone: driver.phone, vehicle_type: driver.vehicle_type, is_active: driver.is_active }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof DriverForm>(key: K, val: DriverForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.phone.trim()) { setError('Phone is required'); return; }
    setSaving(true);
    setError('');
    try {
      const saved = driver
        ? await updateDriver(token, driver.id, form)
        : await createDriver(token, form);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            {driver ? 'Edit Driver' : 'Add Driver'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Raju Kumar"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Phone *</label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark mb-2">Vehicle Type</label>
            <div className="flex gap-2">
              {VEHICLE_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => set('vehicle_type', v.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    form.vehicle_type === v.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-muted hover:border-primary/50'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active ?? true}
              onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-dark">Active (available for deliveries)</span>
          </label>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : driver ? 'Save Changes' : 'Add Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function AdminDriversPanel({ token }: { token: string }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDrivers(await fetchDrivers(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(id: string) {
    setTogglingId(id);
    try {
      const updated = await toggleDriver(token, id);
      setDrivers((prev) => prev.map((d) => d.id === id ? updated : d));
    } catch { /* silent */ } finally {
      setTogglingId(null);
    }
  }

  function handleSaved(saved: Driver) {
    setDrivers((prev) => {
      const exists = prev.find((d) => d.id === saved.id);
      return exists ? prev.map((d) => d.id === saved.id ? saved : d) : [saved, ...prev];
    });
  }

  const activeCount = drivers.filter((d) => d.is_active).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Delivery Drivers
            </h1>
            <p className="text-xs text-muted">
              {drivers.length} total · {activeCount} active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingDriver(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading && drivers.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">Loading drivers…</div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-20">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-semibold text-dark mb-1">No drivers yet</p>
            <p className="text-sm text-muted">Add your first delivery driver to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50 text-xs text-muted">
                  <th className="text-left px-5 py-3 font-medium">Driver</th>
                  <th className="text-left px-4 py-3 font-medium">Phone</th>
                  <th className="text-left px-4 py-3 font-medium">Vehicle</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-dark">{driver.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:${driver.phone}`} className="text-primary hover:underline text-xs">
                        {driver.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{VEHICLE_LABELS[driver.vehicle_type] ?? driver.vehicle_type}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(driver.id)}
                        disabled={togglingId === driver.id}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-50 ${
                          driver.is_active
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {driver.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => { setEditingDriver(driver); setModalOpen(true); }}
                        className="p-1.5 text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Edit driver"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <DriverModal
          driver={editingDriver}
          token={token}
          onClose={() => { setModalOpen(false); setEditingDriver(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
