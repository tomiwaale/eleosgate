import type { Table } from 'dexie'
import { db } from '@/lib/db'
import type { SaleItem } from '@/lib/db'
import {
  canReachSupabase,
  getSupabaseClient,
  isSupabaseConfigured,
  missingSupabaseEnvMessage,
} from './client'

const PAGE_SIZE = 500
type SyncableTableRow = { id?: string; isSynced?: boolean }

// ── field-name helpers ──────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** Convert a local camelCase record to snake_case for Supabase, injecting store_id. */
function serialize(
  record: Record<string, unknown>,
  storeId: string,
  omitKeys: string[] = []
): Record<string, unknown> {
  const out: Record<string, unknown> = { store_id: storeId }
  const omitted = new Set(['isSynced', ...omitKeys])

  for (const [key, val] of Object.entries(record)) {
    if (omitted.has(key)) continue
    out[toSnakeCase(key)] = val
  }
  return out
}

/** Convert a snake_case Supabase row back to camelCase for IndexedDB, marking isSynced. */
function deserialize(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(record)) {
    if (key === 'store_id') continue
    out[toCamelCase(key)] = val
  }
  out.isSynced = true
  return out
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

// ── core helpers ────────────────────────────────────────────────────────────

async function getStoreId(): Promise<string | null> {
  const setting = await db.settings.get('supabase_uid')
  return setting?.value ?? null
}

async function markRowsSynced<Row extends SyncableTableRow>(table: Table<Row, string>, ids: string[]) {
  if (!ids.length) return

  const syncedIds = new Set(ids)
  await table.toCollection().modify((row) => {
    if (typeof row.id === 'string' && syncedIds.has(row.id)) {
      row.isSynced = true
    }
  })
}

async function pushTable<Row extends SyncableTableRow>(
  tableName: string,
  table: Table<Row, string>,
  storeId: string,
  options?: { omitKeys?: string[] }
) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const unsynced = (await table.toArray()).filter((row) => !row.isSynced)
  if (!unsynced.length) return

  for (const batch of chunkArray(unsynced, PAGE_SIZE)) {
    const { error } = await supabase
      .from(`eg_${tableName}`)
      .upsert(batch.map((row) => serialize(row as Record<string, unknown>, storeId, options?.omitKeys)))

    if (error) {
      throw new Error(error.message)
    }

    await markRowsSynced(
      table,
      batch
        .map((row) => row.id)
        .filter((id): id is string => typeof id === 'string')
    )
  }
}

async function pushStockAdjustments(storeId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const unsynced = (await db.stockAdjustments.toArray())
    .filter((row) => !row.isSynced)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (!unsynced.length) return

  const syncedIds: string[] = []

  for (const adjustment of unsynced) {
    const { error } = await supabase.rpc('apply_stock_adjustment', {
      p_adjustment_id: adjustment.id,
      p_store_id: storeId,
      p_product_id: adjustment.productId,
      p_quantity_change: adjustment.quantityChange,
      p_reason: adjustment.reason,
      p_sale_id: adjustment.saleId ?? null,
      p_created_at: adjustment.createdAt,
    })

    if (error) {
      if (syncedIds.length) {
        await markRowsSynced(db.stockAdjustments, syncedIds)
      }
      throw new Error(error.message)
    }

    syncedIds.push(adjustment.id)
  }

  await markRowsSynced(db.stockAdjustments, syncedIds)
}

async function pullTable<Row extends SyncableTableRow>(
  remoteName: string,
  local: Table<Row, string>,
  storeId: string
) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error(missingSupabaseEnvMessage)

  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(remoteName)
      .select('*')
      .eq('store_id', storeId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    if (!data?.length) break

    await local.bulkPut(data.map((row: Record<string, unknown>) => deserialize(row) as Row))

    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
}

/**
 * Pull remote records newer than `since` into the local table.
 * A 10-minute buffer is subtracted from `since` to cover clock drift between
 * devices — bulkPut is idempotent so re-pulling overlapping records is safe.
 * Returns the raw Supabase rows so callers can act on them (e.g. fetch related items).
 */
async function pullTableSince<Row extends SyncableTableRow>(
  remoteName: string,
  local: Table<Row, string>,
  storeId: string,
  since: string,
  timestampCol: string,
): Promise<Record<string, unknown>[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const sinceWithBuffer = new Date(new Date(since).getTime() - 10 * 60 * 1000).toISOString()
  const rows: Record<string, unknown>[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(remoteName)
      .select('*')
      .eq('store_id', storeId)
      .gte(timestampCol, sinceWithBuffer)
      .order(timestampCol, { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    if (!data?.length) break

    await local.bulkPut(data.map((row: Record<string, unknown>) => deserialize(row) as Row))
    rows.push(...data)

    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function pullSaleItemsForSales(storeId: string, saleIds: string[]) {
  if (!saleIds.length) return

  const supabase = getSupabaseClient()
  if (!supabase) return

  for (const saleIdChunk of chunkArray(saleIds, 100)) {
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from('eg_sale_items')
        .select('*')
        .eq('store_id', storeId)
        .in('sale_id', saleIdChunk)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.length) break

      await db.saleItems.bulkPut(
        data.map((row: Record<string, unknown>) => deserialize(row) as unknown as SaleItem)
      )

      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }
}

// ── public API ──────────────────────────────────────────────────────────────

export async function syncToSupabase() {
  if (!isSupabaseConfigured) return
  if (!(await canReachSupabase())) return

  const storeId = await getStoreId()
  if (!storeId) return

  // Capture the watermark before pushing so we don't miss records that
  // arrive on the server while our push is in flight.
  const lastSyncSetting = await db.settings.get('last_synced_at')
  const since = lastSyncSetting?.value ?? '1970-01-01T00:00:00.000Z'

  // ── Push: upload any records created/modified offline on this device ──
  await pushTable('users', db.users, storeId)
  await pushTable('categories', db.categories, storeId)
  await pushTable('products', db.products, storeId, { omitKeys: ['quantityInStock'] })
  await pushTable('sales', db.sales, storeId)
  await pushTable('sale_items', db.saleItems, storeId)
  await pushStockAdjustments(storeId)

  // ── Pull: download changes made on other devices (e.g. cashier → owner) ──
  await pullTableSince('eg_users', db.users, storeId, since, 'updated_at')
  await pullTableSince('eg_categories', db.categories, storeId, since, 'updated_at')
  await pullTableSince('eg_products', db.products, storeId, since, 'updated_at')

  // Sales are immutable after creation — filter by created_at
  const newSales = await pullTableSince('eg_sales', db.sales, storeId, since, 'created_at')

  // SaleItems have no reliable update timestamp — pull them by the IDs of any sales just fetched.
  if (newSales.length) {
    const saleIds = newSales
      .map((row) => row.id)
      .filter((id): id is string => typeof id === 'string')

    await pullSaleItemsForSales(storeId, saleIds)
  }

  await db.settings.put({ key: 'last_synced_at', value: new Date().toISOString() })
}

export async function pullFromSupabase(storeId: string) {
  if (!isSupabaseConfigured) {
    throw new Error(missingSupabaseEnvMessage)
  }

  await pullTable('eg_users', db.users, storeId)
  await pullTable('eg_categories', db.categories, storeId)
  await pullTable('eg_products', db.products, storeId)
  await pullTable('eg_sales', db.sales, storeId)
  await pullTable('eg_sale_items', db.saleItems, storeId)

  await db.settings.put({ key: 'last_synced_at', value: new Date().toISOString() })
  await db.settings.put({ key: 'supabase_uid', value: storeId })
}
