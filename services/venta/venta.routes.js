const express = require('express');
const router = express.Router();
const controller = require('./venta.controller');

router.get('/', controller.getAll);
router.get('/generar-numero', controller.generarNumero);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id/estado', controller.cambiarEstado);
router.delete('/:id', controller.delete);
router.post('/:id/pago-adicional', controller.registrarPagoAdicional);
router.post('/pago-cuota/mixto', controller.registrarPagoCuotaMixto);
router.post('/:idVenta/reenviar-nota', controller.reenviarNota);
router.post('/:idVenta/cuotas/:idCuota/recordatorio', controller.enviarRecordatorio);

module.exports = router;