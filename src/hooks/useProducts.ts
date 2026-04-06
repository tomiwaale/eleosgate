'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export function useProducts() {
  return useLiveQuery(() => db.products.filter((product) => product.isActive).toArray(), [])
}

export function useProduct(id: string) {
  return useLiveQuery(() => db.products.get(id), [id])
}

export function useCategories() {
  return useLiveQuery(() => db.categories.toArray(), [])
}
