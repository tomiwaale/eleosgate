'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import { hashPin } from '@/lib/auth/pin'
import {
  isSupabaseConfigured,
  missingSupabaseEnvMessage,
  requireSupabaseClient,
} from '@/lib/supabase/client'
import { useSessionStore } from '@/store/session.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const setupSchema = z.object({
  storeName: z.string().min(2, 'Store name required'),
  storeAddress: z.string().min(5, 'Address required'),
  storePhone: z.string().min(7, 'Phone number required'),
  ownerName: z.string().min(2, 'Your name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  pin: z
    .string()
    .min(4, 'PIN must be at least 4 digits')
    .max(8, 'PIN must be at most 8 digits')
    .regex(/^\d+$/, 'PIN must be digits only'),
  confirmPin: z.string(),
}).refine((d) => d.pin === d.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin'],
})

type SetupForm = z.infer<typeof setupSchema>

export default function SetupPage() {
  const router = useRouter()
  const { setUser } = useSessionStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupForm>({ resolver: zodResolver(setupSchema) })

  async function onSubmit(data: SetupForm) {
    if (!isSupabaseConfigured) {
      setError(missingSupabaseEnvMessage)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = requireSupabaseClient()

      // 1. Create Supabase account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw new Error(authError.message)
      const uid = authData.user?.id
      if (!uid) throw new Error('Failed to create account')

      // 2. Save store settings to IndexedDB
      const settingsToSave = [
        { key: 'store_name', value: data.storeName },
        { key: 'store_address', value: data.storeAddress },
        { key: 'store_phone', value: data.storePhone },
        { key: 'owner_email', value: data.email },
        { key: 'supabase_uid', value: uid },
        { key: 'last_receipt_number', value: '0' },
      ]
      await db.settings.bulkPut(settingsToSave)

      // 3. Hash PIN and save owner user
      const pinHash = await hashPin(data.pin)
      const ownerId = uuidv4()
      const now = new Date().toISOString()

      await db.users.add({
        id: ownerId,
        name: data.ownerName,
        role: 'owner',
        pinHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        isSynced: false,
      })

      // 4. Set session and redirect
      setUser({ id: ownerId, name: data.ownerName, role: 'owner' })
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Welcome to Eleosgate POS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your pharmacy store to get started.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {missingSupabaseEnvMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Store Details */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Store Details
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  placeholder="Eleosgate Pharmacy"
                  {...register('storeName')}
                  className="mt-1"
                />
                {errors.storeName && (
                  <p className="mt-1 text-xs text-destructive">{errors.storeName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="storeAddress">Address</Label>
                <Input
                  id="storeAddress"
                  placeholder="123 Main Street, Lagos"
                  {...register('storeAddress')}
                  className="mt-1"
                />
                {errors.storeAddress && (
                  <p className="mt-1 text-xs text-destructive">{errors.storeAddress.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="storePhone">Phone Number</Label>
                <Input
                  id="storePhone"
                  placeholder="08012345678"
                  {...register('storePhone')}
                  className="mt-1"
                />
                {errors.storePhone && (
                  <p className="mt-1 text-xs text-destructive">{errors.storePhone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Owner Account */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Owner Account
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="ownerName">Your Name</Label>
                <Input
                  id="ownerName"
                  placeholder="Full name"
                  {...register('ownerName')}
                  className="mt-1"
                />
                {errors.ownerName && (
                  <p className="mt-1 text-xs text-destructive">{errors.ownerName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@pharmacy.com"
                  {...register('email')}
                  className="mt-1"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password (for cloud backup)</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    {...register('password')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* PIN */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Daily Login PIN
            </h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pin">PIN (4–8 digits)</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="e.g. 1234"
                  maxLength={8}
                  {...register('pin')}
                  className="mt-1 tracking-widest"
                />
                {errors.pin && (
                  <p className="mt-1 text-xs text-destructive">{errors.pin.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  placeholder="Re-enter PIN"
                  maxLength={8}
                  {...register('confirmPin')}
                  className="mt-1 tracking-widest"
                />
                {errors.confirmPin && (
                  <p className="mt-1 text-xs text-destructive">{errors.confirmPin.message}</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full bg-primary hover:bg-primary-dark text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Create Store & Get Started'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
