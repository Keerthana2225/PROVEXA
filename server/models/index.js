const Admin = require('./Admin');
const Employee = require('./Employee');
const ItemCategory = require('./ItemCategory');
const Item = require('./Item');
const IssueRecord = require('./IssueRecord');
const ReplacementRequest = require('./ReplacementRequest');
const VerificationLog = require('./VerificationLog');

// -- Relationships --

// Item <-> Category
Item.belongsTo(ItemCategory, { foreignKey: 'category_id', as: 'category' });
ItemCategory.hasMany(Item, { foreignKey: 'category_id', as: 'items' });

// IssueRecord Relationships
IssueRecord.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
IssueRecord.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
Employee.hasMany(IssueRecord, { foreignKey: 'employee_id', as: 'issues' });

// ReplacementRequest Relationships
ReplacementRequest.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
ReplacementRequest.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
Employee.hasMany(ReplacementRequest, { foreignKey: 'employee_id', as: 'replacements' });

// VerificationLog Relationships
VerificationLog.belongsTo(ReplacementRequest, { foreignKey: 'entity_id', as: 'replacement', constraints: false });

module.exports = {
    Admin,
    Employee,
    ItemCategory,
    Item,
    IssueRecord,
    ReplacementRequest,
    VerificationLog
};
