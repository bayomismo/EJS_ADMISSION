/**
 * Edge auth + rate-limit middleware.
 *
 * Matcher covers every admin route (pages + APIs) and the public application
 * POST endpoints. The middleware:
 *   1. Resolves the NextAuth JWT via `getToken` (no DB hit).
 *   2. Redirects to /admin/login?callbackUrl=... for /admin pages (except
 *      /admin/login itself).
 *   3. Returns 401 for /api/admin routes that have no session.
 *   4. Lets `requirePermission` / `requireAdmissionManager` on the per-route
 *      handler enforce the fine-grained RBAC and scope.
 *   5. Adds a coarse per-IP rate limit on the public application POSTs
 *      (defence in depth; the route handler does a more strict one).
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_API = /^\/api\/admin(\/|$)/;
const ADMIN_PAGE = /^\/admin(\/|$)/;
const PUBLIC_APPS = /^\/api\/public\/applications\/(students|teachers)$/;

const ALLOW_ADMIN_PAGE = /^\/admin\/login(\/|$)/;

// Coarse per-IP counters (process-local; in-process Map is sufficient for
// single-instance, and the route handler has a stricter limit).
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_LIMIT = 5;          // per IP
const PUBLIC_WINDOW_MS = 60_000;  // per minute
const CLEANUP_EVERY = 200;
let cleanupCounter = 0;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function ipRateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = ipBuckets.get(ip);
  if (!b || now > b.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export async function middleware(req: NextRequest) {
  // Periodic bucket GC so the Map doesn't grow unbounded.
  if (++cleanupCounter >= CLEANUP_EVERY) {
    cleanupCounter = 0;
    const now = Date.now();
    for (const [k, v] of ipBuckets.entries()) {
      if (now > v.resetAt) ipBuckets.delete(k);
    }
  }

  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  // 1. Public application POSTs — coarse rate limit at the edge.
  if (pathname.match(PUBLIC_APPS) && req.method === "POST") {
    if (!ipRateLimit(ip, PUBLIC_LIMIT, PUBLIC_WINDOW_MS)) {
      return new NextResponse(
        JSON.stringify({ error: "تجاوزت الحد المسموح من المحاولات. يرجى المحاولة لاحقاً." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
      );
    }
  }

  // 2. Admin API routes — must be authenticated; per-route RBAC handles
  //    the fine-grained role/scope checks.
  if (pathname.match(ADMIN_API)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: "غير مصرح — يرجى تسجيل الدخول" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    return NextResponse.next();
  }

  // 3. Admin pages — must be authenticated; redirect to login if not.
  if (pathname.match(ADMIN_PAGE) && !pathname.match(ALLOW_ADMIN_PAGE)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/admin/:path*",
    "/admin/:path*",
    "/api/public/applications/:path*",
  ],
};
