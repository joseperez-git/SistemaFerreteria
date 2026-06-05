const UltraMsg = require('ultramsg-whatsapp-api');

const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
const token = process.env.ULTRAMSG_TOKEN;
const api = new UltraMsg(instanceId, token);

async function enviarWhatsApp({ to, message }) {
    try {
        // El número debe tener formato internacional: +51987654321
        const response = await api.sendChatMessage(to, message);
        return { success: true, data: response };
    } catch (error) {
        console.error('Error enviando WhatsApp:', error);
        return { success: false, error: error.message };
    }
}

// Envío de recordatorio de cuota
async function enviarRecordatorioCuotaWhatsApp(cliente, venta, cuota) {
    const phone = cliente.telefono.startsWith('+') ? cliente.telefono : `+51${cliente.telefono}`;
    
    const message = `*FERRETERÍA - RECORDATORIO DE PAGO*\n\n` +
        `Hola ${cliente.nombre}, le recordamos su cuota pendiente:\n\n` +
        `*Venta:* ${venta.numero_nota_venta}\n` +
        `*Monto:* S/ ${cuota.monto}\n` +
        `*Vence:* ${cuota.fecha_vencimiento}\n\n` +
        `Saldo restante: S/ ${cuota.saldo_pendiente || cuota.monto}\n\n` +
        `¡Evite recargos! Comuníquese con nosotros.`;
    
    return await enviarWhatsApp({ to: phone, message });
}

// Envío de Nota de Venta (resumida)
async function enviarNotaVentaWhatsApp(cliente, venta, total) {
    const phone = cliente.telefono.startsWith('+') ? cliente.telefono : `+51${cliente.telefono}`;
    
    const message = `*FERRETERÍA - NOTA DE VENTA*\n\n` +
        `*N°:* ${venta.numero_nota_venta}\n` +
        `*Cliente:* ${cliente.nombre} ${cliente.apellido || ''}\n` +
        `*Fecha:* ${venta.fecha_venta}\n` +
        `*Total:* S/ ${total}\n` +
        `*Modalidad:* ${venta.modalidad_pago}\n\n` +
        `¡Gracias por su compra!`;
    
    return await enviarWhatsApp({ to: phone, message });
}

module.exports = { enviarWhatsApp, enviarRecordatorioCuotaWhatsApp, enviarNotaVentaWhatsApp };


