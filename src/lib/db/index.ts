import Dexie, { Table } from 'dexie'
import type { User, Category, Product, Sale, SaleItem, StoreSetting } from './schema'

export class EleosgatePOSDatabase extends Dexie {
  users!: Table<User>
  categories!: Table<Category>
  products!: Table<Product>
  sales!: Table<Sale>
  saleItems!: Table<SaleItem>
  settings!: Table<StoreSetting>

  constructor() {
    super('EleosgatePOS')
    this.version(1).stores({
      users: 'id, role, isActive, isSynced',
      categories: 'id, isSynced',
      products: 'id, name, barcode, categoryId, isActive, isSynced',
      sales: 'id, receiptNumber, servedBy, createdAt, isSynced',
      saleItems: 'id, saleId, productId',
      settings: 'key',
    })
    this.version(2).stores({
      categories: 'id, name, isSynced',
      users: 'id, role, isActive, createdAt, isSynced',
    })
  }
}

export const db = new EleosgatePOSDatabase()

export type { User, Category, Product, Sale, SaleItem, StoreSetting }
