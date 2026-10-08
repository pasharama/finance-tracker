import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "finance-tracker-jwt-secret-key-super-secure-2026"
);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  const { pathname } = req.nextUrl;

  const isPublicPage = pathname === "/login" || pathname === "/register";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isShortcutApi = pathname.startsWith("/api/shortcuts");
  const isStatic = pathname.startsWith("/_next") || pathname.includes(".");

  if (isStatic || isAuthApi || isShortcutApi) {
    return NextResponse.next();
  }

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Jika belum login dan mengakses halaman privat -> redirect ke /login
  if (!isAuthenticated && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};