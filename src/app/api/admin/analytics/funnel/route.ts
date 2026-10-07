import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Adım Adım Huni (Funnel): Ürün Görüntüleme → Sepet → Ödeme Başlatma → Satın Alma
    const funnelStepsRaw: any[] = await (prisma as any).$queryRawUnsafe(`
      WITH session_funnel AS (
        SELECT 
          session_id,
          MAX(CASE WHEN event = 'view_item' THEN 1 ELSE 0 END) AS has_view_item,
          MAX(CASE WHEN event IN ('add_to_cart', 'view_cart') THEN 1 ELSE 0 END) AS has_cart,
          MAX(CASE WHEN event = 'begin_checkout' THEN 1 ELSE 0 END) AS has_checkout,
          MAX(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS has_purchase
        FROM funnel_events
        GROUP BY session_id
      )
      SELECT
        COUNT(*) AS total_sessions,
        SUM(has_view_item) AS view_item_sessions,
        SUM(has_cart) AS cart_sessions,
        SUM(has_checkout) AS checkout_sessions,
        SUM(has_purchase) AS purchase_sessions
      FROM session_funnel;
    `).catch(() => []);

    const rawStats = funnelStepsRaw?.[0] || {
      total_sessions: 0,
      view_item_sessions: 0,
      cart_sessions: 0,
      checkout_sessions: 0,
      purchase_sessions: 0,
    };

    const totalSessions = Number(rawStats.total_sessions || 0);
    const viewItemCount = Number(rawStats.view_item_sessions || 0);
    const cartCount = Number(rawStats.cart_sessions || 0);
    const checkoutCount = Number(rawStats.checkout_sessions || 0);
    const purchaseCount = Number(rawStats.purchase_sessions || 0);

    const funnel = [
      {
        step: "1. Ürün Görüntüleme (view_item)",
        key: "view_item",
        count: viewItemCount,
        conversionRate: viewItemCount > 0 ? 100 : 0,
        dropoffRate: 0,
      },
      {
        step: "2. Sepete Ekleme (add_to_cart)",
        key: "add_to_cart",
        count: cartCount,
        conversionRate: viewItemCount > 0 ? Number(((cartCount / viewItemCount) * 100).toFixed(1)) : 0,
        dropoffRate: viewItemCount > 0 ? Number((((viewItemCount - cartCount) / viewItemCount) * 100).toFixed(1)) : 0,
      },
      {
        step: "3. Ödeme Başlatma (begin_checkout)",
        key: "begin_checkout",
        count: checkoutCount,
        conversionRate: cartCount > 0 ? Number(((checkoutCount / cartCount) * 100).toFixed(1)) : 0,
        dropoffRate: cartCount > 0 ? Number((((cartCount - checkoutCount) / cartCount) * 100).toFixed(1)) : 0,
      },
      {
        step: "4. Satın Alma (purchase)",
        key: "purchase",
        count: purchaseCount,
        conversionRate: checkoutCount > 0 ? Number(((purchaseCount / checkoutCount) * 100).toFixed(1)) : 0,
        dropoffRate: checkoutCount > 0 ? Number((((checkoutCount - purchaseCount) / checkoutCount) * 100).toFixed(1)) : 0,
      },
    ];

    // 2. Sepeti Terk Oranı (Cart Abandonment Rate)
    // SQL: ((Sepete ekleyen tekil oturumlar - Satın alan tekil oturumlar) / Sepete ekleyen tekil oturumlar) * 100
    const cartAbandonmentRaw: any[] = await (prisma as any).$queryRawUnsafe(`
      WITH cart_sessions AS (
        SELECT DISTINCT session_id
        FROM funnel_events
        WHERE event IN ('add_to_cart', 'view_cart')
      ),
      purchased_sessions AS (
        SELECT DISTINCT session_id
        FROM funnel_events
        WHERE event = 'purchase'
      )
      SELECT 
        COUNT(c.session_id) AS total_cart_sessions,
        COUNT(p.session_id) AS purchased_sessions,
        COUNT(c.session_id) - COUNT(p.session_id) AS abandoned_cart_sessions,
        ROUND(
          ((COUNT(c.session_id) - COUNT(p.session_id))::decimal / NULLIF(COUNT(c.session_id), 0)) * 100, 
          2
        ) AS cart_abandonment_rate_percent
      FROM cart_sessions c
      LEFT JOIN purchased_sessions p ON c.session_id = p.session_id;
    `).catch(() => []);

    const abandonmentStats = cartAbandonmentRaw?.[0] || {
      total_cart_sessions: cartCount,
      purchased_sessions: purchaseCount,
      abandoned_cart_sessions: Math.max(0, cartCount - purchaseCount),
      cart_abandonment_rate_percent: cartCount > 0 ? Number((((cartCount - purchaseCount) / cartCount) * 100).toFixed(2)) : 0,
    };

    // 3. Cihaz Kırılımı (Device Breakdown)
    const deviceBreakdownRaw: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT 
        COALESCE(device, 'desktop') AS device,
        COUNT(DISTINCT session_id) AS sessions,
        COUNT(DISTINCT CASE WHEN event IN ('add_to_cart', 'view_cart') THEN session_id END) AS cart_sessions,
        COUNT(DISTINCT CASE WHEN event = 'purchase' THEN session_id END) AS purchase_sessions,
        COALESCE(SUM(value), 0) AS total_value
      FROM funnel_events
      GROUP BY device
      ORDER BY sessions DESC;
    `).catch(() => []);

    const deviceBreakdown = (deviceBreakdownRaw || []).map((d: any) => {
      const sess = Number(d.sessions || 0);
      const purch = Number(d.purchase_sessions || 0);
      return {
        device: d.device,
        sessions: sess,
        cartSessions: Number(d.cart_sessions || 0),
        purchaseSessions: purch,
        totalValue: Number(d.total_value || 0),
        conversionRate: sess > 0 ? Number(((purch / sess) * 100).toFixed(2)) : 0,
      };
    });

    // 4. A/B Varyant Karşılaştırması (CTA Metni A/B Testi)
    const abVariantRaw: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT 
        COALESCE(variant, 'control') AS variant,
        COUNT(DISTINCT session_id) AS sessions,
        COUNT(DISTINCT CASE WHEN event = 'view_item' THEN session_id END) AS view_item_sessions,
        COUNT(DISTINCT CASE WHEN event = 'add_to_cart' THEN session_id END) AS add_to_cart_sessions,
        COUNT(DISTINCT CASE WHEN event = 'purchase' THEN session_id END) AS purchase_sessions,
        COALESCE(SUM(CASE WHEN event = 'purchase' THEN value ELSE 0 END), 0) AS revenue
      FROM funnel_events
      WHERE variant IS NOT NULL AND variant != ''
      GROUP BY variant
      ORDER BY variant ASC;
    `).catch(() => []);

    const abTesting = (abVariantRaw || []).map((v: any) => {
      const views = Number(v.view_item_sessions || 0);
      const carts = Number(v.add_to_cart_sessions || 0);
      const purch = Number(v.purchase_sessions || 0);
      return {
        variant: v.variant,
        label: v.variant === "variant_fast" ? "Varyant B ('Hemen Al, Yarın Kapında')" : "Kontrol A ('Sepete Ekle')",
        sessions: Number(v.sessions || 0),
        views,
        cartAdds: carts,
        purchases: purch,
        revenue: Number(v.revenue || 0),
        cartConversionRate: views > 0 ? Number(((carts / views) * 100).toFixed(2)) : 0,
        purchaseConversionRate: views > 0 ? Number(((purch / views) * 100).toFixed(2)) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalSessions,
        overallConversionRate: viewItemCount > 0 ? Number(((purchaseCount / viewItemCount) * 100).toFixed(2)) : 0,
      },
      funnel,
      cartAbandonment: {
        totalCartSessions: Number(abandonmentStats.total_cart_sessions || 0),
        purchasedSessions: Number(abandonmentStats.purchased_sessions || 0),
        abandonedCartSessions: Number(abandonmentStats.abandoned_cart_sessions || 0),
        ratePercent: Number(abandonmentStats.cart_abandonment_rate_percent || 0),
      },
      deviceBreakdown,
      abTesting,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[api/admin/analytics/funnel] Error:", error);
    return NextResponse.json(
      { error: "Huni verisi alınamadı", message: error.message },
      { status: 500 }
    );
  }
}
