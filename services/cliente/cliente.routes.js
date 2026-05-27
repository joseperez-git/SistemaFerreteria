const express = require('express');
const router = express.Router();
const controller = require('./cliente.controller');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.put('/:id/estado', controller.cambiarEstado);

router.get('/consultar-documento', controller.consultarDocumento);

module.exports = router;



