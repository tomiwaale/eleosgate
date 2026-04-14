'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Product, Category } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { db } from '@/lib/db'
import { getExpiryStatus, getStockStatus } from '@/lib/utils/status'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateShort } from '@/lib/utils/date'
import { ExpiryStatus, StockStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, PackageX } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  products: Product[]
  categories: Category[]
}

export function ProductTable({ products, categories }: Props) {
  const { isOwner } = useSessionStore()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]))

  async function handleDelete(id: string) {
    await db.products.update(id, { isActive: false, isSynced: false })
    toast.success('Product removed from inventory')
    setDeletingId(null)
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-white py-16 text-center">
        <PackageX className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">No products found</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Try a different filter or add a new product
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile card view ──────────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {products.map((product) => {
          const stockStatus = getStockStatus(product.quantityInStock, product.reorderLevel)
          const expiryStatus = getExpiryStatus(product.expiryDate)

          return (
            <div key={product.id} className="rounded-lg border bg-white p-4 shadow-sm">
              {/* Name + badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {product.categoryId ? (categoryMap[product.categoryId] ?? '—') : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {stockStatus === StockStatus.OutOfStock && (
                    <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0 text-xs">
                      Out of stock
                    </Badge>
                  )}
                  {stockStatus === StockStatus.Low && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">
                      Low stock
                    </Badge>
                  )}
                  {expiryStatus === ExpiryStatus.Expired && (
                    <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0 text-xs">
                      Expired
                    </Badge>
                  )}
                  {expiryStatus === ExpiryStatus.ExpiringSoon && (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">
                      Expiring soon
                    </Badge>
                  )}
                  {stockStatus === StockStatus.Ok && expiryStatus === ExpiryStatus.Ok && (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">
                      OK
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Stock</p>
                  <p
                    className={
                      stockStatus === StockStatus.OutOfStock
                        ? 'font-bold text-danger'
                        : stockStatus === StockStatus.Low
                        ? 'font-semibold text-amber-600'
                        : 'font-semibold'
                    }
                  >
                    {product.quantityInStock}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(product.sellingPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiry</p>
                  <p>{product.expiryDate ? formatDateShort(product.expiryDate) : '—'}</p>
                </div>
              </div>

              {/* Owner actions */}
              {isOwner() && (
                <div className="mt-3 flex items-center gap-2 border-t pt-3">
                  {product.barcode && (
                    <span className="flex-1 font-mono text-xs text-muted-foreground truncate">
                      {product.barcode}
                    </span>
                  )}
                  <div className="flex gap-1 ml-auto">
                    <Link
                      href={`/inventory/${product.id}`}
                      className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeletingId(product.id)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Desktop table view ────────────────────────────────────────── */}
      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="font-semibold">Product</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Barcode</TableHead>
              <TableHead className="font-semibold text-right">Stock</TableHead>
              <TableHead className="font-semibold text-right">Price</TableHead>
              {isOwner() && <TableHead className="font-semibold text-right">Cost</TableHead>}
              <TableHead className="font-semibold">Expiry</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {isOwner() && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const stockStatus = getStockStatus(product.quantityInStock, product.reorderLevel)
              const expiryStatus = getExpiryStatus(product.expiryDate)

              return (
                <TableRow key={product.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.categoryId ? (categoryMap[product.categoryId] ?? '—') : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.barcode ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={
                        stockStatus === StockStatus.OutOfStock
                          ? 'font-bold text-danger'
                          : stockStatus === StockStatus.Low
                          ? 'font-semibold text-amber-600'
                          : ''
                      }
                    >
                      {product.quantityInStock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(product.sellingPrice)}
                  </TableCell>
                  {isOwner() && (
                    <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                      {formatCurrency(product.costPrice)}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {product.expiryDate ? formatDateShort(product.expiryDate) : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {stockStatus === StockStatus.OutOfStock && (
                        <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0 text-xs">
                          Out of stock
                        </Badge>
                      )}
                      {stockStatus === StockStatus.Low && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">
                          Low stock
                        </Badge>
                      )}
                      {expiryStatus === ExpiryStatus.Expired && (
                        <Badge className="bg-danger/10 text-danger hover:bg-danger/20 border-0 text-xs">
                          Expired
                        </Badge>
                      )}
                      {expiryStatus === ExpiryStatus.ExpiringSoon && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">
                          Expiring soon
                        </Badge>
                      )}
                      {stockStatus === StockStatus.Ok && expiryStatus === ExpiryStatus.Ok && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs">
                          OK
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {isOwner() && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/inventory/${product.id}`}
                          className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeletingId(product.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove product?</AlertDialogTitle>
            <AlertDialogDescription>
              This product will be hidden from inventory and POS. Sales history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
