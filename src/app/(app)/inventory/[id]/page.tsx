'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import type { Product } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { ProductForm } from '@/components/inventory/ProductForm'
import { ArrowLeft } from 'lucide-react'

export default function ProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { isOwner } = useSessionStore()
  const isNew = params.id === 'new'

  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray(), [])
  const [product, setProduct] = useState<Product | undefined>(undefined)
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    if (!isOwner()) {
      router.replace('/inventory')
      return
    }
    if (!isNew) {
      db.products.get(params.id).then((p) => {
        setProduct(p)
        setLoading(false)
      })
    }
  }, [isNew, params.id, isOwner, router])

  if (!isOwner()) return null

  if (loading || categories === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!isNew && !product) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Product not found.{' '}
        <Link href="/inventory" className="text-primary underline-offset-2 hover:underline">
          Back to inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/inventory"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Link>
        <h1 className="text-2xl font-bold">{isNew ? 'Add Product' : 'Edit Product'}</h1>
        {!isNew && product && (
          <p className="text-sm text-muted-foreground">{product.name}</p>
        )}
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  )
}
