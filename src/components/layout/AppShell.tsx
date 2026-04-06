'use client'

import { Sidebar } from './Sidebar'
import { SyncBadge } from './SyncBadge'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-end border-b bg-white px-4">
          <SyncBadge />
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  )
}
