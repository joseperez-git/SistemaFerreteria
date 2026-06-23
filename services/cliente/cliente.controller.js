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

exports.create = async (req, res) => {
    try {
        const { tipo_documento, numero_documento, nombre, apellido, telefono, correo } = req.body;

        if (!tipo_documento || !numero_documento || !nombre) {
            return res.status(400).json({
                error: "Los campos tipo_documento, numero_documento y nombre son obligatorios"
            });
        }

        const nuevo = await service.createCliente(req.body, req.session.usuario);
        res.json(nuevo);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const actualizado = await service.updateCliente(id, req.body, req.session.usuario);
        res.json(actualizado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.cambiarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;

        if (estado === undefined || ![0, 1, 2].includes(Number(estado))) {
            return res.status(400).json({ error: "Estado inválido" });
        }

        const resultado = await service.cambiarEstadoCliente(id, estado, req.session.usuario);
        res.json(resultado);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.consultarDocumento = async (req, res) => {
    try {
        const { numero, tipo } = req.query;
        
        if (!numero || !tipo) {
            return res.status(400).json({ error: 'Número y tipo de documento son requeridos' });
        }

        const clienteLocal = await service.buscarClientePorDocumento(numero);

        if (clienteLocal) {
            return res.json({
                success: true,
                encontrado: true,
                origen: 'local',
                cliente: {
                    id: clienteLocal.id,
                    nombre: clienteLocal.nombre,
                    apellido: clienteLocal.apellido || '',
                    tipo_documento: clienteLocal.tipo_documento,
                    numero_documento: clienteLocal.numero_documento,
                    telefono: clienteLocal.telefono || '',
                    correo: clienteLocal.correo || ''
                }
            });
        }

        const resultadoAPI = await consultarAplicloud(numero, tipo);

        if (!resultadoAPI.success) {
            return res.status(404).json({ 
                success: false,
                error: resultadoAPI.message || 'Documento no encontrado en SUNAT',
                encontrado: false
            });
        }

        return res.json({
            success: true,
            encontrado: false,
            origen: 'sunat',
            cliente: {
                nombre: resultadoAPI.data.nombre || '',
                apellido: resultadoAPI.data.apellido || '',
                tipo_documento: tipo,
                numero_documento: numero,
                telefono: '',
                correo: ''
            }
        });

    } catch (error) {
        console.error('Error en consultarDocumento:', error);
        res.status(500).json({ error: 'Error al consultar el documento' });
    }
};


