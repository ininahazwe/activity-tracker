import sgMail from '@sendgrid/mail';

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'techsupport@mfwa.org';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://tracker.mfwa.org';

// Vérifier que l'API key est configurée
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
    console.error('❌ Email service: SENDGRID_API_KEY is not defined in .env');
} else {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('✅ Email service: SendGrid client initialized successfully');
}

export const emailSendgridService = {
    /**
     * Cas de figure 1 : Envoi de l'invitation à un nouvel utilisateur..
     */
    async sendInvitation({ recipientEmail, recipientName, invitationToken, role, invitedBy }: any) {
        try {
            const invitationLink = `${FRONTEND_URL}/accept-invitation?token=${invitationToken}`;

            const response = await sgMail.send({
                to: {
                    email: recipientEmail,
                    name: recipientName
                },
                from: {
                    email: SENDER_EMAIL,
                    name: 'MFWA Support'
                },
                subject: "Invitation to join Activity Tracker Pro",
                html: `
                    <html>
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
                    </html>
                `,
            });

            console.log(`✅ Invitation email sent via SendGrid to ${recipientEmail}`);
            return { id: response[0].headers['x-message-id'] };
        } catch (error: any) {
            console.error(`❌ Failed to send invitation email to ${recipientEmail} via SendGrid:`, error.message || error);
            throw error;
        }
    },

    /**
     * Cas de figure 2 : Envoi de l'email de confirmation d'activation de compte
     */
    async sendWelcomeEmail(email: string, name: string) {
        try {
            const response = await sgMail.send({
                to: {
                    email: email,
                    name: name
                },
                from: {
                    email: SENDER_EMAIL,
                    name: 'MFWA Support'
                },
                subject: "Welcome to Activity Tracker Pro!",
                html: `
                    <html>
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
                    </html>
                `,
            });

            console.log(`✅ Welcome email sent via SendGrid to ${email}`);
            return { id: response[0].headers['x-message-id'] };
        } catch (error: any) {
            console.error(`❌ Failed to send welcome email to ${email} via SendGrid:`, error.message || error);
            throw error;
        }
    }
};

export default emailSendgridService;