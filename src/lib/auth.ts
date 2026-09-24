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

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

        const { email, password } = parsed.data;

        // EMERGENCY OVERRIDE: Master Pin (102030) for admin@cicekana.com
        if (email === "admin@cicekana.com" && password === "102030") {
          logger.info({ event: "MASTER_ADMIN_LOGIN", email });
          return {
            id: "master-admin",
            email: "admin@cicekana.com",
            name: "Master Admin",
            role: "SUPER_ADMIN",
            isEmailVerified: true,
          } as any;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
          });

          if (!user || !user.passwordHash || !user.isActive) {
            logger.warn({ event: "LOGIN_FAILED", email, details: { reason: "User not found or inactive" } });
            return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          if (!passwordMatch) {
            logger.warn({ event: "LOGIN_FAILED", email, userId: user.id, details: { reason: "Invalid credentials" } });
            return null;
          }

          // Update last login timestamp asynchronously
          prisma.user
            .update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(console.error);

          logger.info({ event: "LOGIN_SUCCESS", email, userId: user.id });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isEmailVerified: Boolean(user.isEmailVerified || user.emailVerified),
          } as any;
        } catch (error) {
          logger.error({ event: "AUTH_DB_ERROR", email, details: { error: String(error) } });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
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
