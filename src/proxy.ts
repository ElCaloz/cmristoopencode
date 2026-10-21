import { NextResponse, type NextRequest } from "next/server";
import { copyResponseCookies, updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/reimposta-password"];
const AUTH_PAGES = ["/login", "/registrati", "/recupera-password"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectWithCookies(
  request: NextRequest,
  target: string,
  source: NextResponse,
  noStore = false,
) {
  const response = NextResponse.redirect(new URL(target, request.url));
  copyResponseCookies(source, response);
  if (noStore) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, user, configured } = await updateSession(request);

  if (!configured) {
    if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
      return redirectWithCookies(
        request,
        "/login?reason=config",
        response,
        true,
      );
    }
    return response;
  }

  if (!user && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    if (pathname === "/reimposta-password") {
      return redirectWithCookies(
        request,
        "/recupera-password?reason=session",
        response,
        true,
      );
    }

    const login = new URL("/login", request.url);
    login.searchParams.set("reason", "session");
    login.searchParams.set("next", `${pathname}${search}`);

    return redirectWithCookies(request, login.toString(), response, true);
  }

  if (user && matchesPrefix(pathname, AUTH_PAGES)) {
    return redirectWithCookies(request, "/dashboard", response, true);
  }

  if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/onboarding",
    "/reimposta-password",
    "/login",
    "/registrati",
    "/recupera-password",
  ],
};
