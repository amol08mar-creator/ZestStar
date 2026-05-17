'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Gift, Package, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  createProduct, deleteProduct, fetchProducts, updateProduct,
  type Product, type ProductForm,
} from '@/lib/api/products';
import ProductModal from '@/components/admin/ProductModal';

export default function AdminBundlesPanel({ token }: { token: string }) {
  const [bundles, setBundles] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Product | null>(null);

  const [deletingBundle, setDeletingBundle] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchProducts(token, { category: 'bundles', limit: 100 });
      setBundles(res.data.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bundles');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form: ProductForm): Promise<Product> {
    const result = editingBundle
      ? await updateProduct(token, editingBundle.id, form)
      : await createProduct(token, form);
    const saved: Product = result.data.product;
    setBundles((prev) => {
      const exists = prev.find((b) => b.id === saved.id);
      return exists
        ? prev.map((b) => b.id === saved.id ? saved : b)
        : [saved, ...prev];
    });
    return saved;
  }

  async function handleDelete() {
    if (!deletingBundle) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(token, deletingBundle.id);
      setBundles((prev) => prev.filter((b) => b.id !== deletingBundle.id));
      setDeletingBundle(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete bundle');
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              Bundles & Kits
            </h1>
            <p className="text-xs text-muted">{bundles.length} bundle{bundles.length !== 1 ? 's' : ''} total</p>
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
            onClick={() => { setEditingBundle(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Bundle
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Prerequisite hint */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-xs">
        <Package className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Make sure a category named exactly <code className="font-mono font-bold">bundles</code> exists in the{' '}
          <strong>Categories</strong> tab before creating bundles. The bundle items editor appears automatically when
          that category is selected.
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading && bundles.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">Loading bundles…</div>
        ) : bundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <p className="font-semibold text-dark mb-1">No bundles yet</p>
            <p className="text-sm text-muted mb-6 max-w-xs">
              Create a bundle to group multiple products together and sell them as a kit at a special price.
            </p>
            <button
              onClick={() => { setEditingBundle(null); setModalOpen(true); }}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create your first bundle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50 text-xs text-muted">
                  <th className="text-left px-5 py-3 font-medium">Bundle</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Original</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Stock</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bundles.map((bundle) => (
                  <tr key={bundle.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-cream shrink-0">
                          {bundle.image_url ? (
                            <Image
                              src={bundle.image_url}
                              alt={bundle.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-dark">{bundle.name}</p>
                          {bundle.weight && <p className="text-xs text-muted">{bundle.weight}</p>}
                          {bundle.discount_percent > 0 && (
                            <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                              -{bundle.discount_percent}% off
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-dark">₹{bundle.price}</td>
                    <td className="px-4 py-3 text-right text-muted hidden sm:table-cell">
                      {bundle.original_price ? <s className="text-xs">₹{bundle.original_price}</s> : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted hidden md:table-cell">
                      {bundle.stock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        bundle.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {bundle.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditingBundle(bundle); setModalOpen(true); }}
                          className="p-1.5 text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          title="Edit bundle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingBundle(bundle)}
                          className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete bundle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ProductModal — reuses existing modal with bundle category pre-set */}
      <ProductModal
        open={modalOpen}
        product={editingBundle}
        token={token}
        initialCategory="bundles"
        onClose={() => { setModalOpen(false); setEditingBundle(null); }}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      {deletingBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-dark mb-2">Delete Bundle?</h3>
            <p className="text-sm text-muted mb-6">
              <strong className="text-dark">{deletingBundle.name}</strong> will be permanently removed along with all its bundle item configurations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingBundle(null)}
                className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
