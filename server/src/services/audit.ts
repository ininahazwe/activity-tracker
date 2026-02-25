import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuditEntry {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VALIDATE" | "REJECT" | "LOGIN" | "LOGOUT";
  entityType: "Activity" | "User" | "Finance" | "Project";
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error("[AUDIT] Failed to log:", err);
  }
}

export function diffChanges(
  original: Record<string, unknown>,
  updated: Record<string, unknown>,
  fields: string[]
): Record<string, { old: unknown; new: unknown }> | undefined {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = original[field];
    const newVal = updated[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
