import { create } from 'zustand'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  lastSyncedAt: string | null
  setStatus: (status: SyncStatus) => void
  setLastSyncedAt: (at: string) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  setStatus: (status) => set({ status }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}))
