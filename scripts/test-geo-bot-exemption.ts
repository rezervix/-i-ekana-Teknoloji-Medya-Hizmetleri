import { NextRequest } from "next/server";
import { middleware, isSearchBotOrAdsBot } from "../src/middleware";

async function runTests() {
  console.log("🧪 =======================================================");
  console.log("🧪 TEST: GEO-RESTRICTION BOT EXEMPTION VERIFICATION");
  console.log("🧪 =======================================================\n");

  const tests = [
    {
      name: "1. Googlebot (Desktop) from US requesting /magaza",
      url: "http://localhost:3000/magaza",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "cf-ipcountry": "US",
        "x-dev-country-override": "US",
      },
      expectAllowed: true,
    },
    {
      name: "2. AdsBot-Google from US requesting /magaza",
      url: "http://localhost:3000/magaza",
      headers: {
        "user-agent": "AdsBot-Google (+http://www.google.com/adsbot.html)",
        "cf-ipcountry": "US",
        "x-dev-country-override": "US",
      },
      expectAllowed: true,
    },
    {
      name: "3. AdsBot-Google-Mobile from US requesting /magaza/urun/kartvizit",
      url: "http://localhost:3000/magaza/urun/kartvizit",
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)",
        "cf-ipcountry": "US",
        "x-dev-country-override": "US",
      },
      expectAllowed: true,
    },
    {
      name: "4. Google-InspectionTool from US requesting /magaza",
      url: "http://localhost:3000/magaza",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)",
        "cf-ipcountry": "US",
        "x-dev-country-override": "US",
      },
      expectAllowed: true,
    },
    {
      name: "5. Real Visitor from Turkey (TR) requesting /magaza",
      url: "http://localhost:3000/magaza",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "cf-ipcountry": "TR",
        "x-dev-country-override": "TR",
      },
      expectAllowed: true,
    },
    {
      name: "6. Real Visitor from United States (US) requesting /magaza -> MUST BE RESTRICTED",
      url: "http://localhost:3000/magaza",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "cf-ipcountry": "US",
        "x-dev-country-override": "US",
      },
      expectAllowed: false,
    },
    {
      name: "7. Real Visitor from Germany (DE) requesting /magaza/urun/kartvizit -> MUST BE RESTRICTED",
      url: "http://localhost:3000/magaza/urun/kartvizit",
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "cf-ipcountry": "DE",
        "x-dev-country-override": "DE",
      },
      expectAllowed: false,
    },
    {
      name: "8. Real Visitor from US calling /api/orders/create -> MUST BE 403 FORBIDDEN",
      url: "http://localhost:3000/api/orders/create",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "cf-ipcountry": "US",
        "x-dev-country-override": "US",
      },
      expectAllowed: false,
      expectStatus: 403,
    },
  ];

  let passed = 0;

  for (const t of tests) {
    const req = new NextRequest(t.url, { headers: t.headers });
    const res = await middleware(req);

    const isRewritten = res.headers.get("x-middleware-rewrite")?.includes("/magaza/restricted");
    const isStatus403 = res.status === 403;
    const cookieGeoTr = res.cookies.get("cicekana_geo_tr")?.value;

    let isBlocked = isRewritten || isStatus403 || cookieGeoTr === "0";
    let isSuccess = false;

    if (t.expectAllowed) {
      isSuccess = !isBlocked && cookieGeoTr === "1";
    } else {
      isSuccess = isBlocked && (cookieGeoTr === "0" || isStatus403);
    }

    if (isSuccess) {
      console.log(`✅ [PASS] ${t.name}`);
      console.log(`   └─ Cookie cicekana_geo_tr: ${cookieGeoTr}, Blocked: ${isBlocked}, Status: ${res.status}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${t.name}`);
      console.error(`   └─ Expected allowed: ${t.expectAllowed}, Got blocked: ${isBlocked}, Cookie: ${cookieGeoTr}, Status: ${res.status}`);
    }
  }

  console.log("\n-------------------------------------------------------");
  console.log(`Sonuç: ${passed}/${tests.length} test başarılı.`);
  if (passed === tests.length) {
    console.log("🎉 Tüm testler başarıyla geçti!");
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test hatası:", err);
  process.exit(1);
});
