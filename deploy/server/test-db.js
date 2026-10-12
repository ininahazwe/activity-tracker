const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: '92.205.29.244',
            user: 'techsupport',
            password: 'techsupport2026',
            database: 'activity_tracker_pro',
            port: 3306
        });
        console.log('✅ Connexion à la base de données réussie!');
        await connection.end();
    } catch (error) {
        console.error('❌ Erreur de connexion:', error.message);
    }
}

testConnection();
