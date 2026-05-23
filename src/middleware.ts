import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";

// Routes that need rate limiting and their limits [maxRequests, windowMs]
const RATE_LIMIT_RULES: [string, number, number][] = [
  ["/api/auth/sign-in",       10,  60_000],  // 10 attempts/min
  ["/api/auth/sign-up",        5,  60_000],  // 5 registrations/min
  ["/api/auth/forget-password", 5, 60_000],  // 5 resets/min
  ["/api/auth/reset-password",  5, 60_000],  // 5 resets/min
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = RATE_LIMIT_RULES.find(([path]) => pathname.startsWith(path));
  if (rule) {
    const [path, limit, windowMs] = rule;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const key = `${ip}:${path}`;

    if (isRateLimited(key, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta más tarde." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
