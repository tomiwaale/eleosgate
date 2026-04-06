'use client'

import type { CartItem as CartItemType } from '@/types'
import { formatCurrency } from '@/lib/utils/currency'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface Props {
  item: CartItemType
  onUpdateQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
}

export function CartItem({ item, onUpdateQty, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{item.productName}</p>
        <button
          onClick={() => onRemove(item.productId)}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        {/* Qty controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQty(item.productId, item.quantity - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border bg-gray-50 hover:bg-gray-100 text-foreground transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.productId, item.quantity + 1)}
            disabled={item.quantity >= item.maxQuantity}
            className="flex h-7 w-7 items-center justify-center rounded-md border bg-gray-50 hover:bg-gray-100 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <span className="ml-1 text-xs text-muted-foreground">/ {item.maxQuantity}</span>
        </div>

        {/* Line total */}
        <p className="text-sm font-bold text-primary tabular-nums">
          {formatCurrency(item.subtotal)}
        </p>
      </div>

      <p className="text-xs text-muted-foreground tabular-nums">
        {formatCurrency(item.unitPrice)} each
      </p>
    </div>
  )
}
