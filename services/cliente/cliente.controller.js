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

// ============================================
// CONSULTAR DOCUMENTO (CORREGIDO)
// Primero busca en BD local, luego en API externa
// ============================================
exports.consultarDocumento = async (req, res) => {
    try {
        const { numero, tipo } = req.query;
        
        if (!numero || !tipo) {
            return res.status(400).json({ error: 'Número y tipo de documento son requeridos' });
        }

        // ==========================================
        // PASO 1: Buscar en la base de datos local
        // ==========================================
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

        // ==========================================
        // PASO 2: Consultar API externa (SUNAT)
        // ==========================================
        const resultadoAPI = await consultarAplicloud(numero, tipo);

        if (!resultadoAPI.success) {
            return res.status(404).json({ 
                success: false,
                error: resultadoAPI.message || 'Documento no encontrado en SUNAT',
                encontrado: false
            });
        }

        // Devolver datos de la API
        return res.json({
            success: true,
            encontrado: false, // No está en BD local
            origen: 'sunat',
            cliente: {
                nombre: resultadoAPI.data.nombre || '',
                apellido: resultadoAPI.data.apellido || '',
                tipo_documento: tipo,
                numero_documento: numero,
                telefono: resultadoAPI.data.telefono || '',
                correo: resultadoAPI.data.correo || ''
            }
        });

    } catch (error) {
        res.status(500).json({ error: 'Error al consultar el documento' });
    }
};