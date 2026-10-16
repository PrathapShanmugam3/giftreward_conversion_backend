const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Single-row table (id = 1) holding global site settings.
class SiteConfig extends Model {}

SiteConfig.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    siteName: { type: DataTypes.STRING(255), allowNull: false, field: 'site_name' },
    banner: { type: DataTypes.STRING(250), allowNull: false, defaultValue: '' },
    favicon: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    domain: { type: DataTypes.STRING(255), allowNull: false },
    minimumWithdrawal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'minimum_withdrawal' },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
    recapthaa: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '' },
    sitekey: { type: DataTypes.STRING(750), allowNull: false, defaultValue: '' },
    secret: { type: DataTypes.STRING(750), allowNull: false, defaultValue: '', field: 'SECRET' },
    wstatus: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '0' },
    telegramChatId: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '', field: 'telegram_chat_id' },
    telegramBotToken: { type: DataTypes.TEXT, allowNull: false, defaultValue: '', field: 'telegram_bot_token' },
  },
  {
    sequelize,
    modelName: 'SiteConfig',
    tableName: 'site_config',
    createdAt: false,
    updatedAt: 'updated_at',
  }
);

module.exports = SiteConfig;
