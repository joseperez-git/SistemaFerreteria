const express = require('express');
const router = express.Router();
const controller = require('./inventario.controller');

router.get('/estadisticas', controller.getEstadisticas);
router.get('/listar', controller.listarProductos);
router.get('/detalle/:id', controller.getDetalle);
router.post('/actualizar-stock', controller.actualizarStock);

module.exports = router;