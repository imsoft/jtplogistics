import type { Route, RouteFormData } from "@/types/route.types";

const STORAGE_KEY = "jtplogistics-routes";

function createId(): string {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getStoredRoutes(): Route[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setStoredRoutes(routes: Route[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function createRouteFromForm(data: RouteFormData): Route {
  const firstUnit = data.unitTargets?.[0];
  return {
    id: createId(),
    origin: data.origin.trim(),
    destination: data.destination.trim(),
    description: data.description?.trim() || undefined,
    target: firstUnit?.target ?? data.target,
    unitType: firstUnit?.unitType ?? data.unitType,
    status: data.status,
    createdAt: new Date().toISOString(),
  };
}
