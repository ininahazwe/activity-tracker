import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authenticate, authorize } from "../middleware/auth";
import gmailService from "../services/gmailService";

const router = Router();
const prisma = new PrismaClient();

// Le JWT ne contient pas le nom : on le relit pour l'e-mail d'invitation
async function getInviterName(userId: string): Promise<string> {
    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return inviter?.name || 'the Administrator';
}

// ─── GET /api/users ───
// Liste des utilisateurs (ADMIN et MANAGER)

// server/src/routes/users.ts

router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const requester = req.user as any;

        // ADMIN voit TOUT
        // MANAGER ne voit que ses FIELD agents
        const whereClause = requester.role === 'ADMIN'
            ? {}
            : { managedById: requester.userId };

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true,
                managedById: true,
                managedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ─── POST /api/users/invite ───
// Créer une invitation utilisateur avec email Resend
// ADMIN peut inviter n'importe quel rôle, MANAGER peut inviter uniquement FIELD

router.post('/invite', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { email, name, role } = req.body;
        const requester = req.user as any;

        // Validation
        if (!email || !name || !role) {
            return res.status(400).json({ error: 'Email, name, and role are required' });
        }

        // Vérifier le rôle (ADMIN, MANAGER, FIELD)
        if (!['ADMIN', 'MANAGER', 'FIELD'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // ─── RESTRICTION: MANAGER ne peut inviter que FIELD ───
        if (requester.role === 'MANAGER' && role !== 'FIELD') {
            return res.status(403).json({
                error: 'Managers can only invite Field Agents'
            });
        }

        // Vérifier si l'email existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Générer un token d'invitation (valide 7 jours)
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const invitationExpires = new Date();
        invitationExpires.setDate(invitationExpires.getDate() + 7);

        const managedById = (requester.role === 'MANAGER' && role === 'FIELD')
            ? requester.userId
            : null;

        // Créer l'utilisateur avec statut INVITED
        const user = await prisma.user.create({
            data: {
                email,
                name,
                role,
                status: 'INVITED',
                passwordHash: '',
                invitationToken,
                invitationExpires,
                managedById,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                managedById: true,
            },
        });

        // ✨ Envoyer l'email d'invitation avec Resend
        try {
            await gmailService.sendInvitation({
                recipientEmail: email,
                recipientName: name,
                invitationToken,
                role: role as 'ADMIN' | 'MANAGER' | 'FIELD',
                invitedBy: await getInviterName(requester.userId)
            });
            console.log(`✅ Email d'invitation envoyé à ${email}`);
        } catch (emailError) {
            console.warn(`⚠️ Email non envoyé à ${email}:`, emailError);
            // Ne pas bloquer la création d'utilisateur si l'email échoue
        }

        res.status(201).json({
            message: 'User invited successfully',
            user,
            invitationLink: `/accept-invitation?token=${invitationToken}`,
            emailSent: true,
        });
    } catch (error) {
        console.error('Error inviting user:', error);
        res.status(500).json({ error: 'Failed to invite user' });
    }
});

// ─── POST /api/users/accept-invitation ───
// Accepter une invitation et activer le compte

