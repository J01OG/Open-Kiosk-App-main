import { CartItem } from '@/types/product';
import { StoreSettings } from '@/types/store';

export class PDFReceiptService {
  generateReceiptPDF(cartItems: CartItem[], settings: StoreSettings, orderNumber: string, discount: number = 0): void {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const calculateItemPrice = (item: CartItem) => {
        if (item.product.soldByWeight) {
          return (item.product.price / 1000) * item.quantity;
        }
        return item.product.price * item.quantity;
    };

    const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = taxableAmount * (settings.taxPercentage / 100);
    const finalTotal = taxableAmount + taxAmount;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    if (!printWindow) {
      throw new Error('Could not open print window. Please allow popups.');
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${orderNumber}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; margin: 20px; max-width: 300px; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .store-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .receipt-info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .items { margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .item-row { display: flex; justify-content: space-between; }
          .item-note { font-size: 10px; font-style: italic; margin-left: 10px; color: #555; }
          .item-name { flex: 1; }
          .item-qty { margin: 0 10px; }
          .item-price { min-width: 60px; text-align: right; }
          .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
          .total-line { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .final-total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">${settings.name}</div>
          ${settings.taxId ? `<div>GST: ${settings.taxId}</div>` : ''}
        </div>
        <div class="receipt-info">
          <div>Bill No: ${orderNumber}</div>
          <div>Date: ${currentDate}</div>
          <div>Time: ${currentTime}</div>
        </div>
        <div class="items">
          ${cartItems.map(item => `
            <div>
              <div class="item-row">
                <span class="item-name">${item.product.title}</span>
                <span class="item-qty">${item.product.soldByWeight ? item.quantity + 'g' : 'x' + item.quantity}</span>
                <span class="item-price">${settings.currency} ${calculateItemPrice(item).toFixed(2)}</span>
              </div>
              ${item.notes ? `<div class="item-note">(${item.notes})</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${settings.currency} ${subtotal.toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
          <div class="total-line">
            <span>Discount:</span>
            <span>-${settings.currency} ${discount.toFixed(2)}</span>
          </div>` : ''}
          <div class="total-line">
            <span>Tax (${settings.taxPercentage}%):</span>
            <span>${settings.currency} ${taxAmount.toFixed(2)}</span>
          </div>
          <div class="total-line final-total">
            <span>Total:</span>
            <span>${settings.currency} ${finalTotal.toFixed(2)}</span>
          </div>
        </div>
        <div class="footer">
          Thank you! Visit Again!
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  }
}

export const pdfReceiptService = new PDFReceiptService();