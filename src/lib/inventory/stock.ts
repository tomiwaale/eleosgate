import { v4 as uuidv4 } from 'uuid'
import type { StockAdjustment } from '@/lib/db'

interface CreateStockAdjustmentInput {
  productId: string
  quantityChange: number
  reason: StockAdjustment['reason']
  saleId?: string
  createdAt?: string
}

export function createStockAdjustment({
  productId,
  quantityChange,
  reason,
  saleId,
  createdAt = new Date().toISOString(),
}: CreateStockAdjustmentInput): StockAdjustment {
  return {
    id: uuidv4(),
    productId,
    quantityChange,
    reason,
    saleId,
    createdAt,
    isSynced: false,
  }
}
