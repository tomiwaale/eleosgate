'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import type { Sale, SaleItem, User } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { ReceiptView } from '@/components/sales/ReceiptView'
import { ArrowLeft } from 'lucide-react'

interface PageData {
  sale: Sale
  items: SaleItem[]
  staff: User | undefined
  storeName: string
  storeAddress?: string
  storePhone?: string
  receiptFooter?: string
}

export default function SaleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, isOwner } = useSessionStore()
  const [data, setData] = useState<PageData | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const sale = await db.sales.get(params.id)
      if (!sale) { setNotFound(true); return }

      // Cashiers can only view their own sales
      if (!isOwner() && sale.servedBy !== user?.id) {
        router.replace('/sales')
        return
      }

      const [items, staff, settings] = await Promise.all([
        db.saleItems.where('saleId').equals(sale.id).toArray(),
        db.users.get(sale.servedBy),
        db.settings.toArray(),
      ])

      const s = Object.fromEntries(settings.map((x) => [x.key, x.value]))

      setData({
        sale,
        items,
        staff,
        storeName: s.store_name ?? 'Eleosgate Pharmacy',
        storeAddress: s.store_address,
        storePhone: s.store_phone,
        receiptFooter: s.receipt_footer,
      })
    }
    load()
  }, [params.id, isOwner, user?.id, router])

  if (notFound) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Sale not found.{' '}
        <Link href="/sales" className="text-primary underline-offset-2 hover:underline">
          Back to sales
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/sales"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{data.sale.receiptNumber}</h1>
      </div>

      <ReceiptView
        sale={data.sale}
        items={data.items}
        staff={data.staff}
        storeName={data.storeName}
        storeAddress={data.storeAddress}
        storePhone={data.storePhone}
        receiptFooter={data.receiptFooter}
      />
    </div>
  )
}
