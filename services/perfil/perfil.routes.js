const express = require('express');
const router = express.Router();
const controller = require('./perfil.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/:id/usuarios-activos', controller.countUsuariosActivos);

module.exports = router;


