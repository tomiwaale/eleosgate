'use client'

import Link from 'next/link'
import type { Sale, User } from '@/lib/db'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Receipt, ClipboardList } from 'lucide-react'

interface Props {
  sales: Sale[]
  users: User[]
  showStaff: boolean
}

export function SalesTable({ sales, users, showStaff }: Props) {
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]))

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-white py-16 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No sales found</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Try a different date range
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50">
            <TableHead className="font-semibold">Receipt</TableHead>
            <TableHead className="font-semibold">Date & Time</TableHead>
            {showStaff && <TableHead className="font-semibold">Staff</TableHead>}
            <TableHead className="font-semibold">Payment</TableHead>
            <TableHead className="font-semibold text-right">Total</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id} className="hover:bg-gray-50/50">
              <TableCell className="font-mono text-sm font-semibold text-primary">
                {sale.receiptNumber}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(sale.createdAt)}
              </TableCell>
              {showStaff && (
                <TableCell className="text-sm">
                  {userMap[sale.servedBy] ?? '—'}
                </TableCell>
              )}
              <TableCell>
                <Badge
                  className={
                    sale.paymentMethod === 'cash'
                      ? 'bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs'
                  }
                >
                  {sale.paymentMethod === 'cash' ? 'Cash' : 'Transfer'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-primary">
                {formatCurrency(sale.totalAmount)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/sales/${sale.id}`}
                  className="flex items-center justify-center rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Receipt className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
