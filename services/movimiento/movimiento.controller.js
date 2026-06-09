const service = require('./movimiento.service');

// ============================================
// LISTAR MOVIMIENTOS
// ============================================
exports.getAll = async (req, res) => {
    try {
        const data = await service.getMovimientos();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ error: "Error al obtener movimientos" });
    }
};

// ============================================
// OBTENER MOVIMIENTO POR ID
// ============================================
exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        const movimiento = await service.getMovimientoById(id);
        res.json(movimiento);
    } catch (error) {
        console.error('Error al obtener movimiento:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================
// REGISTRAR MOVIMIENTO
// ============================================
exports.create = async (req, res) => {
    try {
        const idUsuarioSesion = req.session.usuario?.id;
        
        if (!idUsuarioSesion) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const resultado = await service.registrarMovimiento(req.body, idUsuarioSesion);
        res.json(resultado);
    } catch (error) {
        console.error('Error al registrar movimiento:', error);
        res.status(400).json({ error: error.message });
    }
};

// ============================================
// ELIMINAR MOVIMIENTO
// ============================================
exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "ID inválido" });
        }
        const resultado = await service.eliminarMovimiento(id);
        res.json(resultado);
    } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        res.status(400).json({ error: error.message });
    }
};


