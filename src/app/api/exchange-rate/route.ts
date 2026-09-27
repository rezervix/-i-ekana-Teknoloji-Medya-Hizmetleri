import { NextResponse } from "next/server";

interface CacheEntry {
  rate: number;
  timestamp: number;
}

let cachedRate: CacheEntry | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 saat (60 dakika)
const FALLBACK_RATE = 35.0; // Ağ hatası durumunda gerçekçi varsayılan kur

export async function GET() {
  const now = Date.now();

  // 1 saatlik önbellek kontrolü
  if (cachedRate && now - cachedRate.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json({
      success: true,
      rate: cachedRate.rate,
      source: "cache",
      updatedAt: new Date(cachedRate.timestamp).toISOString(),
    });
  }

  try {
    // API key gerektirmeyen açık ve saatlik güncellenen kur servisi (open.er-api.com)
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: {
        "User-Agent": "CicekanaTechMedia/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const usdTry = data?.rates?.TRY;

      if (usdTry && typeof usdTry === "number" && usdTry > 0) {
        cachedRate = {
          rate: Number(usdTry.toFixed(2)),
          timestamp: now,
        };

        return NextResponse.json({
          success: true,
          rate: cachedRate.rate,
          source: "open.er-api.com",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Döviz kuru çekme hatası:", error);
  }

  // Hata durumunda var olan cache veya fallback döndür
  const rateToReturn = cachedRate ? cachedRate.rate : FALLBACK_RATE;
  return NextResponse.json({
    success: true,
    rate: rateToReturn,
    source: cachedRate ? "stale-cache" : "fallback",
    updatedAt: new Date().toISOString(),
  });
}
