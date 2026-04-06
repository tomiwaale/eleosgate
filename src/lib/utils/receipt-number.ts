import { db } from '@/lib/db'

export async function generateReceiptNumber(): Promise<string> {
  const setting = await db.settings.get('last_receipt_number')
  const last = parseInt(setting?.value ?? '0')
  const next = last + 1
  await db.settings.put({ key: 'last_receipt_number', value: next.toString() })
  return `EG-${next.toString().padStart(4, '0')}`
}
