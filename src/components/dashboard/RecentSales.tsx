'use client'

import Link from 'next/link'
import type { Sale, User } from '@/lib/db'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'

interface Props {
  sales: Sale[]
  users: User[]
}

export function RecentSales({ sales, users }: Props) {
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  if (sales.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No sales today yet.
      </p>
    )
  }

  return (
    <div className="divide-y">
      {sales.map((sale) => (
        <Link
          key={sale.id}
          href={`/sales/${sale.id}`}
          className="flex items-center gap-3 px-1 py-3 hover:bg-gray-50/60 rounded-lg transition-colors group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary">
                {sale.receiptNumber}
              </span>
              <Badge
                className={
                  sale.paymentMethod === 'cash'
                    ? 'bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs'
                }
              >
                {sale.paymentMethod === 'cash' ? 'Cash' : 'Transfer'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {userMap[sale.servedBy] ?? 'Unknown'} · {formatDate(sale.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold tabular-nums text-primary">
              {formatCurrency(sale.totalAmount)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  )
}
