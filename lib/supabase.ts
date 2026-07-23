import { createClient } from '@supabase/supabase-js';

// Placeholder agar build tetap jalan sebelum env di-set; nilai asli diisi lewat
// Environment Variables di Vercel (NEXT_PUBLIC_* di-inline saat build).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
