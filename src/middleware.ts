import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Admin login is intentionally separate from the normal member auth flow.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
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
  if (pathname.startsWith("/profile") || pathname.startsWith("/magaza/odeme")) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/magaza/odeme"],
};
