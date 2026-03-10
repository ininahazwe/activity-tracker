import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface AuditEntry {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "VALIDATE" | "REJECT" | "LOGIN" | "LOGOUT";
  entityType: "Activity" | "User" | "Finance" | "Project";
  entityId: string;
  changes?: Prisma.InputJsonValue;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes ? JSON.stringify(entry.changes) as Prisma.InputJsonValue : undefined,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log:", err);
  }
}

export function diffChanges(
    original: Record<string, unknown>,
    updated: Record<string, unknown>,
    fields: string[]
<<<<<<< HEAD
): Record<string, { old: unknown; new: unknown }> | undefined {
=======
): Prisma.InputJsonValue | undefined {
>>>>>>> 7fdf5b5eccaaf1b4d828249c96a635fc181e645e
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of fields) {
    const oldVal = original[field];
    const newVal = updated[field];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[field] = { old: oldVal, new: newVal };
    }
  }

<<<<<<< HEAD
  return Object.keys(changes).length > 0 ? changes : undefined;
=======
  return Object.keys(changes).length > 0 ? (changes as Prisma.InputJsonValue) : undefined;
>>>>>>> 7fdf5b5eccaaf1b4d828249c96a635fc181e645e
}