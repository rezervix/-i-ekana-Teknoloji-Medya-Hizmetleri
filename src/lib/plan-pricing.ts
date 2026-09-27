type TierPrice = { priceMonthly: number; isActive?: boolean };

export function getStartingPrice<T extends TierPrice>(plan: { tiers: T[] }) {
  const activePrices = plan.tiers.filter((tier) => tier.isActive !== false).map((tier) => tier.priceMonthly).filter((price) => Number.isFinite(price) && price > 0);
  return activePrices.length ? Math.min(...activePrices) : null;
}

export function formatTryPrice(priceInKurus: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(priceInKurus / 100);
}

export function formatStartingPrice(plan: { tiers: TierPrice[] }) {
  const price = getStartingPrice(plan);
  return price === null ? "Fiyat bilgisi için iletişime geçin" : formatTryPrice(price);
}

export function getTierFeatures(features: unknown) {
  return Array.isArray(features) ? features.filter((feature): feature is string => typeof feature === "string") : [];
}

export type { TierPrice };
