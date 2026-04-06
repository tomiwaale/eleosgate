'use client'

import { useEffect, useCallback } from 'react'
import { syncToSupabase } from '@/lib/supabase/sync'
import { useSyncStore } from '@/store/sync.store'
import { db } from '@/lib/db'

export function useSync() {
  const { setStatus, setLastSyncedAt } = useSyncStore()

  const sync = useCallback(async () => {
    if (!navigator.onLine) return
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
    sync()

    const interval = setInterval(sync, 60_000)
    window.addEventListener('online', sync)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', sync)
    }
  }, [sync])

  return { sync }
}
