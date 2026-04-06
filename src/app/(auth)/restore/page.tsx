'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import {
  isSupabaseConfigured,
  missingSupabaseEnvMessage,
  requireSupabaseClient,
} from '@/lib/supabase/client'
import { pullFromSupabase } from '@/lib/supabase/sync'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

const restoreSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})

type RestoreForm = z.infer<typeof restoreSchema>

export default function RestorePage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RestoreForm>({ resolver: zodResolver(restoreSchema) })

  async function onSubmit(data: RestoreForm) {
    if (!isSupabaseConfigured) {
      setError(missingSupabaseEnvMessage)
      return
    }

    setLoading(true)
    setError(null)
    setStatus('Signing in...')

    try {
      const supabase = requireSupabaseClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) throw new Error(authError.message)
      const uid = authData.user?.id
      if (!uid) throw new Error('Sign in failed')

      setStatus('Restoring store data...')
      await pullFromSupabase(uid)

      setStatus('Done! Redirecting...')
      router.replace('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed. Please try again.')
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-xl font-bold text-primary">Restore Store Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with your owner account to restore data on this device.
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {missingSupabaseEnvMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
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

          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {status && !error && (
            <div className="rounded-md bg-primary/10 px-4 py-3 text-sm text-primary">
              {status}
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
                Restoring...
              </>
            ) : (
              'Sign In & Restore'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
