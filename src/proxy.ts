import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session");

  // Not logged in
  if (!session?.value) {
    // API routes → 401 JSON
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Page routes → redirect to login
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths EXCEPT:
    // - /auth (login/register page) and sub-routes
    // - /api/auth (auth API routes like login, register, logout)
    // - /_next/static, /_next/image (Next.js internals)
    // - /favicon.ico
    "/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
