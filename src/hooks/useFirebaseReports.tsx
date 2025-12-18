// src/hooks/useFirebaseReports.tsx

import { useState } from 'react';
import { getFirebaseDb } from '@/services/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, getDoc, doc, updateDoc } from 'firebase/firestore';
import { CartItem } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { CashTransaction } from '@/types/store';

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
  isReturn?: boolean;
  originalOrderId?: string;
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
      const tax = totalAmount - taxableAmount; 

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
      console.log('Sale recorded successfully:', finalOrderNumber);
      return finalOrderNumber;
    } catch (error) {
      console.error('Error recording sale:', error);
      toast({ title: "Error", description: "Failed to record sale", variant: "destructive" });
      throw error;
    }
  };

  const recordCashTransaction = async (type: 'IN' | 'OUT', amount: number, reason: string) => {
    try {
      const db = getFirebaseDb();
      const transaction: CashTransaction = {
        type,
        amount,
        reason,
        timestamp: new Date()
      };
      await addDoc(collection(db, 'cash_logs'), transaction);
      toast({ title: "Success", description: `Cash ${type} recorded successfully` });
      return true;
    } catch (error) {
      console.error('Error recording cash transaction:', error);
      toast({ title: "Error", description: "Failed to record cash transaction", variant: "destructive" });
      return false;
    }
  };

  const getCashTransactions = async (date: string) => {
     try {
       const db = getFirebaseDb();
       // Note: Filtering by date string assumes timestamps are stored compatibly or we filter client side for precision
       // Ideally store a 'dateString' field in cash_logs too.
       // For now, we fetch recent and filter.
       const q = query(collection(db, 'cash_logs'), orderBy('timestamp', 'desc')); 
       const snap = await getDocs(q);
       const logs: CashTransaction[] = [];
       snap.forEach(doc => logs.push({ ...doc.data(), id: doc.id } as CashTransaction));
       return logs.filter(l => l.timestamp.toISOString().split('T')[0] === date);
     } catch (error) {
       console.error(error);
       return [];
     }
  };

  const processReturn = async (originalOrderNumber: string, itemsToReturn: CartItem[], refundAmount: number) => {
    try {
      const db = getFirebaseDb();
      
      // 1. Find original order (optional validation)
      // 2. Create a negative sale record
      const returnOrderNumber = `RET-${originalOrderNumber}`;
      
      const returnData = {
        orderNumber: returnOrderNumber,
        originalOrderId: originalOrderNumber,
        isReturn: true,
        items: itemsToReturn.map(item => ({
          productId: item.product.id,
          title: item.product.title,
          price: item.product.price,
          quantity: item.quantity, // Quantity returned
          total: -(calculateItemPrice(item)), // Negative value
          notes: "Returned"
        })),
        subtotal: -refundAmount,
        discount: 0,
        tax: 0, 
        total: -refundAmount,
        currency: 'INR', // Should match store settings
        paymentMethod: 'Cash', // Usually refunds are cash
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0]
      };

      await addDoc(collection(db, 'sales'), returnData);

      // 3. Restore Stock
      for (const item of itemsToReturn) {
        const productRef = doc(db, 'products', item.product.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          await updateDoc(productRef, {
            stock: currentStock + item.quantity
          });
        }
      }

      toast({ title: "Success", description: "Return processed and stock updated." });
      return true;
    } catch (error) {
      console.error('Error processing return:', error);
      toast({ title: "Error", description: "Failed to process return", variant: "destructive" });
      throw error;
    }
  };

  const getOrderByNumber = async (orderNumber: string) => {
    try {
      const db = getFirebaseDb();
      const q = query(collection(db, 'sales'), where('orderNumber', '==', orderNumber), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() } as SaleRecord;
      }
      return null;
    } catch (error) {
      return null;
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
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    recordSale,
    recordCashTransaction,
    getCashTransactions,
    processReturn,
    getOrderByNumber,
    getSalesReports,
    generateOrderNumber,
    loading
  };
};