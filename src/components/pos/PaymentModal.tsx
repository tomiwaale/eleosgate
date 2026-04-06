'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCurrency } from '@/lib/utils/currency'
import { Loader2, Banknote, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  total: number
  open: boolean
  onClose: () => void
  onConfirm: (method: 'cash' | 'transfer', tendered: number) => Promise<void>
}

export function PaymentModal({ total, open, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash')
  const [tendered, setTendered] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const tenderedNum = parseFloat(tendered) || 0
  const change = Math.max(0, tenderedNum - total)
  const cashValid = tenderedNum >= total

  useEffect(() => {
    if (open) {
      setMethod('cash')
      setTendered('')
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  async function handleConfirm() {
    if (method === 'cash' && !cashValid) return
    setLoading(true)
    try {
      await onConfirm(method, method === 'cash' ? tenderedNum : total)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl mx-4">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-bold">Confirm Payment</h2>
          <p className="text-2xl font-bold text-primary mt-0.5">{formatCurrency(total)}</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Payment method */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Payment Method
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMethod('cash')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all',
                  method === 'cash'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <Banknote className="h-4 w-4" />
                Cash
              </button>
              <button
                onClick={() => setMethod('transfer')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all',
                  method === 'transfer'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                )}
              >
                <Smartphone className="h-4 w-4" />
                Transfer
              </button>
            </div>
          </div>

          {/* Cash input */}
          {method === 'cash' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount Tendered (₦)
                </label>
                <input
                  ref={inputRef}
                  type="number"
                  min={0}
                  step={0.01}
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && cashValid) handleConfirm()
                  }}
                  placeholder="0.00"
                  className="mt-1.5 w-full rounded-lg border border-input px-3 py-2.5 text-lg font-bold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1.5">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTendered(amt.toString())}
                    className="rounded-lg border bg-gray-50 py-1.5 text-xs font-medium text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                  >
                    ₦{amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>

              {/* Change */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-medium text-muted-foreground">Change</span>
                <span
                  className={cn(
                    'text-xl font-bold tabular-nums',
                    cashValid ? 'text-green-600' : 'text-muted-foreground/40'
                  )}
                >
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          {method === 'transfer' && (
            <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary font-medium text-center">
              Confirm once transfer of {formatCurrency(total)} is received
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border py-3 text-sm font-semibold text-muted-foreground hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (method === 'cash' && !cashValid)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Sale'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
