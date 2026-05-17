'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, BookOpen, CalendarDays, Clock, Eye, EyeOff, FileText, Gift, LayoutDashboard, LayoutGrid, MapPin, Package, PackageSearch, Plus, RefreshCw, Search, ShoppingBag, Tag, Truck, Users } from 'lucide-react';
import AdminBundlesPanel from '@/components/admin/AdminBundlesPanel';
import AdminCronJobsPanel from '@/components/admin/AdminCronJobsPanel';
import AdminServiceableAreasPanel from '@/components/admin/AdminServiceableAreasPanel';
import AdminCustomersPanel from '@/components/admin/AdminCustomersPanel';
import AdminLoyaltyPanel from '@/components/admin/AdminLoyaltyPanel';
import AdminDriversPanel from '@/components/admin/AdminDriversPanel';
import AdminSubscriptionsPanel from '@/components/admin/AdminSubscriptionsPanel';
import AdminRecipesPanel from '@/components/admin/AdminRecipesPanel';
import AdminPurchasesPanel from '@/components/admin/AdminPurchasesPanel';
import InventoryTable from '@/components/admin/InventoryTable';
import ProductModal from '@/components/admin/ProductModal';
import CategoriesTable from '@/components/admin/CategoriesTable';
import CategoryModal from '@/components/admin/CategoryModal';
import DeliverySlotsManager from '@/components/admin/DeliverySlotsManager';
import StockHistoryModal from '@/components/admin/StockHistoryModal';
import AdminOrdersTable from '@/components/admin/AdminOrdersTable';
import AdminDashboard from '@/components/admin/AdminDashboard';
import LowStockPanel from '@/components/admin/LowStockPanel';
import PromoTable from '@/components/admin/PromoTable';
import PromoModal from '@/components/admin/PromoModal';
import {
  fetchAdminPromos,
  createPromo,
  updatePromo,
  deletePromo,
  togglePromo,
  type PromoCode,
  type PromoForm,
} from '@/lib/api/promo';
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateProduct,
  type Product,
  type ProductForm,
} from '@/lib/api/products';
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
  type Category,
  type CategoryForm,
} from '@/lib/api/categories';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
const STOCK_FILTERS = [
  { value: '', label: 'All Stock' },
  { value: 'in', label: 'In Stock' },
  { value: 'low', label: 'Low Stock (≤10)' },
  { value: 'out', label: 'Out of Stock' },
];

