'use client'

import { useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'
import type { Category, Product, StockAdjustment } from '@/lib/db'
import { createStockAdjustment } from '@/lib/inventory/stock'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Upload, Download, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawRow {
  name?: string
  barcode?: string
  category?: string
  sellingPrice?: string | number
  costPrice?: string | number
  quantityInStock?: string | number
  reorderLevel?: string | number
  expiryDate?: string
  [key: string]: unknown
}

interface ParsedRow {
  rowIndex: number
  name: string
  barcode?: string
  category?: string
  sellingPrice: number
  costPrice: number
  quantityInStock: number
  reorderLevel: number
  expiryDate?: string
  errors: string[]
}

interface Props {
  categories: Category[]
}

// ─── Column header normalisation ──────────────────────────────────────────────

function normaliseKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_\-/]+/g, '')
}

// Handles both the internal template format AND the existing POS export format:
//   "Product"              → name
//   "Unit Purchase Price"  → costPrice
//   "Selling Price"        → sellingPrice
//   "Current stock"        → quantityInStock
//   "SKU"                  → barcode
const KEY_MAP: Record<string, string> = {
  // name
  name: 'name',
  product: 'name',
  productname: 'name',

  // barcode / SKU
  barcode: 'barcode',
  sku: 'barcode',

  // category
  category: 'category',
  categoryname: 'category',

  // selling price
  sellingprice: 'sellingPrice',
  price: 'sellingPrice',
  saleprice: 'sellingPrice',

  // cost price  — "Unit Purchase Price" normalises to "unitpurchaseprice"
  costprice: 'costPrice',
  cost: 'costPrice',
  unitpurchaseprice: 'costPrice',
  purchaseprice: 'costPrice',

  // quantity — "Current stock" normalises to "currentstock"
  quantityinstock: 'quantityInStock',
  quantity: 'quantityInStock',
  qty: 'quantityInStock',
  stock: 'quantityInStock',
  currentstock: 'quantityInStock',

  // reorder
  reorderlevel: 'reorderLevel',
  reorder: 'reorderLevel',
  minstock: 'reorderLevel',

  // expiry
  expirydate: 'expiryDate',
  expiry: 'expiryDate',
  expdate: 'expiryDate',
  expires: 'expiryDate',
}

function normaliseRow(raw: Record<string, unknown>): RawRow {
  const out: RawRow = {}
  for (const [k, v] of Object.entries(raw)) {
    const mapped = KEY_MAP[normaliseKey(k)]
    if (mapped) out[mapped] = v as string | number
  }
  return out
}

// ─── Value parsers ────────────────────────────────────────────────────────────

/**
 * Parses prices from the existing POS export.
 * Handles: "â¦ 3,230.70", "₦ 1,000", "1000", 1000
 * Strips any leading currency symbols/garbage, removes commas.
 */
