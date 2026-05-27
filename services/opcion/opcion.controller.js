const service = require('./opcion.service');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getOpciones();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener opciones:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = await service.getOpcionById(id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const resultado = await service.createOpcion(req.body);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await service.updateOpcion(id, req.body);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.desactivar = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await service.desactivarOpcion(id);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.activar = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await service.activarOpcion(id);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await service.deleteOpcion(id);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};





