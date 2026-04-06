'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export function useSales(userId?: string) {
  return useLiveQuery(
    () =>
      userId
        ? db.sales.where('servedBy').equals(userId).reverse().sortBy('createdAt')
        : db.sales.orderBy('createdAt').reverse().toArray(),
    [userId]
  )
}

export function useSale(id: string) {
  return useLiveQuery(() => db.sales.get(id), [id])
}

export function useSaleItems(saleId: string) {
  return useLiveQuery(() => db.saleItems.where('saleId').equals(saleId).toArray(), [saleId])
}
