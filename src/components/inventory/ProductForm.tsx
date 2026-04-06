'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import type { Product, Category } from '@/lib/db'
import { useSessionStore } from '@/store/session.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  sellingPrice: z.number().min(0, 'Selling price must be 0 or more'),
  costPrice: z.number().min(0, 'Cost price must be 0 or more'),
  quantityInStock: z.number().int().min(0, 'Quantity must be 0 or more'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be 0 or more'),
  expiryDate: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

interface Props {
  product?: Product
  categories: Category[]
}

export function ProductForm({ product, categories }: Props) {
  const router = useRouter()
  const { isOwner } = useSessionStore()
  const isEditing = !!product

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      barcode: product?.barcode ?? '',
      categoryId: product?.categoryId ?? '',
      sellingPrice: product?.sellingPrice ?? 0,
      costPrice: product?.costPrice ?? 0,
      quantityInStock: product?.quantityInStock ?? 0,
      reorderLevel: product?.reorderLevel ?? 10,
      expiryDate: product?.expiryDate
        ? new Date(product.expiryDate).toISOString().split('T')[0]
        : '',
    },
  })

  const categoryId = watch('categoryId')

  async function onSubmit(data: ProductFormValues) {
    const now = new Date().toISOString()

    const productData: Omit<Product, 'id' | 'createdAt'> & { id?: string; createdAt?: string } = {
      name: data.name.trim(),
      barcode: data.barcode?.trim() || undefined,
      categoryId: data.categoryId || undefined,
      sellingPrice: data.sellingPrice,
      costPrice: data.costPrice,
      quantityInStock: data.quantityInStock,
      reorderLevel: data.reorderLevel,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined,
      isActive: true,
      updatedAt: now,
      isSynced: false,
    }

    if (isEditing) {
      await db.products.update(product.id, productData)
      toast.success('Product updated')
    } else {
      await db.products.add({
        ...productData,
        id: uuidv4(),
        createdAt: now,
      } as Product)
      toast.success('Product added to inventory')
    }

    router.push('/inventory')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Basic Info */}
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Product Details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Paracetamol 500mg"
              {...register('name')}
              className="mt-1"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              placeholder="Scan or type barcode"
              {...register('barcode')}
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={categoryId ?? ''}
              onValueChange={(val) => setValue('categoryId', !val || val === 'none' ? undefined : val)}
            >
              <SelectTrigger className="mt-1 w-full">
                {!categoryId || categoryId === '' ? (
                  <span className="text-muted-foreground">Select category</span>
                ) : (
                  <span>{categories.find(c => c.id === categoryId)?.name ?? '— No category —'}</span>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No category —</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pricing
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sellingPrice">Selling Price (₦) *</Label>
            <Input
              id="sellingPrice"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              {...register('sellingPrice', { valueAsNumber: true })}
              className="mt-1"
            />
            {errors.sellingPrice && (
              <p className="mt-1 text-xs text-destructive">{errors.sellingPrice.message}</p>
            )}
          </div>

          {isOwner() && (
            <div>
              <Label htmlFor="costPrice">Cost Price (₦)</Label>
              <Input
                id="costPrice"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                {...register('costPrice', { valueAsNumber: true })}
                className="mt-1"
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-destructive">{errors.costPrice.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock */}
      <div className="rounded-lg border bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Stock
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="quantityInStock">Quantity in Stock *</Label>
            <Input
              id="quantityInStock"
              type="number"
              min={0}
              step={1}
              {...register('quantityInStock', { valueAsNumber: true })}
              className="mt-1"
            />
            {errors.quantityInStock && (
              <p className="mt-1 text-xs text-destructive">{errors.quantityInStock.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reorderLevel">Reorder Level</Label>
            <Input
              id="reorderLevel"
              type="number"
              min={0}
              step={1}
              {...register('reorderLevel', { valueAsNumber: true })}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">Alert when stock hits this level</p>
            {errors.reorderLevel && (
              <p className="mt-1 text-xs text-destructive">{errors.reorderLevel.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              {...register('expiryDate')}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary-dark text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            'Save Changes'
          ) : (
            'Add Product'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/inventory')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
