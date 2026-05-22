// server/test-gmail.js
// Script standalone pour tester la connexion Gmail SMTP avant déploiement

const nodemailer = require('nodemailer');
require('dotenv').config();

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

console.log('\n📧 Test Gmail SMTP Configuration\n');
console.log('─'.repeat(50));

// 1. Vérifier les variables d'environnement
console.log('\n1️⃣  Checking environment variables...');
if (!gmailUser) {
    console.error('❌ GMAIL_USER not set in .env');
    process.exit(1);
} else {
    console.log(`✅ GMAIL_USER: ${gmailUser}`);
}

if (!gmailAppPassword) {
    console.error('❌ GMAIL_APP_PASSWORD not set in .env');
    process.exit(1);
} else {
    console.log(`✅ GMAIL_APP_PASSWORD: ${'*'.repeat(gmailAppPassword.length)}`);
}

// 2. Créer le transporter
console.log('\n2️⃣  Creating SMTP transporter...');
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: gmailUser,
        pass: gmailAppPassword,
    },
});

// 3. Vérifier la connexion
console.log('\n3️⃣  Verifying connection...');
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code}`);

        // Aide au dépannage
        if (error.code === 'EAUTH') {
            console.error('\n💡 Suggestion: Invalid credentials');
            console.error('   - Check GMAIL_USER and GMAIL_APP_PASSWORD');
            console.error('   - Regenerate App Password from: https://myaccount.google.com/apppasswords');
        }
        process.exit(1);
    } else {
        console.log('✅ SMTP connection successful!');
    }

    // 4. Test d'envoi (optionnel)
    console.log('\n4️⃣  Sending test email...');

    const testEmail = gmailUser; // Envoyer à soi-même pour test

    transporter.sendMail(
        {
            from: gmailUser,
            to: testEmail,
            subject: 'Activity Tracker Pro - Test Email',
            html: `
                <h1>✅ Gmail SMTP Configuration Test</h1>
                <p>If you receive this email, your Gmail SMTP is configured correctly!</p>
                <p><strong>From:</strong> ${gmailUser}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            `,
        },
        (error, info) => {
            if (error) {
                console.error('❌ Failed to send email:');
                console.error(`   Error: ${error.message}`);
                process.exit(1);
            } else {
                console.log('✅ Test email sent successfully!');
                console.log(`   Message-ID: ${info.messageId}`);
                console.log(`   Response: ${info.response}`);
            }

            // 5. Résumé
            console.log('\n' + '─'.repeat(50));
            console.log('\n✅ All tests passed!');
            console.log('\nYou can now deploy Activity Tracker Pro with Gmail SMTP.');
            console.log('Configuration:');
            console.log(`  - SMTP Host: smtp.gmail.com`);
            console.log(`  - SMTP Port: 587`);
            console.log(`  - From Email: ${gmailUser}`);
            console.log('\n💡 Check your inbox (and spam folder) for the test email.\n');

            process.exit(0);
        }
    );
});