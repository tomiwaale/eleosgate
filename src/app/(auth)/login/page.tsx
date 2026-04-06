'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import { verifyPin } from '@/lib/auth/pin'
import { useSessionStore } from '@/store/session.store'
import type { User } from '@/lib/db'
import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_ATTEMPTS = 5

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useSessionStore()

  const [users, setUsers] = useState<User[]>([])
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)
  const [storeName, setStoreName] = useState('Eleosgate POS')

  useEffect(() => {
    async function load() {
      const activeUsers = await db.users.filter((user) => user.isActive).toArray()
      setUsers(activeUsers)
      const setting = await db.settings.get('store_name')
      if (setting) setStoreName(setting.value)
    }
    load()
  }, [])

  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }, [])

  const handleVerify = useCallback(
    async (enteredPin: string) => {
      if (enteredPin.length < 4) return
      setLoading(true)
      setError(null)

      try {
        for (const user of users) {
          const match = await verifyPin(enteredPin, user.pinHash)
          if (match) {
            setUser({ id: user.id, name: user.name, role: user.role })
            if (user.role === 'owner') {
              router.replace('/dashboard')
            } else {
              router.replace('/pos')
            }
            return
          }
        }

        // No match
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setPin('')
        triggerShake()

        if (newAttempts >= MAX_ATTEMPTS) {
          setError(`Too many incorrect attempts. Please wait and try again.`)
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`)
        }
      } finally {
        setLoading(false)
      }
    },
    [users, attempts, router, setUser, triggerShake]
  )

  const handleKey = useCallback(
    (key: string) => {
      if (loading || attempts >= MAX_ATTEMPTS) return

      if (key === 'delete') {
        setPin((p) => p.slice(0, -1))
        setError(null)
        return
      }

      if (key === 'clear') {
        setPin('')
        setError(null)
        return
      }

      if (!/^\d$/.test(key)) return

      const newPin = pin + key
      setPin(newPin)

      // Auto-submit at 8 digits
      if (newPin.length >= 8) {
        handleVerify(newPin)
      }
    },
    [pin, loading, attempts, handleVerify]
  )

  // Physical keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      else if (e.key === 'Backspace') handleKey('delete')
      else if (e.key === 'Enter' && pin.length >= 4) handleVerify(pin)
      else if (e.key === 'Escape') handleKey('clear')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey, handleVerify, pin])

  const keypad = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'delete'],
  ]

  const dots = Math.max(pin.length, 4) // show at least 4 dot slots

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="w-full max-w-xs">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <span className="text-2xl font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-bold text-primary">{storeName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your PIN to continue</p>
        </div>

        {/* PIN dots */}
        <div className={cn('mb-6 flex justify-center gap-3', shake && 'animate-shake')}>
          {Array.from({ length: dots }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all duration-150',
                i < pin.length
                  ? 'border-primary bg-primary scale-110'
                  : 'border-gray-300 bg-transparent'
              )}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keypad.flat().map((key) => {
            if (key === 'delete') {
              return (
                <button
                  key={key}
                  onClick={() => handleKey('delete')}
                  disabled={loading || pin.length === 0}
                  className="flex h-16 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200 text-muted-foreground hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <Delete className="h-5 w-5" />
                </button>
              )
            }

            if (key === 'clear') {
              return (
                <button
                  key={key}
                  onClick={() => handleKey('clear')}
                  disabled={loading || pin.length === 0}
                  className="flex h-16 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200 text-xs font-medium text-muted-foreground hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  CLR
                </button>
              )
            }

            return (
              <button
                key={key}
                onClick={() => handleKey(key)}
                disabled={loading || attempts >= MAX_ATTEMPTS}
                className="flex h-16 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200 text-xl font-semibold text-foreground hover:bg-primary/5 hover:border-primary/30 active:bg-primary/10 disabled:opacity-40 transition-colors"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Submit button — visible once 4+ digits entered */}
        {pin.length >= 4 && pin.length < 8 && (
          <button
            onClick={() => handleVerify(pin)}
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-primary py-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {loading ? 'Checking...' : 'Unlock'}
          </button>
        )}

        {/* Staff count hint */}
        {users.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {users.length} staff member{users.length !== 1 ? 's' : ''} registered
          </p>
        )}

        {/* New device restore link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/restore')}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            New device? Sign in to restore
          </button>
        </div>
      </div>
    </div>
  )
}
