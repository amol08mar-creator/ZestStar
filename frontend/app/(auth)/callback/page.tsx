'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

export default function CallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const u = session.user;
        setSession(session.access_token, session.refresh_token, {
          id: u.id,
          phone: u.phone ?? null,
          email: u.email ?? null,
          name: (u.user_metadata?.name as string) ?? null,
        });
        router.replace(u.user_metadata?.name ? '/' : '/profile-setup');
      } else {
        router.replace('/login');
      }
    });
  }, [router, setSession]);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-border p-8 text-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-dark font-semibold">Signing you in…</p>
      <p className="text-muted text-sm mt-1">Just a moment</p>
    </div>
  );
}
