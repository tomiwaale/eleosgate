export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  subtotal: number
  maxQuantity: number
}

export type UserRole = 'owner' | 'cashier'

export interface SessionUser {
  id: string
  name: string
  role: UserRole
}

export enum ExpiryStatus {
  Ok = 'ok',
  ExpiringSoon = 'expiring_soon',
  Expired = 'expired',
}

export enum StockStatus {
  Ok = 'ok',
  Low = 'low',
  OutOfStock = 'out_of_stock',
}
