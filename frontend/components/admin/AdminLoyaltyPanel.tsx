'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { fetchLoyaltyConfig, updateLoyaltyConfig, type LoyaltyTierConfig } from '@/lib/api/coins';

const TIER_META: Record<string, { emoji: string; label: string; color: string }> = {
  bronze:   { emoji: '🥉', label: 'Bronze',   color: 'text-amber-700 bg-amber-50' },
  silver:   { emoji: '🥈', label: 'Silver',   color: 'text-slate-600 bg-slate-50' },
  gold:     { emoji: '🥇', label: 'Gold',     color: 'text-yellow-700 bg-yellow-50' },
  platinum: { emoji: '💎', label: 'Platinum', color: 'text-purple-700 bg-purple-50' },
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];

export default function AdminLoyaltyPanel({ token }: { token: string }) {
  const [config, setConfig] = useState<LoyaltyTierConfig[]>([]);
  const [edits, setEdits] = useState<Record<string, { min_spend: string; coin_rate: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    try {
      const tiers = await fetchLoyaltyConfig();
      setConfig(tiers);
      const initial: Record<string, { min_spend: string; coin_rate: string }> = {};
      for (const t of tiers) {
        initial[t.tier] = { min_spend: String(t.min_spend), coin_rate: String(t.coin_rate) };
      }
      setEdits(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setField(tier: string, field: 'min_spend' | 'coin_rate', value: string) {
    setEdits((prev) => ({ ...prev, [tier]: { ...prev[tier], [field]: value } }));
    setError('');
    setSuccess('');
  }

  function validate(): string | null {
    const sorted = TIER_ORDER.map((t) => ({
      tier: t,
      min_spend: parseInt(edits[t]?.min_spend ?? '0'),
      coin_rate: parseFloat(edits[t]?.coin_rate ?? '1'),
    }));

    if (sorted[0].min_spend !== 0) return 'Bronze minimum spend must be 0.';

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min_spend <= sorted[i - 1].min_spend) {
        return `${TIER_META[sorted[i].tier].label} min spend must be greater than ${TIER_META[sorted[i - 1].tier].label} (₹${sorted[i - 1].min_spend}).`;
      }
    }

    for (const t of sorted) {
      if (isNaN(t.coin_rate) || t.coin_rate <= 0) return `${TIER_META[t.tier].label} coin rate must be > 0.`;
      if (t.coin_rate > 10) return `${TIER_META[t.tier].label} coin rate cannot exceed 10×.`;
    }

    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updates = TIER_ORDER.map((t) => ({
        tier: t,
        min_spend: parseInt(edits[t]?.min_spend ?? '0'),
        coin_rate: parseFloat(edits[t]?.coin_rate ?? '1'),
      }));
      const updated = await updateLoyaltyConfig(token, updates);
      setConfig(updated);
      setSuccess('Loyalty configuration saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark">Loyalty Tier Configuration</h2>
          <p className="text-xs text-muted mt-0.5">Set spend thresholds and coin earn rates per tier</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">{success}</p>}

      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream border-b border-border">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide w-32">Tier</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                Min. Lifetime Spend (₹)
                <p className="font-normal normal-case text-muted/70 text-[10px] mt-0.5">Customer must spend at least this amount to reach this tier</p>
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                Coins per ₹100 Spent (×)
                <p className="font-normal normal-case text-muted/70 text-[10px] mt-0.5">Multiplier applied to base earning rate</p>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {TIER_ORDER.map((tier) => {
              const meta = TIER_META[tier];
              const edit = edits[tier] ?? { min_spend: '0', coin_rate: '1' };
              const current = config.find((c) => c.tier === tier);

              return (
                <tr key={tier} className="hover:bg-cream/30 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${meta.color}`}>
                      {meta.emoji} {meta.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-muted text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={edit.min_spend}
                        disabled={tier === 'bronze'}
                        onChange={(e) => setField(tier, 'min_spend', e.target.value)}
                        className="w-32 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white disabled:bg-gray-50 disabled:text-muted disabled:cursor-not-allowed"
                      />
                      {tier === 'bronze' && <span className="text-xs text-muted italic">(always 0)</span>}
                      {current && parseInt(edit.min_spend) !== current.min_spend && (
                        <span className="text-xs text-orange-600 font-medium">changed</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.5}
                        value={edit.coin_rate}
                        onChange={(e) => setField(tier, 'coin_rate', e.target.value)}
                        className="w-24 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                      />
                      <span className="text-muted text-sm">× per ₹100</span>
                      {current && parseFloat(edit.coin_rate) !== current.coin_rate && (
                        <span className="text-xs text-orange-600 font-medium">changed</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Example preview */}
      <div className="bg-cream rounded-2xl p-4 text-sm space-y-1">
        <p className="font-semibold text-dark text-xs uppercase tracking-wide mb-2">Preview — Coins earned on a ₹500 order</p>
        {TIER_ORDER.map((tier) => {
          const rate = parseFloat(edits[tier]?.coin_rate ?? '1');
          const coins = Math.floor(500 / 100 * rate);
          const meta = TIER_META[tier];
          return (
            <div key={tier} className="flex justify-between text-xs">
              <span className="text-muted">{meta.emoji} {meta.label}</span>
              <span className="font-semibold text-dark">{coins} coins (= ₹{coins})</span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
