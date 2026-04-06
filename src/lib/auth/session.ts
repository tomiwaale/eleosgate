import { db } from '@/lib/db'

export async function hasExistingUsers(): Promise<boolean> {
  const count = await db.users.count()
  return count > 0
}

export async function getStoreSettings() {
  const settings = await db.settings.toArray()
  return Object.fromEntries(settings.map((s) => [s.key, s.value]))
}
