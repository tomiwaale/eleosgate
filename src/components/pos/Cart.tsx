'use client'

import { formatCurrency } from '@/lib/utils/currency'
import { useCartStore } from '@/store/cart.store'
import { CartItem } from './CartItem'
import { ShoppingCart, Receipt } from 'lucide-react'

interface Props {
  receiptNumber: string
  onCharge: () => void
}

export function Cart({ receiptNumber, onCharge }: Props) {
  const { items, updateQuantity, removeItem, total } = useCartStore()
  const cartTotal = total()

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Cart</h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{receiptNumber}</span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center px-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/20" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Cart is empty</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Search for a product or scan a barcode
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Cart</h2>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
            {items.length}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{receiptNumber}</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.map((item) => (
          <CartItem
            key={item.productId}
            item={item}
            onUpdateQty={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t bg-white p-4 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-2xl font-bold text-primary tabular-nums">
            {formatCurrency(cartTotal)}
          </span>
        </div>

        <button
          onClick={onCharge}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-white hover:bg-primary-dark active:scale-[0.98] transition-all"
        >
          <Receipt className="h-4 w-4" />
          Charge &amp; Print
        </button>
      </div>
    </div>
  )
}
