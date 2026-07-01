import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  permissionKeysForRole,
  ROLE_PERMISSION_MATRIX,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
        if (!user || !user.isActive) return null;
        if (!verifyPassword(credentials.password, user.passwordHash)) return null;

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
