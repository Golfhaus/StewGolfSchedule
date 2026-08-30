import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  ?? 'https://arpcvzszofuwkpijisqq.supabase.co'

const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  ?? 'sb_publishable_3FCv-UxM_vW4mDK8GFTxvQ_UprkUUv5'

export const supabaseConfigured = Boolean(url && publishableKey)

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
