// Root layout for /admin — pass-through (no auth, no sidebar).
// Auth + sidebar live in the (dashboard) route group layout so that
// /admin/login is not wrapped by the protected shell.

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
