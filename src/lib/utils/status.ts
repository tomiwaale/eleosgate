import { ExpiryStatus, StockStatus } from '@/types'

export function getExpiryStatus(expiryDate?: string): ExpiryStatus {
  if (!expiryDate) return ExpiryStatus.Ok
  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return ExpiryStatus.Expired
  if (daysLeft <= 30) return ExpiryStatus.ExpiringSoon
  return ExpiryStatus.Ok
}

export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity === 0) return StockStatus.OutOfStock
  if (quantity <= reorderLevel) return StockStatus.Low
  return StockStatus.Ok
}
