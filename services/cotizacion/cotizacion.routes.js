const express = require('express');
const router = express.Router();
const controller = require('./cotizacion.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.put('/:id/estado', controller.cambiarEstado);
router.delete('/:id', controller.remove);

module.exports = router;