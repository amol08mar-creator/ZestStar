'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, ShoppingBag, Banknote, Plus, CheckCircle, X, ChevronRight, Tag, Coins, Calendar } from 'lucide-react';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { createOrder } from '@/lib/api/orders';
import { fetchAddresses, createAddress, type Address } from '@/lib/api/addresses';
import { fetchAutoApplyPromo, validatePromo } from '@/lib/api/promo';
import { fetchWallet, type WalletData } from '@/lib/api/coins';
import { fetchAvailableDates, fetchSlotsByDate } from '@/lib/api/slots';
import { checkServiceability, type ServiceabilityResult } from '@/lib/api/delivery';
import type { DeliverySlot } from '@/lib/types';
import Image from 'next/image';

function formatSlotDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

const LABELS = ['Home', 'Work', 'Other'];
const MAX_ADDRESSES = 5;
const MAX_COINS_PER_ORDER = 100;

export default function CheckoutPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const items = useCartStore((s) => s.items);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);
  const getDeliveryFee = useCartStore((s) => s.getDeliveryFee);
  const getGrandTotal = useCartStore((s) => s.getGrandTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const promoCode = useCartStore((s) => s.promoCode);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const setPromo = useCartStore((s) => s.setPromo);
  const clearPromo = useCartStore((s) => s.clearPromo);
  const coinsRedeemed = useCartStore((s) => s.coinsRedeemed);
  const setCoins = useCartStore((s) => s.setCoins);
  const clearCoins = useCartStore((s) => s.clearCoins);

  // Promo state
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Coins state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [coinsInput, setCoinsInput] = useState('');
  const [coinsError, setCoinsError] = useState('');

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // New address form (shown inside picker)
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newLabel, setNewLabel] = useState('Home');
  const [newPincode, setNewPincode] = useState('');
  const [pickerPincode, setPickerPincode] = useState('');
  const [saveAddress, setSaveAddress] = useState(true);
  const [savingNew, setSavingNew] = useState(false);
  const [newFormError, setNewFormError] = useState('');

  // Serviceability checks
  const [inlinePinCheck, setInlinePinCheck] = useState<ServiceabilityResult | null>(null);
  const [pickerPinCheck, setPickerPinCheck] = useState<ServiceabilityResult | null>(null);
  const [savedAddrServiceable, setSavedAddrServiceable] = useState<boolean | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // GPS
  const [locating, setLocating] = useState(false);

  // Delivery slot state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const subtotal = getTotalPrice();
  const deliveryFee = getDeliveryFee();
  const grandTotal = getGrandTotal();

  const eta = new Date(Date.now() + 30 * 60 * 1000);
  const etaStr = eta.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Auto-apply best eligible promo on checkout load (only if no promo already applied)
  useEffect(() => {
    if (!token || subtotal <= 0 || promoCode) return;
    fetchAutoApplyPromo(token, subtotal)
      .then((result) => { if (result) setPromo(result.code, result.discount_amount); })
      .catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (items.length === 0) { router.replace('/'); return; }
    if (!token) { router.replace('/login'); return; }
    fetchAddresses(token)
      .then((addresses) => {
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          const def = addresses.find((a) => a.is_default) ?? addresses[0];
          setSelectedAddressId(def.id);
          setDeliveryInstructions(def.delivery_instructions ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false));

    fetchWallet(token).then(setWallet).catch(() => {});

    fetchAvailableDates().then((dates) => {
      setAvailableDates(dates);
      if (dates.length > 0) setSelectedDate(dates[0]);
    }).catch(() => {});
  }, [items.length, token, router]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlotId(null);
    fetchSlotsByDate(selectedDate)
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  useEffect(() => {
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    if (!addr?.pincode) { setSavedAddrServiceable(null); return; }
    checkServiceability(addr.pincode).then((r) => setSavedAddrServiceable(r.serviceable)).catch(() => {});
  }, [selectedAddressId, savedAddresses]);

  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  // GPS auto-fill
  async function handleUseLocation() {
    if (!navigator.geolocation) { setNewFormError('Geolocation not supported.'); return; }
    setLocating(true);
    setNewFormError('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'ZestStar-App' } },
          );
          const data = await res.json();
          const a = data.address ?? {};
          const parts = [a.house_number, a.road, a.neighbourhood, a.suburb ?? a.village ?? a.town, a.city ?? a.county, a.state].filter(Boolean);
          setNewAddress(parts.join(', '));
          if (a.postcode) {
            const pc = a.postcode.replace(/\D/g, '').slice(0, 6);
            setNewPincode(pc);
            if (pc.length === 6) {
              setCheckingPin(true);
              checkServiceability(pc).then(setInlinePinCheck).finally(() => setCheckingPin(false));
            }
          }
        } catch {
          setNewFormError('Could not fetch address. Enter manually.');
        }
        setLocating(false);
      },
      (err) => {
        setNewFormError(err.code === 1 ? 'Location permission denied.' : 'Could not detect location.');
        setLocating(false);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  async function handleSaveNewAddress() {
    if (!newAddress.trim() || !token) return;
    setSavingNew(true);
    setNewFormError('');
    try {
      const saved = await createAddress(token, {
        label: newLabel,
        address: newAddress.trim(),
        landmark: newLandmark.trim() || undefined,
        pincode: pickerPincode.trim() || undefined,
        is_default: savedAddresses.length === 0,
      });
      setSavedAddresses((prev) => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setShowNewForm(false);
      setShowPicker(false);
      setNewAddress('');
      setNewLandmark('');
      setPickerPincode('');
    } catch (err) {
      setNewFormError(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      setSavingNew(false);
    }
  }

  async function handleApplyPromo() {
    if (!token || !promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const cartItemsForPromo = items.map((i) => ({
        category: i.product.category,
        total: i.product.price * i.quantity,
      }));
      const result = await validatePromo(token, promoInput.trim(), subtotal, cartItemsForPromo);
      setPromo(result.code, result.discount_amount);
      setPromoInput('');
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Invalid promo code');
      clearPromo();
    } finally {
      setPromoLoading(false);
    }
  }

  function handleApplyCoins() {
    setCoinsError('');
    const n = parseInt(coinsInput);
    if (!wallet || !n || n <= 0) { setCoinsError('Enter a valid number of coins'); return; }
    if (n > wallet.coins_balance) { setCoinsError(`You only have ${wallet.coins_balance} coins`); return; }
    if (n > MAX_COINS_PER_ORDER) { setCoinsError(`Max ${MAX_COINS_PER_ORDER} coins per order`); return; }
    setCoins(n);
    setCoinsInput('');
  }

  function handleApplyMaxCoins() {
    if (!wallet) return;
    const max = Math.min(wallet.coins_balance, MAX_COINS_PER_ORDER);
    setCoins(max);
    setCoinsInput('');
    setCoinsError('');
  }

  async function handlePlaceOrder() {
    if (!token) return;
    setError('');

    // Determine delivery address
    let deliveryAddress = '';
    let deliveryLandmark: string | undefined;

    if (selectedAddress) {
      deliveryAddress = selectedAddress.address;
      deliveryLandmark = selectedAddress.landmark ?? undefined;
    } else if (newAddress.trim()) {
      deliveryAddress = newAddress.trim();
      deliveryLandmark = newLandmark.trim() || undefined;
      // Save if checkbox checked and under limit
      if (saveAddress && savedAddresses.length < MAX_ADDRESSES && token) {
        try {
          const saved = await createAddress(token, {
            label: newLabel, address: deliveryAddress, landmark: deliveryLandmark,
            pincode: newPincode.trim() || undefined, is_default: true,
          });
          setSavedAddresses((prev) => [...prev, saved]);
        } catch {}
      }
    } else {
      setError('Please select or enter a delivery address.');
      return;
    }

    setPlacing(true);
    try {
      const order = await createOrder(token, {
        delivery_address: deliveryAddress,
        delivery_landmark: deliveryLandmark,
        items_total: subtotal,
        delivery_fee: deliveryFee,
        final_total: grandTotal,
        promo_code: promoCode ?? undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
        coins_redeemed: coinsRedeemed > 0 ? coinsRedeemed : undefined,
        delivery_slot_id: selectedSlotId ?? undefined,
        delivery_pincode: selectedAddress?.pincode || newPincode || pickerPincode || undefined,
        delivery_instructions: deliveryInstructions.trim() || undefined,
        items: items.map(({ product, quantity }) => ({
          product_id: product.id,
          product_name: product.name,
          product_image: product.image || undefined,
          product_weight: product.weight || undefined,
          quantity,
          unit_price: product.price,
          total_price: product.price * quantity,
        })),
      });
      clearCart();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order. Try again.');
    } finally {
      setPlacing(false);
    }
  }

  const slotsEnabled = availableDates.length > 0;
  const pincodeOk =
    savedAddrServiceable !== false &&
    (newPincode.length < 6 || inlinePinCheck?.serviceable !== false) &&
    (pickerPincode.length < 6 || pickerPinCheck?.serviceable !== false);
  const canPlaceOrder = (!!selectedAddress || !!newAddress.trim()) && pincodeOk;

  return (
    <div className="min-h-screen bg-cream pb-36">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Checkout</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Delivery promise */}
        <div className="bg-primary text-white rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            {selectedSlotId && selectedDate ? (() => {
              const slot = slots.find((s) => s.id === selectedSlotId);
              return slot ? (
                <>
                  <p className="font-bold text-lg">{formatSlotDate(selectedDate)}, {slot.time_start}–{slot.time_end}</p>
                  <p className="text-sm text-white/80">✅ Delivery slot confirmed</p>
                </>
              ) : null;
            })() : slotsEnabled ? (
              <>
                <p className="font-bold text-lg">Choose a delivery slot</p>
                <p className="text-sm text-white/80">Select your preferred time below</p>
              </>
            ) : (
              <>
                <p className="font-bold text-lg">Arriving by {etaStr}</p>
                <p className="text-sm text-white/80">🚀 30-minute delivery to your door</p>
              </>
            )}
          </div>
        </div>

        {/* Delivery Instructions */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h2 className="font-semibold text-dark text-sm">Delivery Instructions <span className="text-muted font-normal">(optional)</span></h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '📦 Leave at security', value: 'Leave at security' },
              { label: '📞 Call before delivery', value: 'Call before delivery' },
              { label: '🏠 Leave with neighbor', value: 'Leave with neighbor' },
              { label: '🔔 Ring doorbell', value: 'Ring doorbell' },
              { label: '🤫 Don\'t ring bell', value: 'Don\'t ring bell' },
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setDeliveryInstructions(chip.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  deliveryInstructions === chip.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-dark border-border hover:border-primary/50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <textarea
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Or type your own instruction…"
            className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
          />
          {deliveryInstructions.length > 160 && (
            <p className="text-xs text-muted text-right">{deliveryInstructions.length}/200</p>
          )}
        </div>

        {/* Delivery slot picker */}
        {slotsEnabled && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-dark text-sm">Delivery Slot</h2>
            </div>

            {/* Date chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    selectedDate === date
                      ? 'border-primary bg-primary text-white'
                      : 'border-border text-dark hover:border-primary/50'
                  }`}
                >
                  {formatSlotDate(date)}
                </button>
              ))}
            </div>

            {/* Slot grid */}
            {loadingSlots ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-cream rounded-xl animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No slots available for this date</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => {
                  const remaining = slot.capacity - slot.booked;
                  const full = remaining <= 0;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => !full && setSelectedSlotId(slot.id)}
                      disabled={full}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        full
                          ? 'border-border bg-gray-50 opacity-50 cursor-not-allowed'
                          : selectedSlotId === slot.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-dark">{slot.time_start} – {slot.time_end}</p>
                      {full ? (
                        <p className="text-[10px] text-red-500 mt-0.5">Fully booked</p>
                      ) : remaining <= 3 ? (
                        <p className="text-[10px] text-amber-600 mt-0.5">Only {remaining} left!</p>
                      ) : (
                        <p className="text-[10px] text-green-600 mt-0.5">Available</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-dark text-sm">Delivery Address</h2>
            </div>
            {!loadingAddresses && (
              <button
                onClick={() => { setShowPicker(true); setShowNewForm(false); }}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
              >
                {selectedAddress ? 'Change' : 'Select / Add'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loadingAddresses ? (
            <div className="h-16 bg-cream rounded-xl animate-pulse" />
          ) : selectedAddress ? (
            /* Selected address display */
            <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${savedAddrServiceable === false ? 'bg-red-50 border-red-200' : 'bg-primary-light/50 border-primary/20'}`}>
              <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${savedAddrServiceable === false ? 'text-red-400' : 'text-primary'}`} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                  {selectedAddress.label}
                </span>
                <p className="text-sm text-dark mt-1 leading-snug">{selectedAddress.address}</p>
                {selectedAddress.landmark && (
                  <p className="text-xs text-muted mt-0.5">{selectedAddress.landmark}</p>
                )}
                {selectedAddress.pincode && (
                  <p className="text-xs text-muted mt-0.5">📍 {selectedAddress.pincode}</p>
                )}
                {savedAddrServiceable === false && (
                  <p className="text-xs text-red-600 mt-1 font-medium">✗ We don&apos;t deliver to this pincode yet</p>
                )}
              </div>
            </div>
          ) : (
            /* No saved addresses — inline new address form */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-dark mb-1">Full Address *</label>
                <div className="relative">
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    rows={2}
                    placeholder="House / Flat no., Building, Street, Area..."
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
                <button
                  onClick={handleUseLocation}
                  disabled={locating}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-60"
                >
                  <MapPin className="w-3 h-3" />
                  {locating ? 'Detecting location…' : '📍 Use my current location'}
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark mb-1">
                  Landmark <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  value={newLandmark}
                  onChange={(e) => setNewLandmark(e.target.value)}
                  placeholder="Near temple, opposite park..."
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-dark mb-1">
                  Pincode <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  value={newPincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setNewPincode(val);
                    setInlinePinCheck(null);
                    if (val.length === 6) {
                      setCheckingPin(true);
                      checkServiceability(val).then(setInlinePinCheck).finally(() => setCheckingPin(false));
                    }
                  }}
                  placeholder="6-digit pincode"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {checkingPin && <p className="text-xs text-muted mt-1">Checking delivery availability…</p>}
                {inlinePinCheck && newPincode.length === 6 && (
                  inlinePinCheck.serviceable
                    ? <p className="text-xs text-green-600 mt-1">✓ We deliver to {inlinePinCheck.area_name ?? newPincode}</p>
                    : <p className="text-xs text-red-500 mt-1">✗ We don&apos;t deliver to this pincode yet</p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-dark">Save for future orders</span>
              </label>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Banknote className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-dark text-sm">Payment Method</h2>
          </div>
          <div className="flex items-center gap-3 border-2 border-primary bg-primary-light rounded-xl px-4 py-3">
            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-dark">Cash on Delivery (COD)</p>
              <p className="text-xs text-muted">Pay when your order arrives</p>
            </div>
          </div>
        </div>

        {/* Promo code */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-dark text-sm">Promo Code</h2>
          </div>
          {promoCode ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-green-700">{promoCode} applied</p>
                <p className="text-xs text-green-600 mt-0.5">You save ₹{discountAmount}</p>
              </div>
              <button
                onClick={() => { clearPromo(); setPromoError(''); }}
                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors"
                title="Remove promo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                  placeholder="Enter promo code"
                  className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary uppercase"
                />
                <button
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  {promoLoading ? 'Checking…' : 'Apply'}
                </button>
              </div>
              {promoError && <p className="text-xs text-red-600">{promoError}</p>}
            </div>
          )}
        </div>

        {/* ZestStar Coins */}
        {wallet !== null && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4 text-yellow-500" />
              <h2 className="font-semibold text-dark text-sm">ZestStar Coins</h2>
              <span className="ml-auto text-xs text-yellow-700 font-semibold bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                {wallet.coins_balance} coins available
              </span>
            </div>

            {wallet.coins_balance === 0 ? (
              <p className="text-xs text-muted">
                You have no coins yet. Earn 1 coin per ₹100 spent on every order!
              </p>
            ) : coinsRedeemed > 0 ? (
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-yellow-800">{coinsRedeemed} coins applied</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Saves ₹{coinsRedeemed} on this order</p>
                </div>
                <button
                  onClick={() => { clearCoins(); setCoinsError(''); }}
                  className="p-1.5 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded-lg transition-colors"
                  title="Remove coins"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted mb-2">
                  Use up to {Math.min(wallet.coins_balance, MAX_COINS_PER_ORDER)} coins (₹{Math.min(wallet.coins_balance, MAX_COINS_PER_ORDER)} off)
                </p>
                <div className="flex gap-2">
                  <input
                    value={coinsInput}
                    onChange={(e) => { setCoinsInput(e.target.value.replace(/\D/g, '')); setCoinsError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoins()}
                    placeholder={`1–${Math.min(wallet.coins_balance, MAX_COINS_PER_ORDER)}`}
                    className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-300"
                  />
                  <button
                    onClick={handleApplyMaxCoins}
                    className="px-3 py-2.5 text-xs font-semibold text-yellow-700 border border-yellow-300 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition-colors whitespace-nowrap"
                  >
                    Use Max
                  </button>
                  <button
                    onClick={handleApplyCoins}
                    disabled={!coinsInput.trim()}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {coinsError && <p className="text-xs text-red-600">{coinsError}</p>}
              </div>
            )}
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-dark text-sm">Order Summary ({items.length} item{items.length !== 1 ? 's' : ''})</h2>
          </div>
          <ul className="space-y-3 mb-4">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                  {product.image
                    ? <Image src={product.image} alt={product.name} width={40} height={40} className="object-cover w-full h-full" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark truncate">{product.name}</p>
                  {product.weight && <p className="text-xs text-muted">{product.weight}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-dark">₹{product.price * quantity}</p>
                  <p className="text-xs text-muted">× {quantity}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="text-dark font-medium">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Delivery fee</span>
              {deliveryFee === 0 ? <span className="text-green-600 font-semibold">FREE</span> : <span className="text-dark font-medium">₹{deliveryFee}</span>}
            </div>
            {deliveryFee > 0 && <p className="text-[11px] text-muted">Add ₹{500 - subtotal} more for free delivery</p>}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">Promo ({promoCode})</span>
                <span className="text-green-600 font-semibold">−₹{discountAmount}</span>
              </div>
            )}
            {coinsRedeemed > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-yellow-700 font-medium">ZestStar Coins</span>
                <span className="text-yellow-700 font-semibold">−₹{coinsRedeemed}</span>
              </div>
            )}
            {/* Coins to earn on this order */}
            {grandTotal > 0 && (
              <p className="text-[11px] text-muted">
                🪙 You&apos;ll earn {Math.floor(grandTotal / 100)} ZestStar Coin{Math.floor(grandTotal / 100) !== 1 ? 's' : ''} on this order
              </p>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="font-bold text-dark">Total</span>
              <span className="text-lg font-bold text-dark">₹{grandTotal}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
      </div>

      {/* Sticky place order button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={!canPlaceOrder || placing}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base"
          >
            {placing ? 'Placing Order…' : `Place Order — ₹${grandTotal} (COD)`}
          </button>
          <p className="text-center text-xs text-muted mt-2">You&apos;ll pay ₹{grandTotal} in cash when your order arrives</p>
        </div>
      </div>

      {/* ── Address Picker Overlay ── */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowPicker(false); setShowNewForm(false); }} />
          <div className="relative bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Picker header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-bold text-dark text-sm">{showNewForm ? 'Add New Address' : 'Select Address'}</h3>
              <button onClick={() => { setShowPicker(false); setShowNewForm(false); }} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {!showNewForm ? (
                <>
                  {/* Saved address options */}
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => { setSelectedAddressId(addr.id); setShowPicker(false); setDeliveryInstructions(addr.delivery_instructions ?? ''); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="shrink-0">
                        {selectedAddressId === addr.id
                          ? <CheckCircle className="w-4 h-4 text-primary" />
                          : <div className="w-4 h-4 rounded-full border-2 border-border" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded-full">{addr.label}</span>
                          {addr.is_default && <span className="text-xs text-muted">Default</span>}
                        </div>
                        <p className="text-sm text-dark leading-snug truncate">{addr.address}</p>
                        {addr.landmark && <p className="text-xs text-muted">{addr.landmark}</p>}
                      </div>
                    </button>
                  ))}

                  {/* Add new option */}
                  {savedAddresses.length < MAX_ADDRESSES && (
                    <button
                      onClick={() => setShowNewForm(true)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-semibold text-primary">Add new address</span>
                    </button>
                  )}
                </>
              ) : (
                /* New address form inside picker */
                <div className="space-y-2.5">
                  {newFormError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{newFormError}</p>}

                  {/* Label */}
                  <div className="flex gap-2">
                    {LABELS.map((l) => (
                      <button key={l} type="button" onClick={() => setNewLabel(l)}
                        className={`flex-1 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${
                          newLabel === l ? 'border-primary bg-primary text-white' : 'border-border text-muted hover:border-primary/50'
                        }`}
                      >{l}</button>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-dark">Full Address *</label>
                      <button onClick={handleUseLocation} disabled={locating}
                        className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-60">
                        <MapPin className="w-3 h-3" />
                        {locating ? 'Detecting…' : '📍 Use location'}
                      </button>
                    </div>
                    <textarea value={newAddress} onChange={(e) => setNewAddress(e.target.value)} rows={2}
                      autoFocus placeholder="House / Flat no., Building, Street, Area..."
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark mb-1">Landmark <span className="font-normal text-muted">(optional)</span></label>
                    <input value={newLandmark} onChange={(e) => setNewLandmark(e.target.value)}
                      placeholder="Near temple, opposite park..."
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-dark mb-1">Pincode <span className="font-normal text-muted">(optional)</span></label>
                    <input
                      value={pickerPincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPickerPincode(val);
                        setPickerPinCheck(null);
                        if (val.length === 6) {
                          checkServiceability(val).then(setPickerPinCheck);
                        }
                      }}
                      placeholder="6-digit pincode"
                      inputMode="numeric"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    {pickerPinCheck && pickerPincode.length === 6 && (
                      pickerPinCheck.serviceable
                        ? <p className="text-xs text-green-600 mt-1">✓ We deliver to {pickerPinCheck.area_name ?? pickerPincode}</p>
                        : <p className="text-xs text-red-500 mt-1">✗ We don&apos;t deliver to this pincode yet</p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-dark">Save for future orders</span>
                  </label>

                  <div className="flex gap-2">
                    <button onClick={() => { setShowNewForm(false); setNewFormError(''); }}
                      className="flex-1 py-2 text-sm font-semibold border border-border rounded-xl hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                    <button onClick={handleSaveNewAddress} disabled={savingNew || !newAddress.trim()}
                      className="flex-1 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-60 rounded-xl transition-colors">
                      {savingNew ? 'Saving…' : 'Use this address'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
