const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class GatewayParameter extends Model {}

GatewayParameter.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    gatewayId: { type: DataTypes.INTEGER, allowNull: false, field: 'gateway_id' },
    paramKey: { type: DataTypes.STRING(50), allowNull: false, field: 'param_key' },
    paramValue: { type: DataTypes.STRING(100), allowNull: false, field: 'param_value' },
  },
  {
    sequelize,
    modelName: 'GatewayParameter',
    tableName: 'gateway_parameters',
    updatedAt: false,
  }
);

module.exports = GatewayParameter;
