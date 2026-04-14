import { db } from '@/lib/db'

const DEVICE_ID_KEY = 'device_id'

function createShortId(length: number) {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

  return randomId.slice(0, length).toUpperCase()
}

async function getOrCreateDeviceId() {
  const existing = await db.settings.get(DEVICE_ID_KEY)
  if (existing?.value) return existing.value

  const deviceId = createShortId(4)
  await db.settings.put({ key: DEVICE_ID_KEY, value: deviceId })
  return deviceId
}

export async function generateReceiptNumber(): Promise<string> {
  const deviceId = await getOrCreateDeviceId()
  const timePart = Date.now().toString(36).toUpperCase()
  const randomPart = createShortId(4)
  return `EG-${deviceId}-${timePart}${randomPart}`
}
