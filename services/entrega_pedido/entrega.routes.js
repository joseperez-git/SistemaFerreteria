const express = require('express');
const router = express.Router();
const controller = require('./entrega.controller');

router.post('/:idPedido/confirmar', controller.confirmarEntrega);
router.put('/:id/estado', controller.actualizarEstado);

module.exports = router;


