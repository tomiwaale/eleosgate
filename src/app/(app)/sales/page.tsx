'use client'

import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { SalesTable } from '@/components/sales/SalesTable'
import { formatCurrency } from '@/lib/utils/currency'
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns'
import { cn } from '@/lib/utils'

type DateFilter = 'today' | 'week' | 'month' | 'all'

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

export default function SalesPage() {
  const { user, isOwner } = useSessionStore()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')

  const allSales = useLiveQuery(
    () => db.sales.orderBy('createdAt').reverse().toArray(),
    []
  )
  const users = useLiveQuery(() => db.users.toArray(), [])

  const filtered = useMemo(() => {
    if (!allSales) return []

    let sales = isOwner() ? allSales : allSales.filter((s) => s.servedBy === user?.id)

    const now = new Date()
    if (dateFilter === 'today') {
      const start = startOfDay(now)
      sales = sales.filter((s) => isAfter(new Date(s.createdAt), start))
    } else if (dateFilter === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 })
      sales = sales.filter((s) => isAfter(new Date(s.createdAt), start))
    } else if (dateFilter === 'month') {
      const start = startOfMonth(now)
      sales = sales.filter((s) => isAfter(new Date(s.createdAt), start))
    }

    return sales
  }, [allSales, dateFilter, isOwner, user?.id])

  const summary = useMemo(() => {
    const revenue = filtered.reduce((sum, s) => sum + s.totalAmount, 0)
    const cash = filtered.filter((s) => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0)
    const transfer = filtered.filter((s) => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.totalAmount, 0)
    return { revenue, cash, transfer, count: filtered.length }
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Sales History</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner() ? 'All transactions' : 'Your transactions'}
        </p>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap gap-2">
        {dateFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateFilter(f.value)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              dateFilter === f.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-muted-foreground hover:border-primary/40 hover:text-primary'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</p>
          <p className="mt-1 text-xl font-bold text-primary tabular-nums">
            {formatCurrency(summary.revenue)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transactions</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{summary.count}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cash</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-700">
            {formatCurrency(summary.cash)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transfer</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-blue-700">
            {formatCurrency(summary.transfer)}
          </p>
        </div>
      </div>

      {/* Table */}
      {allSales === undefined ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <SalesTable
          sales={filtered}
          users={users ?? []}
          showStaff={isOwner()}
        />
      )}
    </div>
  )
}
