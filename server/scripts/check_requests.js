const { Sequelize } = require('sequelize');

const seq = new Sequelize('ProvexaDB', 'provexa_user', 'Provexa@123', {
    host: '127.0.0.1', dialect: 'mssql',
    dialectOptions: { options: { port: 1433, encrypt: false, trustServerCertificate: true } },
    logging: false
});

async function check() {
    await seq.authenticate();

    // Get actual columns of ReplacementRequests
    const cols = await seq.query(
        "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ReplacementRequests' ORDER BY ORDINAL_POSITION",
        { type: seq.QueryTypes.SELECT }
    );
    console.log('=== ReplacementRequests COLUMNS ===');
    cols.forEach(c => console.log(' ', c.COLUMN_NAME, '-', c.DATA_TYPE));

    // Get sample row using *
    const sample = await seq.query('SELECT TOP 1 * FROM ReplacementRequests', { type: seq.QueryTypes.SELECT });
    if (sample.length > 0) {
        console.log('\n=== SAMPLE ROW ===');
        Object.entries(sample[0]).forEach(([k, v]) => console.log(' ', k, ':', JSON.stringify(v)));
    }

    await seq.close();
    process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
