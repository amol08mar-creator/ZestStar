import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient;
  readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const anonKey = process.env.SUPABASE_ANON_KEY!;

    // admin — service role, bypasses RLS. Use for all DB operations.
    this.admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // client — anon key, for proxying user-facing auth operations.
    this.client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}
