'use client'

import { useEffect, useCallback } from 'react'
import { syncToSupabase } from '@/lib/supabase/sync'
import { canReachSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { useSyncStore } from '@/store/sync.store'
import { db } from '@/lib/db'

interface UseSyncOptions {
  auto?: boolean
}

export function useSync({ auto = true }: UseSyncOptions = {}) {
  const { setStatus, setLastSyncedAt } = useSyncStore()

  const sync = useCallback(async () => {
    if (!isSupabaseConfigured) return
    if (!(await canReachSupabase())) {
      setStatus('offline')
      return
    }
    setStatus('syncing')
    try {
      await syncToSupabase()
      const setting = await db.settings.get('last_synced_at')
      if (setting) setLastSyncedAt(setting.value)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [setStatus, setLastSyncedAt])

  useEffect(() => {
    if (!auto || !isSupabaseConfigured) return

    void sync()

    const interval = setInterval(sync, 60_000)
    window.addEventListener('online', sync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', sync)
    }
  }, [auto, sync])

  return { sync }
}
