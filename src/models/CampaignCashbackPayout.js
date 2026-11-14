const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class CampaignCashbackPayout extends Model {}

CampaignCashbackPayout.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversionId: { type: DataTypes.INTEGER, allowNull: false, field: 'conversion_id' },
    recipientType: { type: DataTypes.ENUM('user', 'referrer'), allowNull: false, field: 'recipient_type' },
    recipientName: { type: DataTypes.STRING(100), allowNull: false, field: 'recipient_name' },
    accountNumber: { type: DataTypes.STRING(20), allowNull: false, field: 'account_number' },
    ifsc: { type: DataTypes.STRING(11), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed'), allowNull: false, defaultValue: 'pending' },
    gatewayId: { type: DataTypes.INTEGER, field: 'gateway_id' },
    gatewayStatus: { type: DataTypes.STRING(50), field: 'gateway_status' },
    refId: { type: DataTypes.STRING(100), field: 'ref_id' },
    rupiyaxTrxId: { type: DataTypes.STRING(100), field: 'rupiyax_trx_id' },
    utr: { type: DataTypes.STRING(100) },
    paidAt: { type: DataTypes.DATE, field: 'paid_at' },
    rawResponse: { type: DataTypes.JSON, field: 'raw_response' },
  },
  { sequelize, modelName: 'CampaignCashbackPayout', tableName: 'campaign_cashback_payouts' }
);

module.exports = CampaignCashbackPayout;
