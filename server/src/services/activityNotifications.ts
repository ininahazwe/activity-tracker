// server/src/services/activityNotifications.ts
// Notifications e-mail du circuit de validation.
// Les envois ne bloquent jamais la requête : une erreur d'e-mail est seulement journalisée.
import { PrismaClient } from "@prisma/client";
import emailService from "./gmailService";

const prisma = new PrismaClient();

async function loadActivity(activityId: string) {
  return prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      activityTitle: true,
      projectId: true,
      project: { select: { name: true } },
      createdBy: {
        select: {
          id: true, name: true, email: true, status: true,
          managedBy: { select: { id: true, name: true, email: true, status: true } },
        },
      },
    },
  });
}

/**
 * Activité soumise → managers du projet + manager direct de l'auteur.
 * S'il n'y en a aucun, les administrateurs sont prévenus pour que l'activité ne reste pas sans valideur.
 */
export async function notifyActivitySubmitted(activityId: string): Promise<void> {
  try {
    const activity = await loadActivity(activityId);
    if (!activity) return;

    const recipients = new Map<string, { email: string; name: string }>();

    const projectManagers = await prisma.user.findMany({
      where: {
        role: "MANAGER",
        status: "ACTIVE",
        projects: { some: { projectId: activity.projectId } },
      },
      select: { id: true, name: true, email: true },
    });
    projectManagers.forEach((m) => recipients.set(m.id, m));

    const direct = activity.createdBy.managedBy;
    if (direct && direct.status === "ACTIVE") recipients.set(direct.id, direct);

    if (recipients.size === 0) {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true, name: true, email: true },
      });
      admins.forEach((a) => recipients.set(a.id, a));
    }

    // L'auteur ne se notifie pas lui-même
    recipients.delete(activity.createdBy.id);

    const info = {
      activityTitle: activity.activityTitle,
      projectName: activity.project?.name || "—",
      authorName: activity.createdBy.name,
    };

    await Promise.allSettled(
        [...recipients.values()].map((r) =>
            emailService.sendActivitySubmitted(r, info).catch((err) =>
                console.warn(`⚠️ Submission email not sent to ${r.email}:`, err?.message || err)
            )
        )
    );
  } catch (err: any) {
    console.warn("⚠️ notifyActivitySubmitted failed:", err?.message || err);
  }
}

/**
 * Activité rejetée → l'auteur, avec le motif.
 */
export async function notifyActivityRejected(activityId: string, reviewerId: string, reason: string): Promise<void> {
  try {
    const activity = await loadActivity(activityId);
    if (!activity || activity.createdBy.status !== "ACTIVE") return;
    if (activity.createdBy.id === reviewerId) return;

    const reviewer = await prisma.user.findUnique({ where: { id: reviewerId }, select: { name: true } });

    await emailService.sendActivityRejected(
        { email: activity.createdBy.email, name: activity.createdBy.name },
        {
          activityTitle: activity.activityTitle,
          projectName: activity.project?.name || "—",
          authorName: activity.createdBy.name,
          reviewerName: reviewer?.name || "your manager",
          reason,
        }
    );
  } catch (err: any) {
    console.warn("⚠️ Rejection email not sent:", err?.message || err);
  }
}
