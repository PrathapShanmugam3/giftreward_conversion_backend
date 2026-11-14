const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class WithdrawalRequest extends Model {}

WithdrawalRequest.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: { type: DataTypes.ENUM('upi', 'bank', 'paypal'), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'paid', 'failed', 'rejected'),
      defaultValue: 'pending',
    },
    gatewayStatus: { type: DataTypes.STRING(50), field: 'gateway_status' },
    paidAt: { type: DataTypes.DATE, field: 'paid_at' },
    refundedAt: { type: DataTypes.DATE, field: 'refunded_at' },
    notes: { type: DataTypes.TEXT },
    processedAt: { type: DataTypes.DATE, field: 'processed_at' },
  },
  {
    sequelize,
    modelName: 'WithdrawalRequest',
    tableName: 'withdrawal_requests',
    updatedAt: false,
  }
);

module.exports = WithdrawalRequest;
