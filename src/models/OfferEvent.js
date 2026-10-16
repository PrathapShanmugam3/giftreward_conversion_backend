const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class OfferEvent extends Model {}

OfferEvent.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    offerId: { type: DataTypes.INTEGER, allowNull: false, field: 'offer_id' },
    eventName: { type: DataTypes.STRING(100), allowNull: false, field: 'event_name' },
    payoutAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'payout_amount' },
    // 0 = conversions blocked, >0 = remaining cap (decremented per conversion), <0 = unlimited.
    cap: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'OfferEvent',
    tableName: 'offer_events',
    updatedAt: false,
  }
);

module.exports = OfferEvent;
