const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class GatewayConfig extends Model {}

GatewayConfig.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    gatewayId: { type: DataTypes.INTEGER, allowNull: false, field: 'gateway_id' },
    apiEndpoint: { type: DataTypes.TEXT, field: 'api_endpoint' },
    apiKey: { type: DataTypes.STRING(255), field: 'api_key' },
    apiSecret: { type: DataTypes.STRING(255), field: 'api_secret' },
    apiMethod: {
      type: DataTypes.ENUM('POST', 'GET', 'PUT', 'DELETE'),
      defaultValue: 'POST',
      field: 'api_method',
    },
    successCodes: { type: DataTypes.STRING(100), defaultValue: '200,201', field: 'success_codes' },
    upiIds: { type: DataTypes.TEXT, field: 'upi_ids' },
  },
  {
    sequelize,
    modelName: 'GatewayConfig',
    tableName: 'gateway_config',
  }
);

module.exports = GatewayConfig;
