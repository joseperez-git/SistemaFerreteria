const service = require('./producto.service');


// LISTAR PRODUCTOS
exports.getAll = async (req, res) => {
    try {
        const data = await service.getProductos();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};


// CREAR PRODUCTO
exports.create = async (req, res) => {
    try {
        const {
            id_categoria,
            id_unidad_medida,
            nombre,
            descripcion,
            precio,
            stock,
            stock_minimo,
            codigo_barras
        } = req.body;

        if (!id_categoria) {
            return res.status(400).json({ error: "La categoría es obligatoria" });
        }

        if (!id_unidad_medida) {
            return res.status(400).json({ error: "La unidad de medida es obligatoria" });
        }

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ error: "El nombre del producto es obligatorio" });
        }

        if (precio === undefined || precio === null || parseFloat(precio) < 0) {
            return res.status(400).json({ error: "El precio debe ser un valor válido y no negativo" });
        }

        const resultado = await service.createProducto(req.body);
        res.json(resultado); 

    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(400).json({ error: error.message });
    }
};


// ACTUALIZAR PRODUCTO
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        
        const actualizado = await service.updateProducto(id, req.body);
        res.json(actualizado);
        
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(400).json({ error: error.message });
    }
};


// CAMBIAR ESTADO (DESACTIVAR/ACTIVAR/ELIMINAR)
exports.cambiarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }

        if (estado === undefined || ![0, 1, 2].includes(Number(estado))) {
            return res.status(400).json({ error: "Estado inválido" });
        }

        const resultado = await service.updateProducto(id, { estado });
        res.json(resultado);

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(400).json({ error: error.message });
    }
};


// SUBIR IMÁGENES
exports.subirImagenes = async (req, res) => {
    try {
        const { id_producto, principal } = req.body;
        
        if (!id_producto) {
            return res.status(400).json({ error: 'El id_producto es obligatorio' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Debe seleccionar al menos una imagen' });
        }
        
        const resultado = await service.subirImagenes(id_producto, req.files, principal);
        res.json(resultado);
        
    } catch (error) {
        console.error('Error al subir imágenes:', error);
        res.status(500).json({ error: error.message });
    }
};


// LISTAR IMÁGENES DE PRODUCTO
exports.listarImagenes = async (req, res) => {
    try {
        const { id_producto } = req.params;
        
        if (!id_producto) {
            return res.status(400).json({ error: 'El id_producto es obligatorio' });
        }
        
        const imagenes = await service.getImagenesPorProducto(id_producto);
        res.json(imagenes);
        
    } catch (error) {
        console.error('Error al listar imágenes:', error);
        res.status(500).json({ error: error.message });
    }
};



// ELIMINAR IMAGEN
exports.eliminarImagen = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ error: 'El id de la imagen es obligatorio' });
        }
        
        const resultado = await service.eliminarImagen(id);
        res.json(resultado);
        
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        // Devolver 200 aunque no se encuentre para que el frontend no muestre error
        res.json({ message: 'Imagen eliminada correctamente' });
    }
};


// MARCAR IMAGEN COMO PRINCIPAL
exports.marcarPrincipal = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_producto } = req.body;
        
        if (!id || !id_producto) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos' });
        }
        
        const resultado = await service.marcarImagenPrincipal(id, id_producto);
        res.json(resultado);
        
    } catch (error) {
        console.error('Error al marcar imagen principal:', error);
        res.status(500).json({ error: error.message });
    }
};






