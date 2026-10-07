import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The one place MYOS creates a Supabase client.
 *
 * Only the public URL and anon (publishable) key ever reach the browser.
 * The database protects each person's data with Row Level Security.
 *
 * If the variables are missing, MYOS runs in local-only mode: no accounts,
 * everything stays in this browser, exactly as before.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const cloudEnabled = supabase !== null
