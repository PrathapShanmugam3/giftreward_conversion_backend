const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Publisher-built cashback campaign on top of an offer.
class Campaign extends Model {}

Campaign.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    offerId: { type: DataTypes.INTEGER, allowNull: false, field: 'offer_id' },
    // JSON object keyed by event name -> { user_cashback, referral_cashback, max_payout, your_profit }
    eventConfig: { type: DataTypes.TEXT, allowNull: false, field: 'event_config' },
    // JSON array of step strings.
    steps: { type: DataTypes.TEXT, allowNull: false },
    referralEnabled: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0, field: 'referral_enabled' },
    // Public id used in campaign URLs (/o/?cid=, /refer/?cid=).
    campaignId: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'campaign_id' },
    campaignLink: { type: DataTypes.STRING(255), allowNull: false, field: 'campaign_link' },
    referralLink: { type: DataTypes.STRING(255), allowNull: false, field: 'referral_link' },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'deleted'),
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    modelName: 'Campaign',
    tableName: 'campaigns',
  }
);

module.exports = Campaign;
