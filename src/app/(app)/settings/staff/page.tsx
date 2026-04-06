'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import type { User } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { hashPin, verifyPin } from '@/lib/auth/pin'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, UserPlus, KeyRound, UserX, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ── schemas ────────────────────────────────────────────────────────────────

const addCashierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
  confirmPin: z.string(),
}).refine((d) => d.pin === d.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin'],
})

const resetPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
  confirmPin: z.string(),
}).refine((d) => d.pin === d.confirmPin, {
  message: 'PINs do not match',
  path: ['confirmPin'],
})

type AddCashierData = z.infer<typeof addCashierSchema>
type ResetPinData = z.infer<typeof resetPinSchema>

// ── helpers ────────────────────────────────────────────────────────────────

async function isPinTaken(pin: string, excludeId?: string): Promise<boolean> {
  const users = await db.users.filter((user) => user.isActive).toArray()
  for (const u of users) {
    if (excludeId && u.id === excludeId) continue
    if (await verifyPin(pin, u.pinHash)) return true
  }
  return false
}

// ── page ───────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { isOwner } = useSessionStore()
  const router = useRouter()

  useEffect(() => {
    if (!isOwner()) router.replace('/pos')
  }, [isOwner, router])

  const users = useLiveQuery(() => db.users.orderBy('createdAt').toArray(), [])

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)

  // ── add cashier form ────────────────────────────────────────────────────

  const addForm = useForm<AddCashierData>({ resolver: zodResolver(addCashierSchema) })

  async function handleAddCashier(data: AddCashierData) {
    if (await isPinTaken(data.pin)) {
      addForm.setError('pin', { message: 'This PIN is already in use by another staff member' })
      return
    }
    const pinHash = await hashPin(data.pin)
    await db.users.add({
      id: uuidv4(),
      name: data.name.trim(),
      role: 'cashier',
      pinHash,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: false,
    })
    toast.success(`${data.name} added as cashier`)
    addForm.reset()
    setShowAddDialog(false)
  }

  // ── reset PIN form ──────────────────────────────────────────────────────

  const resetForm = useForm<ResetPinData>({ resolver: zodResolver(resetPinSchema) })

  async function handleResetPin(data: ResetPinData) {
    if (!resetTarget) return
    if (await isPinTaken(data.pin, resetTarget.id)) {
      resetForm.setError('pin', { message: 'This PIN is already in use by another staff member' })
      return
    }
    const pinHash = await hashPin(data.pin)
    await db.users.update(resetTarget.id, {
      pinHash,
      updatedAt: new Date().toISOString(),
      isSynced: false,
    })
    toast.success(`PIN updated for ${resetTarget.name}`)
    resetForm.reset()
    setResetTarget(null)
  }

  // ── toggle active ───────────────────────────────────────────────────────

  async function handleToggle(user: User) {
    await db.users.update(user.id, {
      isActive: !user.isActive,
      updatedAt: new Date().toISOString(),
      isSynced: false,
    })
    toast.success(user.isActive ? `${user.name} deactivated` : `${user.name} reactivated`)
    setToggleTarget(null)
  }

  if (!isOwner()) return null

  const owner = users?.find((u) => u.role === 'owner')
  const cashiers = users?.filter((u) => u.role === 'cashier') ?? []

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage Staff</h1>
            <p className="text-sm text-muted-foreground">
              {cashiers.length} cashier{cashiers.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-primary hover:bg-primary/90 gap-2 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Add Cashier
          </Button>
        </div>
      </div>

      {/* Owner card */}
      {owner && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Owner
            </h2>
          </div>
          <StaffRow
            user={owner}
            onResetPin={setResetTarget}
            onToggle={null}
          />
        </div>
      )}

      {/* Cashier cards */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cashiers
          </h2>
        </div>
        {cashiers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground text-center">
            No cashiers yet. Add one above.
          </p>
        ) : (
          <div className="divide-y">
            {cashiers.map((u) => (
              <StaffRow
                key={u.id}
                user={u}
                onResetPin={setResetTarget}
                onToggle={(user) => setToggleTarget(user)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Cashier dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) addForm.reset() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Cashier</DialogTitle>
            <DialogDescription>
              Create a new cashier account with a unique PIN.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddCashier)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input {...addForm.register('name')} placeholder="e.g. Amaka Obi" autoFocus />
              {addForm.formState.errors.name && (
                <p className="text-xs text-danger">{addForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>PIN (4–6 digits)</Label>
              <Input
                {...addForm.register('pin')}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
              />
              {addForm.formState.errors.pin && (
                <p className="text-xs text-danger">{addForm.formState.errors.pin.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm PIN</Label>
              <Input
                {...addForm.register('confirmPin')}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
              />
              {addForm.formState.errors.confirmPin && (
                <p className="text-xs text-danger">{addForm.formState.errors.confirmPin.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setShowAddDialog(false); addForm.reset() }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={addForm.formState.isSubmitting}
              >
                {addForm.formState.isSubmitting ? 'Adding…' : 'Add Cashier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset PIN dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); resetForm.reset() } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset PIN — {resetTarget?.name}</DialogTitle>
            <DialogDescription>
              Enter a new unique PIN for this staff member.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={resetForm.handleSubmit(handleResetPin)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>New PIN (4–6 digits)</Label>
              <Input
                {...resetForm.register('pin')}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                autoFocus
              />
              {resetForm.formState.errors.pin && (
                <p className="text-xs text-danger">{resetForm.formState.errors.pin.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Confirm PIN</Label>
              <Input
                {...resetForm.register('confirmPin')}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
              />
              {resetForm.formState.errors.confirmPin && (
                <p className="text-xs text-danger">{resetForm.formState.errors.confirmPin.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setResetTarget(null); resetForm.reset() }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={resetForm.formState.isSubmitting}
              >
                {resetForm.formState.isSubmitting ? 'Saving…' : 'Update PIN'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Reactivate confirm */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => { if (!o) setToggleTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'} {toggleTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? 'This cashier will no longer be able to log in.'
                : 'This cashier will be able to log in again with their existing PIN.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleTarget && handleToggle(toggleTarget)}
              className={
                toggleTarget?.isActive
                  ? 'bg-danger hover:bg-danger/90 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }
            >
              {toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── StaffRow sub-component ─────────────────────────────────────────────────

function StaffRow({
  user,
  onResetPin,
  onToggle,
}: {
  user: User
  onResetPin: (u: User) => void
  onToggle: ((u: User) => void) | null
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{user.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              className={
                user.isActive
                  ? 'bg-green-100 text-green-700 hover:bg-green-100 border-0 text-xs'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-100 border-0 text-xs'
              }
            >
              {user.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onResetPin(user)}
          title="Reset PIN"
          className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <KeyRound className="h-4 w-4" />
        </button>
        {onToggle && (
          <button
            onClick={() => onToggle(user)}
            title={user.isActive ? 'Deactivate' : 'Reactivate'}
            className={`rounded-lg p-2 transition-colors ${
              user.isActive
                ? 'text-muted-foreground hover:bg-danger/10 hover:text-danger'
                : 'text-muted-foreground hover:bg-green-100 hover:text-green-700'
            }`}
          >
            {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
