const service = require('./categoria.service');

exports.getAll = async (req, res) => {
    const data = await service.getCategorias();
    res.json(data);
};

//Crear categoria
exports.create = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre || !descripcion) {
            return res.status(400).json({
                error: "Todos los campos son obligatorios"
            });
        }

        const nuevo = await service.createCategoria(req.body);
        res.json(nuevo);

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};

//Actualizar categoria
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const actualizado = await service.updateCategoria(id, req.body);

        res.json(actualizado);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

//Desactivar categoria
exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const eliminado = await service.deleteCategoria(id);

        res.json(eliminado);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



