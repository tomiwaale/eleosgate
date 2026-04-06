'use client'

import { useCartStore } from '@/store/cart.store'

export function useCart() {
  return useCartStore()
}
