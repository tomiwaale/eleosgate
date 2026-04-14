'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSessionStore } from '@/store/session.store'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, ownerOnly: true },
  { href: '/pos', label: 'POS', icon: ShoppingCart, ownerOnly: false },
  { href: '/inventory', label: 'Inventory', icon: Package, ownerOnly: false },
  { href: '/sales', label: 'Sales', icon: ClipboardList, ownerOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings, ownerOnly: true },
]

interface Props {
  onClose?: () => void
}

export function Sidebar({ onClose }: Props) {
  const pathname = usePathname()
  const { user, isOwner, clearSession } = useSessionStore()

  return (
    <aside className="flex h-full w-56 flex-col bg-primary text-white">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold tracking-tight">Eleosgate</h1>
        <p className="text-xs text-primary-light/70">Pharmacy POS</p>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems
          .filter((item) => !item.ownerOnly || isOwner())
          .map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
      </nav>

      <div className="border-t border-white/20 px-4 py-4">
        <p className="text-sm font-medium">{user?.name}</p>
        <p className="text-xs capitalize text-white/60">{user?.role}</p>
        <button
          onClick={clearSession}
          className="mt-3 flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Lock screen
        </button>
      </div>
    </aside>
  )
}
