const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// NOTE: despite the name, status = 1 means the IP is BLOCKED from calling
// the /postback endpoint. This mirrors the original (confusing) legacy PHP
// app's semantics exactly —
// see .claude/skills/gskloots-php-reference/references/quirks.md.
class IpPageWhitelist extends Model {}

IpPageWhitelist.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ip: { type: DataTypes.STRING(45), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    sequelize,
    modelName: 'IpPageWhitelist',
    tableName: 'ip_page_whitelist',
    updatedAt: false,
  }
);

module.exports = IpPageWhitelist;
