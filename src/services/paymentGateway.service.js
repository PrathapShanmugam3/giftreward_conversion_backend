const { sequelize, PaymentGateway, GatewayConfig, GatewayParameter } = require('../models');
const ApiError = require('../utils/ApiError');

// Mirrors sadmin/gateway_management.php (add_gateway / update_gateway /
// delete_gateway actions). payment_gateways is admin CRUD only — not
// referenced anywhere in the actual payout flow (database.md).

async function listGateways() {
  return PaymentGateway.findAll({
    include: [{ model: GatewayConfig }, { model: GatewayParameter }],
    order: [['createdAt', 'DESC']],
  });
}

async function getGateway(id, options = {}) {
  // NOTE: must accept/forward `options` (esp. { transaction }) — callers in
  // create/update/delete look this row up from inside an open transaction,
  // and without passing the transaction through, findByPk runs on a separate
  // connection that can't see the not-yet-committed row, surfacing as a
  // false "not found" (bug found + fixed during testing, see report).
  const gateway = await PaymentGateway.findByPk(id, {
    include: [{ model: GatewayConfig }, { model: GatewayParameter }],
    ...options,
  });
  if (!gateway) throw ApiError.notFound('Payment gateway not found');
  return gateway;
}

async function createGateway(payload, adminId) {
  const { name, type, status, config, parameters } = payload;

  return sequelize.transaction(async (t) => {
    const gateway = await PaymentGateway.create(
      {
        name,
        type,
        status: status || 'testing',
        createdBy: adminId,
      },
      { transaction: t }
    );

    // Legacy app only creates a gateway_config row for type='api', with these
    // defaults (database.md: api_method='POST', success_codes='200,201').
    if (type === 'api') {
      await GatewayConfig.create(
        {
          gatewayId: gateway.id,
          apiEndpoint: config?.apiEndpoint || null,
          apiKey: config?.apiKey || null,
          apiSecret: config?.apiSecret || null,
          apiMethod: config?.apiMethod || 'POST',
          successCodes: config?.successCodes || '200,201',
          upiIds: config?.upiIds || null,
        },
        { transaction: t }
      );
    }

    if (Array.isArray(parameters) && parameters.length > 0) {
      await GatewayParameter.bulkCreate(
        parameters
          .filter((p) => p.paramKey && p.paramKey.trim())
          .map((p) => ({ gatewayId: gateway.id, paramKey: p.paramKey, paramValue: p.paramValue })),
        { transaction: t }
      );
    }

    return getGateway(gateway.id, { transaction: t });
  });
}

async function updateGateway(id, payload) {
  const { name, type, status, config, parameters } = payload;

  return sequelize.transaction(async (t) => {
    const gateway = await PaymentGateway.findByPk(id, { transaction: t });
    if (!gateway) throw ApiError.notFound('Payment gateway not found');

    await gateway.update(
      {
        name: name ?? gateway.name,
        type: type ?? gateway.type,
        status: status ?? gateway.status,
      },
      { transaction: t }
    );

    const effectiveType = type ?? gateway.type;

    if (effectiveType === 'api') {
      const [existingConfig] = await GatewayConfig.findOrCreate({
        where: { gatewayId: gateway.id },
        defaults: {
          gatewayId: gateway.id,
          apiMethod: 'POST',
          successCodes: '200,201',
        },
        transaction: t,
      });

      if (config) {
        await existingConfig.update(
          {
            apiEndpoint: config.apiEndpoint ?? existingConfig.apiEndpoint,
            apiKey: config.apiKey ?? existingConfig.apiKey,
            apiSecret: config.apiSecret ?? existingConfig.apiSecret,
            apiMethod: config.apiMethod ?? existingConfig.apiMethod,
            successCodes: config.successCodes ?? existingConfig.successCodes,
            upiIds: config.upiIds ?? existingConfig.upiIds,
          },
          { transaction: t }
        );
      }
    } else {
      // Switched (or stays) manual: legacy page has no api config for manual
      // gateways. We drop any existing gateway_config row so stale API
      // credentials don't linger on a gateway that's no longer type='api'.
      await GatewayConfig.destroy({ where: { gatewayId: gateway.id }, transaction: t });
    }

    if (Array.isArray(parameters)) {
      await GatewayParameter.destroy({ where: { gatewayId: gateway.id }, transaction: t });
      if (parameters.length > 0) {
        await GatewayParameter.bulkCreate(
          parameters
            .filter((p) => p.paramKey && p.paramKey.trim())
            .map((p) => ({ gatewayId: gateway.id, paramKey: p.paramKey, paramValue: p.paramValue })),
          { transaction: t }
        );
      }
    }

    return getGateway(gateway.id, { transaction: t });
  });
}

async function deleteGateway(id) {
  return sequelize.transaction(async (t) => {
    const gateway = await PaymentGateway.findByPk(id, { transaction: t });
    if (!gateway) throw ApiError.notFound('Payment gateway not found');

    // FK ON DELETE CASCADE exists on gateway_config/gateway_parameters
    // (database.md + models/index.js associations), but we delete explicitly
    // inside the transaction to be safe regardless of DB-level enforcement.
    await GatewayConfig.destroy({ where: { gatewayId: id }, transaction: t });
    await GatewayParameter.destroy({ where: { gatewayId: id }, transaction: t });
    await gateway.destroy({ transaction: t });

    return { message: 'Payment gateway deleted successfully' };
  });
}

async function getGatewayStats() {
  const [total, active, apiType, manualType] = await Promise.all([
    PaymentGateway.count(),
    PaymentGateway.count({ where: { status: 'active' } }),
    PaymentGateway.count({ where: { type: 'api' } }),
    PaymentGateway.count({ where: { type: 'manual' } }),
  ]);
  return { total, active, apiType, manualType };
}

module.exports = {
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
  getGatewayStats,
};
