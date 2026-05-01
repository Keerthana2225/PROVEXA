const cron = require('node-cron');
const dayjs = require('dayjs');
const IssueRecord = require('../models/IssueRecord');

// Run daily at 8:00 AM
cron.schedule('0 8 * * *', async () => {
    console.log(`[Cron Job] Running daily due date check at ${new Date()}`);
    
    try {
        const today = dayjs().startOf('day').toDate();
        
        // Find overdue issues
        const overdueIssues = await IssueRecord.find({ 
            next_due_date: { $lt: today } 
        }).populate('employee item');

        if (overdueIssues.length > 0) {
            console.log(`[Cron Job] Found ${overdueIssues.length} overdue items.`);
            // In a real application, you might send an email or SMS here
        } else {
            console.log('[Cron Job] No overdue items found today.');
        }

    } catch (error) {
        console.error('[Cron Job] Error checking due dates:', error);
    }
});
