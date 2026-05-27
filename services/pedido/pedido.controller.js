const service = require('./pedido.service');


// LISTAR PEDIDOS
exports.getAll = async (req, res) => {
    try {
        const data = await service.getPedidos();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
};


// OBTENER PEDIDO POR ID
exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const pedido = await service.getPedidoById(id);
        const detalles = await service.getDetallesPedido(id);

        res.json({
            ...pedido,
            detalles
        });
    } catch (error) {
        console.error('Error al obtener pedido:', error);
        res.status(500).json({ error: error.message });
    }
};


// CREAR PEDIDO
exports.create = async (req, res) => {
    try {
        const resultado = await service.createPedido(req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(400).json({ error: error.message });
    }
};


// ACTUALIZAR PEDIDO
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const resultado = await service.updatePedido(id, req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        res.status(400).json({ error: error.message });
    }
};


// CAMBIAR ESTADO DEL PEDIDO
exports.cambiarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        if (estado === undefined || ![0, 1, 2].includes(Number(estado))) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const resultado = await service.cambiarEstado(id, estado);
        res.json(resultado);
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(400).json({ error: error.message });
    }
};




