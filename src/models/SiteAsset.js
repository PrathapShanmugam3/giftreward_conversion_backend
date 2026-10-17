const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// New table (not in the legacy dump): holds the uploaded site banner and
// favicon bytes. Legacy sadmin/settings.php wrote these files to
// ../uploads/ on disk, but this backend runs as a Vercel serverless
// function with an ephemeral filesystem, so the image itself lives in the
// DB and site_config.banner/favicon store the public URL that serves it
// (/api/public/assets/:kind). Created on first use via sync() — see
// siteAsset.service.js.
class SiteAsset extends Model {}

SiteAsset.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    kind: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    mimeType: { type: DataTypes.STRING(100), allowNull: false, field: 'mime_type' },
    data: { type: DataTypes.BLOB('long'), allowNull: false },
  },
  {
    sequelize,
    modelName: 'SiteAsset',
    tableName: 'site_assets',
    createdAt: false,
    updatedAt: 'updated_at',
  }
);

module.exports = SiteAsset;
