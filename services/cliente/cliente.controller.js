const service = require('./cliente.service');
const { consultarAplicloud } = require('../consultas-externas/consulta.service');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getClientes();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener clientes" });
    }
};


// Crear cliente
exports.create = async (req, res) => {
    try {
        const { tipo_documento, numero_documento, nombre, apellido, telefono, correo } = req.body;

        if (!tipo_documento || !numero_documento || !nombre) {
            return res.status(400).json({
                error: "Los campos tipo_documento, numero_documento y nombre son obligatorios"
            });
        }

        const nuevo = await service.createCliente(req.body);
        res.json(nuevo);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Actualizar cliente
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const actualizado = await service.updateCliente(id, req.body);
        res.json(actualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Cambiar estado (desactivar/activar/eliminar)
exports.cambiarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;

        if (estado === undefined || ![0, 1, 2].includes(Number(estado))) {
            return res.status(400).json({ error: "Estado inválido" });
        }

        const resultado = await service.updateCliente(id, { estado });
        res.json(resultado);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


//Consultar documento externo (DNI/RUC)
exports.consultarDocumento = async (req, res) => {
    try {
        const { numero, tipo } = req.query;
        if (!numero || !tipo) {
            return res.status(400).json({ error: 'Número y tipo de documento son requeridos' });
        }
        
        const resultado = await consultarAplicloud(numero, tipo);
        
        if (!resultado.success) {
            return res.status(404).json({ error: resultado.message });
        }
        
        res.json(resultado.data);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar el documento' });
    }
};




