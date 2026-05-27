const service = require('./venta.service');


// LISTAR VENTAS
exports.getAll = async (req, res) => {
    try {
        const data = await service.getVentas();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: "Error al obtener ventas" });
    }
};


// OBTENER VENTA POR ID
exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        
        const venta = await service.getVentaById(id);
        const detalles = await service.getDetallesVenta(id);
        const cuotas = await service.getCuotasVenta(id);
        const pagos = await service.getPagosVenta(id);
        
        res.json({
            ...venta,
            detalles,
            cuotas,
            pagos
        });
    } catch (error) {
        console.error('Error al obtener venta:', error);
        res.status(500).json({ error: error.message });
    }
};


// CREAR VENTA
exports.create = async (req, res) => {
    try {
        const resultado = await service.createVenta(req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Error al crear venta:', error);
        res.status(400).json({ error: error.message });
    }
};


// ACTUALIZAR VENTA
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        
        const resultado = await service.updateVenta(id, req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Error al actualizar venta:', error);
        res.status(400).json({ error: error.message });
    }
};


// CAMBIAR ESTADO VENTA
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




