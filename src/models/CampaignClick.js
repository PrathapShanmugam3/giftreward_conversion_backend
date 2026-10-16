const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Submission from the /o landing page form.
class CampaignClick extends Model {}

CampaignClick.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    offername: { type: DataTypes.STRING(255), allowNull: false },
    offerid: { type: DataTypes.STRING(100), allowNull: false },
    user: { type: DataTypes.STRING(100), allowNull: false }, // publisher user id (string, legacy)
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    upi: { type: DataTypes.STRING(150), allowNull: false },
    date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ip: { type: DataTypes.STRING(45), allowNull: false },
    refercode: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '' },
    name: { type: DataTypes.STRING(50), allowNull: false },
    number: { type: DataTypes.STRING(30), allowNull: false },
  },
  {
    sequelize,
    modelName: 'CampaignClick',
    tableName: 'campaign_clicks',
    timestamps: false,
  }
);

module.exports = CampaignClick;
