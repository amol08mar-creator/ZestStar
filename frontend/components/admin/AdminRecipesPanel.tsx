'use client';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { BookOpen, Plus, Pencil, Trash2, RefreshCw, X, Check } from 'lucide-react';
import {
  adminFetchRecipes,
  adminCreateRecipe,
  adminUpdateRecipe,
  adminDeleteRecipe,
  adminSetIngredients,
  type IngredientPayload,
} from '@/lib/api/recipes';
import type { Recipe } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const DIFF_BADGE: Record<string, string> = {
  easy: 'bg-green-50 text-green-700',
  medium: 'bg-yellow-50 text-yellow-700',
  hard: 'bg-red-50 text-red-700',
};

interface RecipeFormData {
  name: string;
  description: string;
  image_url: string;
  servings: number;
  prep_time_minutes: number | '';
  difficulty: 'easy' | 'medium' | 'hard' | '';
  cuisine_type: string;
  is_active: boolean;
}

interface IngredientRow extends IngredientPayload { tempId: string; productName?: string; }

const emptyForm = (): RecipeFormData => ({
  name: '', description: '', image_url: '', servings: 2,
  prep_time_minutes: '', difficulty: '', cuisine_type: '', is_active: true,
});

interface Props { token: string; }

export default function AdminRecipesPanel({ token }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [form, setForm] = useState<RecipeFormData>(emptyForm());
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<{ id: string; name: string; price: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminFetchRecipes(token).then(setRecipes).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // Product autocomplete
  useEffect(() => {
    if (productSearch.length < 2) { setProductResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${API}/products/suggestions?q=${encodeURIComponent(productSearch)}`)
        .then(r => r.json())
        .then(j => setProductResults(j?.data?.suggestions ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  function openCreate() {
    setEditingRecipe(null);
    setForm(emptyForm());
    setIngredients([]);
    setModalOpen(true);
  }

  function openEdit(recipe: Recipe) {
    setEditingRecipe(recipe);
    setForm({
      name: recipe.name,
      description: recipe.description ?? '',
      image_url: recipe.image ?? '',
      servings: recipe.servings,
      prep_time_minutes: recipe.prepTime ?? '',
      difficulty: recipe.difficulty ?? '',
      cuisine_type: recipe.cuisineType ?? '',
      is_active: recipe.inStock !== false,
    });
    setIngredients(recipe.ingredients.map((i, idx) => ({
      tempId: `existing-${idx}`,
      product_id: i.productId,
      quantity: i.quantity,
      display_quantity: i.displayQuantity ?? undefined,
      productName: i.name,
    })));
    setModalOpen(true);
  }

  function addIngredient(product: { id: string; name: string }) {
    setIngredients(prev => [...prev, {
      tempId: Date.now().toString(),
      product_id: product.id,
      quantity: 1,
      productName: product.name,
    }]);
    setProductSearch('');
    setProductResults([]);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const dto: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        image_url: form.image_url || undefined,
        servings: form.servings,
        prep_time_minutes: form.prep_time_minutes || undefined,
        difficulty: form.difficulty || undefined,
        cuisine_type: form.cuisine_type || undefined,
        is_active: form.is_active,
      };

      let recipe: Recipe;
      if (editingRecipe) {
        recipe = await adminUpdateRecipe(token, editingRecipe.id, dto);
      } else {
        recipe = await adminCreateRecipe(token, dto);
      }

      // Set ingredients
      if (ingredients.length > 0) {
        await adminSetIngredients(token, recipe.id, ingredients.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          display_quantity: i.display_quantity,
        })));
      }

      setModalOpen(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this recipe?')) return;
    setDeletingId(id);
    await adminDeleteRecipe(token, id).catch(() => {});
    setRecipes(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>Recipes</h1>
            <p className="text-xs text-muted">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} disabled={loading} className="p-2 border border-border rounded-xl text-muted hover:text-dark disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Recipe
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />)}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No recipes yet</p>
            <p className="text-xs mt-1">Click &quot;Add Recipe&quot; to create your first one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-cream/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Recipe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Cuisine</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Difficulty</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Ingredients</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cream overflow-hidden shrink-0">
                        {recipe.image
                          ? <Image src={recipe.image} alt={recipe.name} width={40} height={40} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">🍽️</div>}
                      </div>
                      <div>
                        <p className="font-medium text-dark text-sm">{recipe.name}</p>
                        {recipe.prepTime && <p className="text-xs text-muted">{recipe.prepTime} min</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted">{recipe.cuisineType ?? '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-center hidden md:table-cell">
                    {recipe.difficulty ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${DIFF_BADGE[recipe.difficulty] ?? ''}`}>
                        {recipe.difficulty}
                      </span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-sm font-semibold text-dark">{recipe.ingredients.length}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${recipe.inStock !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {recipe.inStock !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(recipe)} className="p-1.5 text-muted hover:text-primary hover:bg-primary-light rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(recipe.id)} disabled={deletingId === recipe.id} className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
                {editingRecipe ? 'Edit Recipe' : 'New Recipe'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-dark mb-1">Recipe Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Paneer Butter Masala"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-dark mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="Brief description..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-dark mb-1">Image URL</label>
                  <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark mb-1">Servings</label>
                  <input type="number" min={1} value={form.servings} onChange={e => setForm(f => ({ ...f, servings: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark mb-1">Prep Time (min)</label>
                  <input type="number" min={1} value={form.prep_time_minutes} onChange={e => setForm(f => ({ ...f, prep_time_minutes: parseInt(e.target.value) || '' }))}
                    placeholder="30"
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark mb-1">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))}
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary">
                    <option value="">— Select —</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark mb-1">Cuisine Type</label>
                  <input value={form.cuisine_type} onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
                    placeholder="Indian, Chinese..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <label htmlFor="is_active" className="text-sm text-dark cursor-pointer">Active (visible to customers)</label>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <p className="text-xs font-semibold text-dark mb-2">Ingredients ({ingredients.length})</p>
                <div className="space-y-2 mb-3">
                  {ingredients.map((ing, idx) => (
                    <div key={ing.tempId} className="flex items-center gap-2 bg-cream rounded-xl p-2">
                      <p className="flex-1 text-xs font-medium text-dark truncate">{ing.productName ?? ing.product_id}</p>
                      <input type="number" min={1} value={ing.quantity}
                        onChange={e => setIngredients(prev => prev.map((i, j) => j === idx ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))}
                        className="w-14 px-2 py-1 border border-border rounded-lg text-xs text-center focus:outline-none focus:border-primary" />
                      <input value={ing.display_quantity ?? ''} onChange={e => setIngredients(prev => prev.map((i, j) => j === idx ? { ...i, display_quantity: e.target.value } : i))}
                        placeholder="500g" className="w-16 px-2 py-1 border border-border rounded-lg text-xs focus:outline-none focus:border-primary" />
                      <button onClick={() => setIngredients(prev => prev.filter((_, j) => j !== idx))} className="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Product search */}
                <div className="relative">
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products to add as ingredients..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
                  {productResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-border rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                      {productResults.map((p) => (
                        <button key={p.id} onClick={() => addIngredient(p)}
                          className="w-full text-left px-3 py-2 hover:bg-cream transition-colors text-sm">
                          {p.name} <span className="text-muted">₹{p.price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
