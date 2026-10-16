const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class PaymentGateway extends Model {}

PaymentGateway.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.ENUM('api', 'manual'), allowNull: false },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'testing'),
      defaultValue: 'testing',
    },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
  },
  {
    sequelize,
    modelName: 'PaymentGateway',
    tableName: 'payment_gateways',
  }
);

module.exports = PaymentGateway;
