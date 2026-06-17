const express = require('express');
const router = express.Router();
const controller = require('./dashboard.controller');

router.get('/', controller.getAll);

module.exports = router;


