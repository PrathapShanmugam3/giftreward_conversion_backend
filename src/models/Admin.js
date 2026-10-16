const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

class Admin extends Model {}

Admin.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    // bcrypt hash. Original PHP stored this in plaintext — fixed in the port.
    password: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    // Shared secret used to authorize /postback calls (admins.id = 1 is authoritative).
    token: { type: DataTypes.STRING(50), allowNull: false },
  },
  {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    updatedAt: false,
  }
);

module.exports = Admin;
