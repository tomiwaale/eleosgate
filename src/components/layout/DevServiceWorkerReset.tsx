'use client'

import { useEffect } from 'react'

const RESET_FLAG = 'eg-dev-sw-reset'

export function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === 'true') return
    if (!('serviceWorker' in navigator) || typeof caches === 'undefined') return
    if (sessionStorage.getItem(RESET_FLAG) === 'done') return

    async function resetServiceWorkers() {
      const registrations = await navigator.serviceWorker.getRegistrations()
      const cacheNames = await caches.keys()

      await Promise.all(registrations.map((registration) => registration.unregister()))
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))

      sessionStorage.setItem(RESET_FLAG, 'done')

      if (registrations.length > 0 || cacheNames.length > 0) {
        window.location.reload()
      }
    }

    void resetServiceWorkers()
  }, [])

  return null
}
