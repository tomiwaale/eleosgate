'use client'

import { useSyncStore } from '@/store/sync.store'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { timeAgo } from '@/lib/utils/date'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function SyncBadge() {
  const { status, lastSyncedAt } = useSyncStore()
  const isOnline = useOnlineStatus()

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 text-destructive" />
          <span>Offline</span>
        </>
      ) : status === 'syncing' ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 text-green-600" />
          <span>{lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : 'Not synced yet'}</span>
        </>
      )}
    </div>
  )
}
