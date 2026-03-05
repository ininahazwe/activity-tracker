import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import emailService from '../services/emailService';
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// ─── GET /api/users ───
// Liste des utilisateurs (admin seulement)

router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// ─── POST /api/users/invite ───
// Créer une invitation utilisateur avec email Resend

router.post('/invite', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { email, name, role, projects } = req.body;

        // Validation
        if (!email || !name || !role) {
            return res.status(400).json({ error: 'Email, name, and role are required' });
        }

        // Vérifier le rôle (ADMIN, MANAGER, FIELD)
        if (!['ADMIN', 'MANAGER', 'FIELD'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
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

        // Créer l'utilisateur avec statut INVITED
        const user = await prisma.user.create({
            data: {
                email,
                name,
                role,
                status: 'INVITED',
                passwordHash: '', // Sera défini lors de l'acceptation
                invitationToken,
                invitationExpires,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                invitationToken: true,
                invitationExpires: true,
            },
        });

        // ✨ Envoyer l'email d'invitation avec Resend
        try {
            const requester = req.user as any;
            await emailService.sendInvitation({
                recipientEmail: email,
                recipientName: name,
                invitationToken,
                role: role as 'ADMIN' | 'MANAGER' | 'FIELD',
                invitedBy: requester.name || 'Un administrateur'
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
// Mettre à jour un utilisateur (admin seulement)

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, status } = req.body;

        // Validation du rôle
        if (role && !['ADMIN', 'MANAGER', 'FIELD'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Validation du statut
        if (status && !['ACTIVE', 'INVITED', 'INACTIVE'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Ne pas permettre la désactivation du dernier admin
        if (status === 'INACTIVE') {
            const user = await prisma.user.findUnique({ where: { id } });
            if (user?.role === 'ADMIN') {
                const activeAdmins = await prisma.user.count({
                    where: {
                        role: 'ADMIN',
                        status: 'ACTIVE',
                    },
                });
                if (activeAdmins <= 1) {
                    return res.status(400).json({ error: 'Cannot deactivate the last admin user' });
                }
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(role && { role }),
                ...(status && { status }),
            },
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
// Supprimer un utilisateur (admin seulement)

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que ce n'est pas le dernier admin
        const user = await prisma.user.findUnique({ where: { id } });
        if (user?.role === 'ADMIN') {
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
// Renvoyer une invitation (admin seulement)

router.post('/:id/resend-invitation', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
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
            const requester = req.user as any;
            await emailService.sendInvitation({
                recipientEmail: user.email,
                recipientName: user.name,
                invitationToken,
                role: user.role,
                invitedBy: requester.name || 'Un administrateur'
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