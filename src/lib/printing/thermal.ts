import type { Sale, SaleItem } from '@/lib/db'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'

export async function printReceipt(
  sale: Sale,
  items: SaleItem[],
  storeName: string,
  storeAddress?: string,
  storePhone?: string,
  receiptFooter?: string
) {
  if (!('serial' in navigator)) {
    printFallback(sale, items, storeName, storeAddress, storePhone, receiptFooter)
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const port = await (navigator as any).serial.requestPort()
    await port.open({ baudRate: 9600 })

    const writer = port.writable.getWriter()
    const encoder = new TextEncoder()

    const ESC = '\x1B'
    const GS = '\x1D'

    const lines: string[] = [
      `${ESC}a\x01`,
      `${ESC}!\x30${storeName}\n`,
      `${ESC}!\x00${[storeAddress, storePhone].filter(Boolean).join(' | ')}\n`,
      '--------------------------------\n',
      `${ESC}a\x00`,
      `Receipt: ${sale.receiptNumber}\n`,
      `Date: ${formatDate(sale.createdAt)}\n`,
      '--------------------------------\n',
      ...items.map(
        (item) =>
          `${item.productName}\n  ${item.quantity} x ${formatCurrency(item.unitPrice)}  ${formatCurrency(item.subtotal)}\n`
      ),
      '--------------------------------\n',
      `TOTAL         ${formatCurrency(sale.totalAmount)}\n`,
      sale.paymentMethod === 'cash'
        ? `Cash          ${formatCurrency(sale.amountTendered)}\nChange        ${formatCurrency(sale.changeAmount)}\n`
        : `Payment       Transfer\n`,
      '--------------------------------\n',
      `${ESC}a\x01`,
      `${receiptFooter ?? 'Thank you & get well soon!'}\n`,
      '\n\n\n',
      `${GS}V\x41\x03`,
    ]

    await writer.write(encoder.encode(lines.join('')))
    writer.releaseLock()
    await port.close()
  } catch {
    printFallback(sale, items, storeName, storeAddress, storePhone, receiptFooter)
  }
}

function printFallback(
  sale: Sale,
  items: SaleItem[],
  storeName: string,
  storeAddress?: string,
  storePhone?: string,
  receiptFooter?: string
) {
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) return

  win.document.write(`
    <html>
      <head>
        <title>Receipt ${sale.receiptNumber}</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 300px; margin: 0 auto; padding: 8px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:14px">${storeName}</div>
        <div class="center">${[storeAddress, storePhone].filter(Boolean).join(' | ')}</div>
        <div class="divider"></div>
        <div>Receipt: ${sale.receiptNumber}</div>
        <div>Date: ${formatDate(sale.createdAt)}</div>
        <div class="divider"></div>
        ${items
          .map(
            (item) => `
          <div>${item.productName}</div>
          <div class="row">
            <span>${item.quantity} x ${formatCurrency(item.unitPrice)}</span>
            <span>${formatCurrency(item.subtotal)}</span>
          </div>`
          )
          .join('')}
        <div class="divider"></div>
        <div class="row bold"><span>TOTAL</span><span>${formatCurrency(sale.totalAmount)}</span></div>
        ${
          sale.paymentMethod === 'cash'
            ? `<div class="row"><span>Cash</span><span>${formatCurrency(sale.amountTendered)}</span></div>
               <div class="row"><span>Change</span><span>${formatCurrency(sale.changeAmount)}</span></div>`
            : `<div class="row"><span>Payment</span><span>Transfer</span></div>`
        }
        <div class="divider"></div>
        <div class="center">${receiptFooter ?? 'Thank you & get well soon!'}</div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
    </html>
  `)
  win.document.close()
}
