const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Payout extends Model {}

Payout.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    withdrawalId: { type: DataTypes.INTEGER, allowNull: false, field: 'withdrawal_id' },
    gatewayId: { type: DataTypes.INTEGER, field: 'gateway_id' },
    rupiyaxTrxId: { type: DataTypes.STRING(100), field: 'rupiyax_trx_id' },
    refId: { type: DataTypes.STRING(100), field: 'ref_id' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fee: { type: DataTypes.DECIMAL(10, 2) },
    status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
    utr: { type: DataTypes.STRING(100) },
    rawResponse: { type: DataTypes.JSON, field: 'raw_response' },
  },
  { sequelize, modelName: 'Payout', tableName: 'payouts', updatedAt: 'updatedAt', createdAt: 'createdAt' }
);

module.exports = Payout;
