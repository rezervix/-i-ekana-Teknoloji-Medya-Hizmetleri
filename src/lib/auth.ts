import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth/next";
import type { AuthOptions, Session } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logger } from "@/lib/logger";

import { normalizePhoneNumber, checkLoginRateLimit } from "@/lib/auth-security";

const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  claimToken: z.string().optional(),
});

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // 1. Kısa ömürlü, tek kullanımlık belirteç ile güvenli otomatik giriş
        const rawClaimToken = typeof parsed.data.claimToken === "string" ? parsed.data.claimToken.trim() : "";
        if (rawClaimToken) {
          if (!/^[A-Za-z0-9_-]{32,128}$/.test(rawClaimToken)) return null;
          try {
            const sub = await prisma.subscription.findFirst({
              where: {
                claimToken: rawClaimToken,
                status: "ACTIVE",
                claimTokenExpiresAt: { gt: new Date() },
              },
              include: { user: true },
            });

            if (!sub || !sub.user || !sub.user.isActive) {
              logger.warn({
                event: "CLAIM_TOKEN_LOGIN_FAILED",
                claimToken: rawClaimToken.slice(0, 8),
              });
              return null;
            }

            // Tek kullanımlık belirteci hemen geçersiz kıl
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { claimToken: null, claimTokenExpiresAt: null },
            });

            logger.info({ event: "CLAIM_TOKEN_LOGIN_SUCCESS", userId: sub.user.id });

            return {
              id: sub.user.id,
              email: sub.user.email,
              name: sub.user.name,
              image: sub.user.image,
              role: sub.user.role,
              isEmailVerified: Boolean(sub.user.isEmailVerified || sub.user.emailVerified),
            } as any;
          } catch (err) {
            logger.error({ event: "CLAIM_TOKEN_ERROR", details: { error: String(err) } });
            return null;
          }
        }

        const input = parsed.data.email || "";
        const password = parsed.data.password || "";
        if (!input || !password) return null;

        const rawInput = input.trim();
        const isEmail = rawInput.includes("@");
        const normalized = isEmail ? rawInput.toLowerCase() : normalizePhoneNumber(rawInput);

        const rateLimitResult = checkLoginRateLimit("client", normalized);
        if (!rateLimitResult.success) {
          logger.warn({ event: "LOGIN_RATE_LIMITED", identifier: normalized });
          throw new Error("Çok fazla başarısız deneme. Lütfen 15 dakika sonra tekrar deneyin.");
        }

        try {
          const user = isEmail
            ? await prisma.user.findUnique({
                where: { email: normalized },
              })
            : await prisma.user.findFirst({
                where: { phone: normalized },
              });

          if (!user || !user.passwordHash || !user.isActive) {
            logger.warn({ event: "LOGIN_FAILED", identifier: normalized, details: { reason: "User not found or inactive" } });
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          if (!passwordMatch) {
            logger.warn({ event: "LOGIN_FAILED", identifier: normalized, userId: user.id, details: { reason: "Invalid credentials" } });
            return null;
          }

          // Update last login timestamp asynchronously
          prisma.user
            .update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(console.error);

          logger.info({ event: "LOGIN_SUCCESS", identifier: normalized, userId: user.id });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isEmailVerified: Boolean(user.isEmailVerified || user.emailVerified),
          } as any;
        } catch (error: any) {
          if (error.message?.includes("Çok fazla")) {
            throw error;
          }
          logger.error({ event: "AUTH_DB_ERROR", identifier: normalized, details: { error: String(error) } });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED !== "true") {
          logger.warn({ event: "GOOGLE_OAUTH_DISABLED_BLOCKED", email: user.email ?? undefined });
          return false;
        }
        if (user.email) {
          try {
            // Auto verify email for Google OAuth sign-in
            const existingUser = await prisma.user.findUnique({
              where: { email: user.email.toLowerCase().trim() },
            });
            if (existingUser && (!existingUser.isEmailVerified || !existingUser.emailVerified)) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                  isEmailVerified: true,
                  emailVerified: new Date(),
                },
              });
            }
            logger.info({ event: "GOOGLE_OAUTH_SUCCESS", email: user.email, userId: user.id });
          } catch (err) {
            console.error("Google sign-in sync error:", err);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.isEmailVerified = (user as any).isEmailVerified ?? false;
      }
      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).isEmailVerified = token.isEmailVerified ?? false;
      }
      return session;
    },
  },
};

export async function auth(): Promise<Session | null> {
  return getServerSession(authOptions);
}

const handler = NextAuth(authOptions);
export { handler };
