const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Login brute-force lockout per source IP.
class BlockedIp extends Model {}

BlockedIp.init(
  {
    ipAddress: { type: DataTypes.STRING(45), primaryKey: true, field: 'ip_address' },
    attempts: { type: DataTypes.INTEGER, defaultValue: 1 },
    blockedUntil: { type: DataTypes.DATE, field: 'blocked_until' },
  },
  {
    sequelize,
    modelName: 'BlockedIp',
    tableName: 'blocked_ips',
    timestamps: false,
  }
);

module.exports = BlockedIp;
