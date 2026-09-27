export function getProfitMargin(totalCost: number): number {
  if (totalCost <= 500) return 170;
  if (totalCost <= 1000) return 150;
  if (totalCost <= 3000) return 135;
  if (totalCost <= 10000) return 125;
  return 110;
}

export function applyRounding(price: number, strategy: "99"): number {
  if (strategy === "99") {
    return Math.floor(price / 100) * 100 + 99;
  }
  return price;
}
