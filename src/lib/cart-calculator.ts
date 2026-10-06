import { STORE_DELIVERY_CONFIG } from "@/config/store.config";

export interface CartCalculationItem {
  id?: string;
  price: number;
  quantity: number;
  freeShipping?: boolean;
  extraServices?: Array<{
    price: number;
    [key: string]: any;
  }>;
}

export interface CouponRule {
  code: string;
  type: "percent" | "fixed";
  value: number; // e.g. 10 for 10%, 50 for 50 TL
  minBasket?: number;
  description: string;
}

export const AVAILABLE_COUPONS: Record<string, CouponRule> = {
  HOSGELDIN10: {
    code: "HOSGELDIN10",
    type: "percent",
    value: 10,
    description: "%10 Hoş Geldin İndirimi",
  },
  INDIRIM50: {
    code: "INDIRIM50",
    type: "fixed",
    value: 50,
    minBasket: 200,
    description: "200 TL üzeri 50 TL İndirim",
  },
  BAHAR20: {
    code: "BAHAR20",
    type: "percent",
    value: 20,
    minBasket: 300,
    description: "300 TL üzeri %20 Bahar Kampanyası",
  },
};

export interface CartCalculationParams {
  items: CartCalculationItem[];
  couponCode?: string | null;
  customThreshold?: number;
  customShippingFee?: number;
}

export interface CartCalculationResult {
  subtotal: number;
  freeShippingThreshold: number;
  shippingFee: number;
  isFreeShipping: number | boolean;
  remainingForFreeShipping: number;
  freeShippingProgress: number; // 0 to 100
  discountAmount: number;
  appliedCoupon: CouponRule | null;
  couponError: string | null;
  grandTotal: number;
  totalItemCount: number;
}

export function calculateCartTotals({
  items,
  couponCode,
  customThreshold,
  customShippingFee,
}: CartCalculationParams): CartCalculationResult {
  const threshold =
    customThreshold !== undefined
      ? customThreshold
      : STORE_DELIVERY_CONFIG.freeShippingThreshold;

  const defaultShippingFee =
    customShippingFee !== undefined
      ? customShippingFee
      : STORE_DELIVERY_CONFIG.standardShippingFee;

  // 1. Calculate subtotal & total items
  let subtotal = 0;
  let totalItemCount = 0;
  let hasFreeShippingItem = false;

  for (const item of items) {
    const qty = Math.max(1, item.quantity || 1);
    totalItemCount += qty;

    const servicesTotal =
      item.extraServices?.reduce((sum, s) => sum + (s.price || 0), 0) || 0;

    subtotal += item.price * qty + servicesTotal;

    if (item.freeShipping) {
      hasFreeShippingItem = true;
    }
  }

  // Round subtotal to 2 decimals
  subtotal = Math.round(subtotal * 100) / 100;

  // 2. Shipping calculation
  const isEligibleForFreeShipping =
    subtotal >= threshold || (hasFreeShippingItem && subtotal > 0);

  const shippingFee =
    subtotal === 0 || isEligibleForFreeShipping ? 0 : defaultShippingFee;

  const remainingForFreeShipping =
    subtotal === 0
      ? threshold
      : Math.max(0, Math.round((threshold - subtotal) * 100) / 100);

  const freeShippingProgress =
    threshold > 0
      ? Math.min(100, Math.round((subtotal / threshold) * 100))
      : 100;

  // 3. Coupon calculation
  let discountAmount = 0;
  let appliedCoupon: CouponRule | null = null;
  let couponError: string | null = null;

  if (couponCode && couponCode.trim()) {
    const normalized = couponCode.trim().toUpperCase();
    const coupon = AVAILABLE_COUPONS[normalized];

    if (!coupon) {
      couponError = "Geçersiz veya süresi dolmuş kupon kodu.";
    } else if (coupon.minBasket && subtotal < coupon.minBasket) {
      couponError = `Bu kupon en az ${coupon.minBasket} TL sepet tutarında geçerlidir.`;
    } else {
      appliedCoupon = coupon;
      if (coupon.type === "percent") {
        discountAmount = Math.round(((subtotal * coupon.value) / 100) * 100) / 100;
      } else if (coupon.type === "fixed") {
        discountAmount = Math.min(subtotal, coupon.value);
      }
    }
  }

  // 4. Grand Total calculation
  const grandTotal = Math.max(
    0,
    Math.round((subtotal - discountAmount + shippingFee) * 100) / 100
  );

  return {
    subtotal,
    freeShippingThreshold: threshold,
    shippingFee,
    isFreeShipping: isEligibleForFreeShipping,
    remainingForFreeShipping,
    freeShippingProgress,
    discountAmount,
    appliedCoupon,
    couponError,
    grandTotal,
    totalItemCount,
  };
}
