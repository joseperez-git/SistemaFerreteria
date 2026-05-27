const express = require('express');
const router = express.Router();
const controller = require('./opcion.controller');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.put('/:id/desactivar', controller.desactivar);
router.put('/:id/activar', controller.activar);
router.delete('/:id', controller.remove);

module.exports = router;




