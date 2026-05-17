'use client';
import { Pencil, Tag, Trash2 } from 'lucide-react';
import type { PromoCode } from '@/lib/api/promo';

interface Props {
  promos: PromoCode[];
  onEdit: (promo: PromoCode) => void;
  onDelete: (promo: PromoCode) => void;
  onToggle: (promo: PromoCode) => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PromoTable({ promos, onEdit, onDelete, onToggle }: Props) {
  if (promos.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl text-center py-20">
        <Tag className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
        <p className="font-semibold text-dark mb-1">No promo codes yet</p>
        <p className="text-sm text-muted">Create your first discount code above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-cream text-xs font-semibold text-muted uppercase tracking-wide">
              <th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Discount</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Min Order</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Uses</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Expires</th>
              <th className="text-left px-4 py-3">Active</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {promos.map((promo) => (
              <tr key={promo.id} className="hover:bg-cream/50 transition-colors">
                <td className="px-4 py-3">
                  <code className="font-mono font-bold text-dark bg-cream px-2 py-0.5 rounded text-xs">
                    {promo.code}
                  </code>
                  {promo.description && (
                    <p className="text-xs text-muted mt-0.5 max-w-[140px] truncate">{promo.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-dark text-sm">
                    {promo.type === 'percentage' ? `${promo.value}% off` : `₹${promo.value} off`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {promo.first_order_only && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">1st Order</span>
                    )}
                    {promo.auto_apply && (
                      <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">Auto</span>
                    )}
                    {promo.applicable_categories?.length ? (
                      <span className="text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                        {promo.applicable_categories.join(', ')}
                      </span>
                    ) : null}
                    {promo.max_uses_per_customer != null && (
                      <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">
                        {promo.max_uses_per_customer}× / user
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted hidden sm:table-cell">
                  {promo.min_order_amount > 0 ? `₹${promo.min_order_amount}` : '—'}
                </td>
                <td className="px-4 py-3 text-muted hidden md:table-cell">
                  {promo.used_count} / {promo.max_uses ?? '∞'}
                </td>
                <td className="px-4 py-3 text-muted hidden lg:table-cell">
                  {promo.valid_until ? fmtDate(promo.valid_until) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onToggle(promo)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      promo.is_active
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(promo)}
                      className="p-1.5 text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(promo)}
                      className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
