const express = require('express');
const router = express.Router();
const controller = require('./producto.controller');
const upload = require('../../middlewares/upload');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.put('/:id/estado', controller.cambiarEstado);

// Rutas de imágenes
router.post('/imagenes', upload.array('imagenes', 10), controller.subirImagenes);
router.get('/:id_producto/imagenes', controller.listarImagenes);
router.delete('/imagenes/:id', controller.eliminarImagen);
router.put('/imagenes/:id/principal', controller.marcarPrincipal);

module.exports = router;



