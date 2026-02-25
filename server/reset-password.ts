// Script pour réinitialiser le mot de passe admin
// À exécuter une seule fois avec: npx ts-node reset_admin_password.ts

import { PrismaClient } from "@prisma/client";
// @ts-ignore
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetAdminPassword() {
    try {
        const newPassword = "admin123"; // Mot de passe simple pour tester
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const admin = await prisma.user.update({
            where: { email: "admin@mfwa.org" },
            data: {
                passwordHash: hashedPassword,
                status: "ACTIVE",
            },
        });

        console.log("✅ Admin password reset successfully!");
        console.log(`Email: ${admin.email}`);
        console.log(`Password: ${newPassword}`);
        console.log(`New hash: ${hashedPassword}`);
    } catch (error) {
        console.error("❌ Error resetting password:", error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword();