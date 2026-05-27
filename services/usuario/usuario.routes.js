const express = require('express');
const router = express.Router();
const controller = require('./usuario.controller');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);

// Cambiar estado usuario
router.put('/:id/estado', controller.cambiarEstado);
router.put('/estado/perfil', controller.cambiarEstadoPorPerfil);

module.exports = router;


