const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const subFields = (prefix, count) => {
  const fields = {};
  for (let i = 1; i <= count; i += 1) {
    fields[`${prefix}${i}`] = { type: DataTypes.STRING(100), field: `${prefix}${i}` };
  }
  return fields;
};

class Click extends Model {}

Click.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    offerId: { type: DataTypes.INTEGER, allowNull: false, field: 'offer_id' },
    // PHP uniqid() equivalent generated in the click-tracking service.
    clickId: { type: DataTypes.STRING(255), allowNull: false, field: 'click_id' },
    ...subFields('p', 9),
    ...subFields('sub', 10),
    ...subFields('aff_sub', 10),
    googleaid: { type: DataTypes.STRING(100) },
    deviceid: { type: DataTypes.STRING(100) },
    iosidfa: { type: DataTypes.STRING(100) },
    source: { type: DataTypes.STRING(100) },
    ip: { type: DataTypes.STRING(50), allowNull: false },
    userAgent: { type: DataTypes.TEXT, allowNull: false, field: 'user_agent' },
  },
  {
    sequelize,
    modelName: 'Click',
    tableName: 'clicks',
    updatedAt: false,
  }
);

module.exports = Click;
