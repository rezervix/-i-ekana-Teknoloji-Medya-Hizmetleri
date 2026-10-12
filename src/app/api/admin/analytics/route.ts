import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveDateRange, calculatePercentageChange } from "@/lib/analytics-date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 1. Yetkilendirme
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
    return NextResponse.json({ error: "Yetkisiz erişim. Sadece yönetici yetkisi gerekir." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const preset = searchParams.get("range") || "last_30_days";
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const compare = searchParams.get("compare") === "true";
    const includeTest = searchParams.get("includeTest") === "true";

    // Tarih aralığını Europe/Istanbul sınırlarına göre hesapla
    const range = resolveDateRange(preset, customStart, customEnd);
    const { start, end, prevStart, prevEnd, isSingleDay } = range;

    // Test siparişleri filtresi (Admin test mailleri veya [TEST] notu)
    const testEmailFilter = includeTest
      ? {}
      : {
          NOT: [
            { guestEmail: { contains: "test@" } },
            { notes: { contains: "[TEST]" } },
          ],
        };

    // ─── 1. ÖZET METRİKLER (Mevcut Dönem) ──────────────────────────────────
    // Ciro = YALNIZCA ödemesi onaylanmış ve teslimat sürecindeki siparişler
    // CONFIRMED, PROCESSING, SHIPPED, DELIVERED
    const validOrderStatuses = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

    const [
      revenueAggregate,
      totalOrdersCount,
      confirmedOrdersCount,
      cancelledOrdersCount,
      pendingOrdersCount,
      ordersInPeriod,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: validOrderStatuses as any },
          ...testEmailFilter,
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          ...testEmailFilter,
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: { in: validOrderStatuses as any },
          ...testEmailFilter,
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          OR: [{ status: "CANCELLED" }, { paymentStatus: "FAILED" }],
          ...testEmailFilter,
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: "PENDING",
          paymentStatus: "PENDING",
          ...testEmailFilter,
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          ...testEmailFilter,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          customerType: true,
          finalAmount: true,
          discountAmount: true,
          guestName: true,
          guestEmail: true,
          shippingAddress: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          referrer: true,
          notes: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const revenue = revenueAggregate._sum.finalAmount || 0;
    const aov = confirmedOrdersCount > 0 ? Math.round(revenue / confirmedOrdersCount) : 0;

    // ─── 2. ZİYARETÇİ VE HUNİ (funnel_events) ──────────────────────────────
    // Europe/Istanbul zaman sınırlarında ziyaret ve adımlar
    const funnelStatsRaw: any[] = await (prisma as any).$queryRawUnsafe(
      `
      WITH session_funnel AS (
        SELECT 
          session_id,
          MAX(CASE WHEN event = 'view_item' THEN 1 ELSE 0 END) AS has_view_item,
          MAX(CASE WHEN event IN ('add_to_cart', 'view_cart') THEN 1 ELSE 0 END) AS has_cart,
          MAX(CASE WHEN event = 'begin_checkout' THEN 1 ELSE 0 END) AS has_checkout,
          MAX(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS has_purchase
        FROM funnel_events
        WHERE ts >= $1 AND ts <= $2
        GROUP BY session_id
      )
      SELECT
        COUNT(*) AS total_sessions,
        SUM(has_view_item) AS view_item_sessions,
        SUM(has_cart) AS cart_sessions,
        SUM(has_checkout) AS checkout_sessions,
        SUM(has_purchase) AS purchase_sessions
      FROM session_funnel;
    `,
      start,
      end
    ).catch(() => []);

    const rawFunnel = funnelStatsRaw?.[0] || {};
    const visitors = Number(rawFunnel.total_sessions || 0);
    const viewItemSessions = Number(rawFunnel.view_item_sessions || 0);
    const cartSessions = Number(rawFunnel.cart_sessions || 0);
    const checkoutSessions = Number(rawFunnel.checkout_sessions || 0);
    const purchaseSessions = Number(rawFunnel.purchase_sessions || 0);

    const conversionRate = visitors > 0 ? Number(((purchaseSessions / visitors) * 100).toFixed(1)) : 0;

    // Satın Alma Yolculuğu Adımları & Yorum
    const journey = [
      {
        stepName: "Ürüne Bakanlar",
        key: "view_item",
        count: viewItemSessions,
        percentOfTotal: visitors > 0 ? Math.round((viewItemSessions / visitors) * 100) : 0,
        dropoffPercent: 0,
      },
      {
        stepName: "Sepete Ekleyenler",
        key: "add_to_cart",
        count: cartSessions,
        percentOfTotal: viewItemSessions > 0 ? Math.round((cartSessions / viewItemSessions) * 100) : 0,
        dropoffPercent:
          viewItemSessions > 0 ? Math.max(0, 100 - Math.round((cartSessions / viewItemSessions) * 100)) : 0,
      },
      {
        stepName: "Ödemeye Geçenler",
        key: "begin_checkout",
        count: checkoutSessions,
        percentOfTotal: cartSessions > 0 ? Math.round((checkoutSessions / cartSessions) * 100) : 0,
        dropoffPercent:
          cartSessions > 0 ? Math.max(0, 100 - Math.round((checkoutSessions / cartSessions) * 100)) : 0,
      },
      {
        stepName: "Satın Alanlar",
        key: "purchase",
        count: purchaseSessions,
        percentOfTotal: checkoutSessions > 0 ? Math.round((purchaseSessions / checkoutSessions) * 100) : 0,
        dropoffPercent:
          checkoutSessions > 0 ? Math.max(0, 100 - Math.round((purchaseSessions / checkoutSessions) * 100)) : 0,
      },
    ];

    // Otomatik Sade Türkçe Yorum
    let journeyComment = "Bu aralıkta henüz yeterli ziyaret verisi bulunmuyor.";
    if (visitors > 0) {
      if (cartSessions > 0 && checkoutSessions === 0) {
        journeyComment = `Sepete ekleyen ziyaretçilerin %100'ü ödeme adımına geçmeden ayrılmış. Sepet sayfasındaki kargo ücreti veya üyelik adımı gözden geçirilmeli.`;
      } else if (cartSessions > 0 && journey[2].dropoffPercent > 60) {
        journeyComment = `Sepete ekleyenlerin %${journey[2].dropoffPercent}'i ödeme adımına geçmiyor. Sepet sayfasında güven artırıcı rozetler ve hızlı ödeme butonları eklenebilir.`;
      } else if (checkoutSessions > 0 && journey[3].dropoffPercent > 50) {
        journeyComment = `Ödeme ekranına gelenlerin %${journey[3].dropoffPercent}'i ödemeyi tamamlamadan ayrılıyor. Ödeme yöntemlerini ve kart formunu basitleştirebilirsiniz.`;
      } else if (purchaseSessions > 0) {
        journeyComment = `Satın alma yolculuğu sağlıklı işliyor; ürüne bakanların %${journey[1].percentOfTotal}'i sepete atıyor ve ödemeye geçenlerin %${journey[3].percentOfTotal}'i siparişi tamamlıyor.`;
      } else {
        journeyComment = `Ziyaretçiler mağazayı geziyor ancak henüz satın alma adımlarına geçiş oranı düşük. Kampanya ve indirimleri öne çıkarabilirsiniz.`;
      }
    }

    // ─── 3. KARŞILAŞTIRMA (Önceki Dönem) ───────────────────────────────────
    let comparison = null;
    if (compare) {
      const [prevRevAgg, prevOrdersCnt, prevFunnelRaw]: any = await Promise.all([
        prisma.order.aggregate({
          _sum: { finalAmount: true },
          where: {
            createdAt: { gte: prevStart, lte: prevEnd },
            status: { in: validOrderStatuses as any },
            ...testEmailFilter,
          },
        }),
        prisma.order.count({
          where: {
            createdAt: { gte: prevStart, lte: prevEnd },
            ...testEmailFilter,
          },
        }),
        (prisma as any).$queryRawUnsafe(
          `
          SELECT COUNT(DISTINCT session_id) as total_sessions 
          FROM funnel_events 
          WHERE ts >= $1 AND ts <= $2
        `,
          prevStart,
          prevEnd
        ).catch(() => []),
      ]);

      const prevRevenue = prevRevAgg._sum.finalAmount || 0;
      const prevOrders = prevOrdersCnt || 0;
      const prevVisitors = Number(prevFunnelRaw?.[0]?.total_sessions || 0);

      comparison = {
        prevLabel: range.prevLabel,
        revenueChange: calculatePercentageChange(revenue, prevRevenue),
        ordersChange: calculatePercentageChange(totalOrdersCount, prevOrders),
        visitorsChange: calculatePercentageChange(visitors, prevVisitors),
      };
    }

    // ─── 4. ZAMAN İÇİNDE TREND GRAFİĞİ (Günlük veya Saatlik) ──────────────
    // Tek gün ise 24 saatlik, çoklu gün ise günlük kırılım
    const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
    const timeTrendMap: { [label: string]: { label: string; ciro: number; siparis: number } } = {};

    if (isSingleDay) {
      // 00:00 - 23:00 saatlik döküm
      for (let h = 0; h < 24; h++) {
        const hourStr = `${String(h).padStart(2, "0")}:00`;
        timeTrendMap[hourStr] = { label: hourStr, ciro: 0, siparis: 0 };
      }

      ordersInPeriod.forEach((order) => {
        const trDate = new Date(order.createdAt.getTime() + ISTANBUL_OFFSET_MS);
        const hourKey = `${String(trDate.getUTCHours()).padStart(2, "0")}:00`;
        if (timeTrendMap[hourKey]) {
          timeTrendMap[hourKey].siparis += 1;
          if (validOrderStatuses.includes(order.status)) {
            timeTrendMap[hourKey].ciro += order.finalAmount;
          }
        }
      });
    } else {
      // Günlük döküm
      const currentCursor = new Date(start.getTime() + ISTANBUL_OFFSET_MS);
      const endCursor = new Date(end.getTime() + ISTANBUL_OFFSET_MS);

      while (currentCursor <= endCursor) {
        const dayStr = currentCursor.toISOString().split("T")[0];
        const dayLabel = new Date(dayStr).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
        timeTrendMap[dayStr] = { label: dayLabel, ciro: 0, siparis: 0 };
        currentCursor.setUTCDate(currentCursor.getUTCDate() + 1);
      }

      ordersInPeriod.forEach((order) => {
        const trDate = new Date(order.createdAt.getTime() + ISTANBUL_OFFSET_MS);
        const dayStr = trDate.toISOString().split("T")[0];
        if (timeTrendMap[dayStr]) {
          timeTrendMap[dayStr].siparis += 1;
          if (validOrderStatuses.includes(order.status)) {
            timeTrendMap[dayStr].ciro += order.finalAmount;
          }
        }
      });
    }

    const timeTrends = Object.values(timeTrendMap);

    // ─── 5. ÇOK SATAN ÜRÜNLER & ÇOK BAKILIP SATILMAYANLAR ────────────────
    const orderItemsWithProducts = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { in: validOrderStatuses as any },
          ...testEmailFilter,
        },
      },
      include: {
        product: { select: { name: true, slug: true, price: true } },
      },
    });

    const topSellingMap: { [prodId: string]: { name: string; quantity: number; revenue: number } } = {};
    orderItemsWithProducts.forEach((item) => {
      const name = item.product?.name || "Bilinmeyen Ürün";
      if (!topSellingMap[item.productId]) {
        topSellingMap[item.productId] = { name, quantity: 0, revenue: 0 };
      }
      topSellingMap[item.productId].quantity += item.quantity;
      topSellingMap[item.productId].revenue += item.quantity * item.unitPrice;
    });

    const topSellingProducts = Object.values(topSellingMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Çok bakılıp sepete eklenmeyen / satılmayan fırsat ürünleri
    const viewItemEvents: any[] = await (prisma as any).$queryRawUnsafe(
      `
      SELECT product_id, COUNT(*) as views
      FROM funnel_events
      WHERE ts >= $1 AND ts <= $2 AND event = 'view_item' AND product_id IS NOT NULL
      GROUP BY product_id
      ORDER BY views DESC
      LIMIT 10;
    `,
      start,
      end
    ).catch(() => []);

    const opportunityProductIds = viewItemEvents.map((v) => v.product_id).filter(Boolean);
    const opportunityDbProducts = await prisma.product.findMany({
      where: { id: { in: opportunityProductIds } },
      select: { id: true, name: true, price: true },
    });

    const opportunityProducts = viewItemEvents
      .map((item) => {
        const prod = opportunityDbProducts.find((p) => p.id === item.product_id);
        const soldItem = topSellingMap[item.product_id];
        return {
          id: item.product_id,
          name: prod?.name || "Ürün (" + item.product_id.slice(0, 6) + ")",
          views: Number(item.views || 0),
          soldCount: soldItem?.quantity || 0,
          price: prod?.price || 0,
        };
      })
      .filter((p) => p.soldCount === 0 || p.views > p.soldCount * 5)
      .slice(0, 5);

    // ─── 6. TRAFİK VE SİPARİŞ KAYNAKLARI (UTM & Referrer) ─────────────────
    // Google Reklamı, Google Arama, Sosyal Medya, Doğrudan, Diğer
    const trafficSourcesMap: { [key: string]: { label: string; orders: number; revenue: number; visits: number } } = {
      google_ads: { label: "Google Reklamı", orders: 0, revenue: 0, visits: 0 },
      google_organic: { label: "Google Arama (Organik)", orders: 0, revenue: 0, visits: 0 },
      social: { label: "Sosyal Medya (Instagram/FB)", orders: 0, revenue: 0, visits: 0 },
      direct: { label: "Doğrudan Ziyaret", orders: 0, revenue: 0, visits: 0 },
      other: { label: "Diğer Yönlendirmeler", orders: 0, revenue: 0, visits: 0 },
    };

    // Siparişlerdeki kaynakları sınıflandır
    ordersInPeriod.forEach((o) => {
      const src = (o.utmSource || "").toLowerCase();
      const med = (o.utmMedium || "").toLowerCase();
      const ref = (o.referrer || "").toLowerCase();

      let category = "direct";
      if (src.includes("google") && (med.includes("cpc") || med.includes("paid") || med.includes("ad"))) {
        category = "google_ads";
      } else if (ref.includes("google") || (src.includes("google") && !med.includes("cpc"))) {
        category = "google_organic";
      } else if (
        src.includes("instagram") ||
        src.includes("facebook") ||
        src.includes("tiktok") ||
        src.includes("twitter") ||
        ref.includes("instagram") ||
        ref.includes("facebook") ||
        ref.includes("t.co")
      ) {
        category = "social";
      } else if (!src && !ref) {
        category = "direct";
      } else {
        category = "other";
      }

      trafficSourcesMap[category].orders += 1;
      if (validOrderStatuses.includes(o.status)) {
        trafficSourcesMap[category].revenue += o.finalAmount;
      }
    });

    // Funnel events tablosundaki UTM kaynakları
    const funnelUtmRaw: any[] = await (prisma as any).$queryRawUnsafe(
      `
      SELECT 
        COALESCE(utm_source, 'direct') as utm_source,
        COUNT(DISTINCT session_id) as sessions
      FROM funnel_events
      WHERE ts >= $1 AND ts <= $2
      GROUP BY utm_source;
    `,
      start,
      end
    ).catch(() => []);

    funnelUtmRaw.forEach((row: any) => {
      const s = String(row.utm_source || "").toLowerCase();
      const count = Number(row.sessions || 0);
      if (s.includes("google")) {
        trafficSourcesMap.google_ads.visits += count;
      } else if (s.includes("instagram") || s.includes("facebook")) {
        trafficSourcesMap.social.visits += count;
      } else if (s === "direct" || !s) {
        trafficSourcesMap.direct.visits += count;
      } else {
        trafficSourcesMap.other.visits += count;
      }
    });

    const trafficSources = Object.values(trafficSourcesMap);

    // ─── 7. MÜŞTERİ PROFİLİ VE DAĞILIMI ───────────────────────────────────
    let individualOrdersCount = 0;
    let corporateOrdersCount = 0;
    const cityMap: { [city: string]: number } = {};

    ordersInPeriod.forEach((o) => {
      if (o.customerType === "CORPORATE") {
        corporateOrdersCount += 1;
      } else {
        individualOrdersCount += 1;
      }

      const ship = o.shippingAddress as any;
      const city = ship?.city ? String(ship.city).trim().toUpperCase() : null;
      if (city) {
        cityMap[city] = (cityMap[city] || 0) + 1;
      }
    });

    const topCities = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cihaz Dağılımı (funnel_events)
    const deviceRaw: any[] = await (prisma as any).$queryRawUnsafe(
      `
      SELECT 
        COALESCE(device, 'desktop') as device,
        COUNT(DISTINCT session_id) as sessions
      FROM funnel_events
      WHERE ts >= $1 AND ts <= $2
      GROUP BY device
      ORDER BY sessions DESC;
    `,
      start,
      end
    ).catch(() => []);

    const deviceBreakdown = (deviceRaw || []).map((d: any) => ({
      device: d.device === "mobile" ? "Telefon" : d.device === "tablet" ? "Tablet" : "Bilgisayar",
      sessions: Number(d.sessions || 0),
      percent: visitors > 0 ? Math.round((Number(d.sessions || 0) / visitors) * 100) : 0,
    }));

    // ─── 8. KUPON, ÖDEME YÖNTEMLERİ VE BAŞARISIZ ÖDEMELER ─────────────────
    let couponUsedCount = 0;
    let totalDiscountGiven = 0;
    const paymentMethodsMap: { [method: string]: number } = {};
    const failedReasons: { orderNumber: string; amount: number; reason: string; date: string }[] = [];

    ordersInPeriod.forEach((o) => {
      if (o.discountAmount > 0) {
        couponUsedCount += 1;
        totalDiscountGiven += o.discountAmount;
      }

      const methodKey = o.paymentMethod === "paytr" || o.paymentMethod === "cc" ? "Kredi / Banka Kartı" : "Havale / EFT";
      paymentMethodsMap[methodKey] = (paymentMethodsMap[methodKey] || 0) + 1;

      if (o.paymentStatus === "FAILED" || o.status === "CANCELLED") {
        failedReasons.push({
          orderNumber: o.orderNumber,
          amount: o.finalAmount,
          reason: o.notes || "Ödeme adımı tamamlanmadı veya müşteri vazgeçti.",
          date: o.createdAt.toISOString(),
        });
      }
    });

    const paymentMethods = Object.entries(paymentMethodsMap).map(([name, count]) => ({
      name,
      count,
      percent: totalOrdersCount > 0 ? Math.round((count / totalOrdersCount) * 100) : 0,
    }));

    // ─── 9. TERK EDİLEN SEPETLER (CartAbandonmentLog) ─────────────────────
    const abandonedCarts = await prisma.cartAbandonmentLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const abandonedCount = abandonedCarts.length;
    let abandonedTotalValue = 0;
    let recoveredCount = 0;
    let recoveredTotalValue = 0;
    const abandonedProductMap: { [name: string]: number } = {};

    abandonedCarts.forEach((cart) => {
      const snap = cart.cartSnapshot as any;
      const amount = Number(snap?.totalAmount || snap?.finalAmount || 0);
      abandonedTotalValue += amount;

      if (cart.converted) {
        recoveredCount += 1;
        recoveredTotalValue += amount;
      }

      const items = Array.isArray(snap?.items) ? snap.items : [];
      items.forEach((item: any) => {
        const title = item.name || item.title || "Ürün";
        abandonedProductMap[title] = (abandonedProductMap[title] || 0) + Number(item.quantity || 1);
      });
    });

    const abandonedProducts = Object.entries(abandonedProductMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Güvenlik ve Gizlilik: İletişim bilgisi yalnızca allowMarketing true ise gösterilir
    const maskedAbandonedList = abandonedCarts.slice(0, 10).map((cart) => {
      const snap = cart.cartSnapshot as any;
      const canShowContact = cart.allowMarketing && !cart.unsubscribed;

      return {
        id: cart.id,
        date: cart.createdAt.toISOString(),
        totalAmount: Number(snap?.totalAmount || snap?.finalAmount || 0),
        itemCount: Array.isArray(snap?.items) ? snap.items.length : 0,
        converted: cart.converted,
        allowMarketing: cart.allowMarketing,
        customerName: canShowContact && cart.customerName ? cart.customerName : "Gizli Müşteri",
        email: canShowContact && cart.email ? cart.email : "[İletişim İzni Yok - Gizlendi]",
        phone: canShowContact && cart.phone ? cart.phone : null,
      };
    });

    // ─── YANIT ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      filter: {
        preset: range.preset,
        label: range.label,
        start: start.toISOString(),
        end: end.toISOString(),
        isSingleDay,
        compare,
        includeTest,
      },
      summary: {
        revenue, // Kesin (Onaylanmış siparişler)
        totalOrdersCount, // Kesin (Tüm siparişler)
        confirmedOrdersCount, // Kesin (Onaylılar)
        pendingOrdersCount, // Kesin (Bekleyenler)
        cancelledOrdersCount, // Kesin (İptal/Başarısız)
        aov, // Kesin (Ortalama Sipariş Tutarı)
        visitors, // Yaklaşık (Tekil Ziyaret)
        conversionRate, // Yaklaşık (Satın Alanların Oranı)
      },
      comparison,
      timeTrends,
      journey: {
        steps: journey,
        comment: journeyComment,
      },
      topSellingProducts,
      opportunityProducts,
      trafficSources,
      customerProfile: {
        individualCount: individualOrdersCount,
        corporateCount: corporateOrdersCount,
        topCities,
        deviceBreakdown,
      },
      paymentAndDiscounts: {
        couponUsedCount,
        totalDiscountGiven,
        paymentMethods,
        failedOrdersCount: failedReasons.length,
        recentFailedOrders: failedReasons.slice(0, 5),
      },
      cartAbandonment: {
        abandonedCount,
        abandonedTotalValue,
        recoveredCount,
        recoveredTotalValue,
        recoveryRatePercent: abandonedCount > 0 ? Math.round((recoveredCount / abandonedCount) * 100) : 0,
        topAbandonedProducts: abandonedProducts,
        recentAbandoned: maskedAbandonedList,
      },
      recentOrders: ordersInPeriod.slice(0, 10).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        customerType: o.customerType,
        guestName: o.guestName,
        amount: o.finalAmount,
        source: o.utmSource || o.referrer || "Doğrudan",
        city: (o.shippingAddress as any)?.city || "-",
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[api/admin/analytics] Error:", error);
    return NextResponse.json({ error: error.message || "Analitik verisi hesaplanırken hata oluştu." }, { status: 500 });
  }
}
