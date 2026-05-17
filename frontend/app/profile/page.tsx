'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, Coins, Heart, LogOut,
  Mail, MapPin, Package, Pencil, Plus, RefreshCw, Star, Trash2, User,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useWishlistStore } from '@/lib/store/wishlistStore';
import { fetchAddresses, createAddress, updateAddress, deleteAddress, type Address, type CreateAddressPayload } from '@/lib/api/addresses';
import { updateProfile, logout } from '@/lib/api/auth';
import { checkServiceability, type ServiceabilityResult } from '@/lib/api/delivery';
import { fetchWallet, fetchLoyaltyConfig, type WalletData, type LoyaltyTierConfig } from '@/lib/api/coins';
import { fetchOrders } from '@/lib/api/orders';
import { fetchReferralStats, type ReferralStats } from '@/lib/api/referral';
import { fetchSubscriptions } from '@/lib/api/subscriptions';

const LABELS = ['Home', 'Work', 'Other'];
const MAX_ADDRESSES = 5;

function tierEmoji(tier?: string) { return ({ platinum: '💎', gold: '🥇', silver: '🥈', bronze: '🥉' } as Record<string, string>)[tier ?? 'bronze'] ?? '🥉'; }
function tierLabel(tier?: string) { return tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Bronze'; }
function tierBg(tier?: string) { return ({ platinum: 'bg-purple-100', gold: 'bg-yellow-100', silver: 'bg-gray-100', bronze: 'bg-amber-50' } as Record<string, string>)[tier ?? 'bronze'] ?? 'bg-amber-50'; }
function tierColor(tier?: string) { return ({ platinum: 'text-purple-700', gold: 'text-yellow-700', silver: 'text-gray-600', bronze: 'text-amber-700' } as Record<string, string>)[tier ?? 'bronze'] ?? 'text-amber-700'; }

function tierMultiplierLabel(tier?: string, config?: LoyaltyTierConfig[]) {
  if (config?.length) {
    const rate = config.find((t) => t.tier === (tier ?? 'bronze'))?.coin_rate ?? 1;
    return `${rate}×`;
  }
  return ({ platinum: '3×', gold: '2×', silver: '1.5×', bronze: '1×' } as Record<string, string>)[tier ?? 'bronze'] ?? '1×';
}

function TierProgressBar({ wallet, config }: { wallet: WalletData; config: LoyaltyTierConfig[] }) {
  const tier = wallet.tier ?? 'bronze';
  const spent = wallet.total_order_value ?? 0;
  const sorted = [...config].sort((a, b) => a.min_spend - b.min_spend);
  const currentIdx = sorted.findIndex((t) => t.tier === tier);
  const nextTier = sorted[currentIdx + 1];
  if (!nextTier) return null;
  const floor = sorted[currentIdx]?.min_spend ?? 0;
  const pct = Math.min(100, Math.round(((spent - floor) / (nextTier.min_spend - floor)) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1">
        <span>₹{spent.toLocaleString('en-IN')} spent</span>
        <span>{tierLabel(nextTier.tier)} at ₹{nextTier.min_spend.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2 bg-cream rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted mt-1">₹{(nextTier.min_spend - spent).toLocaleString('en-IN')} more to reach {tierLabel(nextTier.tier)}</p>
    </div>
  );
}

function AddressForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: Partial<Address>;
  onSave: (payload: CreateAddressPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const [label, setLabel] = useState(initial?.label ?? 'Home');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [landmark, setLandmark] = useState(initial?.landmark ?? '');
  const [pincode, setPincode] = useState(initial?.pincode ?? '');
  const [pinCheck, setPinCheck] = useState<ServiceabilityResult | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [instructions, setInstructions] = useState(initial?.delivery_instructions ?? '');

  return (
    <div className="border-2 border-primary/30 bg-primary-light/20 rounded-2xl p-4 space-y-3">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        {LABELS.map((l) => (
          <button key={l} type="button" onClick={() => setLabel(l)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
              label === l ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary/50 bg-white'
            }`}
          >{l}</button>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold text-dark mb-1">Full Address *</label>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} autoFocus
          placeholder="House / Flat no., Building, Street, Area..."
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-dark mb-1">
          Landmark <span className="font-normal text-muted">(optional)</span>
        </label>
        <input value={landmark} onChange={(e) => setLandmark(e.target.value)}
          placeholder="Near temple, opposite park..."
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-dark mb-1">Pincode <span className="font-normal text-muted">(optional)</span></label>
        <input
          value={pincode}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            setPincode(val);
            setPinCheck(null);
            if (val.length === 6) {
              setCheckingPin(true);
              checkServiceability(val).then(setPinCheck).finally(() => setCheckingPin(false));
            }
          }}
          placeholder="6-digit pincode"
          inputMode="numeric"
          maxLength={6}
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
        />
        {checkingPin && <p className="text-xs text-muted mt-1">Checking delivery availability…</p>}
        {pinCheck && pincode.length === 6 && (
          pinCheck.serviceable
            ? <p className="text-xs text-green-600 mt-1">✓ We deliver to {pinCheck.area_name ?? pincode}</p>
            : <p className="text-xs text-red-500 mt-1">✗ We don&apos;t deliver to this pincode yet</p>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-dark mb-1">
          Delivery Instructions <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value.slice(0, 200))}
          rows={2}
          placeholder="e.g. Leave at security, call before delivery…"
          className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none bg-white"
        />
        {instructions.length > 160 && (
          <p className="text-xs text-muted mt-0.5 text-right">{instructions.length}/200</p>
        )}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 accent-primary" />
        <span className="text-sm text-dark">Set as default address</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors bg-white">
          Cancel
        </button>
        <button onClick={() => onSave({ label, address, landmark: landmark.trim() || undefined, pincode: pincode.trim() || undefined, is_default: isDefault, delivery_instructions: instructions.trim() || undefined })}
          disabled={saving || !address.trim()}
          className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </div>
    </div>
  );
}


export default function ProfilePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const wishlistIds = useWishlistStore((s) => s.wishlistIds);

  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Wallet + loyalty config
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyTierConfig[]>([]);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [subCount, setSubCount] = useState<number | null>(null);

  // Referral
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  // Logout
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchWallet(token).then(setWallet).catch(() => {});
    fetchLoyaltyConfig().then(setLoyaltyConfig).catch(() => {});
    fetchOrders(token).then((orders) => setOrderCount(orders.length)).catch(() => setOrderCount(0));
    fetchSubscriptions(token).then((subs) => setSubCount(subs.filter((s) => s.status === 'active').length)).catch(() => setSubCount(0));
    fetchAddresses(token)
      .then(setAddresses)
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));
    fetchReferralStats(token).then(setReferralStats).catch(() => {});
  }, [token, router]);

  async function handleSaveProfile() {
    if (!name.trim() || !token) return;
    setSavingProfile(true);
    setProfileError('');
    try {
      const updated = await updateProfile(token, name.trim(), email.trim() || undefined);
      updateUser({ name: updated.name, email: updated.email });
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddAddress(payload: CreateAddressPayload) {
    if (!token) return;
    setSavingAddress(true);
    setAddressError('');
    try {
      const saved = await createAddress(token, payload);
      setAddresses((prev) => {
        if (payload.is_default) return [...prev.map((a) => ({ ...a, is_default: false })), saved];
        return [...prev, saved];
      });
      setShowAddForm(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleEditAddress(payload: CreateAddressPayload) {
    if (!token || !editingAddress) return;
    setUpdatingAddress(true);
    setAddressError('');
    try {
      const updated = await updateAddress(token, editingAddress.id, payload);
      setAddresses((prev) =>
        prev.map((a) => {
          if (payload.is_default) return a.id === updated.id ? updated : { ...a, is_default: false };
          return a.id === updated.id ? updated : a;
        }),
      );
      setEditingAddress(null);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setUpdatingAddress(false);
    }
  }

  async function handleSetDefault(addr: Address) {
    if (!token || addr.is_default) return;
    setSettingDefaultId(addr.id);
    try {
      await updateAddress(token, addr.id, { label: addr.label, address: addr.address, landmark: addr.landmark ?? undefined, is_default: true });
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === addr.id })));
    } catch {}
    setSettingDefaultId(null);
  }

  async function handleDeleteAddress(id: string) {
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteAddress(token, id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {}
    setDeletingId(null);
  }

  async function handleLogout() {
    setLoggingOut(true);
    if (token) await logout(token);
    clearSession();
    router.replace('/login');
  }

  const displayName = user?.name ?? user?.phone ?? 'User';

  return (
    <div className="min-h-screen bg-cream pb-10">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>My Profile</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Hero banner ── */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl overflow-hidden shadow-md shadow-primary/20">
          <div className="px-5 pt-5 pb-4 flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-2xl">{displayName.charAt(0).toUpperCase()}</span>
            </div>

            {/* Name + contact */}
            <div className="flex-1 min-w-0 pt-1">
              <p className="font-bold text-white text-xl leading-snug truncate" style={{ fontFamily: 'var(--font-serif)' }}>
                {displayName}
              </p>
              {user?.phone && <p className="text-white/75 text-sm mt-0.5">{user.phone}</p>}
              {user?.email && <p className="text-white/65 text-xs mt-0.5 truncate">{user.email}</p>}
              {wallet?.tier && (
                <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${tierBg(wallet.tier)} ${tierColor(wallet.tier)}`}>
                  {tierEmoji(wallet.tier)} {tierLabel(wallet.tier)} Member
                </span>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => { setEditingProfile(true); setName(user?.name ?? ''); setEmail(user?.email ?? ''); setProfileError(''); }}
              className="mt-1 p-2 bg-white/15 hover:bg-white/25 rounded-xl transition-colors"
              title="Edit profile"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>

        {/* ── Edit profile form (shown below hero) ── */}
        {editingProfile && (
          <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
            <p className="text-sm font-semibold text-dark">Edit Profile</p>
            {profileError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{profileError}</p>}
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
                  className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark mb-1">
                Email <span className="font-normal text-muted">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For order receipts"
                  className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingProfile(false)} className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveProfile} disabled={savingProfile || !name.trim()}
                className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors"
              >
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* My Orders */}
          <button
            onClick={() => router.push('/orders')}
            className="bg-white rounded-2xl border border-border p-3.5 text-left shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.97] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest leading-tight">My Orders</p>
              <div className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center shrink-0">
                <Package className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-dark leading-none">{orderCount ?? '—'}</p>
            <p className="text-xs text-muted mt-1.5">all time</p>
          </button>

          {/* My Wishlist */}
          <button
            onClick={() => router.push('/wishlist')}
            className="bg-white rounded-2xl border border-border p-3.5 text-left shadow-sm hover:shadow-md hover:border-red-200 active:scale-[0.97] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest leading-tight">Wishlist</p>
              <div className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-500 leading-none">{wishlistIds.length}</p>
            <p className="text-xs text-muted mt-1.5">saved items</p>
          </button>

          {/* My Wallet */}
          <button
            onClick={() => router.push('/wallet')}
            className="bg-white rounded-2xl border border-border p-3.5 text-left shadow-sm hover:shadow-md hover:border-yellow-200 active:scale-[0.97] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest leading-tight">Wallet</p>
              <div className="w-7 h-7 bg-yellow-50 rounded-full flex items-center justify-center shrink-0">
                <Coins className="w-3.5 h-3.5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600 leading-none">{wallet?.coins_balance ?? '—'}</p>
            <p className="text-xs text-muted mt-1.5">= ₹{wallet?.coins_balance ?? 0}</p>
          </button>

          {/* My Subscriptions */}
          <button
            onClick={() => router.push('/subscriptions')}
            className="bg-white rounded-2xl border border-border p-3.5 text-left shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.97] transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-widest leading-tight">Subscriptions</p>
              <div className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary leading-none">{subCount ?? '—'}</p>
            <p className="text-xs text-muted mt-1.5">active</p>
          </button>
        </div>

        {/* ── Saved Addresses ── */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-dark text-sm">Saved Addresses</h2>
              <span className="text-xs text-muted">({addresses.length}/{MAX_ADDRESSES})</span>
            </div>
            {!showAddForm && !editingAddress && addresses.length < MAX_ADDRESSES && (
              <button onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {loadingAddresses ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-cream rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {showAddForm && (
                <AddressForm onSave={handleAddAddress} onCancel={() => { setShowAddForm(false); setAddressError(''); }}
                  saving={savingAddress} error={addressError} />
              )}

              {addresses.length === 0 && !showAddForm ? (
                <div className="text-center py-8 text-muted">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No saved addresses yet</p>
                  <p className="text-xs mt-0.5">Add one to speed up checkout</p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id}>
                    {editingAddress?.id === addr.id ? (
                      <AddressForm initial={editingAddress} onSave={handleEditAddress}
                        onCancel={() => { setEditingAddress(null); setAddressError(''); }}
                        saving={updatingAddress} error={addressError} />
                    ) : (
                      <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                        addr.is_default
                          ? 'bg-primary-light/40 border-primary/20'
                          : 'bg-cream border-border'
                      }`}>
                        <div className="shrink-0 mt-0.5">
                          {addr.is_default
                            ? <CheckCircle className="w-4 h-4 text-primary" />
                            : <MapPin className="w-4 h-4 text-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                              {addr.label}
                            </span>
                            {addr.is_default && <span className="text-xs text-muted">Default</span>}
                          </div>
                          <p className="text-sm text-dark leading-snug">{addr.address}</p>
                          {addr.landmark && <p className="text-xs text-muted mt-0.5">{addr.landmark}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {!addr.is_default && (
                            <button onClick={() => handleSetDefault(addr)} disabled={settingDefaultId === addr.id}
                              className="p-1.5 text-muted hover:text-yellow-500 transition-colors disabled:opacity-40" title="Set as default">
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => { setEditingAddress(addr); setShowAddForm(false); setAddressError(''); }}
                            className="p-1.5 text-muted hover:text-primary transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAddress(addr.id)} disabled={deletingId === addr.id}
                            className="p-1.5 text-muted hover:text-red-500 transition-colors disabled:opacity-40" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {addresses.length >= MAX_ADDRESSES && (
                <p className="text-xs text-muted text-center pt-1">
                  Maximum {MAX_ADDRESSES} addresses. Delete one to add another.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Loyalty Status ── */}
        {wallet && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h2 className="font-semibold text-dark text-sm mb-3">Loyalty Status</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${tierBg(wallet.tier)}`}>
                {tierEmoji(wallet.tier)}
              </div>
              <div>
                <p className={`font-bold ${tierColor(wallet.tier)}`}>{tierLabel(wallet.tier)} Member</p>
                <p className="text-xs text-muted">{tierMultiplierLabel(wallet.tier, loyaltyConfig)} coins per ₹100 spent</p>
              </div>
            </div>
            {wallet.tier !== 'platinum' && loyaltyConfig.length > 0 && <TierProgressBar wallet={wallet} config={loyaltyConfig} />}
            {wallet.tier === 'platinum' && (
              <p className="text-xs text-purple-600 font-medium">💎 You&apos;ve reached the highest tier! Enjoy 3× coin rewards.</p>
            )}
          </div>
        )}

        {/* ── Refer & Earn ── */}
        {referralStats && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h2 className="font-semibold text-dark text-sm mb-1">Refer & Earn</h2>
            <p className="text-xs text-muted mb-3">
              Share your code — both you and your friend earn 100 coins when they place their first order
            </p>
            <div className="flex items-center gap-2 bg-primary-light border border-primary/30 rounded-xl px-4 py-3 mb-3">
              <p className="flex-1 font-mono font-bold text-primary tracking-widest text-sm">
                {referralStats.code}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralStats.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors shrink-0"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-cream rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-dark">{referralStats.referral_count}</p>
                <p className="text-xs text-muted mt-0.5">Friends referred</p>
              </div>
              <div className="flex-1 bg-cream rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-dark">{referralStats.coins_earned}</p>
                <p className="text-xs text-muted mt-0.5">Coins earned</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Sign out ── */}
        <button onClick={handleLogout} disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
