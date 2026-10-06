export interface StoreDeliveryConfig {
  shippingEstimateText: string;
  freeShippingThreshold: number; // Ücretsiz kargo eşiği (TL)
  standardShippingFee: number; // Eşik altı sabit kargo ücreti (TL)
  freeShippingText: string;
  returnPolicyText: string;
  supportGuaranteeText: string;
  lowStockThreshold: number;
}

export const STORE_DELIVERY_CONFIG: StoreDeliveryConfig = {
  shippingEstimateText:
    process.env.NEXT_PUBLIC_STORE_SHIPPING_ESTIMATE || "1-3 iş günü içinde kargoda",
  freeShippingThreshold: Number(
    process.env.NEXT_PUBLIC_STORE_FREE_SHIPPING_THRESHOLD || 350
  ),
  standardShippingFee: Number(
    process.env.NEXT_PUBLIC_STORE_STANDARD_SHIPPING_FEE || 49.9
  ),
  freeShippingText:
    process.env.NEXT_PUBLIC_STORE_FREE_SHIPPING_TEXT ||
    "350 TL ve üzeri siparişlerde kargo bedava",
  returnPolicyText:
    process.env.NEXT_PUBLIC_STORE_RETURN_POLICY ||
    "14 gün içinde koşulsuz kolay iade garantisi",
  supportGuaranteeText:
    process.env.NEXT_PUBLIC_STORE_SUPPORT_TEXT ||
    "256-bit SSL güvenli ödeme & kurumsal fatura",
  lowStockThreshold: Number(
    process.env.NEXT_PUBLIC_STORE_LOW_STOCK_THRESHOLD || 5
  ),
};
