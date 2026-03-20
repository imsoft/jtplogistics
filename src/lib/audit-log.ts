/**
 * Generic platform-wide audit logging utility.
 * Fire-and-forget: errors are logged but never thrown.
 */
import { prisma } from "@/lib/db";

export interface AuditChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

interface LogAuditParams {
  resource: string;
  resourceId: string;
  resourceLabel: string;
  action: "created" | "updated" | "deleted";
  userId: string;
  userName: string;
  changes?: AuditChange[];
}

export async function logAudit({
  resource,
  resourceId,
  resourceLabel,
  action,
  userId,
  userName,
  changes,
}: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        resource,
        resourceId,
        resourceLabel,
        action,
        userId,
        userName,
        changes: changes ? JSON.stringify(changes) : null,
      },
    });
  } catch (e) {
    console.error("[audit-log] Error writing log:", e);
  }
}

/**
 * Compares two objects and returns the differences as AuditChange[].
 */
export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels: Record<string, string>,
  formatters?: Record<string, (v: unknown) => string | null>
): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const [field, label] of Object.entries(fieldLabels)) {
    const bv = before[field] ?? null;
    const av = after[field] ?? null;
    if (String(bv) !== String(av)) {
      const fmt = formatters?.[field];
      changes.push({
        field,
        label,
        from: fmt ? fmt(bv) : (bv != null && bv !== "" ? String(bv) : null),
        to: fmt ? fmt(av) : (av != null && av !== "" ? String(av) : null),
      });
    }
  }
  return changes;
}
