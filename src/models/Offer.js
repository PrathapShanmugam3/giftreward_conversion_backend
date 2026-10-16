const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Offer extends Model {}

Offer.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT },
    // Advertiser tracking link, may contain a literal "{tid}" placeholder.
    link: { type: DataTypes.TEXT, allowNull: false },
    image: { type: DataTypes.TEXT },
    payoutType: {
      type: DataTypes.ENUM(
        'CPI', 'CPA', 'CPL', 'CPS', 'CPM', 'CPC', 'CPV', 'CPR', 'CPE', 'CPT', 'CPD', 'RevShare', 'Hybrid'
      ),
      allowNull: false,
      field: 'payout_type',
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'pending'),
      defaultValue: 'active',
    },
    category: { type: DataTypes.STRING(50) },
    ipWhitelistEnabled: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      field: 'ip_whitelist_enabled',
    },
    whitelistedIps: { type: DataTypes.TEXT, field: 'whitelisted_ips' },
    autoApprovalEnabled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'auto_approval_enabled',
    },
  },
  {
    sequelize,
    modelName: 'Offer',
    tableName: 'offers',
  }
);

module.exports = Offer;
