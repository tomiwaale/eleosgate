export interface User {
  id: string
  name: string
  role: 'owner' | 'cashier'
  pinHash: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

export interface Category {
  id: string
  name: string
  createdAt: string
  isSynced: boolean
}

export interface Product {
  id: string
  name: string
  barcode?: string
  categoryId?: string
  sellingPrice: number
  costPrice: number
  quantityInStock: number
  reorderLevel: number
  expiryDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  isSynced: boolean
}

export interface Sale {
  id: string
  receiptNumber: string
  totalAmount: number
  amountTendered: number
  changeAmount: number
  paymentMethod: 'cash' | 'transfer'
  servedBy: string
  createdAt: string
  isSynced: boolean
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface StoreSetting {
  key: string
  value: string
}
