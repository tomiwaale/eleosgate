import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity' | 'subtotal'>) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const existing = get().items.find((i) => i.productId === product.productId)
        if (existing) {
          const newQty = Math.min(existing.quantity + 1, existing.maxQuantity)
          get().updateQuantity(product.productId, newQty)
        } else {
          set((state) => ({
            items: [
              ...state.items,
              { ...product, quantity: 1, subtotal: product.unitPrice },
            ],
          }))
        }
      },
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity, subtotal: i.unitPrice * quantity }
                : i
            )
            .filter((i) => i.quantity > 0),
        })),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
    }),
    { name: 'eleosgate-cart' }
  )
)
