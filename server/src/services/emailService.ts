import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInvitationParams {
    recipientEmail: string;
    recipientName: string;
    invitationToken: string;
    role: 'ADMIN' | 'MANAGER' | 'FIELD';
    invitedBy: string;
}

const emailService = {
    /**
     * 📧 Envoyer une invitation utilisateur avec lien d'activation
     */
    sendInvitation: async ({
                               recipientEmail,
                               recipientName,
                               invitationToken,
                               role,
                               invitedBy,
                           }: SendInvitationParams) => {
        try {
            // Construire le lien d'invitation
            const baseUrl = process.env.FRONTEND_URL || 'https://tracker.mfwa.org';
            const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;

            // Labels pour les rôles
            const roleLabels: Record<string, string> = {
                ADMIN: 'Administrator',
                MANAGER: 'Project Manager',
                FIELD: 'Field Agent',
            };

            const roleLabel = roleLabels[role] || role;

            const subject = `You've been invited to Activity Tracker Pro`;
            const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .info-box { background-color: white; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0; }
              .role-badge { display: inline-block; background-color: #0066cc; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; margin-top: 10px; }
              .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
              .button:hover { background-color: #0052a3; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
              .expires { color: #d9534f; font-size: 13px; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Activity Tracker Pro</h1>
                <p>You're invited!</p>
              </div>
              <div class="content">
                <p>Hi <strong>${recipientName}</strong>,</p>
                
                <p><strong>${invitedBy}</strong> has invited you to join <strong>Activity Tracker Pro</strong> as a team member.</p>
                
                <div class="info-box">
                  <p><strong>Your Role:</strong></p>
                  <div class="role-badge">${roleLabel}</div>
                  <p style="margin-top: 15px; color: #666; font-size: 14px;">
                    As a ${roleLabel}, you'll have access to activity tracking, reporting, and collaboration features.
                  </p>
                </div>

                <p><strong>Next Steps:</strong></p>
                <ol style="color: #555;">
                  <li>Click the button below to accept your invitation</li>
                  <li>Set up your password (minimum 8 characters)</li>
                  <li>Start tracking activities right away</li>
                </ol>

                <center>
                  <a href="${invitationLink}" class="button">Accept Invitation</a>
                </center>

                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link in your browser:<br>
                  <code style="background-color: #eee; padding: 8px; border-radius: 4px; display: inline-block; word-break: break-all; margin-top: 8px;">
                    ${invitationLink}
                  </code>
                </p>

                <div class="expires">
                  ⏰ This invitation link expires in 7 days. After that, you'll need to ask an administrator to send a new one.
                </div>

                <p style="margin-top: 30px; color: #666; font-size: 13px;">
                  If you have any questions or didn't expect this invitation, please contact your administrator.
                </p>
              </div>
              <div class="footer">
                <p>Activity Tracker Pro — Development & Advocacy Field Tracking</p>
                <p style="margin-top: 10px;">© 2026 All rights reserved</p>
              </div>
            </div>
          </body>
        </html>
      `;

            const response = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'tracker@tracker.mfwa.org',
                to: recipientEmail,
                subject,
                html,
            });

            //console.log(`✅ Invitation email sent to ${recipientEmail}:`, response.id);
            return response;
        } catch (error) {
            console.error('❌ Failed to send invitation email:', error);
            throw error;
        }
    },

    /**
     * 📧 Envoyer un email de bienvenue (après activation du compte)
     */
    sendWelcome: async (email: string, name: string) => {
        try {
            const baseUrl = process.env.FRONTEND_URL || 'https://tracker.mfwa.org';

            const subject = `Welcome to Activity Tracker Pro`;
            const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { margin: 0; font-size: 28px; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
              .button:hover { background-color: #0052a3; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome aboard!</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${name}</strong>,</p>
                
                <p>Your account has been successfully activated. You can now log in and start tracking activities.</p>

                <center>
                  <a href="${baseUrl}/login" class="button">Go to Dashboard</a>
                </center>

                <p style="margin-top: 30px; color: #666; font-size: 13px;">
                  If you have any questions, please contact your administrator.
                </p>
              </div>
              <div class="footer">
                <p>Activity Tracker Pro — Development & Advocacy Field Tracking</p>
              </div>
            </div>
          </body>
        </html>
      `;

            const response = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'tracker@tracker.mfwa.org',
                to: email,
                subject,
                html,
            });

            //console.log(`✅ Welcome email sent to ${email}:`, response.id);
            return response;
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
            throw error;
        }
    },
};

export default emailService;