const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Conversion extends Model {}

Conversion.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    offerId: { type: DataTypes.INTEGER, allowNull: false, field: 'offer_id' },
    eventId: { type: DataTypes.INTEGER, allowNull: false, field: 'event_id' },
    clickId: { type: DataTypes.STRING(255), allowNull: false, field: 'click_id' },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    payout: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  {
    sequelize,
    modelName: 'Conversion',
    tableName: 'conversions',
    updatedAt: false,
  }
);

module.exports = Conversion;
