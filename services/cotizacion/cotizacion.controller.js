const service = require('./cotizacion.service');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getCotizaciones();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener cotizaciones:', error);
        res.status(500).json({ error: 'Error al obtener cotizaciones' });
    }
};

exports.generarNumero = async (req, res) => {
    try {
        const numero = await service.generarNumeroCotizacion();
        res.json({ numero_cotizacion: numero });
    } catch (error) {
        console.error('Error al generar número:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const cotizacion = await service.getCotizacionById(id);
        if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });

        res.json(cotizacion);
    } catch (error) {
        console.error('Error al obtener cotización:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const idUsuarioSesion = req.session.usuario?.id;
        if (!idUsuarioSesion) return res.status(401).json({ error: 'Usuario no autenticado' });

        const resultado = await service.createCotizacion(req.body, idUsuarioSesion);
        res.json(resultado);
    } catch (error) {
        console.error('Error al crear cotización:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const idUsuarioSesion = req.session.usuario?.id;
        if (!idUsuarioSesion) return res.status(401).json({ error: 'Usuario no autenticado' });

        const resultado = await service.updateCotizacion(id, req.body, idUsuarioSesion);
        res.json(resultado);
    } catch (error) {
        console.error('Error al actualizar cotización:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.cambiarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;

        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        if (estado === undefined || ![0, 1, 2, 3].includes(Number(estado))) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const resultado = await service.updateCotizacion(id, { estado }, null);
        res.json(resultado);
    } catch (error) {
        console.error('Error al cambiar estado:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const resultado = await service.deleteCotizacion(id);
        res.json(resultado);
    } catch (error) {
        console.error('Error al eliminar cotización:', error);
        res.status(400).json({ error: error.message });
    }
};