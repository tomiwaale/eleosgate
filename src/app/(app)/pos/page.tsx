'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import type { Sale, SaleItem } from '@/lib/db'
import { useCartStore } from '@/store/cart.store'
import { useSessionStore } from '@/store/session.store'
import { useSync } from '@/hooks/useSync'
import { useDebounce } from '@/hooks/useDebounce'
import { generateReceiptNumber } from '@/lib/utils/receipt-number'
import { printReceipt } from '@/lib/printing/thermal'
import { SearchBar } from '@/components/pos/SearchBar'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { Cart } from '@/components/pos/Cart'
import { PaymentModal } from '@/components/pos/PaymentModal'
import type { Product } from '@/lib/db'
import { toast } from 'sonner'

export default function POSPage() {
  const { user } = useSessionStore()
  const { items, addItem, clearCart, total } = useCartStore()
  const { sync } = useSync()

  const [search, setSearch] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [nextReceipt, setNextReceipt] = useState('EG-????')

  const searchRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(search, 250)

  // Pre-fetch the next receipt number on mount
  useEffect(() => {
    async function peek() {
      const setting = await db.settings.get('last_receipt_number')
      const next = parseInt(setting?.value ?? '0') + 1
      setNextReceipt(`EG-${next.toString().padStart(4, '0')}`)
    }
    peek()
  }, [items.length]) // refresh after every sale (cart cleared)

  const allProducts = useLiveQuery(
    async () => (await db.products.toArray()).filter((product) => product.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  const results = useMemo(() => {
    if (!allProducts) return []
    const q = debouncedSearch.toLowerCase().trim()
    if (!q) return allProducts.slice(0, 30) // show first 30 when no query
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  }, [allProducts, debouncedSearch])

  const focusSearch = useCallback(() => {
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  function handleAddToCart(product: Product) {
    addItem({
      productId: product.id,
      productName: product.name,
      unitPrice: product.sellingPrice,
      maxQuantity: product.quantityInStock,
    })
    setSearch('')
    focusSearch()
  }

  // Called when Enter is pressed in search bar
  function handleSearchEnter() {
    const q = search.trim()
    if (!q || !allProducts) return

    // Try exact barcode match first
    const byBarcode = allProducts.find(
      (p) => p.barcode && p.barcode.toLowerCase() === q.toLowerCase()
    )
    if (byBarcode) {
      handleAddToCart(byBarcode)
      return
    }

    // Fall back to first name match
    const byName = allProducts.find((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    if (byName) {
      handleAddToCart(byName)
    }
  }

  async function handleConfirmSale(method: 'cash' | 'transfer', tendered: number) {
    if (!user || items.length === 0) return

    const settings = await db.settings.toArray()
    const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]))

    const saleId = uuidv4()
    const now = new Date().toISOString()
    const receiptNumber = await generateReceiptNumber()
    const cartTotal = total()
    const changeAmount = Math.max(0, tendered - cartTotal)

    const sale: Sale = {
      id: saleId,
      receiptNumber,
      totalAmount: cartTotal,
      amountTendered: tendered,
      changeAmount,
      paymentMethod: method,
      servedBy: user.id,
      createdAt: now,
      isSynced: false,
    }

    const saleItems: SaleItem[] = items.map((item) => ({
      id: uuidv4(),
      saleId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    }))

    // Single Dexie transaction: write sale + items + deduct stock
    await db.transaction('rw', db.sales, db.saleItems, db.products, async () => {
      await db.sales.add(sale)
      await db.saleItems.bulkAdd(saleItems)
      for (const item of items) {
        await db.products.where('id').equals(item.productId).modify((p) => {
          p.quantityInStock = Math.max(0, p.quantityInStock - item.quantity)
          p.isSynced = false
        })
      }
    })

    // Print receipt
    try {
      await printReceipt(sale, saleItems, settingMap.store_name ?? 'Eleosgate Pharmacy', settingMap.store_address, settingMap.store_phone, settingMap.receipt_footer)
    } catch {
      // Print failure is non-fatal
    }

    clearCart()
    setPaymentOpen(false)
    focusSearch()
    toast.success(`Sale ${receiptNumber} recorded`)

    // Background sync
    sync()
  }

  return (
    <div className="flex h-full gap-4 overflow-hidden -m-4">
      {/* Left — Search + Results */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <SearchBar
          ref={searchRef}
          value={search}
          onChange={setSearch}
          onEnter={handleSearchEnter}
        />
        <div className="flex-1 overflow-y-auto">
          {allProducts === undefined ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <ProductGrid products={results} onAdd={handleAddToCart} />
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-80 xl:w-96 shrink-0 border-l bg-gray-50 overflow-hidden flex flex-col">
        <Cart
          receiptNumber={nextReceipt}
          onCharge={() => {
            if (items.length === 0) return
            setPaymentOpen(true)
          }}
        />
      </div>

      {/* Payment modal */}
      <PaymentModal
        total={total()}
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false)
          focusSearch()
        }}
        onConfirm={handleConfirmSale}
      />
    </div>
  )
}
