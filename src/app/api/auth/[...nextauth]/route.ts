import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// Wrap to log cookies being set on every auth response — used to diagnose
// login issues where the session cookie is rejected by the browser.
function withCookieLogging(h: typeof handler) {
  return async (req: Request, ctx: any) => {
    const res = await h(req, ctx);
    // Log every Set-Cookie header on the response (for credentials callback)
    const setCookies = res.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      const names = setCookies.map((c) => c.split("=")[0]).join(", ");
      console.log(`[auth-resp] ${req.method} ${new URL(req.url).pathname} → set-cookie: ${names}`);
    } else {
      console.log(`[auth-resp] ${req.method} ${new URL(req.url).pathname} → no set-cookie`);
    }
    return res;
  };
}

export const GET = withCookieLogging(handler);
export const POST = withCookieLogging(handler);
