const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ProvexaDB');
        
        const IssueRecord = mongoose.connection.db.collection('issuerecords');
        const ReplacementRequest = mongoose.connection.db.collection('replacementrequests');

        const res1 = await IssueRecord.updateMany(
            { lifecycle_status: { $exists: false } }, 
            { $set: { lifecycle_status: 'Active' } }
        );

        const res2 = await ReplacementRequest.updateMany(
            { lifecycle_status: { $exists: false } }, 
            { $set: { lifecycle_status: 'Active' } }
        );

        console.log(`✅ IssueRecords updated: ${res1.modifiedCount}`);
        console.log(`✅ ReplacementRequests updated: ${res2.modifiedCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
};

migrate();
