const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const migrateIds = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ProvexaDB');
        console.log('Connected to ProvexaDB for ID migration...');

        const collections = ['issuerecords', 'replacementrequests', 'verificationlogs'];
        
        for (const colName of collections) {
            const collection = mongoose.connection.db.collection(colName);
            const docs = await collection.find({}).toArray();
            console.log(`Checking ${colName} (${docs.length} documents)...`);

            for (const doc of docs) {
                const updates = {};
                
                // Fields to check and convert
                const idFields = ['employee', 'item', 'issued_by', 'archived_by', 'resolved_by', 'verified_by', 'entity_id'];
                
                idFields.forEach(field => {
                    if (doc[field] && typeof doc[field] === 'string' && doc[field].length === 24) {
                        updates[field] = new mongoose.Types.ObjectId(doc[field]);
                    }
                });

                if (Object.keys(updates).length > 0) {
                    await collection.updateOne({ _id: doc._id }, { $set: updates });
                }
            }
            console.log(`✅ Finished ${colName}`);
        }

        console.log('🎉 ID Migration complete! All string IDs converted to ObjectIds.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
};

migrateIds();
