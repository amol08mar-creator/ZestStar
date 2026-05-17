'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Plus, Trash2, Calculator, Upload } from 'lucide-react';
import type { Product, ProductForm } from '@/lib/api/products';
import { fetchProducts, fetchAdminBundleItems, saveBundleItems } from '@/lib/api/products';
import { fetchAdminCategories } from '@/lib/api/categories';
import { createSupabaseClient } from '@/lib/supabase/client';

const EMPTY: ProductForm = {
  name: '',
  category: '',
  price: 0,
  original_price: undefined,
  discount_percent: 0,
  stock: 0,
  description: '',
  image_url: '',
  weight: '',
  is_active: true,
};

interface BundleRow {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  open: boolean;
  product: Product | null;
  token: string;
  onClose: () => void;
  onSave: (form: ProductForm) => Promise<Product>;
  initialCategory?: string;
}

export default function ProductModal({ open, product, token, onClose, onSave, initialCategory }: Props) {
  const [form, setForm] = useState<ProductForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, idx: number) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const supabase = createSupabaseClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setImageUrls((prev) => {
        const next = [...prev];
        next[idx] = publicUrl;
        return next.filter(Boolean);
      });
      if (idx === 0) set('image_url', publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImageUrls((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (idx === 0 && next.length > 0) set('image_url', next[0]);
      if (next.length === 0) set('image_url', '');
      return next;
    });
  }

  // Categories
  const [categories, setCategories] = useState<string[]>([]);

  // Bundle state
  const [bundleRows, setBundleRows] = useState<BundleRow[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    if (!open) return;

    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        price: product.price,
        original_price: product.original_price ?? undefined,
        discount_percent: product.discount_percent,
        stock: product.stock,
        description: product.description ?? '',
        image_url: product.image_url ?? '',
        weight: product.weight ?? '',
        is_active: product.is_active,
      });
      setImageUrls(
        product.image_urls?.filter(Boolean) ??
        (product.image_url ? [product.image_url] : []),
      );
    } else {
      setForm({ ...EMPTY, category: initialCategory ?? '' });
      setImageUrls([]);
    }

    setBundleRows([]);
    setSelectedId('');
    setSelectedQty(1);
    setError('');

    // Load product list and categories
    fetchProducts(token, { limit: 100 })
      .then((res) => setAllProducts(res.data.products))
      .catch(() => {});
    fetchAdminCategories(token)
      .then((cats) => setCategories(cats.filter((c) => c.is_active).map((c) => c.name)))
      .catch(() => {});

    // Load existing bundle items when editing
    if (product?.id && product.category === 'bundles') {
      fetchAdminBundleItems(token, product.id)
        .then((res) => {
          const rows: BundleRow[] = (res.data.items ?? []).map((i: any) => ({
            product_id: i.constituent.id,
            name: i.constituent.name,
            price: i.constituent.price,
            quantity: i.quantity,
          }));
          setBundleRows(rows);
        })
        .catch(() => {});
    }
  }, [product, open, token]);

  if (!open) return null;

  function set<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'price' || key === 'original_price') {
        const p = key === 'price' ? (value as number) : f.price;
        const op = key === 'original_price' ? (value as number) : f.original_price;
        if (op && op > 0 && p > 0 && op > p) {
          next.discount_percent = Math.round(((op - p) / op) * 100);
        } else {
          next.discount_percent = 0;
        }
      }
      return next;
    });
  }

  function addBundleItem() {
    if (!selectedId) return;
    if (bundleRows.some((r) => r.product_id === selectedId)) return;
    const p = allProducts.find((p) => p.id === selectedId);
    if (!p) return;
    setBundleRows((prev) => [...prev, { product_id: p.id, name: p.name, price: p.price, quantity: selectedQty }]);
    setSelectedId('');
    setSelectedQty(1);
  }

  function removeBundleItem(productId: string) {
    setBundleRows((prev) => prev.filter((r) => r.product_id !== productId));
  }

  function applyCalculatedPrice() {
    const total = bundleRows.reduce((sum, r) => sum + r.price * r.quantity, 0);
    set('original_price', total);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.category) { setError('Category is required'); return; }
    if (form.price < 1) { setError('Price must be at least ₹1'); return; }
    if (form.category === 'bundles' && bundleRows.length === 0) {
      setError('Add at least one item to the bundle'); return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await onSave({ ...form, image_urls: imageUrls });
      if (form.category === 'bundles') {
        await saveBundleItems(
          token,
          saved.id,
          bundleRows.map((r) => ({ product_id: r.product_id, quantity: r.quantity })),
        );
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const isBundle = form.category === 'bundles';
  const calculatedOriginal = bundleRows.reduce((sum, r) => sum + r.price * r.quantity, 0);
  const availableProducts = allProducts.filter(
    (p) => p.id !== product?.id && p.category !== 'bundles' && !bundleRows.some((r) => r.product_id === p.id),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-dark">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-dark mb-1">Name *</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="e.g. Fresh Spinach"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="" disabled>Select a category…</option>
                {form.category && !categories.includes(form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Weight / Unit</label>
              <input
                value={form.weight}
                onChange={(e) => set('weight', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 250g, 1kg, 6 pcs"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Price (₹) *</label>
              <input
                type="number"
                min={1}
                value={form.price || ''}
                onChange={(e) => set('price', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="45"
              />
            </div>

            {/* Original Price */}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">
                Original Price (₹)
                {isBundle && calculatedOriginal > 0 && (
                  <button
                    type="button"
                    onClick={applyCalculatedPrice}
                    title={`Auto-fill ₹${calculatedOriginal} from bundle items`}
                    className="ml-2 inline-flex items-center gap-0.5 text-primary hover:text-primary-dark"
                  >
                    <Calculator className="w-3 h-3" />
                    <span className="text-[10px]">₹{calculatedOriginal}</span>
                  </button>
                )}
              </label>
              <input
                type="number"
                min={1}
                value={form.original_price || ''}
                onChange={(e) => set('original_price', parseInt(e.target.value) || undefined)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="60"
              />
            </div>

            {/* Discount — auto-calculated */}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">
                Discount (%) <span className="text-[10px] font-normal text-muted">auto-calculated</span>
              </label>
              <input
                type="number"
                readOnly
                value={form.discount_percent || ''}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-cream text-muted cursor-default"
                placeholder="—"
                tabIndex={-1}
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Stock (units)</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set('stock', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="100"
              />
            </div>

            {/* Images — up to 5 */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-dark mb-2">
                Product Images <span className="font-normal text-muted">(up to 5 · first = primary)</span>
              </label>
              {uploading && <p className="text-xs text-muted mb-1">Uploading…</p>}
              {uploadError && <p className="text-xs text-red-600 mb-1">{uploadError}</p>}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, idx) => {
                  const url = imageUrls[idx];
                  const isNext = imageUrls.length === idx;
                  return (
                    <div key={idx} className="relative aspect-square">
                      {url ? (
                        <div className="relative w-full h-full rounded-xl overflow-hidden border-2 border-primary/30 bg-cream">
                          <Image src={url} alt={`Image ${idx + 1}`} fill sizes="80px" className="object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow"
                          >×</button>
                          {idx === 0 && (
                            <span className="absolute bottom-0 inset-x-0 text-center text-[9px] font-bold text-white bg-primary/80 py-0.5">
                              Primary
                            </span>
                          )}
                        </div>
                      ) : (
                        <label className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-colors ${isNext ? 'border-border hover:border-primary/50 cursor-pointer' : 'border-border/40 opacity-30 pointer-events-none'}`}>
                          <Plus className="w-4 h-4 text-muted" />
                          <span className="text-[9px] text-muted mt-0.5">{idx + 1}</span>
                          {isNext && (
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e, idx)}
                            />
                          )}
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* URL paste for primary image */}
              <input
                value={form.image_url}
                onChange={(e) => {
                  set('image_url', e.target.value);
                  if (e.target.value) setImageUrls((prev) => { const n = [...prev]; n[0] = e.target.value; return n.filter(Boolean); });
                }}
                className="w-full mt-2 px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-muted"
                placeholder="Or paste primary image URL…"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-dark mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary resize-none"
                placeholder="Short description..."
              />
            </div>

            {/* Active toggle */}
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-dark">
                Active (visible in shop)
              </label>
            </div>
          </div>

          {/* ── Bundle Items Section ─────────────────────────────── */}
          {isBundle && (
            <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary-light/30">
              <p className="text-xs font-semibold text-dark">Bundle Items</p>

              {/* Add item row */}
              <div className="flex gap-2">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
                >
                  <option value="">Select product…</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.weight ? ` (${p.weight})` : ''} — ₹{p.price}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 border border-border rounded-xl text-sm text-center focus:outline-none focus:border-primary bg-white"
                  title="Quantity"
                />
                <button
                  type="button"
                  onClick={addBundleItem}
                  disabled={!selectedId}
                  className="p-2 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl transition-colors"
                  title="Add item"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Item list */}
              {bundleRows.length === 0 ? (
                <p className="text-xs text-muted text-center py-2">No items added yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {bundleRows.map((row) => (
                    <li key={row.product_id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 text-sm">
                      <span className="flex-1 truncate font-medium text-dark">{row.name}</span>
                      <span className="text-xs text-muted">× {row.quantity}</span>
                      <span className="text-xs text-muted">₹{row.price * row.quantity}</span>
                      <button
                        type="button"
                        onClick={() => removeBundleItem(row.product_id)}
                        className="p-1 text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {bundleRows.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-primary/20">
                  <span className="text-muted">
                    Total original value: <strong className="text-dark">₹{calculatedOriginal}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={applyCalculatedPrice}
                    className="text-primary hover:text-primary-dark font-semibold flex items-center gap-1"
                  >
                    <Calculator className="w-3 h-3" /> Apply as Original Price
                  </button>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-muted border border-border rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
