import { useState } from 'react';
import { getFirebaseDb } from '@/services/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { CartItem } from '@/types/product';
import { useToast } from '@/hooks/use-toast';

interface SaleRecord {
  id: string;
  orderNumber: string;
  items: Array<{
    productId: string;
    title: string;
    price: number;
    quantity: number;
    total: number;
    notes?: string;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod: string;
  timestamp: Date;
  date: string;
}

export const useFirebaseReports = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateOrderNumber = async () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  };

  const calculateItemPrice = (item: CartItem) => {
    if (item.product.soldByWeight) {
      return (item.product.price / 1000) * item.quantity;
    }
    return item.product.price * item.quantity;
  };

  const recordSale = async (
    cartItems: CartItem[], 
    totalAmount: number, 
    currency: string, 
    orderNumber?: string,
    discount: number = 0,
    paymentMethod: string = 'Cash'
  ) => {
    try {
      const db = getFirebaseDb();
      const finalOrderNumber = orderNumber || await generateOrderNumber();
      
      const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
      const taxableAmount = Math.max(0, subtotal - discount);
      const tax = totalAmount - taxableAmount; // Approximation based on total passed

      const saleData = {
        orderNumber: finalOrderNumber,
        items: cartItems.map(item => ({
          productId: item.product.id,
          title: item.product.title,
          price: item.product.price,
          quantity: item.quantity,
          total: calculateItemPrice(item),
          notes: item.notes || ""
        })),
        subtotal,
        discount,
        tax,
        total: totalAmount,
        currency,
        paymentMethod,
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0]
      };

      await addDoc(collection(db, 'sales'), saleData);
      console.log('Sale recorded successfully with order number:', finalOrderNumber);
      return finalOrderNumber;
    } catch (error) {
      console.error('Error recording sale:', error);
      toast({
        title: "Error",
        description: "Failed to record sale",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getSalesReports = async (startDate?: string, endDate?: string): Promise<SaleRecord[]> => {
    setLoading(true);
    try {
      const db = getFirebaseDb();
      let q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
      
      if (startDate && endDate) {
        q = query(
          collection(db, 'sales'),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const sales: SaleRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sales.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        } as SaleRecord);
      });

      return sales;
    } catch (error) {
      console.error('Error fetching sales reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales reports",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    recordSale,
    getSalesReports,
    generateOrderNumber,
    loading
  };
};