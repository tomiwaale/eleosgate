'use client'

import { forwardRef } from 'react'
import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  onEnter: () => void
}

export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar(
  { value, onChange, onEnter },
  ref
) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter()
          }
        }}
        placeholder="Search drug name or scan barcode..."
        autoFocus
        autoComplete="off"
        className="w-full rounded-xl border border-input bg-white py-3 pl-10 pr-4 text-sm shadow-sm outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
      />
    </div>
  )
})
