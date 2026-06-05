const emailService = require('./email.service');
const whatsappService = require('./whatsapp.service');

async function enviarRecordatorio(cliente, venta, cuota, canales = ['email', 'whatsapp']) {
    const resultados = [];
    
    if (canales.includes('email') && cliente.correo) {
        const emailResult = await emailService.enviarRecordatorioCuota(cliente, venta, cuota);
        resultados.push({ canal: 'email', ...emailResult });
    }
    
    if (canales.includes('whatsapp') && cliente.telefono) {
        const whatsappResult = await whatsappService.enviarRecordatorioCuotaWhatsApp(cliente, venta, cuota);
        resultados.push({ canal: 'whatsapp', ...whatsappResult });
    }
    
    return resultados;
}

async function enviarNotaVenta(cliente, venta, detalles, cuotas = [], canales = ['email', 'whatsapp']) {
    const resultados = [];
    
    if (canales.includes('email') && cliente.correo) {
        const emailResult = await emailService.enviarNotaVenta(cliente, venta, detalles, cuotas);
        resultados.push({ canal: 'email', ...emailResult });
    }
    
    if (canales.includes('whatsapp') && cliente.telefono) {
        // Para WhatsApp, enviamos versión resumida
        const whatsappResult = await whatsappService.enviarNotaVentaWhatsApp(cliente, venta, venta.total_venta);
        resultados.push({ canal: 'whatsapp', ...whatsappResult });
    }
    
    return resultados;
}

module.exports = { enviarRecordatorio, enviarNotaVenta };


