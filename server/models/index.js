const { sequelize } = require('../config/database');

const Admin = require('./Admin');
const Employee = require('./Employee');
const ItemCategory = require('./ItemCategory');
const Item = require('./Item');
const IssueRecord = require('./IssueRecord');
const ReplacementRequest = require('./ReplacementRequest');
const VerificationLog = require('./VerificationLog');
const AllocationConfig = require('./AllocationConfig');
const OfficialPriceList = require('./OfficialPriceList');

// ── Relationships ──

// ItemCategory ↔ Item
ItemCategory.hasMany(Item, { foreignKey: 'category', constraints: false });
Item.belongsTo(ItemCategory, { foreignKey: 'category', targetKey: '_id', constraints: false });

// Employee ↔ IssueRecord
Employee.hasMany(IssueRecord, { foreignKey: 'employee', constraints: false });
IssueRecord.belongsTo(Employee, { foreignKey: 'employee', targetKey: '_id', constraints: false });

// Item ↔ IssueRecord
Item.hasMany(IssueRecord, { foreignKey: 'item', constraints: false });
IssueRecord.belongsTo(Item, { foreignKey: 'item', targetKey: '_id', constraints: false });

// Employee ↔ ReplacementRequest
Employee.hasMany(ReplacementRequest, { foreignKey: 'employee', constraints: false });
ReplacementRequest.belongsTo(Employee, { foreignKey: 'employee', targetKey: '_id', constraints: false });

// Item ↔ ReplacementRequest
Item.hasMany(ReplacementRequest, { foreignKey: 'item', constraints: false });
ReplacementRequest.belongsTo(Item, { foreignKey: 'item', targetKey: '_id', constraints: false });

// Employee ↔ VerificationLog
Employee.hasMany(VerificationLog, { foreignKey: 'employee', constraints: false });
VerificationLog.belongsTo(Employee, { foreignKey: 'employee', targetKey: '_id', constraints: false });

// Optionally, Issued By Admin
Admin.hasMany(IssueRecord, { foreignKey: 'issued_by', constraints: false });
IssueRecord.belongsTo(Admin, { foreignKey: 'issued_by', targetKey: '_id', constraints: false });

// Export everything
module.exports = {
    sequelize,
    Admin,
    Employee,
    ItemCategory,
    Item,
    IssueRecord,
    ReplacementRequest,
    VerificationLog,
    AllocationConfig,
    OfficialPriceList
};
