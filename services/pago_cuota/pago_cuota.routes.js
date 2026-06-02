const express = require('express');
const router = express.Router();
const controller = require('./pago_cuota.controller');

router.post('/', controller.registrarPago);

module.exports = router;


