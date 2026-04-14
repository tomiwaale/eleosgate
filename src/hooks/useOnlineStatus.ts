'use client'

import { useEffect, useState } from 'react'
import { canReachSupabase, isSupabaseConfigured } from '@/lib/supabase/client'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    let cancelled = false

    async function refreshStatus() {
      const nextStatus = isSupabaseConfigured
        ? await canReachSupabase()
        : typeof navigator !== 'undefined'
          ? navigator.onLine
          : true

      if (!cancelled) {
        setIsOnline(nextStatus)
      }
    }

    const handleOnline = () => {
      void refreshStatus()
    }
    const handleOffline = () => setIsOnline(false)

    void refreshStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const interval = window.setInterval(() => {
      void refreshStatus()
    }, 30_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
