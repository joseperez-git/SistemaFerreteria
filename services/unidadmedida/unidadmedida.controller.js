const service = require('./unidadmedida.service');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getUnidadesMedida();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener unidades de medida" });
    }
};

exports.getAllComplete = async (req, res) => {
    try {
        const data = await service.getAllUnidadesMedida();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener unidades de medida" });
    }
};

exports.getById = async (req, res) => {
    try {
        const data = await service.getUnidadMedidaById(req.params.id);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const resultado = await service.createUnidadMedida(req.body);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await service.updateUnidadMedida(id, req.body);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const resultado = await service.deleteUnidadMedida(id);
        res.json(resultado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};




