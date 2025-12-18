import { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/services/firebase';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { Coupon } from '@/types/coupon';
import { CartItem } from '@/types/product';
import { useToast } from '@/hooks/use-toast';

export const useFirebaseCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const db = getFirebaseDb();
    const unsubscribe = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const couponsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Coupon[];
      setCoupons(couponsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'usageCount'>) => {
    try {
      const db = getFirebaseDb();
      const q = query(collection(db, 'coupons'), where('code', '==', coupon.code));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error('Coupon code already exists');
      }

      await addDoc(collection(db, 'coupons'), {
        ...coupon,
        usageCount: 0,
        createdAt: new Date().toISOString()
      });
      toast({ title: "Success", description: "Coupon created successfully" });
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
  };

  const updateCoupon = async (id: string, updates: Partial<Coupon>) => {
    try {
      const db = getFirebaseDb();
      await updateDoc(doc(db, 'coupons', id), updates);
      toast({ title: "Success", description: "Coupon updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update coupon", variant: "destructive" });
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, 'coupons', id));
      toast({ title: "Success", description: "Coupon deleted" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete coupon", variant: "destructive" });
    }
  };

  const validateCoupon = (code: string, cartItems: CartItem[], cartTotal: number): { isValid: boolean; discount: number; message?: string; couponId?: string } => {
    const normalizedCode = code.trim().toUpperCase();
    const coupon = coupons.find(c => c.code === normalizedCode && c.isActive);

    if (!coupon) {
      return { isValid: false, discount: 0, message: "Invalid or inactive coupon" };
    }

    if (coupon.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(coupon.expiryDate);
      if (expiry < today) {
        return { isValid: false, discount: 0, message: "Coupon expired" };
      }
    }

    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      return { isValid: false, discount: 0, message: `Minimum purchase of ${coupon.minPurchase} required` };
    }

    let discountAmount = 0;

    if (coupon.applicableProductIds && coupon.applicableProductIds.length > 0) {
      const applicableItemsTotal = cartItems
        .filter(item => coupon.applicableProductIds?.includes(item.product.id))
        .reduce((sum, item) => {
            const price = item.product.soldByWeight 
                ? (item.product.price / 1000) * item.quantity 
                : item.product.price * item.quantity;
            return sum + price;
        }, 0);

      if (applicableItemsTotal === 0) {
        return { isValid: false, discount: 0, message: "Coupon not applicable to items in cart" };
      }

      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (applicableItemsTotal * coupon.value) / 100;
      } else {
        discountAmount = Math.min(coupon.value, applicableItemsTotal);
      }
    } else {
      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (cartTotal * coupon.value) / 100;
      } else {
        discountAmount = coupon.value;
      }
    }

    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }

    discountAmount = Math.min(discountAmount, cartTotal);

    return { isValid: true, discount: discountAmount, message: "Coupon applied!", couponId: coupon.id };
  };

  const incrementUsage = async (id: string) => {
      try {
          const db = getFirebaseDb();
          const couponRef = doc(db, 'coupons', id);
          const coupon = coupons.find(c => c.id === id);
          if(coupon) {
             await updateDoc(couponRef, { usageCount: (coupon.usageCount || 0) + 1 });
          }
      } catch (e) {
          console.error("Failed to increment coupon usage", e);
      }
  }

  return {
    coupons,
    loading,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    incrementUsage
  };
};