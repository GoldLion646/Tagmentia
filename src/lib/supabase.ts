import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Prefer Lovable's native Supabase integration. Env vars are not guaranteed in this environment.
const url = (window as any)?.SUPABASE_URL || (import.meta as any)?.env?.VITE_SUPABASE_URL
const anon = (window as any)?.SUPABASE_ANON_KEY || (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anon)

// Do NOT throw on missing config to avoid blank screens during development.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anon as string)
  : null

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Not configured. Connect Supabase via Lovable integration to enable auth & data features.')
}