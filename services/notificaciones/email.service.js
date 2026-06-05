const { Resend } = require('resend');

// Inicializar Resend con tu API key
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarCorreo({ to, subject, html, from = process.env.RESEND_FROM_EMAIL }) {
    try {
        // Validar que el destinatario existe
        if (!to || to.trim() === '') {
            return { success: false, error: 'Destinatario no especificado' };
        }
        
        const { data, error } = await resend.emails.send({
            from: from,
            to: [to],
            subject: subject,
            html: html
        });
        
        if (error) {
            console.error('Error de Resend:', error);
            return { success: false, error: error.message };
        }
        
        console.log('Correo enviado:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('Error enviando correo:', error);
        return { success: false, error: error.message };
    }
}

// Envío de recordatorio de cuota
async function enviarRecordatorioCuota(cliente, venta, cuota) {
    const subject = `Recordatorio de pago - Ferretería`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a2a3a 0%, #0f1724 100%); padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Ferretería</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
                <p>Estimado(a) <strong>${cliente.nombre} ${cliente.apellido || ''}</strong>,</p>
                <p>Le recordamos que tiene una cuota pendiente:</p>
                <ul style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <li><strong>Venta N°:</strong> ${venta.numero_nota_venta}</li>
                    <li><strong>Monto:</strong> S/ ${parseFloat(cuota.monto).toFixed(2)}</li>
                    <li><strong>Vence:</strong> ${cuota.fecha_vencimiento}</li>
                </ul>
                <p>Saldo restante: S/ ${cuota.saldo_pendiente || parseFloat(cuota.monto).toFixed(2)}</p>
                <hr style="margin: 20px 0;">
                <p style="color: #6c757d; font-size: 12px;">¡Gracias por preferirnos!</p>
            </div>
        </div>
    `;
    
    return await enviarCorreo({
        to: cliente.correo,
        subject,
        html
    });
}

// Envío de Nota de Venta
async function enviarNotaVenta(cliente, venta, detalles, cuotas = []) {
    // Construir tabla de productos
    let productosHtml = '<table style="width: 100%; border-collapse: collapse;">';
    productosHtml += '<thead><tr style="background: #e9ecef;"><th style="padding: 8px; text-align: left;">Producto</th><th style="padding: 8px; text-align: right;">Cantidad</th><th style="padding: 8px; text-align: right;">Precio</th><th style="padding: 8px; text-align: right;">Subtotal</th></tr></thead><tbody>';
    
    detalles.forEach(det => {
        const subtotal = det.precio_unitario * det.cantidad;
        productosHtml += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${det.producto}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: right;">${det.cantidad}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: right;">S/ ${parseFloat(det.precio_unitario).toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: right;">S/ ${subtotal.toFixed(2)}</td>
            </tr>
        `;
    });
    productosHtml += '</tbody></table>';
    
    let cuotasHtml = '';
    if (cuotas.length > 0) {
        cuotasHtml = '<h4>Cuotas:</h4><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #e9ecef;"><th style="padding: 8px; text-align: left;"># Cuota</th><th style="padding: 8px; text-align: right;">Monto</th><th style="padding: 8px; text-align: center;">Vencimiento</th><th style="padding: 8px; text-align: center;">Estado</th></tr></thead><tbody>';
        cuotas.forEach(c => {
            cuotasHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${c.numero_cuota}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: right;">S/ ${parseFloat(c.monto).toFixed(2)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">${c.fecha_vencimiento}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">${c.estado === 1 ? 'Pagada' : 'Pendiente'}</td>
                </tr>
            `;
        });
        cuotasHtml += '</tbody></table>';
    }
    
    const subject = `Su Nota de Venta N° ${venta.numero_nota_venta}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a2a3a 0%, #0f1724 100%); padding: 20px; text-align: center;">
                <h2 style="color: white; margin: 0;">Ferretería</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
                <h3>Nota de Venta N°: ${venta.numero_nota_venta}</h3>
                <p><strong>Cliente:</strong> ${cliente.nombre} ${cliente.apellido || ''}</p>
                <p><strong>Fecha:</strong> ${venta.fecha_venta}</p>
                <p><strong>Total:</strong> S/ ${parseFloat(venta.total_venta).toFixed(2)}</p>
                <p><strong>Modalidad:</strong> ${venta.modalidad_pago}</p>
                
                <h4>Productos:</h4>
                ${productosHtml}
                
                ${cuotasHtml}
                
                <hr style="margin: 20px 0;">
                <p style="color: #6c757d; font-size: 12px;">¡Gracias por su compra!</p>
            </div>
        </div>
    `;
    
    return await enviarCorreo({ to: cliente.correo, subject, html });
}

module.exports = { enviarCorreo, enviarRecordatorioCuota, enviarNotaVenta };


