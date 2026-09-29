import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {defaultLocale, isLocale, localeCookie, type Locale} from '@/i18n/routing';

export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  const hasLocale = isLocale(segments[0]);
  const cookieLocale = request.cookies.get(localeCookie)?.value;
  const acceptLanguage = request.headers.get('accept-language')?.split(',').map((part) => part.trim().split(';')[0].split('-')[0]).find(isLocale);
  const locale: Locale = hasLocale ? segments[0] as Locale : (isLocale(cookieLocale) ? cookieLocale : acceptLanguage ?? defaultLocale);
  const internalPath = hasLocale ? `/${segments.slice(1).join('/')}` || '/' : pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  requestHeaders.set('x-next-intl-locale', locale);
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Admin login is intentionally separate from the normal member auth flow.
  if (internalPath.startsWith("/admin") && internalPath !== "/admin/login") {
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
  }

  // 2. Protect /profile and /magaza/odeme routes (Mandatory Login Enforcement)
  if (internalPath.startsWith("/profile") || internalPath.startsWith("/magaza/odeme")) {
    if (!token) {
      const loginUrl = new URL("/auth", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Ensure UTF-8 on API responses
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    response.headers.set("Content-Type", "application/json; charset=utf-8");
    return response;
  }

  const response = hasLocale
    ? NextResponse.rewrite(new URL(internalPath === '/' ? '/homepage' : internalPath, request.url), {request: {headers: requestHeaders}})
    : NextResponse.next({request: {headers: requestHeaders}});
  response.cookies.set(localeCookie, locale, {path: '/', maxAge: 31536000, sameSite: 'lax'});
  return response;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
