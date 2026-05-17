'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, BellOff, ShoppingCart, MapPin, Search, Menu, X, ChevronDown, Home, Grid3X3, User, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/lib/store/cartStore';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotificationsStore } from '@/lib/store/notificationsStore';
import { logout } from '@/lib/api/auth';
import { savePushSubscription, removePushSubscription, fetchUnreadCount } from '@/lib/api/notifications';
import { subscribeToPush, unsubscribeFromPush, isPushSupported, getPermissionState } from '@/lib/push';
import { fetchSuggestions, type Suggestion } from '@/lib/api/shop';

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const rawCartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const clearSession = useAuthStore((s) => s.clearSession);
  const isLoggedIn = !!token;

  const pushEnabled = useNotificationsStore((s) => s.pushEnabled);
  const setPushEnabled = useNotificationsStore((s) => s.setPushEnabled);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationsStore((s) => s.setUnreadCount);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = mounted && isPushSupported();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchUnreadCount(token).then(setUnreadCount).catch(() => {});
    const interval = setInterval(() => {
      fetchUnreadCount(token).then(setUnreadCount).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close autocomplete on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cartCount = mounted ? rawCartCount : 0;

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setActiveIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 200);
  }

  function navigate(q: string) {
    setShowSuggestions(false);
    setActiveIdx(-1);
    if (!q.trim()) return;
    const url = `/shop?q=${encodeURIComponent(q.trim())}`;
    if (pathname === '/shop') router.replace(url);
    else router.push(url);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      const name = suggestions[activeIdx].name;
      setSearchQuery(name);
      navigate(name);
    } else {
      navigate(searchQuery);
    }
  }

  function handleSelectSuggestion(name: string) {
    setSearchQuery(name);
    navigate(name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIdx(-1);
    }
  }

  async function handleTogglePush() {
    if (!token || pushLoading) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await removePushSubscription(token, endpoint).catch(() => {});
        setPushEnabled(false);
      } else {
        // If already hard-blocked, guide user to site settings
        if (Notification.permission === 'denied') {
          alert('Notifications are blocked in your browser. Open site settings, set Notifications to "Allow", then try again.');
          return;
        }
        // Explicitly request permission — this is what triggers the browser dialog
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
        // Read VAPID key directly here — Next.js substitutes NEXT_PUBLIC_* at
        // compile time in client components, which is more reliable than reading
        // it in a plain utility module at import time.
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
        // Subscribe with push manager — throws on failure so we see the real error
        try {
          const sub = await subscribeToPush(vapidKey);
          await savePushSubscription(token, sub).catch(() => {});
          setPushEnabled(true);
          // Immediate local test notification — confirms the whole push chain works
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('ZestStar Notifications Enabled! 🎉', {
            body: "You'll be notified when out-of-stock products are restocked.",
            icon: '/icon-192.png',
          } as NotificationOptions).catch(() => {});
        } catch (subErr) {
          const msg = subErr instanceof Error ? subErr.message : 'Unknown error';
          alert(`Push setup failed: ${msg}`);
        }
      }
    } catch { /* outer guard */ } finally {
      setPushLoading(false);
    }
  }

  async function handleSignOut() {
    setUserMenuOpen(false);
    setMenuOpen(false);
    if (token) await logout(token);
    clearSession();
    router.push('/');
  }

  const displayName = user?.name ?? user?.phone ?? 'Account';

  return (
    <>
      {/* Main Navbar */}
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <span className="text-xl font-bold text-primary" style={{ fontFamily: 'var(--font-serif)' }}>
              ZestStar
            </span>
          </a>

          {/* Location */}
          <button className="hidden md:flex items-center gap-1.5 text-sm text-dark hover:text-primary transition-colors shrink-0 border border-border rounded-lg px-3 py-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">Panvel, Maharashtra</span>
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>

          {/* Delivery badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-primary-light text-primary text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0">
            <span>📍</span>
            <span>Delivered in 30 mins</span>
          </div>

          {/* Search with autocomplete */}
          <div ref={searchContainerRef} className="flex-1 relative">
            <form onSubmit={handleSubmit}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search vegetables, fruits, dry fruits..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full pl-9 pr-4 py-2 bg-cream border border-border rounded-xl text-sm text-dark placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                aria-label="Search products"
                autoComplete="off"
              />
            </form>

            {/* Autocomplete dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <ul>
                  {suggestions.map((s, i) => (
                    <li key={s.id}>
                      <button
                        onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                        onClick={() => handleSelectSuggestion(s.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          i === activeIdx ? 'bg-cream' : 'hover:bg-cream/70'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-border bg-cream shrink-0">
                          {s.image_url ? (
                            <Image src={s.image_url} alt={s.name} width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">📦</div>
                          )}
                        </div>
                        {/* Name with highlight */}
                        <span className="flex-1 text-sm text-dark truncate">
                          {highlight(s.name, searchQuery)}
                        </span>
                        {/* Category */}
                        <span className="text-xs text-muted shrink-0">{s.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {/* See all results */}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { navigate(searchQuery); }}
                  className="w-full px-3 py-2.5 text-xs font-semibold text-primary hover:bg-cream/70 text-center border-t border-border transition-colors"
                >
                  See all results for &ldquo;{searchQuery}&rdquo; →
                </button>
              </div>
            )}
          </div>

          {/* Notification bell — links to notification centre */}
          {isLoggedIn && (
            <button
              onClick={() => router.push('/notifications')}
              className="relative shrink-0 p-2 rounded-xl transition-colors text-muted hover:bg-primary-light hover:text-primary"
              aria-label="Notifications"
            >
              <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-primary' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative shrink-0 p-2 hover:bg-primary-light rounded-xl transition-colors"
            aria-label={`Cart with ${cartCount} items`}
          >
            <ShoppingCart className="w-5 h-5 text-dark" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* Auth — desktop */}
          {mounted && (
            isLoggedIn ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="hidden md:flex items-center gap-2 border border-border rounded-xl px-3 py-2 text-sm font-semibold text-dark hover:bg-cream transition-colors"
                >
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-muted" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-border rounded-xl shadow-lg py-1 z-50">
                    <button onClick={() => { setUserMenuOpen(false); router.push('/orders'); }} className="w-full text-left px-4 py-2.5 text-sm text-dark hover:bg-cream transition-colors">My Orders</button>
                    <button onClick={() => { setUserMenuOpen(false); router.push('/profile'); }} className="w-full text-left px-4 py-2.5 text-sm text-dark hover:bg-cream transition-colors">My Profile</button>
                    <hr className="border-border my-1" />
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => router.push('/login')} className="hidden md:block shrink-0 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                Sign In
              </button>
            )
          )}

          {/* Mobile hamburger */}
          <button className="md:hidden shrink-0 p-2 hover:bg-gray-100 rounded-xl transition-colors" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-border px-4 py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-dark">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Panvel, Maharashtra</span>
            </div>
            <div className="flex items-center gap-2 bg-primary-light text-primary text-xs font-semibold px-3 py-2 rounded-lg w-fit">
              <span>📍</span><span>Delivered in 30 mins</span>
            </div>
            {mounted && (
              isLoggedIn ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-dark px-1">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    {displayName}
                  </div>
                  <button onClick={() => { setMenuOpen(false); router.push('/orders'); }} className="w-full text-left text-sm text-dark py-2 px-3 rounded-xl hover:bg-cream transition-colors">My Orders</button>
                  <button onClick={() => { setMenuOpen(false); router.push('/profile'); }} className="w-full text-left text-sm text-dark py-2 px-3 rounded-xl hover:bg-cream transition-colors">My Profile</button>
                  <button onClick={handleSignOut} className="w-full text-left text-sm text-red-600 py-2 px-3 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <button onClick={() => { setMenuOpen(false); router.push('/login'); }} className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl">Sign In</button>
              )
            )}
          </div>
        )}
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border px-2 py-2">
        <div className="flex items-center justify-around">
          {[
            { icon: Home, label: 'Home', href: '/' },
            { icon: Grid3X3, label: 'Categories', href: '/shop' },
            { icon: ShoppingCart, label: 'Cart', badge: cartCount, action: () => setCartOpen(true) },
            { icon: User, label: 'Account', action: () => router.push(isLoggedIn ? '/orders' : '/login') },
          ].map(({ icon: Icon, label, href, badge, action }) => {
            const isActive = href ? pathname === href : false;
            return (
              <button
                key={label}
                onClick={action ?? (() => router.push(href!))}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${isActive ? 'text-primary' : 'text-muted'}`}
                aria-label={label}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
