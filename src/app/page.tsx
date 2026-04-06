'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const count = await db.users.count()
      if (count === 0) {
        router.replace('/setup')
      } else {
        router.replace('/login')
      }
    }
    redirect()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Eleosgate POS</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
