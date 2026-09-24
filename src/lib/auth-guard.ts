import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  isEmailVerified: boolean;
}

export type AuthGuardResult =
  | { authorized: true; user: AuthenticatedUser }
  | { authorized: false; response: NextResponse };

/**
 * Centralized server-side authorization & verification guard for API routes.
 * Enforces login and compulsory email verification status.
 */
export async function requireAuth(req?: Request): Promise<AuthGuardResult> {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Bu işlemi gerçekleştirmek için giriş yapmalısınız.",
            },
          },
          { status: 401 }
        ),
      };
    }

    // Fetch up-to-date user details from DB
    let isEmailVerified = (session.user as any).isEmailVerified ?? false;
    let userId = (session.user as any).id as string | undefined;

    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, email: true, name: true, role: true, isEmailVerified: true, emailVerified: true },
      });

      if (dbUser) {
        userId = dbUser.id;
        // Consider email verified if isEmailVerified flag is true OR emailVerified date is set
        isEmailVerified = Boolean(dbUser.isEmailVerified || dbUser.emailVerified);
      }
    } catch (dbErr) {
      console.error("[requireAuth DB Check Error]", dbErr);
    }

    if (!userId) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Kullanıcı kimliği doğrulanamadı.",
            },
          },
          { status: 401 }
        ),
      };
    }

    if (!isEmailVerified) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: "EMAIL_VERIFICATION_REQUIRED",
              message: "Sipariş oluşturmak için e-posta adresinizi doğrulamanız gerekmektedir.",
            },
          },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user: {
        id: userId,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as any).role,
        isEmailVerified: true,
      },
    };
  } catch (error) {
    console.error("[requireAuth Error]", error);
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "SERVER_ERROR",
            message: "Kimlik doğrulama sırasında sunucu hatası oluştu.",
          },
        },
        { status: 500 }
      ),
    };
  }
}
