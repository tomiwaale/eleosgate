'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import type { Category } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tags, Plus, Trash2 } from 'lucide-react'
// Button import kept for Add button below
import { toast } from 'sonner'

interface Props {
  categories: Category[]
}

export function CategoryManager({ categories }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    await db.categories.add({
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      isSynced: false,
    })
    setNewName('')
    setAdding(false)
    toast.success(`Category "${name}" added`)
  }

  async function handleDelete(cat: Category) {
    // Check if any product uses this category
    const inUse = await db.products.where('categoryId').equals(cat.id).count()
    if (inUse > 0) {
      toast.error(`Cannot delete — ${inUse} product(s) use this category`)
      return
    }
    await db.categories.delete(cat.id)
    toast.success(`Category "${cat.name}" deleted`)
  }

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors">
        <Tags className="h-4 w-4" />
        Categories
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Manage Categories</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 px-4">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
            />
            <Button
              onClick={handleAdd}
              disabled={!newName.trim() || adding}
              className="bg-primary hover:bg-primary-dark text-white shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* List */}
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No categories yet</p>
          ) : (
            <ul className="space-y-1">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium">{cat.name}</span>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
