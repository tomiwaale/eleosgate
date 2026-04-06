'use client'

import type { Product } from '@/lib/db'
import { formatCurrency } from '@/lib/utils/currency'
import { getStockStatus } from '@/lib/utils/status'
import { StockStatus } from '@/types'
import { cn } from '@/lib/utils'
import { PackageSearch } from 'lucide-react'

interface Props {
  products: Product[]
  onAdd: (product: Product) => void
}

export function ProductGrid({ products, onAdd }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PackageSearch className="h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">No products found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
      {products.map((product) => {
        const stockStatus = getStockStatus(product.quantityInStock, product.reorderLevel)
        const outOfStock = stockStatus === StockStatus.OutOfStock

        return (
          <button
            key={product.id}
            onClick={() => !outOfStock && onAdd(product)}
            disabled={outOfStock}
            className={cn(
              'relative flex flex-col items-start rounded-xl border bg-white p-3 text-left shadow-sm transition-all',
              outOfStock
                ? 'cursor-not-allowed opacity-50'
                : 'hover:border-primary/50 hover:shadow-md active:scale-[0.98] cursor-pointer'
            )}
          >
            {/* Stock badge */}
            {stockStatus === StockStatus.Low && (
              <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                Low
              </span>
            )}
            {outOfStock && (
              <span className="absolute right-2 top-2 rounded-full bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger">
                Out
              </span>
            )}

            <p className="pr-8 text-sm font-semibold leading-snug text-foreground line-clamp-2">
              {product.name}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Stock: {product.quantityInStock}
            </p>
            <p className="mt-1 text-base font-bold text-primary">
              {formatCurrency(product.sellingPrice)}
            </p>
          </button>
        )
      })}
    </div>
  )
}