router.post('/accept-invitation', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Trouver l'utilisateur avec ce token valide
        const user = await prisma.user.findFirst({
            where: {
                invitationToken: token,
                invitationExpires: {
                    gte: new Date(), // Token pas encore expiré
                },
            },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired invitation token' });
        }

        // Hash le mot de passe et activer le compte
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: hashedPassword,
                status: 'ACTIVE',
                invitationToken: null,
                invitationExpires: null,
            },
        });

        res.json({ message: 'Account activated successfully' });
    } catch (error) {
        console.error('Error accepting invitation:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

// ─── PUT /api/users/:id ───
// Mettre à jour un utilisateur
// ADMIN peut éditer n'importe qui, MANAGER peut éditer uniquement les FIELD agents

router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, status, managedById } = req.body;
        const requester = req.user as any;

        // ✨ ADMIN peut réassigner, MANAGER ne peut pas
        if (requester.role === 'MANAGER' && managedById !== undefined) {
            return res.status(403).json({
                error: 'Only admins can reassign managers'
            });
        }

        // Récupérer l'utilisateur à éditer
        const userToUpdate = await prisma.user.findUnique({ where: { id } });
        if (!userToUpdate) {
            return res.status(404).json({ error: 'User not found' });
        }

        // ─── RESTRICTION: MANAGER ne peut éditer que FIELD ───
        if (requester.role === 'MANAGER' && (userToUpdate.role !== 'FIELD' || userToUpdate.managedById !== requester.userId)) {
            return res.status(403).json({
                error: 'Managers can only edit their own Field Agents'
            });
        }

        // Validation du rôle
        if (role && !['ADMIN', 'MANAGER', 'FIELD'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // ─── RESTRICTION: MANAGER ne peut pas changer le rôle d'un FIELD en autre chose ───
        if (requester.role === 'MANAGER' && role && role !== 'FIELD') {
            return res.status(403).json({
                error: 'Managers can only keep Field Agents as Field Agents'
            });
        }

        // Validation du statut
        if (status && !['ACTIVE', 'INVITED', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Ne pas permettre la désactivation ni la rétrogradation du dernier admin
        if (status === 'INACTIVE' || (role && role !== 'ADMIN')) {
            if (userToUpdate.role === 'ADMIN') {
                const activeAdmins = await prisma.user.count({
                    where: {
                        role: 'ADMIN',
                        status: 'ACTIVE',
                    },
                });
                if (activeAdmins <= 1) {
                    return res.status(400).json({ error: 'Cannot deactivate or demote the last admin user' });
                }
            }
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (requester.role === 'ADMIN' && managedById !== undefined) {
            updateData.managedById = managedById || null;
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
            },
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// ─── DELETE /api/users/:id ───
// Supprimer un utilisateur
// ADMIN peut supprimer n'importe qui, MANAGER peut supprimer uniquement les FIELD agents

router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const requester = req.user as any;

        // Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // ─── RESTRICTION: MANAGER ne peut supprimer que FIELD ───
        if (requester.role === 'MANAGER' && (user.role !== 'FIELD' || user.managedById !== requester.userId)) {
            return res.status(403).json({
                error: 'Managers can only delete their own Field Agents'
            });
        }

        // Vérifier que ce n'est pas le dernier admin
        if (user.role === 'ADMIN') {
            const adminCount = await prisma.user.count({
                where: { role: 'ADMIN' },
            });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }

        await prisma.user.delete({
            where: { id },
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ─── POST /api/users/:id/resend-invitation ───
// Renvoyer une invitation (ADMIN et MANAGER)
// MANAGER peut renvoyer invitation uniquement aux FIELD agents

router.post('/:id/resend-invitation', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
    try {
        const { id } = req.params;
        const requester = req.user as any;

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // ─── RESTRICTION: MANAGER ne peut renvoyer invitation que pour FIELD ───
        if (requester.role === 'MANAGER' && (user.role !== 'FIELD' || user.managedById !== requester.userId)) {
            return res.status(403).json({
                error: 'Managers can only resend invitations to their own Field Agents'
            });
        }

        // Vérifier que l'utilisateur n'est pas déjà actif
        if (user.status === 'ACTIVE') {
            return res.status(400).json({ error: 'User is already active' });
        }

        // Générer un nouveau token
        const invitationToken = crypto.randomBytes(32).toString('hex');
        const invitationExpires = new Date();
        invitationExpires.setDate(invitationExpires.getDate() + 7);

        await prisma.user.update({
            where: { id },
            data: {
                invitationToken,
                invitationExpires,
            },
        });

        // ✨ Envoyer l'email de renvoi avec Resend
        try {
            await gmailService.sendInvitation({
                recipientEmail: user.email,
                recipientName: user.name,
                invitationToken,
                role: user.role,
                invitedBy: await getInviterName(requester.userId)
            });
            console.log(`✅ Email de renvoi envoyé à ${user.email}`);
        } catch (emailError) {
            console.warn(`⚠️ Email de renvoi non envoyé:`, emailError);
        }

        res.json({
            message: 'Invitation resent successfully',
            invitationLink: `/accept-invitation?token=${invitationToken}`,
            emailSent: true,
        });
    } catch (error) {
        console.error('Error resending invitation:', error);
        res.status(500).json({ error: 'Failed to resend invitation' });
    }
});

export default router;