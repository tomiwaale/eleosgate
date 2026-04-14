'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { SyncBadge } from './SyncBadge'
import { Menu } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar — overlay drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-50">
            <Sidebar onClose={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-12 items-center justify-between border-b bg-white px-4 md:justify-end shrink-0">
          <button
            className="md:hidden rounded p-1.5 text-muted-foreground hover:bg-gray-100 transition-colors"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <SyncBadge />
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
