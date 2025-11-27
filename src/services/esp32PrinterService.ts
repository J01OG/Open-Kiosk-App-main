import { CartItem } from '@/types/product';
import { StoreSettings } from '@/types/store';

interface PrinterResponse {
  success: boolean;
  message: string;
}

export class ESP32PrinterService {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async connectToComPort(comPortName: string): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser');
      }
      const ports = await navigator.serial.getPorts();
      let targetPort = null;
      for (const port of ports) {
        try {
          if (!port.readable) {
            await port.open({ baudRate: 9600 });
          }
          targetPort = port;
          break;
        } catch (error) {
          continue;
        }
      }
      if (!targetPort) {
        targetPort = await navigator.serial.requestPort();
        await targetPort.open({ baudRate: 9600 });
      }
      this.port = targetPort;
      this.writer = this.port.writable?.getWriter() || null;
      this.reader = this.port.readable?.getReader() || null;
      return true;
    } catch (error) {
      console.error(`Failed to connect to COM port ${comPortName}:`, error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  isConnected(): boolean {
    return this.port !== null && this.writer !== null && this.reader !== null;
  }

  generatePrintData(cartItems: CartItem[], settings: StoreSettings, orderNumber: string, discount: number = 0) {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true, hour: '2-digit', minute: '2-digit' 
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
    
    return {
      store: {
        name: settings.name,
        gst: settings.taxId
      },
      receipt: {
        bill_no: orderNumber,
        date: currentDate,
        time: currentTime
      },
      items: cartItems.map(item => ({
        name: item.product.title,
        quantity: item.product.soldByWeight ? `${item.quantity}g` : `${item.quantity}`,
        price: calculateItemPrice(item),
        notes: item.notes
      })),
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      tax: Math.round(taxAmount),
      total: Math.round(finalTotal),
      footer: "Thank you! Visit Again!"
    };
  }

  async sendPrintData(printData: any): Promise<PrinterResponse> {
    try {
      if (!this.writer) {
        throw new Error('ESP32 printer not connected');
      }
      const jsonString = JSON.stringify(printData);
      const data = new TextEncoder().encode(jsonString + '\n');
      await this.writer.write(data);
      return { success: true, message: 'Print sent successfully.' };
    } catch (error) {
      console.error('Error sending print data:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown print error' };
    }
  }

  async printReceipt(cartItems: CartItem[], settings: StoreSettings, orderNumber: string, discount: number = 0): Promise<PrinterResponse> {
    try {
      if (!this.isConnected() && settings.comPort) {
        const connected = await this.connectToComPort(settings.comPort);
        if (!connected) {
          throw new Error(`Failed to connect to COM port ${settings.comPort}`);
        }
      } else if (!this.isConnected()) {
        throw new Error('No COM port configured in settings');
      }
      
      const printData = this.generatePrintData(cartItems, settings, orderNumber, discount);
      return await this.sendPrintData(printData);
    } catch (error) {
      console.error('Print failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }
}

export const esp32Printer = new ESP32PrinterService();