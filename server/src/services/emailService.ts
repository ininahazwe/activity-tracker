import { Resend } from 'resend';

// Initialiser Resend seulement si la clé API est disponible
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const SMTP_FROM = process.env.SMTP_FROM || 'noreply@tracker.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@tracker.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── TYPES ───

export interface InvitationEmailData {
    recipientEmail: string;
    recipientName: string;
    invitationToken: string;
    role: 'ADMIN' | 'MANAGER' | 'FIELD';
    invitedBy: string;
}

export interface ActivityNotificationData {
    recipientEmail: string;
    recipientName: string;
    activityTitle: string;
    projectName: string;
    activityDate: string;
    location: string;
    participantCount: number;
}

export interface ErrorAlertData {
    recipientEmail: string;
    errorType: string;
    errorMessage: string;
    timestamp: Date;
    context?: Record<string, any>;
}

// ─── TEMPLATES ───

function invitationEmailTemplate(data: InvitationEmailData): string {
    const acceptLink = `${FRONTEND_URL}/accept-invitation?token=${data.invitationToken}`;
    const roleName = {
        ADMIN: 'Administrateur',
        MANAGER: 'Gestionnaire',
        FIELD: 'Agent de Terrain'
    }[data.role];

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Activity Tracker Pro</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
    .badge { display: inline-block; background: #e0e7ff; color: #667eea; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Activity Tracker Pro</h1>
      <p>Vous êtes invité(e) à rejoindre notre plateforme</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.recipientName}</strong>,</p>
      
      <p><strong>${data.invitedBy}</strong> vous a invité(e) à rejoindre Activity Tracker Pro en tant que <span class="badge">${roleName}</span>.</p>
      
      <div class="info-box">
        <strong>📧 Email :</strong> ${data.recipientEmail}<br>
        <strong>👤 Rôle :</strong> ${roleName}<br>
        <strong>📅 Invité(e) le :</strong> ${new Date().toLocaleDateString('fr-FR')}
      </div>
      
      <p>Activity Tracker Pro est une plateforme de suivi d'activités pour les projets de développement et d'advocacy.</p>
      
      <p style="text-align: center;">
        <a href="${acceptLink}" class="cta-button">Accepter l'invitation</a>
      </p>
      
      <p style="color: #666; font-size: 13px;">
        <strong>Le lien expire dans 7 jours.</strong> Si le bouton ne fonctionne pas:<br>
        <code>${acceptLink}</code>
      </p>
      
      <div class="footer">
        <p>Activity Tracker Pro</p>
        <p>Besoin d'aide? Contactez <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function activityNotificationTemplate(data: ActivityNotificationData): string {
    const dashboardLink = `${FRONTEND_URL}/dashboard`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle activité créée</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .activity-card { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
    .label { color: #666; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; font-weight: bold; color: #059669; margin-bottom: 10px; }
    .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Nouvelle Activité</h1>
      <p>Une nouvelle activité a été créée</p>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.recipientName}</strong>,</p>
      
      <p>Une nouvelle activité a été créée dans le projet <strong>${data.projectName}</strong>.</p>
      
      <div class="activity-card">
        <div class="label">📋 Titre</div>
        <div class="value">${data.activityTitle}</div>
        
        <div class="label" style="margin-top: 15px;">📅 Date</div>
        <div>${data.activityDate}</div>
        
        <div class="label" style="margin-top: 15px;">📍 Lieu</div>
        <div>${data.location}</div>
        
        <div class="label" style="margin-top: 15px;">👥 Participants</div>
        <div>${data.participantCount} personne(s)</div>
      </div>
      
      <p style="text-align: center;">
        <a href="${dashboardLink}" class="cta-button">Voir le Tableau de Bord</a>
      </p>
      
      <div class="footer">
        <p>Activity Tracker Pro</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// ─── SEND FUNCTIONS ───

async function sendEmail(
    to: string,
    subject: string,
    html: string,
    retryCount = 0
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Si Resend n'est pas configuré, log et retourner success (mode dev)
    if (!resend) {
        console.log(`⚠️  Resend non configuré. Email à ${to} (sujet: "${subject}") aurait été envoyé en production`);
        return {
            success: true,
            error: 'Resend not configured - email not sent'
        };
    }

    try {
        const response = await resend.emails.send({
            from: SMTP_FROM,
            to,
            subject,
            html,
            replyTo: SUPPORT_EMAIL
        });

        if (response.error) {
            throw new Error(response.error.message);
        }

        console.log(`✅ Email envoyé à ${to} (ID: ${response.data?.id})`);
        return {
            success: true,
            messageId: response.data?.id
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Erreur envoi email à ${to}:`, errorMessage);

        // Retry (max 3 tentatives)
        if (retryCount < 3) {
            console.log(`⏳ Tentative ${retryCount + 1}/3 dans 5s...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return sendEmail(to, subject, html, retryCount + 1);
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

// ─── PUBLIC API ───

export const emailService = {
    async sendInvitation(data: InvitationEmailData) {
        const html = invitationEmailTemplate(data);
        return sendEmail(
            data.recipientEmail,
            `Vous êtes invité(e) à rejoindre Activity Tracker Pro`,
            html
        );
    },

    async sendActivityNotification(data: ActivityNotificationData) {
        const html = activityNotificationTemplate(data);
        return sendEmail(
            data.recipientEmail,
            `✅ Nouvelle activité : ${data.activityTitle}`,
            html
        );
    },

    async sendCustom(to: string, subject: string, html: string) {
        return sendEmail(to, subject, html);
    }
};

export default emailService;