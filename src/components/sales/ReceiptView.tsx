'use client'

import type { Sale, SaleItem, User } from '@/lib/db'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { Separator } from '@/components/ui/separator'
import { Printer } from 'lucide-react'
import { printReceipt } from '@/lib/printing/thermal'
import { toast } from 'sonner'

interface Props {
  sale: Sale
  items: SaleItem[]
  staff: User | undefined
  storeName: string
  storeAddress?: string
  storePhone?: string
  receiptFooter?: string
}

export function ReceiptView({
  sale,
  items,
  staff,
  storeName,
  storeAddress,
  storePhone,
  receiptFooter,
}: Props) {
  async function handleReprint() {
    try {
      await printReceipt(sale, items, storeName, storeAddress, storePhone, receiptFooter)
    } catch {
      toast.error('Print failed')
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* Store header */}
        <div className="bg-primary px-6 py-5 text-center text-white">
          <h2 className="text-lg font-bold">{storeName}</h2>
          {storeAddress && <p className="mt-0.5 text-xs text-white/70">{storeAddress}</p>}
          {storePhone && <p className="text-xs text-white/70">{storePhone}</p>}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Receipt meta */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Receipt</span>
              <span className="font-mono font-bold text-primary">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(sale.createdAt)}</span>
            </div>
            {staff && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Served by</span>
                <span>{staff.name}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm flex-1">{item.productName}</span>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary tabular-nums">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>

            {sale.paymentMethod === 'cash' ? (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Cash</span>
                  <span className="tabular-nums">{formatCurrency(sale.amountTendered)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCurrency(sale.changeAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Payment</span>
                <span>Transfer</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            {receiptFooter ?? 'Thank you & get well soon!'}
          </p>
        </div>
      </div>

      {/* Reprint button */}
      <button
        onClick={handleReprint}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border bg-white py-3 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors shadow-sm"
      >
        <Printer className="h-4 w-4" />
        Reprint Receipt
      </button>
    </div>
  )
}
