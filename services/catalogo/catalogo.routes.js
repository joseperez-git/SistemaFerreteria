const express = require('express');
const router = express.Router();
const controller = require('./catalogo.controller');
const upload = require('../../middlewares/uploadCatalogo');

// Logo - SIN /api/
router.get('/logo/listar', controller.listarLogos);
router.post('/logo/subir', upload.single('imagen'), controller.subirLogo);
router.post('/logo/publicar/:id', controller.publicarLogo);
router.delete('/logo/eliminar/:id', controller.eliminarLogo);

// Slider - SIN /api/
router.get('/slider/listar', controller.listarSliders);
router.post('/slider/subir', upload.single('imagen'), controller.subirSlider);
router.post('/slider/publicar/:id', controller.publicarSlider);
router.post('/slider/inactivar/:id', controller.inactivarSlider);
router.delete('/slider/eliminar/:id', controller.eliminarSlider);

// Redes Sociales - SIN /api/
router.get('/redes/listar', controller.listarRedes);
router.get('/redes/:id', controller.obtenerRed);
router.post('/redes/guardar', controller.guardarRed);
router.post('/redes/inactivar/:id', controller.inactivarRed);
router.post('/redes/activar/:id', controller.activarRed);
router.delete('/redes/eliminar/:id', controller.eliminarRed);

module.exports = router;