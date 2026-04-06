'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session.store'
import { useSync } from '@/hooks/useSync'
import { AppShell } from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSessionStore()
  const router = useRouter()

  // Runs once per app session: syncs on load, every 60s, and on reconnect.
  // POS additionally calls sync() manually after each sale.
  useSync()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  if (!user) return null

  return <AppShell>{children}</AppShell>
}
