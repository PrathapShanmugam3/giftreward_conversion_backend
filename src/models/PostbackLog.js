const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class PostbackLog extends Model {}

PostbackLog.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversionId: { type: DataTypes.INTEGER, allowNull: false, field: 'conversion_id' },
    sentToUser: { type: DataTypes.TINYINT, defaultValue: 0, field: 'sent_to_user' },
    sentToAdmin: { type: DataTypes.TINYINT, defaultValue: 0, field: 'sent_to_admin' },
    postbackUrl: { type: DataTypes.STRING(750), allowNull: false, defaultValue: '', field: 'postback_url' },
    httpCode: { type: DataTypes.STRING(750), allowNull: false, defaultValue: '', field: 'http_code' },
    response: { type: DataTypes.STRING(750), allowNull: false, defaultValue: '' },
    attempts: { type: DataTypes.STRING(720), allowNull: false, defaultValue: '' },
  },
  {
    sequelize,
    modelName: 'PostbackLog',
    tableName: 'postbacks_log',
    updatedAt: false,
  }
);

module.exports = PostbackLog;
