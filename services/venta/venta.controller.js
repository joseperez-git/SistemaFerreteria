const service = require('./venta.service');
const clienteService = require('../cliente/cliente.service');
const notificacionService = require('../notificaciones/notificacion.service');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getVentas();
        res.json(data);
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ error: "Error al obtener ventas" });
    }
};

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

exports.create = async (req, res) => {
    try {
        const resultado = await service.createVenta(req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Error al crear venta:', error);
        res.status(400).json({ error: error.message });
    }
};

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

exports.enviarRecordatorio = async (req, res) => {
    try {
        const idVenta = parseInt(req.params.idVenta);
        const idCuota = parseInt(req.params.idCuota);
        const { canal } = req.body;
        
        if (isNaN(idVenta) || isNaN(idCuota)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const venta = await service.getVentaById(idVenta);
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        
        const cliente = await clienteService.getClienteById(venta.id_cliente);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const cuotas = await service.getCuotasVenta(idVenta);
        const cuota = cuotas.find(c => c.id === idCuota);
        
        if (!cuota) {
            return res.status(404).json({ error: 'Cuota no encontrada' });
        }
        
        const canales = canal === 'ambos' ? ['email', 'whatsapp'] : [canal];
        const resultado = await notificacionService.enviarRecordatorio(cliente, venta, cuota, canales);
        
        res.json(resultado);
    } catch (error) {
        console.error('Error al enviar recordatorio:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.reenviarNota = async (req, res) => {
    try {
        const idVenta = parseInt(req.params.idVenta);
        const { canal, correo } = req.body;
        
        if (isNaN(idVenta)) {
            return res.status(400).json({ error: 'ID de venta inválido' });
        }
        
        const venta = await service.getVentaById(idVenta);
        if (!venta) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        
        const cliente = await clienteService.getClienteById(venta.id_cliente);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const detalles = await service.getDetallesVenta(idVenta);
        const cuotas = await service.getCuotasVenta(idVenta);
        
        const correoDestino = (correo && canal === 'email') ? correo : cliente.correo;
        
        if (canal === 'email' && !correoDestino) {
            return res.status(400).json({ error: 'El cliente no tiene correo registrado' });
        }
        
        if (canal === 'whatsapp' && !cliente.telefono) {
            return res.status(400).json({ error: 'El cliente no tiene teléfono registrado' });
        }
        
        const clienteTemp = { ...cliente };
        if (correoDestino && canal === 'email') {
            clienteTemp.correo = correoDestino;
        }
        
        const resultado = await notificacionService.enviarNotaVenta(clienteTemp, venta, detalles, cuotas, [canal]);
        
        res.json(resultado);
    } catch (error) {
        console.error('Error al reenviar nota:', error);
        res.status(400).json({ error: error.message });
    }
};


