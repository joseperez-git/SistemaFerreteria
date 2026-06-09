const express = require('express');
const router = express.Router();
const controller = require('./reportes.controller');

router.get('/venta/:id/pdf', controller.generarNotaVentaPDF);

module.exports = router;