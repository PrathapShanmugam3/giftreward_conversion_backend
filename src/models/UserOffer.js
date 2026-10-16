const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Publisher access requests against an offer.
class UserOffer extends Model {}

UserOffer.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    offerId: { type: DataTypes.INTEGER, allowNull: false, field: 'offer_id' },
    status: {
      type: DataTypes.ENUM('requested', 'approved', 'rejected'),
      defaultValue: 'requested',
    },
    requestedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'requested_at',
    },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
  },
  {
    sequelize,
    modelName: 'UserOffer',
    tableName: 'users_offers',
    timestamps: false,
  }
);

module.exports = UserOffer;
