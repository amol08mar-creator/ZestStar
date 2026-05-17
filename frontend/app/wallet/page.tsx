'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Coins } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { fetchWallet, fetchCoinHistory, type WalletData, type LedgerEntry } from '@/lib/api/coins';

const TYPE_LABEL: Record<LedgerEntry['type'], string> = {
  earn: 'Earned',
  spend: 'Redeemed',
  refund: 'Refunded',
};

const TYPE_COLOR: Record<LedgerEntry['type'], string> = {
  earn: 'text-green-700 bg-green-50 border-green-200',
  spend: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  refund: 'text-blue-700 bg-blue-50 border-blue-200',
};

const TYPE_SIGN: Record<LedgerEntry['type'], string> = {
  earn: '+',
  spend: '−',
  refund: '+',
};

export default function WalletPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    fetchWallet(token)
      .then(setWallet)
      .catch(() => {})
      .finally(() => setWalletLoaded(true));
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchCoinHistory(token, page)
      .then(({ entries: e, total: t }) => { setEntries(e); setTotal(t); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-cream pb-10">
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-dark" />
          </button>
          <h1 className="font-bold text-dark text-lg" style={{ fontFamily: 'var(--font-serif)' }}>My Wallet</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Balance card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">ZestStar Coins</p>
              {wallet ? (
                <p className="text-3xl font-bold text-yellow-800 leading-tight">
                  {wallet.coins_balance}
                  <span className="text-base font-normal text-yellow-600 ml-1">= ₹{wallet.coins_balance}</span>
                </p>
              ) : walletLoaded ? (
                <p className="text-3xl font-bold text-yellow-800 leading-tight">
                  0 <span className="text-base font-normal text-yellow-600 ml-1">coins</span>
                </p>
              ) : (
                <div className="h-8 w-32 bg-yellow-100 rounded-lg animate-pulse mt-1" />
              )}
            </div>
          </div>

          {walletLoaded && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 text-center border border-yellow-100">
                <p className="text-xs text-muted mb-0.5">Total Earned</p>
                <p className="font-bold text-dark">{wallet?.total_earned ?? 0} coins</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-yellow-100">
                <p className="text-xs text-muted mb-0.5">Total Redeemed</p>
                <p className="font-bold text-dark">{wallet?.total_spent ?? 0} coins</p>
              </div>
            </div>
          )}
        </div>

        {/* How to earn */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-dark mb-3">How it works</p>
          <ul className="space-y-2 text-sm text-dark">
            <li className="flex items-start gap-2">
              <span className="text-lg leading-none">🛒</span>
              <span>Earn <strong>1 ZestStar Coin</strong> for every ₹100 you spend</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg leading-none">✨</span>
              <span>Each coin is worth <strong>₹1</strong> — use up to 100 coins per order</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg leading-none">⚡</span>
              <span>Coins are credited instantly when you place an order</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lg leading-none">🔄</span>
              <span>Coins are refunded if your order is cancelled</span>
            </li>
          </ul>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-dark mb-3">Transaction History</p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-cream rounded-xl animate-pulse" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <Coins className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No transactions yet</p>
              <p className="text-xs mt-0.5">Place your first order to start earning coins!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOR[entry.type]}`}>
                    {TYPE_LABEL[entry.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark truncate">{entry.note ?? '—'}</p>
                    <p className="text-xs text-muted">
                      {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${entry.type === 'spend' ? 'text-yellow-700' : 'text-green-700'}`}>
                    {TYPE_SIGN[entry.type]}{entry.amount}
                  </span>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm mt-4 pt-3 border-t border-border">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-border rounded-lg text-muted hover:text-dark disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-border rounded-lg text-muted hover:text-dark disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
