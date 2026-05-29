const express = require('express');
const router = express.Router();
const controller = require('./autenticacion.controller');

router.post('/login', controller.login);
router.get('/menu', controller.getMenu);

module.exports = router;


