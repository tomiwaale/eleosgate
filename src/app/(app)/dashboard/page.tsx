'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { getExpiryStatus, getStockStatus } from '@/lib/utils/status'
import { formatCurrency } from '@/lib/utils/currency'
import { ExpiryStatus, StockStatus } from '@/types'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { RecentSales } from '@/components/dashboard/RecentSales'
import { SyncBadge } from '@/components/layout/SyncBadge'
import {
  TrendingUp,
  CalendarDays,
  ShoppingCart,
  AlertTriangle,
  PackageX,
  ChevronRight,
} from 'lucide-react'
import { startOfDay, startOfMonth, isAfter, format } from 'date-fns'

export default function DashboardPage() {
  const { isOwner } = useSessionStore()
  const router = useRouter()

  useEffect(() => {
    if (!isOwner()) router.replace('/pos')
  }, [isOwner, router])

  const sales = useLiveQuery(() => db.sales.orderBy('createdAt').reverse().toArray(), [])
  const products = useLiveQuery(
    () => db.products.filter((product) => product.isActive).toArray(),
    []
  )
  const users = useLiveQuery(() => db.users.toArray(), [])

  const now = useMemo(() => new Date(), [])

  const metrics = useMemo(() => {
    if (!sales) return null
    const todayStart = startOfDay(now)
    const monthStart = startOfMonth(now)
    const todaySales = sales.filter((s) => isAfter(new Date(s.createdAt), todayStart))
    const monthSales = sales.filter((s) => isAfter(new Date(s.createdAt), monthStart))
    return {
      todayRevenue: todaySales.reduce((sum, s) => sum + s.totalAmount, 0),
      todayCount: todaySales.length,
      monthRevenue: monthSales.reduce((sum, s) => sum + s.totalAmount, 0),
      recentSales: todaySales.slice(0, 8),
    }
  }, [sales, now])

  const stockAlerts = useMemo(() => {
    if (!products) return { lowStock: 0, expiringSoon: 0, expired: 0 }
    let lowStock = 0, expiringSoon = 0, expired = 0
    for (const p of products) {
      const stock = getStockStatus(p.quantityInStock, p.reorderLevel)
      const expiry = getExpiryStatus(p.expiryDate)
      if (stock === StockStatus.Low || stock === StockStatus.OutOfStock) lowStock++
      if (expiry === ExpiryStatus.ExpiringSoon) expiringSoon++
      if (expiry === ExpiryStatus.Expired) expired++
    }
    return { lowStock, expiringSoon, expired }
  }, [products])

  if (!isOwner()) return null

  const loading = sales === undefined || products === undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{format(now, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <SyncBadge />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MetricCard
              label="Today's Revenue"
              value={formatCurrency(metrics?.todayRevenue ?? 0)}
              sub={`${metrics?.todayCount ?? 0} transaction${metrics?.todayCount !== 1 ? 's' : ''}`}
              icon={TrendingUp}
              variant="primary"
            />
            <MetricCard
              label="This Month"
              value={formatCurrency(metrics?.monthRevenue ?? 0)}
              icon={CalendarDays}
            />
            <MetricCard
              label="Total Products"
              value={(products?.length ?? 0).toString()}
              sub={`${users?.filter((u) => u.isActive).length ?? 0} active staff`}
              icon={ShoppingCart}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {/* Alerts */}
          {(stockAlerts.lowStock > 0 || stockAlerts.expiringSoon > 0 || stockAlerts.expired > 0) && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Alerts
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {stockAlerts.lowStock > 0 && (
                  <Link
                    href="/inventory?filter=low_stock"
                    className="flex items-center justify-between rounded-xl border border-l-4 border-l-amber-400 bg-white px-4 py-3 shadow-sm hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <PackageX className="h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">
                          {stockAlerts.lowStock} low stock
                        </p>
                        <p className="text-xs text-muted-foreground">Need restocking</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </Link>
                )}
                {stockAlerts.expiringSoon > 0 && (
                  <Link
                    href="/inventory?filter=expiring"
                    className="flex items-center justify-between rounded-xl border border-l-4 border-l-amber-400 bg-white px-4 py-3 shadow-sm hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">
                          {stockAlerts.expiringSoon} expiring soon
                        </p>
                        <p className="text-xs text-muted-foreground">Within 30 days</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </Link>
                )}
                {stockAlerts.expired > 0 && (
                  <Link
                    href="/inventory?filter=expired"
                    className="flex items-center justify-between rounded-xl border border-l-4 border-l-danger bg-white px-4 py-3 shadow-sm hover:bg-red-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
                      <div>
                        <p className="text-sm font-semibold text-danger">
                          {stockAlerts.expired} expired
                        </p>
                        <p className="text-xs text-muted-foreground">Remove from shelf</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Recent sales */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="font-semibold">Recent Sales</h2>
              <Link
                href="/sales"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="px-4 pb-4">
              <RecentSales sales={metrics?.recentSales ?? []} users={users ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
