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
import { Tags, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
// Button import kept for Add button below
import { toast } from 'sonner'

interface Props {
  categories: Category[]
}

export function CategoryManager({ categories }: Props) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  function categoryExists(name: string, ignoreId?: string) {
    return categories.some(
      (category) =>
        category.id !== ignoreId && category.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    if (categoryExists(name)) {
      toast.error(`Category "${name}" already exists`)
      return
    }
    setAdding(true)
    await db.categories.add({
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: false,
    })
    setNewName('')
    setAdding(false)
    toast.success(`Category "${name}" added`)
  }

  async function handleRename(cat: Category) {
    const name = editingName.trim()
    if (!name || name === cat.name) {
      setEditingId(null)
      setEditingName('')
      return
    }
    if (categoryExists(name, cat.id)) {
      toast.error(`Category "${name}" already exists`)
      return
    }

    await db.categories.update(cat.id, {
      name,
      updatedAt: new Date().toISOString(),
      isSynced: false,
    })
    setEditingId(null)
    setEditingName('')
    toast.success(`Category renamed to "${name}"`)
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
                  {editingId === cat.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleRename(cat)
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingName('')
                          }
                        }}
                        className="mr-2 h-8"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => void handleRename(cat)}
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(cat.id)
                            setEditingName(cat.name)
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
