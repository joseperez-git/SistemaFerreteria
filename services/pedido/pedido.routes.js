const express = require('express');
const router = express.Router();
const controller = require('./pedido.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.put('/:id/estado', controller.cambiarEstado);
router.get('/:id/venta', controller.getVentaByPedido);
router.post('/:id/convertir-venta', controller.convertirAVenta);

module.exports = router;


