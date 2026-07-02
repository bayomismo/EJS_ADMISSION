import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  permissionKeysForRole,
  ROLE_PERMISSION_MATRIX,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Fail-fast guard: refuse to boot in production without a strong secret.
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (process.env.NODE_ENV === "production") {
  if (!NEXTAUTH_SECRET || NEXTAUTH_SECRET.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET is missing or too short (min 32 chars). Generate one with: openssl rand -base64 48",
    );
  }
  // Reject known-bad placeholder secrets.
  if (NEXTAUTH_SECRET.includes("ejs-platform-secret-key")) {
    throw new Error(
      "NEXTAUTH_SECRET is a known placeholder. Replace with a real random secret.",
    );
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/admin/login" },
  // Standard next-auth cookie names (no __Secure- prefix). The prefix
  // requires Secure=true AND https, which we have, but some browser
  // configurations silently reject __Secure- cookies on credentials
  // login redirects. Use plain names for maximum compatibility.
  // NUCLEAR OPTION: no cookie customization at all. NextAuth will use
  // its built-in defaults which are:
  //   - sessionToken: name "next-auth.session-token" (or
  //     __Secure-next-auth.session-token in production)
  //   - sameSite: "lax"
  //   - httpOnly: true
  //   - secure: true in production
  //   - path: "/"
  // If the previous attempts failed, this MUST work because there's no
  // custom config to break anything.
  cookies: {},
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const log = (msg: string) => console.log(`[auth] ${new Date().toISOString()} ${msg}`);
        if (!credentials?.email || !credentials?.password) {
          log("missing credentials");
          return null;
        }
        const email = credentials.email.toLowerCase();
        const user = await db.user.findUnique({
          where: { email },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
        if (!user) {
          log(`no user for email=${email}`);
          return null;
        }
        if (!user.isActive) {
          log(`user inactive: ${email}`);
          return null;
        }
        const passOk = verifyPassword(credentials.password, user.passwordHash);
        if (!passOk) {
          log(`bad password for ${email}`);
          return null;
        }
        log(`login OK: ${email}`);

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await logAudit({
          userId: user.id,
          action: "LOGIN",
          entity: "user",
          entityId: user.id,
          summary: `تسجيل دخول: ${user.name}`,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roleId: user.roleId,
          roleName: user.role.name,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.roleId = (user as any).roleId;
        token.roleName = (user as any).roleName;
        // Resolve permission keys
        const roleKey = (user as any).roleName;
        const matrix = ROLE_PERMISSION_MATRIX[roleKey];
        const perms = matrix
          ? permissionKeysForRole(matrix)
          : (user as any).permissions ?? [];
        token.permissions = perms;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roleId = token.roleId;
        (session.user as any).roleName = token.roleName;
        (session.user as any).permissions = token.permissions ?? [];
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      try {
        const userId = (token as any)?.id as string | undefined;
        if (userId) {
          await logAudit({
            userId,
            action: "LOGOUT",
            entity: "user",
            entityId: userId,
            summary: `تسجيل خروج`,
          });
        }
      } catch {
        // never break signout on audit failure
      }
    },
  },
};

export type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    roleName: string;
    permissions: string[];
  };
};
