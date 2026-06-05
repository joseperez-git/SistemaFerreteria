const service = require('./pedido.service');

// ============================================
// LISTAR PEDIDOS
// ============================================
exports.getAll = async (req, res) => {
    try {
        const data = await service.getPedidos();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener pedidos:', error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
};

// ============================================
// OBTENER PEDIDO POR ID
// ============================================
exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
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

// ============================================
// CREAR PEDIDO
// ============================================
exports.create = async (req, res) => {
    try {
        const idUsuarioSesion = req.session.usuario?.id;
        
        if (!idUsuarioSesion) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const resultado = await service.createPedido(req.body, idUsuarioSesion);
        res.json(resultado);
    } catch (error) {
        console.error('Error al crear pedido:', error);
        res.status(400).json({ error: error.message });
    }
};

// ============================================
// ACTUALIZAR PEDIDO
// ============================================
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const idUsuarioSesion = req.session.usuario?.id;
        
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        if (!idUsuarioSesion) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const resultado = await service.updatePedido(id, req.body, idUsuarioSesion);
        res.json(resultado);
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        res.status(400).json({ error: error.message });
    }
};

// ============================================
// CAMBIAR ESTADO
// ============================================
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

        const resultado = await service.cambiarEstado(id, estado);
        res.json(resultado);
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(400).json({ error: error.message });
    }
};

// ============================================
// OBTENER VENTA ASOCIADA A UN PEDIDO
// ============================================
exports.getVentaByPedido = async (req, res) => {
    try {
        const idPedido = parseInt(req.params.id);
        if (isNaN(idPedido)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        const venta = await service.getVentaByPedido(idPedido);
        res.json(venta || null);
    } catch (error) {
        console.error('Error al obtener venta:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// CONVERTIR PEDIDO A VENTA
// ============================================
exports.convertirAVenta = async (req, res) => {
    try {
        const idPedido = parseInt(req.params.id);
        const { monto_pago, metodo_pago } = req.body;
        
        if (isNaN(idPedido)) {
            return res.status(400).json({ error: 'ID de pedido inválido' });
        }
        
        if (!metodo_pago) {
            return res.status(400).json({ error: 'Método de pago requerido' });
        }
        
        if (monto_pago === undefined || monto_pago < 0) {
            return res.status(400).json({ error: 'Monto de pago inválido' });
        }
        
        const resultado = await service.convertirAVenta(idPedido, monto_pago, metodo_pago);
        res.json(resultado);
    } catch (error) {
        console.error('Error al convertir pedido:', error);
        res.status(400).json({ error: error.message });
    }
};


