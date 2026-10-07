/**
 * Faz 5: Ölçüm & Analitik Doğrulama Scripti
 * Test oturumları oluşturur, olayları kaydeder, SQL ve API sonuçlarını kanıtlar.
 */

const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runTests() {
  console.log("=== FAZ 5: ÖLÇÜM & ANALİTİK TESTİ BAŞLIYOR ===\n");

  const testSessions = [
    {
      sessionId: "test_sess_desktop_control_01",
      device: "desktop",
      variant: "control",
      utmSource: "google_ads",
      events: [
        { event: "view_item_list", value: 6099, productId: "prod_ilan_01" },
        { event: "view_item", value: 6099, productId: "prod_ilan_01" },
        { event: "add_to_cart", value: 6099, productId: "prod_ilan_01" },
        { event: "view_cart", value: 6099, productId: "prod_ilan_01" },
        { event: "begin_checkout", value: 6099, productId: "prod_ilan_01" },
        { event: "add_shipping_info", value: 6099, productId: "prod_ilan_01" },
        { event: "add_payment_info", value: 6099, productId: "prod_ilan_01" },
        { event: "purchase", value: 6099, productId: "prod_ilan_01" },
      ],
    },
    {
      sessionId: "test_sess_mobile_variant_02",
      device: "mobile",
      variant: "variant_fast",
      utmSource: "instagram",
      events: [
        { event: "view_item_list", value: 3500, productId: "prod_kartvizit_02" },
        { event: "view_item", value: 3500, productId: "prod_kartvizit_02" },
        { event: "add_to_cart", value: 3500, productId: "prod_kartvizit_02" },
        { event: "view_cart", value: 3500, productId: "prod_kartvizit_02" },
        // Sepeti terk eden oturum
      ],
    },
    {
      sessionId: "test_sess_mobile_variant_03",
      device: "mobile",
      variant: "variant_fast",
      utmSource: "google_organic",
      events: [
        { event: "view_item", value: 12500, productId: "prod_tabela_03" },
        { event: "add_to_cart", value: 12500, productId: "prod_tabela_03" },
        { event: "begin_checkout", value: 12500, productId: "prod_tabela_03" },
        { event: "purchase", value: 12500, productId: "prod_tabela_03" },
      ],
    },
    {
      sessionId: "test_sess_tablet_control_04",
      device: "tablet",
      variant: "control",
      utmSource: "linkedin",
      events: [
        { event: "view_item", value: 4200, productId: "prod_brosur_04" },
        { event: "add_to_cart", value: 4200, productId: "prod_brosur_04" },
        { event: "begin_checkout", value: 4200, productId: "prod_brosur_04" },
        // Ödeme adımında terk eden oturum
      ],
    },
  ];

  try {
    // 1. Olayları funnel_events tablosuna ekle
    console.log("1. Test oturumları ve olayları kaydediliyor...");
    for (const s of testSessions) {
      for (const ev of s.events) {
        const id = "fe_test_" + Math.random().toString(36).substring(2, 10);
        await pool.query(
          `INSERT INTO funnel_events (id, session_id, event, product_id, value, device, utm_source, variant, metadata, ts)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            id,
            s.sessionId,
            ev.event,
            ev.productId,
            ev.value,
            s.device,
            s.utmSource,
            s.variant,
            JSON.stringify({ currency: "TRY", test: true }),
          ]
        );
      }
    }
    console.log("-> 4 test oturumu ve olayları başarıyla veritabanına yazıldı!\n");

    // 2. Tablodaki toplam kayıt sayısını sorgula
    const countRes = await pool.query("SELECT COUNT(*) AS total_count FROM funnel_events;");
    console.log("2. FUNNEL_EVENTS TOPLAM KAYIT SAYISI:");
    console.log(`-> Toplam Kayıt: ${countRes.rows[0].total_count} adet olay.\n`);

    // 3. Adım Adım Huni (Funnel) SQL Sorgusu
    console.log("3. ADIM ADIM HUNİ (FUNNEL) SQL ÇIKTISI:");
    const funnelQuery = `
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
        SUM(has_view_item) AS step1_view_item,
        SUM(has_cart) AS step2_add_to_cart,
        SUM(has_checkout) AS step3_begin_checkout,
        SUM(has_purchase) AS step4_purchase,
        ROUND((SUM(has_purchase)::decimal / NULLIF(SUM(has_view_item), 0)) * 100, 2) AS overall_conversion_rate_pct
      FROM session_funnel;
    `;
    const funnelRes = await pool.query(funnelQuery);
    console.table(funnelRes.rows);

    // 4. Sepeti Terk Oranı (Cart Abandonment Rate) SQL Sorgusu
    console.log("4. SEPETİ TERK ORANI SQL ÇIKTISI:");
    const abandonmentQuery = `
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
    `;
    const abandonmentRes = await pool.query(abandonmentQuery);
    console.table(abandonmentRes.rows);

    // 5. A/B Testi Varyant Karşılaştırması SQL Sorgusu
    console.log("5. A/B TESTİ VARYANT KARŞILAŞTIRMASI SQL ÇIKTISI:");
    const abQuery = `
      SELECT 
        variant,
        COUNT(DISTINCT session_id) AS total_sessions,
        COUNT(DISTINCT CASE WHEN event = 'view_item' THEN session_id END) AS views,
        COUNT(DISTINCT CASE WHEN event = 'add_to_cart' THEN session_id END) AS cart_adds,
        COUNT(DISTINCT CASE WHEN event = 'purchase' THEN session_id END) AS purchases,
        ROUND(
          (COUNT(DISTINCT CASE WHEN event = 'purchase' THEN session_id END)::decimal / 
           NULLIF(COUNT(DISTINCT CASE WHEN event = 'view_item' THEN session_id END), 0)) * 100, 
          2
        ) AS conversion_rate_pct
      FROM funnel_events
      WHERE variant IS NOT NULL
      GROUP BY variant
      ORDER BY variant ASC;
    `;
    const abRes = await pool.query(abQuery);
    console.table(abRes.rows);

    // 6. Cihaz Kırılımı SQL Sorgusu
    console.log("6. CİHAZ KIRILIMI SQL ÇIKTISI:");
    const deviceQuery = `
      SELECT 
        device,
        COUNT(DISTINCT session_id) AS sessions,
        COUNT(DISTINCT CASE WHEN event IN ('add_to_cart', 'view_cart') THEN session_id END) AS cart_sessions,
        COUNT(DISTINCT CASE WHEN event = 'purchase' THEN session_id END) AS purchases
      FROM funnel_events
      GROUP BY device
      ORDER BY sessions DESC;
    `;
    const deviceRes = await pool.query(deviceQuery);
    console.table(deviceRes.rows);

  } catch (err) {
    console.error("Test hatası:", err);
  } finally {
    await pool.end();
  }
}

runTests();
