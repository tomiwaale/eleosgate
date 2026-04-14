import Dexie, { Table } from 'dexie'
import type { User, Category, Product, Sale, SaleItem, StockAdjustment, StoreSetting } from './schema'

export class EleosgatePOSDatabase extends Dexie {
  users!: Table<User>
  categories!: Table<Category>
  products!: Table<Product>
  sales!: Table<Sale>
  saleItems!: Table<SaleItem>
  stockAdjustments!: Table<StockAdjustment>
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
    this.version(3)
      .stores({
        users: 'id, role, isActive, createdAt, updatedAt, isSynced',
        categories: 'id, name, updatedAt, isSynced',
        products: 'id, name, barcode, categoryId, isActive, updatedAt, isSynced',
        sales: 'id, receiptNumber, servedBy, createdAt, isSynced',
        saleItems: 'id, saleId, productId, isSynced',
        stockAdjustments: 'id, productId, saleId, createdAt, isSynced',
        settings: 'key',
      })
      .upgrade(async (tx) => {
        const categories = tx.table<Category>('categories')
        const saleItems = tx.table<SaleItem>('saleItems')

        await categories.toCollection().modify((category) => {
          category.updatedAt = category.updatedAt ?? category.createdAt
        })

        await saleItems.toCollection().modify((saleItem) => {
          saleItem.isSynced = saleItem.isSynced ?? true
        })
      })
  }
}

export const db = new EleosgatePOSDatabase()

export type { User, Category, Product, Sale, SaleItem, StockAdjustment, StoreSetting }
