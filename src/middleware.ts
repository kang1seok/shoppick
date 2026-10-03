import { NextResponse, type NextRequest } from "next/server";

const REALM = "ShopPick Admin";

function unauthorized(message: string): NextResponse {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

// Length-independent comparison to avoid early-exit timing leaks
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Basic Auth guard for admin pages and admin-only API routes.
 * Fails closed: if ADMIN_USER / ADMIN_PASSWORD are not configured, access is denied.
 */
export function middleware(request: NextRequest): NextResponse {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    return new NextResponse("Admin credentials are not configured.", { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorized("Authentication required.");
  }

  let decoded: string;
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return unauthorized("Invalid credentials.");
  }

  const sep = decoded.indexOf(":");
  const user = sep >= 0 ? decoded.slice(0, sep) : "";
  const password = sep >= 0 ? decoded.slice(sep + 1) : "";

  // Evaluate both comparisons to keep timing uniform
  const userOk = safeEqual(user, adminUser);
  const passwordOk = safeEqual(password, adminPassword);
  if (!userOk || !passwordOk) {
    return unauthorized("Invalid credentials.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/articles/:path*"],
};
