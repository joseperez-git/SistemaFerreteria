const express = require('express');
const router = express.Router();
const controller = require('./venta.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.put('/:id/estado', controller.cambiarEstado);

module.exports = router;



