import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";

// Routes that need rate limiting and their limits [maxRequests, windowMs].
// Nota: este limitador vive en memoria y en Vercel cada instancia tiene el
// suyo, así que es solo una primera barrera. El conteo real y persistente de
// /api/auth lo hace Better Auth contra la BD (ver `rateLimit` en lib/auth.ts).
//
// Este archivo se llamaba middleware.ts; Next 16 renombró la convención a
// proxy.ts y marcó la anterior como obsoleta.
const RATE_LIMIT_RULES: [string, number, number][] = [
  ["/api/auth/sign-in",         10, 60_000],  // 10 intentos/min
  ["/api/auth/sign-up",          5, 60_000],  // 5 registros/min
  ["/api/auth/forget-password",  5, 60_000],  // 5 recuperaciones/min
  ["/api/auth/reset-password",   5, 60_000],
  ["/api/mural/uploads",        20, 60_000],  // subida de imágenes
  ["/api/admin/uploads",        20, 60_000],
  ["/api/collaborator/uploads", 20, 60_000],
  ["/api/search",               60, 60_000],  // búsqueda global
];

/** Límite genérico para el resto de la API, como red de seguridad. */
const DEFAULT_API_LIMIT = 300;
const DEFAULT_API_WINDOW = 60_000;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Cabeceras de seguridad para todas las respuestas.
 * `frame-ancestors` va en la CSP; X-Frame-Options se conserva para los
 * navegadores viejos que no la interpretan.
 */
function applySecurityHeaders(headers: Headers, nonce: string) {
  // React usa eval() en desarrollo para reconstruir stacks de error; en
  // producción nunca lo hace. Se permite solo en dev para no aflojar la
  // política donde de verdad importa.
  const evalDirective = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' permite que los scripts firmados con el nonce carguen
    // los suyos (los chunks de Next, Vercel Analytics) sin listarlos uno a uno.
    // El 'unsafe-inline' y el https: son el respaldo para navegadores que no
    // entienden 'strict-dynamic'; los que sí lo entienden los ignoran.
    // 'wasm-unsafe-eval' es imprescindible para el cotizador: @react-pdf arma
    // el PDF en el navegador con Yoga, que es WebAssembly. Solo habilita WASM,
    // no el eval() de JavaScript.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline' 'wasm-unsafe-eval'${evalDirective}`,
    // Tailwind y Next inyectan estilos en línea; no hay manera de evitarlo.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "font-src 'self' data:",
    "connect-src 'self' https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  headers.set("Content-Security-Policy", csp);
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const rule = RATE_LIMIT_RULES.find(([path]) => pathname.startsWith(path));
    const limit = rule ? rule[1] : DEFAULT_API_LIMIT;
    const windowMs = rule ? rule[2] : DEFAULT_API_WINDOW;
    const key = `${clientIp(request)}:${rule ? rule[0] : "api"}`;

    if (isRateLimited(key, limit, windowMs)) {
      return new NextResponse(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta más tarde." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Nonce por petición: Next firma con él sus scripts en línea.
  const nonce = crypto.randomUUID().replace(/-/g, "");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(response.headers, nonce);
  return response;
}

export const config = {
  matcher: [
    /*
     * Todo menos los archivos estáticos: no necesitan cabeceras de seguridad y
     * sí pagarían el costo del middleware en cada petición.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|manifest.webmanifest).*)",
  ],
};
