import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface AuditEntry {
  userId: string;
  action:
      | "CREATE" | "UPDATE" | "DELETE"
      | "SUBMIT" | "VALIDATE" | "REJECT"
      | "LOGIN" | "LOGOUT"
      | "INVITE" | "DEACTIVATE" | "REACTIVATE";
  entityType: "Activity" | "User" | "Finance" | "Project";
  entityId: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error("[AUDIT] Failed to log:", err);
  }
}

// Les champs texte peuvent être longs : on garde un extrait pour ne pas alourdir le journal
function shorten(value: unknown): unknown {
  return typeof value === "string" && value.length > 300 ? `${value.slice(0, 300)}…` : value;
}

export function diffChanges(
    original: Record<string, unknown>,
    updated: Record<string, unknown>,
    fields: string[]
): Prisma.InputJsonValue | undefined {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = original[field];
    const newVal = updated[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[field] = { old: shorten(oldVal), new: shorten(newVal) };
    }
  }

  return Object.keys(changes).length > 0 ? (changes as Prisma.InputJsonValue) : undefined;
}