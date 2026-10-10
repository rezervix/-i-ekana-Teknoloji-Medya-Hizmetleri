import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STORE_ENABLED = process.env.STORE_GEO_RESTRICTION !== "false";
const ALLOWED_COUNTRIES = (process.env.STORE_ALLOWED_COUNTRIES || "TR")
  .split(",")
  .map((c) => c.trim().toUpperCase());
const FAIL_OPEN = process.env.STORE_GEO_FAIL_OPEN !== "false";

const SEARCH_BOT_PATTERNS = [
  "googlebot",
  "adsbot-google",
  "google-inspectiontool",
  "storebot-google",
  "mediapartners-google",
  "apis-google",
  "feedfetcher-google",
  "google-read-aloud",
  "bingbot",
];

export function isSearchBotOrAdsBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SEARCH_BOT_PATTERNS.some((bot) => ua.includes(bot));
}

function resolveCountry(request: NextRequest): string | null {
  // 1. Development/Testing Override (strictly disabled in production)
  if (process.env.NODE_ENV !== "production") {
    const override =
      process.env.STORE_DEV_OVERRIDE_COUNTRY ||
      request.headers.get("x-dev-country-override") ||
      request.nextUrl.searchParams.get("geo_override");
    if (override) return override.toUpperCase();
  }

  // 2. Cloudflare header
  const cfCountry = request.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    return cfCountry.toUpperCase();
  }

  // 3. Nginx GeoIP2 header (sanitized by Nginx)
  const nginxCountry = request.headers.get("x-visitor-country");
  if (nginxCountry && nginxCountry !== "-" && nginxCountry !== "XX") {
    return nginxCountry.toUpperCase();
  }

  // 4. Vercel/Hosting fallback
  const vercelCountry = request.headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return vercelCountry.toUpperCase();
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawIp =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "";

  // 0. DO NOT restrict /admin routes by country
  // Admin login is intentionally separate from the normal member auth flow.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = (token as any).role as string | undefined;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "EDITOR"];
    if (!allowedRoles.includes(userRole ?? "")) {
      return NextResponse.redirect(new URL("/homepage?error=NoAccess", request.url));
    }
    return NextResponse.next();
  }

  // 1. PayTR Callback Webhook and File Upload routes must pass through without header mutation
  if (pathname === "/api/paytr/callback" || pathname.includes("/upload")) {
    return NextResponse.next();
  }

  // 2. Resolve Country for Store routes & Header state
  const country = resolveCountry(request);
  let isAllowedCountry = false;

  if (!STORE_ENABLED) {
    isAllowedCountry = true;
  } else if (!country) {
    // Fail-open for unknown countries
    isAllowedCountry = FAIL_OPEN;
  } else {
    isAllowedCountry = ALLOWED_COUNTRIES.includes(country);
  }

  // Googlebot ve AdsBot-Google (Google Ads robotları) ülke kısıtlamasından kesin olarak muaftır
  const isBot = isSearchBotOrAdsBot(userAgent);
  if (isBot) {
    isAllowedCountry = true;
  }

  // Eğer muaf tutulan bir bot /magaza/restricted sayfasına gelirse mağaza sayfasına yönlendir
  if (isBot && pathname === "/magaza/restricted") {
    return NextResponse.redirect(new URL("/magaza", request.url));
  }

  // 3. Coğrafi Kısıtlama: /magaza (ve alt sayfaları) ile sipariş/ödeme API'leri
  const isStorePageRoute = pathname.startsWith("/magaza") && pathname !== "/magaza/restricted";
  const isStoreApiRoute =
    pathname.startsWith("/api/orders/create") ||
    pathname.startsWith("/api/paytr/get-token");

  if (!isAllowedCountry && (isStorePageRoute || isStoreApiRoute)) {
    // Structured KVKK-compliant log for PM2
    const clientIp = rawIp.split(",")[0].trim();
    const maskedIp = clientIp.includes(".")
      ? clientIp.replace(/\.\d+$/, ".xxx")
      : clientIp.includes(":")
      ? clientIp.split(":").slice(0, 3).join(":") + ":xxxx"
      : clientIp;

    console.log(
      `[GEO_BLOCK] ${new Date().toISOString()} | Country: ${country || "UNKNOWN"} | Path: ${pathname} | IP: ${maskedIp} | Bot: ${isBot}`
    );

    // API isteği ise HTTP 403 JSON döndür
    if (isStoreApiRoute) {
      return new NextResponse(
        JSON.stringify({
          error: "GeoRestricted",
          message:
            "Mağazamız yalnızca Türkiye içi siparişler için geçerlidir. / Store serves orders within Türkiye only.",
          country: country || "UNKNOWN",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store, private",
          },
        }
      );
    }

    // Sayfa isteği ise kısıtlama sayfasına rewrite et (HTTP 200)
    const restrictedUrl = new URL("/magaza/restricted", request.url);
    const response = NextResponse.rewrite(restrictedUrl);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Vary", "User-Agent, X-Visitor-Country, CF-IPCountry");
    response.headers.set("Cache-Control", "no-store, private, must-revalidate");
    response.cookies.set("cicekana_geo_tr", "0", {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });
    return response;
  }

  // 4. Protect /profile and /magaza/odeme routes (Mandatory Login Enforcement)
  if (pathname.startsWith("/profile") || pathname.startsWith("/magaza/odeme")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const loginUrl = new URL("/auth", request.url);
      const fullCallbackUrl = request.nextUrl.pathname + request.nextUrl.search;
      loginUrl.searchParams.set("callbackUrl", fullCallbackUrl);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 5. Pass country info to response & client cookie
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-is-tr-visitor", isAllowedCountry ? "1" : "0");
  requestHeaders.set("x-visitor-country-resolved", country || "UNKNOWN");
  if (isBot) {
    requestHeaders.set("x-is-search-bot", "1");
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set("cicekana_geo_tr", isAllowedCountry ? "1" : "0", {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
  });

  // Ensure UTF-8 on API responses
  if (pathname.startsWith("/api")) {
    response.headers.set("Content-Type", "application/json; charset=utf-8");
  }

  // Cache Vary protection for page routes - User-Agent eklenerek bot ve ziyaretçi yanıtlarının CDN/Proxy'de karışması önlenir
  if (pathname.startsWith("/magaza") || pathname === "/homepage") {
    response.headers.set("Vary", "User-Agent, X-Visitor-Country, CF-IPCountry");
  }

  // Yurt dışından gelen ve kısıtlamadan muaf tutulan bot istekleri için PM2 logu
  if (isBot && country && !ALLOWED_COUNTRIES.includes(country)) {
    console.log(
      `[GEO_BOT_EXEMPT] ${new Date().toISOString()} | Bot: ${userAgent.slice(0, 80)} | Origin Country: ${country} | Path: ${pathname}`
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/magaza/:path*",
    "/api/orders/:path*",
    "/api/paytr/:path*",
    "/api/:path*",
    "/homepage",
    "/",
  ],
};
