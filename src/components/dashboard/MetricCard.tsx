'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  variant?: 'default' | 'primary' | 'warning' | 'danger'
  className?: string
}

const variantStyles = {
  default: {
    card: 'bg-white border',
    icon: 'bg-gray-100 text-gray-500',
    value: 'text-foreground',
  },
  primary: {
    card: 'bg-primary border-primary text-white',
    icon: 'bg-white/20 text-white',
    value: 'text-white',
  },
  warning: {
    card: 'bg-white border border-l-4 border-l-amber-400',
    icon: 'bg-amber-100 text-amber-600',
    value: 'text-amber-700',
  },
  danger: {
    card: 'bg-white border border-l-4 border-l-danger',
    icon: 'bg-red-100 text-danger',
    value: 'text-danger',
  },
}

export function MetricCard({ label, value, sub, icon: Icon, variant = 'default', className }: Props) {
  const styles = variantStyles[variant]

  return (
    <div className={cn('rounded-xl p-4 shadow-sm', styles.card, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              variant === 'primary' ? 'text-white/70' : 'text-muted-foreground'
            )}
          >
            {label}
          </p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums truncate', styles.value)}>
            {value}
          </p>
          {sub && (
            <p
              className={cn(
                'mt-0.5 text-xs',
                variant === 'primary' ? 'text-white/60' : 'text-muted-foreground'
              )}
            >
              {sub}
            </p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5 shrink-0', styles.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
