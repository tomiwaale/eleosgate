import { create } from 'zustand'
import type { SessionUser } from '@/types'

interface SessionState {
  user: SessionUser | null
  setUser: (user: SessionUser) => void
  clearSession: () => void
  isOwner: () => boolean
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null }),
  isOwner: () => get().user?.role === 'owner',
}))
