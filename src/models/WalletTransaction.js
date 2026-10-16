const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class WalletTransaction extends Model {}

WalletTransaction.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: false },
  },
  {
    sequelize,
    modelName: 'WalletTransaction',
    tableName: 'wallet_transactions',
    updatedAt: false,
  }
);

module.exports = WalletTransaction;
