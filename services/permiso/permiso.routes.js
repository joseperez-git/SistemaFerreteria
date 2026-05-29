const express = require('express');
const router = express.Router();
const controller = require('./permiso.controller');

router.get('/:idPerfil', controller.getPermisos);
router.post('/', controller.savePermisos);

module.exports = router;