// ── Login Gate ────────────────────────────────────────────────────────────────
function LoginGate({ onToken }: { onToken: (t: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!data.session) throw new Error('No session returned');
      const token = data.session.access_token;
      sessionStorage.setItem('admin_token', token);
      onToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md border border-border p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">Z</span>
          </div>
          <h1 className="text-2xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
            ZestStar Admin
          </h1>
          <p className="text-sm text-muted mt-1">Sign in to manage inventory</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@zeststar.in"
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminInventoryPage() {
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'categories' | 'slots' | 'orders' | 'reorder' | 'promos' | 'subscriptions' | 'recipes' | 'purchases' | 'customers' | 'loyalty' | 'drivers' | 'bundles' | 'serviceable' | 'cron-jobs'>('dashboard');
  const [reorderProduct, setReorderProduct] = useState<{ id: string; name: string } | null>(null);
  const [editAlertCount, setEditAlertCount] = useState(0);

  // Clear reorderProduct when user leaves the purchases tab
  useEffect(() => {
    if (activeTab !== 'purchases') setReorderProduct(null);
  }, [activeTab]);

  // ── Inventory state ──
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteProductLoading, setDeleteProductLoading] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // ── Categories state ──
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);

  // ── Promos state ──
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<PromoCode | null>(null);
  const [deletePromoLoading, setDeletePromoLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) setToken(saved);
  }, []);

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = useCallback(
    async (tok: string) => {
      setLoadingProducts(true);
      setProductError('');
      try {
        const res = await fetchProducts(tok, {
          search: search || undefined,
          category: category || undefined,
          stock_status: stockStatus || undefined,
        });
        setProducts(res.data.products);
        if (!stockStatus) {
          setLowStockCount(res.data.products.filter((p: Product) => p.stock <= 10).length);
        }
      } catch (err) {
        setProductError(err instanceof Error ? err.message : 'Failed to load products');
        if (err instanceof Error && err.message.includes('Unauthorized')) {
          sessionStorage.removeItem('admin_token');
          setToken(null);
        }
      } finally {
        setLoadingProducts(false);
      }
    },
    [search, category, stockStatus],
  );

  // ── Load categories ───────────────────────────────────────────────────────
  const loadCategories = useCallback(async (tok: string) => {
    setLoadingCategories(true);
    setCategoryError('');
    try {
      const data = await fetchAdminCategories(tok);
      setCategories(data);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // ── Load promos ────────────────────────────────────────────────────────────
  const loadPromos = useCallback(async (tok: string) => {
    setLoadingPromos(true);
    setPromoError('');
    try {
      setPromos(await fetchAdminPromos(tok));
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Failed to load promo codes');
    } finally {
      setLoadingPromos(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadProducts(token);
      fetchCategories(token).then(setProductCategories).catch(() => {});
      loadCategories(token);
      loadPromos(token);
    }
  }, [token, loadProducts, loadCategories, loadPromos]);

  if (!token) return <LoginGate onToken={setToken} />;

  // ── Product handlers ──────────────────────────────────────────────────────
  async function handleSave(form: ProductForm): Promise<Product> {
    const result = editingProduct
      ? await updateProduct(token!, editingProduct.id, form)
      : await createProduct(token!, form);
    loadProducts(token!);
    fetchCategories(token!).then(setProductCategories).catch(() => {});
    return result.data.product;
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) return;
    setDeleteProductLoading(true);
    try {
      await deleteProduct(token!, deletingProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      setDeletingProduct(null);
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteProductLoading(false);
    }
  }

  // ── Category handlers ─────────────────────────────────────────────────────
  async function handleSaveCategory(form: CategoryForm) {
    if (editingCategory) {
      await updateCategory(token!, editingCategory.id, form);
    } else {
      await createCategory(token!, form);
    }
    loadCategories(token!);
    fetchCategories(token!).then(setProductCategories).catch(() => {});
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return;
    setDeleteCategoryLoading(true);
    try {
      await deleteCategory(token!, deletingCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setDeletingCategory(null);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteCategoryLoading(false);
    }
  }

  // ── Promo handlers ────────────────────────────────────────────────────────
  async function handleSavePromo(form: PromoForm) {
    if (editingPromo) {
      await updatePromo(token!, editingPromo.id, form);
    } else {
      await createPromo(token!, form);
    }
    loadPromos(token!);
  }

  async function handleTogglePromo(promo: PromoCode) {
    await togglePromo(token!, promo.id);
    loadPromos(token!);
  }

  async function handleDeletePromo() {
    if (!deletingPromo) return;
    setDeletePromoLoading(true);
    try {
      await deletePromo(token!, deletingPromo.id);
      setPromos((prev) => prev.filter((p) => p.id !== deletingPromo.id));
      setDeletingPromo(null);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletePromoLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="bg-white border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">Z</span>
            </div>
            <span className="font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
              ZestStar Admin
            </span>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); sessionStorage.removeItem('admin_token'); setToken(null); }}
            className="text-xs text-muted hover:text-dark transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'inventory'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('reorder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'reorder'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <PackageSearch className="w-4 h-4" />
            Reorder
            {lowStockCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'categories'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab('slots')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'slots'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Slots
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Orders
            {editAlertCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {editAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('promos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'promos'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <Tag className="w-4 h-4" />
            Promos
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'recipes'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Recipes
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'purchases'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <FileText className="w-4 h-4" />
            Purchases
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <Users className="w-4 h-4" />
            Customers
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'loyalty'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <span>🏆</span>
            Loyalty
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'drivers'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <Truck className="w-4 h-4" />
            Drivers
          </button>
          <button
            onClick={() => setActiveTab('bundles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'bundles'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <Gift className="w-4 h-4" />
            Bundles
          </button>
          <button
            onClick={() => setActiveTab('serviceable')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'serviceable'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Serviceable Areas
          </button>
          <button
            onClick={() => setActiveTab('cron-jobs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'cron-jobs'
                ? 'bg-primary text-white'
                : 'text-muted hover:text-dark hover:bg-cream'
            }`}
          >
            <Clock className="w-4 h-4" />
            Cron Jobs
          </button>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <AdminDashboard
            token={token!}
            onGoToOrders={() => setActiveTab('orders')}
            onGoToInventory={() => setActiveTab('inventory')}
          />
        )}

        {/* ── REORDER TAB ── */}
        {activeTab === 'reorder' && (
          <LowStockPanel
            token={token!}
            onAddStock={(product) => { setReorderProduct(product); setActiveTab('purchases'); }}
          />
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === 'inventory' && (
          <>
            {lowStockCount > 0 && (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{lowStockCount} product{lowStockCount > 1 ? 's' : ''}</strong> with low or zero stock. Click the stock number to update inline.
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
                    Inventory Management
                  </h1>
                  <p className="text-xs text-muted">{products.length} product{products.length !== 1 ? 's' : ''} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadProducts(token)}
                  disabled={loadingProducts}
                  className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingProducts ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => { setEditingProduct(null); setModalOpen(true); }}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>
            </div>

            {productError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{productError}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
              >
                <option value="">All Categories</option>
                {productCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white"
              >
                {STOCK_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {loadingProducts && products.length === 0 ? (
              <div className="text-center py-20 text-muted text-sm">Loading inventory…</div>
            ) : (
              <InventoryTable
                products={products}
                onEdit={(p) => { setEditingProduct(p); setModalOpen(true); }}
                onDelete={setDeletingProduct}
                onViewHistory={setHistoryProduct}
              />
            )}
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {activeTab === 'categories' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
                    Category Management
                  </h1>
                  <p className="text-xs text-muted">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadCategories(token)}
                  disabled={loadingCategories}
                  className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingCategories ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => { setEditingCategory(null); setCatModalOpen(true); }}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </div>
            </div>

            {categoryError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{categoryError}</div>
            )}

            {loadingCategories && categories.length === 0 ? (
              <div className="text-center py-20 text-muted text-sm">Loading categories…</div>
            ) : (
              <CategoriesTable
                categories={categories}
                onEdit={(c) => { setEditingCategory(c); setCatModalOpen(true); }}
                onDelete={setDeletingCategory}
              />
            )}
          </>
        )}
      </main>

      {/* ── Stock Modals ── */}
      {historyProduct && (
        <StockHistoryModal
          product={historyProduct}
          token={token!}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {/* ── Modals ── */}
      <ProductModal
        open={modalOpen}
        product={editingProduct}
        token={token!}
        onClose={() => { setModalOpen(false); setEditingProduct(null); }}
        onSave={handleSave}
      />

      <CategoryModal
        open={catModalOpen}
        category={editingCategory}
        onClose={() => { setCatModalOpen(false); setEditingCategory(null); }}
        onSave={handleSaveCategory}
      />

      {/* Delete Product confirmation */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-dark mb-2">Delete Product?</h3>
            <p className="text-sm text-muted mb-6">
              <strong className="text-dark">{deletingProduct.name}</strong> will be permanently removed from inventory.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingProduct(null)} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteProductLoading}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {deleteProductLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* ── SLOTS TAB ── */}
        {activeTab === 'slots' && <DeliverySlotsManager token={token!} />}

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && <AdminOrdersTable token={token!} onEditAlertCountChange={setEditAlertCount} />}

        {/* ── SUBSCRIPTIONS TAB ── */}
        {activeTab === 'subscriptions' && <AdminSubscriptionsPanel token={token!} />}

        {/* ── RECIPES TAB ── */}
        {activeTab === 'recipes' && <AdminRecipesPanel token={token!} />}

        {/* ── PURCHASES TAB ── */}
        {activeTab === 'purchases' && (
          <AdminPurchasesPanel
            key={reorderProduct ? `rp-${reorderProduct.id}` : 'default'}
            token={token!}
            initialView={reorderProduct ? 'create' : 'list'}
            initialProduct={reorderProduct ?? undefined}
          />
        )}

        {/* ── CUSTOMERS TAB ── */}
        {activeTab === 'customers' && <AdminCustomersPanel token={token!} />}
        {activeTab === 'loyalty' && <AdminLoyaltyPanel token={token!} />}

        {/* ── DRIVERS TAB ── */}
        {activeTab === 'drivers' && <AdminDriversPanel token={token!} />}

        {/* ── BUNDLES TAB ── */}
        {activeTab === 'bundles' && <AdminBundlesPanel token={token!} />}
        {activeTab === 'serviceable' && <AdminServiceableAreasPanel token={token!} />}
        {activeTab === 'cron-jobs' && <AdminCronJobsPanel token={token!} />}

        {/* ── PROMOS TAB ── */}
        {activeTab === 'promos' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Tag className="w-6 h-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold text-dark" style={{ fontFamily: 'var(--font-serif)' }}>
                    Promo Codes
                  </h1>
                  <p className="text-xs text-muted">{promos.length} code{promos.length !== 1 ? 's' : ''} total</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPromos(token!)}
                  disabled={loadingPromos}
                  className="p-2 border border-border rounded-xl text-muted hover:text-dark hover:bg-white transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPromos ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => { setEditingPromo(null); setPromoModalOpen(true); }}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Code
                </button>
              </div>
            </div>
            {promoError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{promoError}</div>
            )}
            {loadingPromos && promos.length === 0 ? (
              <div className="text-center py-20 text-muted text-sm">Loading promo codes…</div>
            ) : (
              <PromoTable
                promos={promos}
                onEdit={(p) => { setEditingPromo(p); setPromoModalOpen(true); }}
                onDelete={setDeletingPromo}
                onToggle={handleTogglePromo}
              />
            )}
          </>
        )}

      {/* Delete Category confirmation */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-dark mb-2">Delete Category?</h3>
            <p className="text-sm text-muted mb-6">
              <strong className="text-dark">{deletingCategory.name}</strong> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingCategory(null)} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={deleteCategoryLoading}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {deleteCategoryLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PromoModal */}
      <PromoModal
        open={promoModalOpen}
        promo={editingPromo}
        onClose={() => { setPromoModalOpen(false); setEditingPromo(null); }}
        onSave={handleSavePromo}
      />

      {/* Delete Promo confirmation */}
      {deletingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-dark mb-2">Delete Promo Code?</h3>
            <p className="text-sm text-muted mb-6">
              <strong className="text-dark">{deletingPromo.code}</strong> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingPromo(null)} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeletePromo}
                disabled={deletePromoLoading}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                {deletePromoLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
