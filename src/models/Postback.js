const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Publisher's outgoing postback URL registration for a (user, offer, event).
class Postback extends Model {}

Postback.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    event: { type: DataTypes.STRING(100), allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    offerId: { type: DataTypes.INTEGER, allowNull: false, field: 'offer_id' },
    postbackUrl: { type: DataTypes.TEXT, allowNull: false, field: 'postback_url' },
    // 'pending' | 'approved' | 'rejected' — only 'approved' postbacks fire.
    status: { type: DataTypes.STRING(50), allowNull: false },
  },
  {
    sequelize,
    modelName: 'Postback',
    tableName: 'postbacks',
    updatedAt: false,
  }
);

module.exports = Postback;
