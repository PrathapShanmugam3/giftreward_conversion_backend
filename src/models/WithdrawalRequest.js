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
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
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
