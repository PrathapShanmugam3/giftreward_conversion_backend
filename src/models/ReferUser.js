const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class ReferUser extends Model {}

ReferUser.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    campaignId: { type: DataTypes.STRING(100), allowNull: false, field: 'campaign_id' },
    offerId: { type: DataTypes.STRING(100), allowNull: false, field: 'offer_id' },
    userId: { type: DataTypes.STRING(100), allowNull: false, field: 'user_id' },
    upiId: { type: DataTypes.STRING(150), allowNull: false, field: 'upi_id' },
    // Unique, collision-checked at generation time (see services/referral.service.js).
    referCode: { type: DataTypes.STRING(100), field: 'refer_code' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    ipAddress: { type: DataTypes.STRING(45), field: 'ip_address' },
    telegram: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '' },
  },
  {
    sequelize,
    modelName: 'ReferUser',
    tableName: 'refer_users',
    timestamps: false,
  }
);

module.exports = ReferUser;
