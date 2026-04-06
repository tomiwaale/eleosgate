'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { getExpiryStatus, getStockStatus } from '@/lib/utils/status'
import { ExpiryStatus, StockStatus } from '@/types'
import { ProductTable } from '@/components/inventory/ProductTable'
import { ProductFilters, type InventoryFilter } from '@/components/inventory/ProductFilters'
import { CategoryManager } from '@/components/inventory/CategoryManager'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'

export default function InventoryPage() {
  const { isOwner } = useSessionStore()
  const [filter, setFilter] = useState<InventoryFilter>('all')
  const [search, setSearch] = useState('')

  const products = useLiveQuery(
    async () => (await db.products.toArray()).filter((product) => product.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), [])

  const filtered = useMemo(() => {
    if (!products) return []
    const q = search.toLowerCase().trim()

    return products.filter((p) => {
      // Search filter
      if (q) {
        const matchName = p.name.toLowerCase().includes(q)
        const matchBarcode = p.barcode?.toLowerCase().includes(q)
        if (!matchName && !matchBarcode) return false
      }

      // Status filter
      if (filter === 'low_stock') {
        const s = getStockStatus(p.quantityInStock, p.reorderLevel)
        return s === StockStatus.Low || s === StockStatus.OutOfStock
      }
      if (filter === 'expiring') {
        return getExpiryStatus(p.expiryDate) === ExpiryStatus.ExpiringSoon
      }
      if (filter === 'expired') {
        return getExpiryStatus(p.expiryDate) === ExpiryStatus.Expired
      }

      return true
    })
  }, [products, filter, search])

  const counts = useMemo(() => {
    if (!products) return { all: 0, low_stock: 0, expiring: 0, expired: 0 }
    return {
      all: products.length,
      low_stock: products.filter((p) => {
        const s = getStockStatus(p.quantityInStock, p.reorderLevel)
        return s === StockStatus.Low || s === StockStatus.OutOfStock
      }).length,
      expiring: products.filter(
        (p) => getExpiryStatus(p.expiryDate) === ExpiryStatus.ExpiringSoon
      ).length,
      expired: products.filter(
        (p) => getExpiryStatus(p.expiryDate) === ExpiryStatus.Expired
      ).length,
    }
  }, [products])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {products?.length ?? 0} product{products?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner() && <CategoryManager categories={categories ?? []} />}
          {isOwner() && (
            <Link href="/inventory/new">
              <Button className="bg-primary hover:bg-primary-dark text-white gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Filters */}
      <ProductFilters active={filter} onChange={setFilter} counts={counts} />

      {/* Table */}
      {products === undefined ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : (
        <ProductTable products={filtered} categories={categories ?? []} />
      )}
    </div>
  )
}
