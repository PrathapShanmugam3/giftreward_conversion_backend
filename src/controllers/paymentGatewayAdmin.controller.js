const asyncHandler = require('../utils/asyncHandler');
const gatewayService = require('../services/paymentGateway.service');

const listGateways = asyncHandler(async (req, res) => {
  const [gateways, stats] = await Promise.all([
    gatewayService.listGateways(),
    gatewayService.getGatewayStats(),
  ]);
  res.json({ success: true, gateways, stats });
});

const getGateway = asyncHandler(async (req, res) => {
  const gateway = await gatewayService.getGateway(req.params.id);
  res.json({ success: true, gateway });
});

const createGateway = asyncHandler(async (req, res) => {
  const gateway = await gatewayService.createGateway(req.body, req.auth.sub);
  res.status(201).json({ success: true, message: 'Payment gateway created successfully', gateway });
});

const updateGateway = asyncHandler(async (req, res) => {
  const gateway = await gatewayService.updateGateway(req.params.id, req.body);
  res.json({ success: true, message: 'Payment gateway updated successfully', gateway });
});

const deleteGateway = asyncHandler(async (req, res) => {
  const result = await gatewayService.deleteGateway(req.params.id);
  res.json({ success: true, ...result });
});

module.exports = {
  listGateways,
  getGateway,
  createGateway,
  updateGateway,
  deleteGateway,
};
