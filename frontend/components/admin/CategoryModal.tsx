'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Upload, ImageIcon } from 'lucide-react';
import type { Category, CategoryForm } from '@/lib/api/categories';
import { createSupabaseClient } from '@/lib/supabase/client';

const EMPTY: CategoryForm = { name: '', image_url: '', is_active: true };

interface Props {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (form: CategoryForm) => Promise<void>;
}

export default function CategoryModal({ open, category, onClose, onSave }: Props) {
  const [form, setForm] = useState<CategoryForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setUploadError('');
    setForm(
      category
        ? { name: category.name, image_url: category.image_url ?? '', is_active: category.is_active }
        : EMPTY,
    );
  }, [open, category]);

  if (!open) return null;

  function set<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB'); return; }
    setUploading(true);
    setUploadError('');
    try {
      const supabase = createSupabaseClient();
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `categories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
      set('image_url', publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-dark">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. Fresh Vegetables"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Category Image</label>
            <div className="flex gap-3">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-cream flex items-center justify-center shrink-0 overflow-hidden">
                {form.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <ImageIcon className="w-7 h-7 text-muted/40" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary rounded-xl py-2.5 text-sm font-semibold text-muted hover:text-primary transition-colors disabled:opacity-60"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading…' : 'Upload photo'}
                </button>

                {/* URL fallback */}
                <input
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:border-primary text-muted"
                  placeholder="Or paste image URL…"
                />
              </div>
            </div>
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cat_is_active"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="cat_is_active" className="text-sm font-medium text-dark">
              Active (visible in shop)
            </label>
          </div>
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
            {saving ? 'Saving…' : category ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
