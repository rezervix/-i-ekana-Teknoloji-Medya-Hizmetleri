import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function checkCustomerServiceAdminAuth(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) return null;
  const role = (token as any).role as string | undefined;
  if (!["ADMIN", "SUPER_ADMIN", "EDITOR"].includes(role ?? "")) {
    return null;
  }
  return token;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Bu işlem için yönetici yetkisi gereklidir." },
    { status: 401 }
  );
}
