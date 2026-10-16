const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Publishers.
class User extends Model {}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    companyName: { type: DataTypes.STRING(255), allowNull: false, field: 'company_name' },
    contactNumber: { type: DataTypes.STRING(20), allowNull: false, field: 'contact_number' },
    // 1 = active/can log in, 0 = locked or pending verification.
    status: { type: DataTypes.TINYINT, defaultValue: 0 },
    walletBalance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'wallet_balance',
    },
    verificationToken: { type: DataTypes.STRING(64), field: 'verification_token' },
    googleId: { type: DataTypes.STRING(255), field: 'google_id' },
    postbackUrl: { type: DataTypes.TEXT, field: 'postback_url' },
    tgChatId: { type: DataTypes.STRING(750), allowNull: false, defaultValue: '', field: 'tg_chat_id' },
    resetExpires: { type: DataTypes.DATE, field: 'reset_expires' },
    resetToken: { type: DataTypes.STRING(64), field: 'reset_token' },
    loginAttempts: { type: DataTypes.INTEGER, defaultValue: 0, field: 'login_attempts' },
    lastAttempt: { type: DataTypes.DATE, field: 'last_attempt' },
    lastIp: { type: DataTypes.STRING(45), field: 'last_ip' },
    authToken: { type: DataTypes.STRING(70), allowNull: false, field: 'auth_token' },
    lifetimeEarning: { type: DataTypes.INTEGER, defaultValue: 0, field: 'lifetimeearning' },
    userWithdrow: { type: DataTypes.INTEGER, defaultValue: 0, field: 'userwithdrow' },
    withdrawalStatus: { type: DataTypes.TINYINT, defaultValue: 1, field: 'withdrawal_status' },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {},
    },
  }
);

module.exports = User;
