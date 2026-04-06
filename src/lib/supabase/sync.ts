import { db } from '@/lib/db'
import { getSupabaseClient, isSupabaseConfigured, missingSupabaseEnvMessage } from './client'

// ── field-name helpers ──────────────────────────────────────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** Convert a local camelCase record to snake_case for Supabase, injecting store_id. */
function serialize(record: Record<string, unknown>, storeId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { store_id: storeId }
  for (const [key, val] of Object.entries(record)) {
    if (key === 'isSynced') continue
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

// ── core helpers ────────────────────────────────────────────────────────────

async function getStoreId(): Promise<string | null> {
  const setting = await db.settings.get('supabase_uid')
  return setting?.value ?? null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pushTable(tableName: string, table: any, storeId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  const unsynced = (await table.toArray()).filter((row: Record<string, unknown>) => !row.isSynced)
  if (!unsynced.length) return

  const { error } = await supabase
    .from(`eg_${tableName}`)
    .upsert(unsynced.map((r: Record<string, unknown>) => serialize(r, storeId)))

  if (!error) {
    const syncedIds = new Set(unsynced.map((row: Record<string, unknown>) => row.id))
    await table.toCollection().modify((row: Record<string, unknown>) => {
      if (syncedIds.has(row.id)) {
        row.isSynced = true
      }
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function pullTable(remoteName: string, local: any, storeId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error(missingSupabaseEnvMessage)

  const { data, error } = await supabase
    .from(remoteName)
    .select('*')
    .eq('store_id', storeId)

  if (!error && data) {
    await local.bulkPut(data.map((r: Record<string, unknown>) => deserialize(r)))
  }
}

// ── public API ──────────────────────────────────────────────────────────────

export async function syncToSupabase() {
  if (!isSupabaseConfigured) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const storeId = await getStoreId()
  if (!storeId) return

  await pushTable('products', db.products, storeId)
  await pushTable('sales', db.sales, storeId)
  await pushTable('sale_items', db.saleItems, storeId)
  await pushTable('users', db.users, storeId)
  await pushTable('categories', db.categories, storeId)

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
