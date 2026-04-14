'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import {
  isSupabaseConfigured,
  missingSupabaseEnvMessage,
  requireSupabaseClient,
} from '@/lib/supabase/client'
import { syncToSupabase } from '@/lib/supabase/sync'
import { useSessionStore } from '@/store/session.store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Users, ChevronRight, Save, Cloud, Loader2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const schema = z.object({
  store_name: z.string().min(1, 'Store name is required'),
  store_address: z.string().optional(),
  store_phone: z.string().optional(),
  receipt_footer: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const { isOwner } = useSessionStore()
  const router = useRouter()
  const [cloudEmail, setCloudEmail] = useState('')
  const [cloudPassword, setCloudPassword] = useState('')
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [supabaseUid, setSupabaseUid] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!isOwner()) { router.replace('/pos'); return }
    db.settings.toArray().then((rows) => {
      const s = Object.fromEntries(rows.map((r) => [r.key, r.value]))
      setCloudEmail(s.owner_email ?? '')
      setSupabaseUid(s.supabase_uid ?? null)
      reset({
        store_name: s.store_name ?? '',
        store_address: s.store_address ?? '',
        store_phone: s.store_phone ?? '',
        receipt_footer: s.receipt_footer ?? '',
      })
    })
  }, [isOwner, router, reset])

  async function onSubmit(data: FormData) {
    await Promise.all(
      Object.entries(data).map(([key, value]) =>
        db.settings.put({ key, value: value ?? '' })
      )
    )
    toast.success('Settings saved')
    reset(data)
  }

  async function connectCloudBackup() {
    const email = cloudEmail.trim()
    if (!email || cloudPassword.length < 6) {
      setCloudError('Enter a valid email and a password with at least 6 characters.')
      return
    }

    if (!isSupabaseConfigured) {
      setCloudError(missingSupabaseEnvMessage)
      return
    }

    setCloudLoading(true)
    setCloudError(null)

    try {
      const supabase = requireSupabaseClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: cloudPassword,
      })

      if (authError) throw new Error(authError.message)

      const uid = authData.user?.id
      if (!uid) throw new Error('Failed to create cloud backup account')

      await db.settings.bulkPut([
        { key: 'owner_email', value: email },
        { key: 'supabase_uid', value: uid },
      ])

      setSupabaseUid(uid)
      setCloudPassword('')

      try {
        await syncToSupabase()
      } catch {
        toast.error('Cloud backup is connected, but the first sync did not finish yet.')
      }

      toast.success('Cloud backup connected')
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Failed to connect cloud backup.')
    } finally {
      setCloudLoading(false)
    }
  }

  if (!isOwner()) return null

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your store information</p>
      </div>

      {/* Store info */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Store Information</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Appears on receipts and the app header
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="store_name">Store Name *</Label>
            <Input id="store_name" {...register('store_name')} placeholder="Eleosgate Pharmacy" />
            {errors.store_name && (
              <p className="text-xs text-danger">{errors.store_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store_address">Address</Label>
            <Input
              id="store_address"
              {...register('store_address')}
              placeholder="123 Main Street, Lagos"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store_phone">Phone Number</Label>
            <Input
              id="store_phone"
              {...register('store_phone')}
              placeholder="0801 234 5678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt_footer">Receipt Footer</Label>
            <Input
              id="receipt_footer"
              {...register('receipt_footer')}
              placeholder="Thank you & get well soon!"
            />
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Cloud Backup</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect Supabase backup so new devices can restore this store.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!isSupabaseConfigured ? (
            <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {missingSupabaseEnvMessage}
            </div>
          ) : supabaseUid ? (
            <div className="flex items-start gap-3 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Cloud backup is connected.</p>
                <p className="text-xs text-green-700">
                  {cloudEmail || 'Owner email saved'} · Store ID {supabaseUid.slice(0, 8)}...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cloud_email">Owner Email</Label>
                <Input
                  id="cloud_email"
                  type="email"
                  value={cloudEmail}
                  onChange={(e) => setCloudEmail(e.target.value)}
                  placeholder="owner@pharmacy.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cloud_password">Cloud Password</Label>
                <Input
                  id="cloud_password"
                  type="password"
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              {cloudError && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {cloudError}
                </div>
              )}

              <Button
                type="button"
                onClick={() => void connectCloudBackup()}
                disabled={cloudLoading}
                className="bg-primary hover:bg-primary/90 gap-2"
              >
                {cloudLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    Enable Cloud Backup
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Staff shortcut */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Staff Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add cashiers, reset PINs, deactivate accounts
          </p>
        </div>
        <Link
          href="/settings/staff"
          className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors rounded-b-xl"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Manage Staff</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </Link>
      </div>
    </div>
  )
}
