import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const missingSupabaseEnvMessage =
  'Cloud sync is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!)
  }

  return supabaseClient
}

export function requireSupabaseClient() {
  const client = getSupabaseClient()

  if (!client) {
    throw new Error(missingSupabaseEnvMessage)
  }

  return client
}

export async function canReachSupabase(timeoutMs = 5000) {
  if (!isSupabaseConfigured) return false
  if (typeof window === 'undefined') return true
  if (!navigator.onLine) return false

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const healthUrl = new URL('/rest/v1/', supabaseUrl!).toString()
    await fetch(healthUrl, {
      method: 'GET',
      headers: { apikey: supabaseAnonKey! },
      cache: 'no-store',
      signal: controller.signal,
    })
    return true
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}
