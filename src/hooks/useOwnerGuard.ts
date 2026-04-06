'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/session.store'

export function useOwnerGuard() {
  const { isOwner } = useSessionStore()
  const router = useRouter()

  useEffect(() => {
    if (!isOwner()) {
      router.replace('/pos')
    }
  }, [isOwner, router])

  return isOwner()
}