function parsePrice(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  // Remove everything that's not a digit, dot, or comma, then strip commas
  const cleaned = String(val).replace(/[^\d.,]/g, '').replace(/,/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/**
 * Parses quantity from the existing POS export.
 * Handles: "3.00 Pieces", "20.00 sachet", "1.00 BOTTLE", "1.00 PACK", 5
 * Strips trailing unit words, rounds to integer.
 */
function parseQty(val: string | number | undefined): number | null {
  if (val === undefined || val === null || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : Math.round(val)
  // Take only the leading numeric part before any space/unit
  const match = String(val).trim().match(/^[\d.,]+/)
  if (!match) return null
  const n = parseFloat(match[0].replace(/,/g, ''))
  return isNaN(n) ? null : Math.round(n)
}

/**
 * Detects garbage rows from the existing POS export.
 * The last row contains "Add to location" / "Remove from location" noise
 * repeated across every column.
 * NOTE: Do NOT check for "ActionsToggle" — that text appears in the Action
 * column of every valid product row and would wipe all products.
 */
function isGarbageRow(raw: Record<string, unknown>): boolean {
  const values = Object.values(raw).map((v) => String(v ?? ''))
  const combined = values.join(' ')
  return (
    combined.includes('Add to location') ||
    combined.includes('Remove from location')
  )
}

function parseDate(val: string | undefined): string | undefined {
  if (!val) return undefined
  const s = String(val).trim()
  if (!s) return undefined
  // Excel serial date
  if (/^\d{4,5}$/.test(s)) {
    const date = XLSX.SSF.parse_date_code(Number(s))
    if (date) {
      const m = String(date.m).padStart(2, '0')
      const d = String(date.d).padStart(2, '0')
      return new Date(`${date.y}-${m}-${d}`).toISOString()
    }
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateRows(rawRows: RawRow[]): ParsedRow[] {
  return rawRows.map((raw, i) => {
    const errors: string[] = []
    const name = String(raw.name ?? '').trim()
    if (!name) errors.push('name is required')

    const sellingPrice = parsePrice(raw.sellingPrice)
    if (sellingPrice === null) errors.push('sellingPrice must be a number')
    else if (sellingPrice < 0) errors.push('sellingPrice must be ≥ 0')

    const costPrice = parsePrice(raw.costPrice) ?? 0
    const quantityInStock = parseQty(raw.quantityInStock) ?? 0
    const reorderLevel = parsePrice(raw.reorderLevel) ?? 10

    if (costPrice < 0) errors.push('costPrice must be ≥ 0')
    if (quantityInStock < 0) errors.push('quantityInStock must be ≥ 0')

    const expiryDate = parseDate(raw.expiryDate as string | undefined)

    return {
      rowIndex: i + 2,
      name,
      barcode: String(raw.barcode ?? '').trim() || undefined,
      category: String(raw.category ?? '').trim() || undefined,
      sellingPrice: sellingPrice ?? 0,
      costPrice,
      quantityInStock,
      reorderLevel,
      expiryDate,
      errors,
    }
  })
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = ['name', 'barcode', 'category', 'sellingPrice', 'costPrice', 'quantityInStock', 'reorderLevel', 'expiryDate']
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    ['Paracetamol 500mg', '1234567890', 'Analgesics', 500, 300, 100, 10, '2026-12-31'],
    ['Amoxicillin 250mg', '', 'Antibiotics', 1200, 800, 50, 5, ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  XLSX.writeFile(wb, 'eleosgate_products_template.xlsx')
}

// ─── File parsing ─────────────────────────────────────────────────────────────

function processRawData(
  data: Record<string, unknown>[],
  onDone: (rows: ParsedRow[]) => void
) {
  const cleaned = data.filter((r) => !isGarbageRow(r))
  const rawRows = cleaned.map(normaliseRow)
  onDone(validateRows(rawRows))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductImport({ categories }: Props) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter((r) => r.errors.length === 0)
  const errorRows = rows.filter((r) => r.errors.length > 0)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          processRawData(result.data as Record<string, unknown>[], setRows)
        },
        error: () => toast.error('Failed to parse CSV'),
      })
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        processRawData(data, setRows)
      }
      reader.onerror = () => toast.error('Failed to read file')
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Unsupported file type. Use .csv, .xlsx, or .xls')
    }

    e.target.value = ''
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setImporting(true)

    try {
      const now = new Date().toISOString()

      // Build category name → id map
      const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

      // Create missing categories
      const seen = new Set<string>()
      const newCatNames: string[] = []
      for (const row of validRows) {
        const n = row.category?.toLowerCase()
        if (n && !catMap.has(n) && !seen.has(n)) {
          seen.add(n)
          newCatNames.push(n)
        }
      }
      for (const catName of newCatNames) {
        const newCat: Category = {
          id: uuidv4(),
          name: catName.charAt(0).toUpperCase() + catName.slice(1),
          createdAt: now,
          updatedAt: now,
          isSynced: false,
        }
        await db.categories.add(newCat)
        catMap.set(catName, newCat.id)
      }

      const products: Product[] = []
      const stockAdjustments: StockAdjustment[] = []

      for (const row of validRows) {
        const productId = uuidv4()

        products.push({
          id: productId,
          name: row.name,
          barcode: row.barcode,
          categoryId: row.category ? catMap.get(row.category.toLowerCase()) : undefined,
          sellingPrice: row.sellingPrice,
          costPrice: row.costPrice,
          quantityInStock: row.quantityInStock,
          reorderLevel: row.reorderLevel,
          expiryDate: row.expiryDate,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          isSynced: false,
        })

        if (row.quantityInStock > 0) {
          stockAdjustments.push(
            createStockAdjustment({
              productId,
              quantityChange: row.quantityInStock,
              reason: 'initial_stock',
              createdAt: now,
            })
          )
        }
      }

      await db.transaction('rw', db.products, db.stockAdjustments, async () => {
        await db.products.bulkAdd(products)
        if (stockAdjustments.length > 0) {
          await db.stockAdjustments.bulkAdd(stockAdjustments)
        }
      })

      toast.success(`${products.length} product${products.length !== 1 ? 's' : ''} imported`)
      handleOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Import failed. Check the console for details.')
    } finally {
      setImporting(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setRows([])
      setFileName('')
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        Import
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Products</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Upload area */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div
                className="flex-1 border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {fileName ? fileName : 'Click to select a file'}
                </p>
                <p className="text-xs text-muted-foreground">CSV, XLSX, or XLS</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <Button
                variant="outline"
                className="gap-2 self-center"
                onClick={downloadTemplate}
                type="button"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            {/* Column reference — shown before any file is loaded */}
            {rows.length === 0 && (
              <div className="rounded-lg bg-muted/50 p-4 text-xs space-y-2">
                <p className="font-semibold text-muted-foreground uppercase tracking-wide">
                  Accepted column names
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <span><code className="font-mono">name</code> or <code className="font-mono">Product</code> — required</span>
                  <span><code className="font-mono">sellingPrice</code> or <code className="font-mono">Selling Price</code> — required</span>
                  <span><code className="font-mono">barcode</code> or <code className="font-mono">SKU</code> — optional</span>
                  <span><code className="font-mono">costPrice</code> or <code className="font-mono">Unit Purchase Price</code> — optional</span>
                  <span><code className="font-mono">category</code> or <code className="font-mono">Category</code> — optional</span>
                  <span><code className="font-mono">quantityInStock</code> or <code className="font-mono">Current stock</code> — optional</span>
                  <span><code className="font-mono">expiryDate</code> — optional (YYYY-MM-DD)</span>
                  <span><code className="font-mono">reorderLevel</code> — optional</span>
                </div>
                <p className="text-muted-foreground pt-1">
                  Your existing POS export is supported directly — just upload it as-is.
                </p>
              </div>
            )}

            {/* Summary badges */}
            {rows.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">{validRows.length} valid</span>
                </div>
                {errorRows.length > 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800">
                      {errorRows.length} with errors — will be skipped
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Preview table */}
            {rows.length > 0 && (
              <div className="rounded-lg border overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">SKU</th>
                      <th className="px-3 py-2 text-left font-medium">Category</th>
                      <th className="px-3 py-2 text-right font-medium">Sell ₦</th>
                      <th className="px-3 py-2 text-right font-medium">Cost ₦</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={row.errors.length > 0 ? 'bg-red-50' : 'bg-white'}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                        <td className="px-3 py-2 font-medium max-w-[200px] truncate">
                          {row.name || <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {row.barcode || <span className="italic">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.category || <span className="text-muted-foreground italic">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.sellingPrice.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.costPrice.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">{row.quantityInStock}</td>
                        <td className="px-3 py-2">
                          {row.errors.length === 0 ? (
                            <span className="text-green-600 font-medium">OK</span>
                          ) : (
                            <span className="text-red-600 text-xs" title={row.errors.join('; ')}>
                              {row.errors.join('; ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t mt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary-dark text-white gap-2"
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {validRows.length > 0 ? `${validRows.length} Products` : 'Products'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
