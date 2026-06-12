const service = require('./inventario.service');

exports.getEstadisticas = async (req, res) => {
    try {
        const data = await service.getEstadisticas();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listarProductos = async (req, res) => {
    try {
        const data = await service.listarProductos();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDetalle = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = await service.getDetalleProducto(id);
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.actualizarStock = async (req, res) => {
    try {
        const idUsuarioSesion = req.session.usuario?.id;
        if (!idUsuarioSesion) return res.status(401).json({ error: 'No autenticado' });

        const { id_producto, nuevo_stock, motivo } = req.body;
        const resultado = await service.actualizarStock(id_producto, nuevo_stock, idUsuarioSesion, motivo);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};