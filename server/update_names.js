const mongoose = require('mongoose');
const IssueRecord = require('./models/IssueRecord');
const ReplacementRequest = require('./models/ReplacementRequest');
const Employee = require('./models/Employee');
const Item = require('./models/Item');

mongoose.connect('mongodb://127.0.0.1:27017/ProvexaDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB");

    const issues = await IssueRecord.find({});
    let issueCount = 0;
    for (let issue of issues) {
        if (!issue.employee_name || !issue.item_name) {
            const emp = await Employee.findById(issue.employee);
            const item = await Item.findById(issue.item);
            issue.employee_name = emp ? emp.name : 'Unknown';
            issue.item_name = item ? item.name : 'Unknown';
            await issue.save();
            issueCount++;
        }
    }
    console.log(`Updated ${issueCount} IssueRecords`);

    const requests = await ReplacementRequest.find({});
    let reqCount = 0;
    for (let req of requests) {
        if (!req.employee_name || !req.item_name) {
            const emp = await Employee.findById(req.employee);
            const item = await Item.findById(req.item);
            req.employee_name = emp ? emp.name : 'Unknown';
            req.item_name = item ? item.name : 'Unknown';
            await req.save();
            reqCount++;
        }
    }
    console.log(`Updated ${reqCount} ReplacementRequests`);

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
