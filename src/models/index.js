const { sequelize } = require('../config/database');

const Admin = require('./Admin');
const User = require('./User');
const Offer = require('./Offer');
const OfferEvent = require('./OfferEvent');
const UserOffer = require('./UserOffer');
const Click = require('./Click');
const Conversion = require('./Conversion');
const Postback = require('./Postback');
const PostbackLog = require('./PostbackLog');
const Campaign = require('./Campaign');
const CampaignClick = require('./CampaignClick');
const ReferUser = require('./ReferUser');
const WalletTransaction = require('./WalletTransaction');
const WithdrawalRequest = require('./WithdrawalRequest');
const SiteConfig = require('./SiteConfig');
const BlockedIp = require('./BlockedIp');
const IpPageWhitelist = require('./IpPageWhitelist');
const PaymentGateway = require('./PaymentGateway');
const GatewayConfig = require('./GatewayConfig');
const GatewayParameter = require('./GatewayParameter');
const SiteAsset = require('./SiteAsset');

// ---- Associations (mirrors the FKs in database.md) ----

// offers -> offer_events (CASCADE)
Offer.hasMany(OfferEvent, { foreignKey: 'offerId', onDelete: 'CASCADE' });
OfferEvent.belongsTo(Offer, { foreignKey: 'offerId' });

// users_offers -> users, offers (CASCADE both)
User.hasMany(UserOffer, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserOffer.belongsTo(User, { foreignKey: 'userId' });
Offer.hasMany(UserOffer, { foreignKey: 'offerId', onDelete: 'CASCADE' });
UserOffer.belongsTo(Offer, { foreignKey: 'offerId' });
Admin.hasMany(UserOffer, { foreignKey: 'approvedBy' });
UserOffer.belongsTo(Admin, { foreignKey: 'approvedBy', as: 'approver' });

// clicks: no FK in original schema, but logically tied to users/offers.
User.hasMany(Click, { foreignKey: 'userId' });
Click.belongsTo(User, { foreignKey: 'userId' });
Offer.hasMany(Click, { foreignKey: 'offerId' });
Click.belongsTo(Offer, { foreignKey: 'offerId' });

// conversions -> users (CASCADE), offer_events (CASCADE)
User.hasMany(Conversion, { foreignKey: 'userId', onDelete: 'CASCADE' });
Conversion.belongsTo(User, { foreignKey: 'userId' });
OfferEvent.hasMany(Conversion, { foreignKey: 'eventId', onDelete: 'CASCADE' });
Conversion.belongsTo(OfferEvent, { foreignKey: 'eventId' });
Offer.hasMany(Conversion, { foreignKey: 'offerId' });
Conversion.belongsTo(Offer, { foreignKey: 'offerId' });

// postbacks -> users, offers (CASCADE both)
User.hasMany(Postback, { foreignKey: 'userId', onDelete: 'CASCADE' });
Postback.belongsTo(User, { foreignKey: 'userId' });
Offer.hasMany(Postback, { foreignKey: 'offerId', onDelete: 'CASCADE' });
Postback.belongsTo(Offer, { foreignKey: 'offerId' });

// postbacks_log -> conversions (logical FK)
Conversion.hasMany(PostbackLog, { foreignKey: 'conversionId' });
PostbackLog.belongsTo(Conversion, { foreignKey: 'conversionId' });

// campaigns (logical FKs to users/offers; original schema has no real FK)
User.hasMany(Campaign, { foreignKey: 'userId' });
Campaign.belongsTo(User, { foreignKey: 'userId' });
Offer.hasMany(Campaign, { foreignKey: 'offerId' });
Campaign.belongsTo(Offer, { foreignKey: 'offerId' });

// payment_gateways -> admins (no cascade)
Admin.hasMany(PaymentGateway, { foreignKey: 'createdBy' });
PaymentGateway.belongsTo(Admin, { foreignKey: 'createdBy' });

// gateway_config / gateway_parameters -> payment_gateways (CASCADE)
PaymentGateway.hasOne(GatewayConfig, { foreignKey: 'gatewayId', onDelete: 'CASCADE' });
GatewayConfig.belongsTo(PaymentGateway, { foreignKey: 'gatewayId' });
PaymentGateway.hasMany(GatewayParameter, { foreignKey: 'gatewayId', onDelete: 'CASCADE' });
GatewayParameter.belongsTo(PaymentGateway, { foreignKey: 'gatewayId' });

// wallet_transactions / withdrawal_requests -> users (CASCADE)
User.hasMany(WalletTransaction, { foreignKey: 'userId', onDelete: 'CASCADE' });
WalletTransaction.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(WithdrawalRequest, { foreignKey: 'userId', onDelete: 'CASCADE' });
WithdrawalRequest.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  Admin,
  User,
  Offer,
  OfferEvent,
  UserOffer,
  Click,
  Conversion,
  Postback,
  PostbackLog,
  Campaign,
  CampaignClick,
  ReferUser,
  WalletTransaction,
  WithdrawalRequest,
  SiteConfig,
  BlockedIp,
  IpPageWhitelist,
  PaymentGateway,
  GatewayConfig,
  GatewayParameter,
  SiteAsset,
};
