import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;
  const userRole = user?.rol;

  const isLoginRoute = nextUrl.pathname === "/login";
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isUsuarioRoute = nextUrl.pathname.startsWith("/usuario");
  const isRootRoute = nextUrl.pathname === "/";

  // Redirect logged-in users visiting /login or / to their dashboards
  if (isLoginRoute || isRootRoute) {
    if (isLoggedIn) {
      const destination = userRole === "ADMIN" ? "/admin/dashboard" : "/usuario/dashboard";
      return NextResponse.redirect(new URL(destination, nextUrl));
    }
    if (isRootRoute) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    return NextResponse.next();
  }

  // Protect Admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl));
    }
    if (userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/usuario/dashboard", nextUrl));
    }
  }

  // Protect User routes
  if (isUsuarioRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl));
    }
    if (userRole !== "USUARIO") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: [
    // Match all pathnames except Next.js internals, static files, and public assets
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
