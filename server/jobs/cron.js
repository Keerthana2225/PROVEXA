const cron = require('node-cron');
const dayjs = require('dayjs');
const issueService = require('../services/IssueService');

// Run daily at 8:00 AM
cron.schedule('0 8 * * *', async () => {
    console.log(`[Cron Job] Running daily due date check at ${new Date()}`);
    
    try {
        const { actionNeeded } = await issueService.getUpcomingRenewals(0); // 0 days means today/overdue
        
        if (actionNeeded.length > 0) {
            console.log(`[Cron Job] Found ${actionNeeded.length} overdue or due items.`);
            // Implement notification logic here if needed
        } else {
            console.log('[Cron Job] No overdue items found today.');
        }

    } catch (error) {
        console.error('[Cron Job] Error checking due dates:', error);
    }
});
