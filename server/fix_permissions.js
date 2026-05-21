const { sequelize } = require('./config/database');

async function diagnose() {
    // Find which server/instance we're actually connected to
    const [serverInfo] = await sequelize.query(`
        SELECT 
            @@SERVERNAME as server_name,
            @@SERVICENAME as service_name,
            @@VERSION as version_str,
            DB_NAME() as current_db
    `);
    console.log('=== ACTUAL CONNECTION ===');
    console.log('Server:', serverInfo[0].server_name);
    console.log('Service:', serverInfo[0].service_name);
    console.log('Database:', serverInfo[0].current_db);
    
    // List all tables
    const [tables] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME
    `);
    console.log('\n=== TABLES (' + tables.length + ') ===');
    tables.forEach(t => console.log(' -', t.TABLE_NAME));
    
    // Count records
    const counts = ['Employees', 'IssueRecords', 'ReplacementRequests', 'VerificationLogs'];
    console.log('\n=== RECORD COUNTS ===');
    for (const tbl of counts) {
        try {
            const [r] = await sequelize.query(`SELECT COUNT(*) as cnt FROM [${tbl}]`);
            console.log(` ${tbl}: ${r[0].cnt} rows`);
        } catch(e) { console.log(` ${tbl}: not found`); }
    }
    
    process.exit(0);
}

diagnose().catch(e => { console.error('Error:', e.message); process.exit(1); });
