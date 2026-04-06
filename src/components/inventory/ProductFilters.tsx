'use client'

import { cn } from '@/lib/utils'

export type InventoryFilter = 'all' | 'low_stock' | 'expiring' | 'expired'

const filters: { value: InventoryFilter; label: string }[] = [
  { value: 'all', label: 'All Products' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
]

interface Props {
  active: InventoryFilter
  onChange: (f: InventoryFilter) => void
  counts: Record<InventoryFilter, number>
}

export function ProductFilters({ active, onChange, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            active === f.value
              ? f.value === 'expired'
                ? 'bg-danger text-white'
                : f.value === 'expiring'
                ? 'bg-accent text-white'
                : f.value === 'low_stock'
                ? 'bg-amber-500 text-white'
                : 'bg-primary text-white'
              : 'bg-white border border-gray-200 text-muted-foreground hover:border-primary/40 hover:text-primary'
          )}
        >
          {f.label}
          {counts[f.value] > 0 && f.value !== 'all' && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
                active === f.value ? 'bg-white/25' : 'bg-gray-100 text-gray-600'
              )}
            >
              {counts[f.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
