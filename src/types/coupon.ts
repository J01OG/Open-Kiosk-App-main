export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Coupon {
  id: string;
  code: string;
  type: DiscountType;
  value: number; // The percentage or fixed amount
  minPurchase?: number; // Minimum cart value required
  maxDiscount?: number; // Max discount amount (useful for percentage coupons)
  applicableProductIds?: string[]; // If empty, applies to the entire order
  expiryDate?: string;
  isActive: boolean;
  usageCount: number;
  createdAt?: string;
}