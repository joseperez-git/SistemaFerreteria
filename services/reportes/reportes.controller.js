const reportesService = require('./reportes.service');
const ventaService = require('../venta/venta.service');
const clienteService = require('../cliente/cliente.service');

class ReportesController {
    async generarNotaVentaPDF(req, res) {
        try {
            const idVenta = parseInt(req.params.id);
            const tipo = req.query.tipo || 'A4';
            
            const venta = await ventaService.getVentaById(idVenta);
            if (!venta) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }
            
            // Obtener datos completos del cliente
            const cliente = await clienteService.getClienteById(venta.id_cliente);
            if (cliente) {
                venta.numero_documento = cliente.numero_documento;
                venta.tipo_documento = cliente.tipo_documento;
                venta.direccion = cliente.direccion;
                venta.telefono = cliente.telefono;
                venta.cliente = `${cliente.nombre} ${cliente.apellido || ''}`;
            }
            
            const detalles = await ventaService.getDetallesVenta(idVenta);
            const cuotas = await ventaService.getCuotasVenta(idVenta);
            const pagos = await ventaService.getPagosVenta(idVenta);
            
            let pdfBuffer;
            if (tipo === 'ticket') {
                pdfBuffer = await reportesService.generarTicketVenta(venta, detalles, pagos);
            } else {
                pdfBuffer = await reportesService.generarNotaVentaA4(venta, detalles, cuotas, pagos);
            }
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="nota_venta_${venta.numero_nota_venta}.pdf"`);
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            res.status(500).json({ error: error.message || 'Error al generar el PDF' });
        }
    }
}

module.exports = new ReportesController();