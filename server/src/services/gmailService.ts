import { google } from 'googleapis';

// Configuration des variables d'environnement
const SENDER_EMAIL = process.env.EMAIL_USER || 'techsupport@mfwa.org';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tracker.mfwa.org';

// Initialisation du client OAuth2 de Google
const oAuth2Client = new google.auth.OAuth2(
    (process.env.CLIENT_ID || '').trim(),
    (process.env.CLIENT_SECRET || '').trim(),
    'https://developers.google.com/oauthplayground'
);

// Attribution du Refresh Token permanent
oAuth2Client.setCredentials({
    refresh_token: (process.env.REFRESH_TOKEN || '').trim()
});

// Instance de l'API Gmail
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

console.log('✅ Email service: Google HTTP API client initialized successfully');

export const emailService = {
    /**
     * Cas de figure 1 : Envoi de l'invitation à un nouvel utilisateur
     */
    async sendInvitation({ recipientEmail, recipientName, invitationToken, role, invitedBy }: any) {
        try {
            const invitationLink = `${FRONTEND_URL}/accept-invitation?token=${invitationToken}`;

            // Construction du message au format standard RFC 2822
            const messageParts = [
                `From: "MFWA Activity Tracker" <${SENDER_EMAIL}>`,
                `To: ${recipientEmail}`,
                `Subject: Invitation to join Activity Tracker Pro`,
                `MIME-Version: 1.0`,
                `Content-Type: text/html; charset=utf-8`,
                ``,
                `<html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #4F46E5;">Hello ${recipientName},</h2>
                            <p>You have been invited by <strong>${invitedBy}</strong> to join <strong>Activity Tracker Pro</strong> as a <strong>${role}</strong>.</p>
                            <p>Click the button below to set up your account and choose your password. This link is valid for 7 days.</p>
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="${invitationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                    Accept Invitation
                                </a>
                            </div>
                            <p style="color: #666; font-size: 13px;">If the button doesn't work, copy and paste this link into your browser:<br>${invitationLink}</p>
                        </div>
                    </body>
                </html>`
            ];

            const message = messageParts.join('\r\n');

            // Encodage Base64URL sécurisé requis par l'API Google
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            console.log(`✅ Invitation email sent via Google REST API to ${recipientEmail}`);
            return { id: response.data.id };
        } catch (error: any) {
            console.error(`❌ Failed to send invitation email to ${recipientEmail} via Google API:`, error.message || error);
            throw error;
        }
    },

    /**
     * Cas de figure 2 : Envoi de l'email de confirmation d'activation de compte
     */
    async sendWelcomeEmail(email: string, name: string) {
        try {
            const messageParts = [
                `From: "MFWA Support" <${SENDER_EMAIL}>`,
                `To: ${email}`,
                `Subject: Welcome to Activity Tracker Pro!`,
                `MIME-Version: 1.0`,
                `Content-Type: text/html; charset=utf-8`,
                ``,
                `<html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                            <h2 style="color: #10B981;">Welcome aboard!</h2>
                            <p>Hi <strong>${name}</strong>,</p>
                            <p>Your account has been successfully activated. You can now log in and start tracking your activities on the dashboard.</p>
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="${FRONTEND_URL}/login" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                                    Go to Dashboard
                                </a>
                            </div>
                            <p style="margin-top: 30px; color: #666; font-size: 13px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                                If you have any questions, please contact your administrator.
                            </p>
                        </div>
                    </body>
                </html>`
            ];

            const message = messageParts.join('\r\n');

            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });

            console.log(`✅ Welcome email sent via Google REST API to ${email}`);
            return { id: response.data.id };
        } catch (error: any) {
            console.error(`❌ Failed to send welcome email to ${email} via Google API:`, error.message || error);
            throw error;
        }
    }
};

export default emailService;