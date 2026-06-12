const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const db = require('../../config/db');

class ReportesService {
    constructor() {
        this.EMPRESA = {
            nombre: 'Ferretería Liam & Miley',
            nombreComercial: 'FERRETERÍA LIAM & MILEY S.A.C.',
            ruc: '20123456789',
            direccion: 'Av. Domingo Elías 282, Chiclayo',
            telefono: '906 456 034',
            correo: 'valientelorena245@gmail.com',
            web: 'www.ferreterialiamymiley.com'
        };

        this.COLORES = {
            primario: '#1a3a5c',
            header: '#1a3a5c',
            headerTexto: '#FFFFFF',
            filaPar: '#F9FAFB',
            filaImpar: '#FFFFFF',
            borde: '#D1D5DB',
            texto: '#1F2937',
            textoClaro: '#6B7280',
            exito: '#059669',
            peligro: '#DC2626',
            advertencia: '#D97706'
        };
    }

    formatearFecha(fechaISO) {
        if (!fechaISO) return '-';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    formatearFechaCompleta(fechaISO) {
        if (!fechaISO) return new Date().toLocaleString('es-PE');
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatearFechaLarga(fechaISO) {
        if (!fechaISO) return '-';
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    formatoSoles(valor) {
        const num = parseFloat(valor) || 0;
        return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    async generarQR(data) {
        try {
            return await QRCode.toBuffer(data, {
                width: 120,
                margin: 2,
                errorCorrectionLevel: 'M',
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } catch (error) {
            console.error('Error generando QR:', error);
            return null;
        }
    }

    // ============================================
    // GENERAR NOTA DE VENTA A4
    // ============================================
    async generarNotaVentaA4(venta, detalles, cuotas = [], pagos = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 30,
                    size: 'A4',
                    bufferPages: true
                });

                const buffers = [];
                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                doc.on('error', reject);

                // ============================================
                // CONSTANTES DE DISEÑO
                // ============================================
                const LEFT = 30;
                const RIGHT = doc.page.width - 30;
                const WIDTH = RIGHT - LEFT;
                const CENTER = doc.page.width / 2;

                let y = 30;

                // Helpers
                const addLine = (grosor = 0.5, color = this.COLORES.borde, espacio = 4) => {
                    y += espacio;
                    doc.strokeColor(color).lineWidth(grosor)
                        .moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
                };

                const checkSpace = (needed) => {
                    if (y + needed > doc.page.height - 50) {
                        doc.addPage();
                        y = 30;
                        return true;
                    }
                    return false;
                };

                // ============================================
                // ENCABEZADO PRINCIPAL
                // ============================================

                // ============================================
                // ENCABEZADO PRINCIPAL
                // ============================================

                try {
                    // Buscar el logo publicado en la base de datos
                    const [logoRows] = await db.query(
                        'SELECT ruta FROM logo WHERE publicado = 1 LIMIT 1'
                    );

                    if (logoRows.length > 0 && logoRows[0].ruta) {
                        // Construir la ruta física del archivo
                        const logoPath = path.join(__dirname, '../../public/Fotos/catalogo', logoRows[0].ruta); // ← ESTA LÍNEA YA ESTÁ

                        if (fs.existsSync(logoPath)) {
                            doc.image(logoPath, LEFT, y, { width: 80 });  // ← Muestra el logo
                        }
                    }
                } catch (error) {
                    console.warn('No se pudo cargar el logo dinámico:', error.message);
                }

                // Datos empresa (derecha)
                const empresaX = LEFT + 95;
                doc.fontSize(16).font('Helvetica-Bold').fillColor(this.COLORES.primario);
                doc.text(this.EMPRESA.nombre, empresaX, y, { width: RIGHT - empresaX, align: 'left' });

                doc.fontSize(7.5).font('Helvetica').fillColor(this.COLORES.textoClaro);
                doc.text(this.EMPRESA.direccion, empresaX, y + 22);
                doc.text(`Tel: ${this.EMPRESA.telefono}  |  Email: ${this.EMPRESA.correo}`, empresaX, y + 32);
                doc.text(`RUC: ${this.EMPRESA.ruc}`, empresaX, y + 42);

                // Tipo de documento (extremo derecho)
                doc.fontSize(20).font('Helvetica-Bold').fillColor(this.COLORES.primario);
                doc.text('NOTA DE VENTA', RIGHT - 180, y, { width: 180, align: 'right' });

                doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                doc.text(venta.numero_nota_venta || 'N° 000000', RIGHT - 180, y + 25, { width: 180, align: 'right' });

                doc.fontSize(7).font('Helvetica').fillColor(this.COLORES.textoClaro);
                doc.text('ELECTRÓNICA', RIGHT - 180, y + 38, { width: 180, align: 'right' });

                y += 80;
                addLine(2, this.COLORES.primario, 15);

                // ============================================
                // DATOS DEL CLIENTE
                // ============================================
                checkSpace(40);

                const clienteNombre = venta.cliente || 'Cliente Varios';
                const clienteDoc = venta.numero_documento || '-';
                const clienteDireccion = venta.direccion || 'No especificada';

                doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                doc.text('DATOS DEL CLIENTE', LEFT, y);
                y += 16;

                // Tabla de datos del cliente
                const datosCliente = [
                    { label: 'Cliente:', value: clienteNombre, width: 280 },
                    { label: 'RUC/DNI:', value: clienteDoc, width: 150 },
                    { label: 'Dirección:', value: clienteDireccion, width: WIDTH - 10 }
                ];

                datosCliente.forEach(dato => {
                    doc.fontSize(8).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                    doc.text(dato.label, LEFT + 5, y + 2);
                    doc.font('Helvetica').fillColor(this.COLORES.textoClaro);
                    doc.text(dato.value || '-', LEFT + 55, y + 2, { width: dato.width - 55 });
                    y += 16;
                });

                // ============================================
                // DATOS DE LA VENTA (RECUADRO DERECHO)
                // ============================================
                const infoX = RIGHT - 180;
                const infoY = y - 48;

                doc.roundedRect(infoX - 5, infoY - 5, 185, 52, 3)
                    .fillColor('#F8FAFC').fill()
                    .strokeColor(this.COLORES.borde).stroke();

                const fechaEmision = this.formatearFecha(venta.fecha_venta);
                const cajero = venta.usuario || 'Sistema';
                const formaPago = venta.modalidad_pago === 'CREDITO' ? 'CRÉDITO' : 'CONTADO';

                doc.fontSize(7).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                doc.text('Fecha Emisión:', infoX, infoY);
                doc.text('Vendedor:', infoX, infoY + 14);
                doc.text('Forma Pago:', infoX, infoY + 28);

                doc.font('Helvetica').fillColor(this.COLORES.textoClaro);
                doc.text(fechaEmision, infoX + 70, infoY, { width: 100, align: 'right' });
                doc.text(cajero.length > 15 ? cajero.substring(0, 15) : cajero, infoX + 70, infoY + 14, { width: 100, align: 'right' });

                // Color según forma de pago
                doc.font('Helvetica-Bold');
                if (venta.modalidad_pago === 'CREDITO') {
                    doc.fillColor(this.COLORES.advertencia);
                } else {
                    doc.fillColor(this.COLORES.exito);
                }
                doc.text(formaPago, infoX + 70, infoY + 28, { width: 100, align: 'right' });

                y += 10;
                addLine(0.5, this.COLORES.borde, 5);

                // ============================================
                // TABLA DE PRODUCTOS
                // ============================================
                checkSpace(80);

                doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                doc.text('DETALLE DE PRODUCTOS', LEFT, y);
                y += 14;

                // Definición de columnas
                const cols = {
                    item: { x: LEFT, w: 25 },
                    cant: { x: LEFT + 28, w: 40 },
                    um: { x: LEFT + 71, w: 35 },
                    desc: { x: LEFT + 109, w: 175 },
                    precio: { x: LEFT + 287, w: 70 },
                    descuento: { x: LEFT + 360, w: 60 },
                    subtotal: { x: LEFT + 423, w: 85 }
                };

                // Cabecera de tabla
                doc.fillColor(this.COLORES.header)
                    .rect(LEFT, y, WIDTH, 20)
                    .fill();

                doc.fillColor(this.COLORES.headerTexto).fontSize(7.5).font('Helvetica-Bold');
                doc.text('#', cols.item.x + 3, y + 5, { width: cols.item.w, align: 'center' });
                doc.text('CANT.', cols.cant.x + 3, y + 5, { width: cols.cant.w, align: 'center' });
                doc.text('U.M.', cols.um.x + 3, y + 5, { width: cols.um.w, align: 'center' });
                doc.text('DESCRIPCIÓN', cols.desc.x + 3, y + 5, { width: cols.desc.w - 6 });
                doc.text('P. UNIT.', cols.precio.x, y + 5, { width: cols.precio.w - 3, align: 'right' });
                doc.text('DSCTO.', cols.descuento.x, y + 5, { width: cols.descuento.w - 3, align: 'right' });
                doc.text('IMPORTE', cols.subtotal.x, y + 5, { width: cols.subtotal.w - 3, align: 'right' });

                y += 22;

                // Variables de totales
                let subtotalSinDesc = 0;
                let totalDescuento = 0;
                let totalVentaCalc = 0;

                // Filas de productos
                if (detalles && detalles.length > 0) {
                    for (let i = 0; i < detalles.length; i++) {
                        checkSpace(18);

                        const det = detalles[i];
                        const cantidad = parseFloat(det.cantidad) || 0;
                        const precio = parseFloat(det.precio_unitario) || 0;
                        const subtotal = precio * cantidad;
                        const descuento = parseFloat(det.descuento) || 0;
                        const importe = subtotal - descuento;

                        subtotalSinDesc += subtotal;
                        totalDescuento += descuento;
                        totalVentaCalc += importe;

                        // Fondo alternado
                        if (i % 2 === 0) {
                            doc.fillColor(this.COLORES.filaPar)
                                .rect(LEFT, y - 2, WIDTH, 17)
                                .fill();
                        }

                        doc.fillColor(this.COLORES.texto).fontSize(7).font('Helvetica');

                        // Número
                        doc.text((i + 1).toString(), cols.item.x, y, { width: cols.item.w, align: 'center' });

                        // Cantidad
                        doc.text(cantidad.toString(), cols.cant.x, y, { width: cols.cant.w, align: 'center' });

                        // Unidad
                        doc.text((det.unidad_abreviatura || 'UND').substring(0, 4), cols.um.x, y, { width: cols.um.w, align: 'center' });

                        // Descripción
                        const nombre = (det.producto || det.producto_nombre || 'Producto');
                        doc.text(nombre.length > 30 ? nombre.substring(0, 30) + '...' : nombre,
                            cols.desc.x + 3, y, { width: cols.desc.w - 6 });

                        // Precio unitario
                        doc.text(this.formatoSoles(precio), cols.precio.x, y, { width: cols.precio.w - 3, align: 'right' });

                        // Descuento
                        if (descuento > 0) {
                            doc.fillColor(this.COLORES.peligro)
                                .text(`-${this.formatoSoles(descuento)}`, cols.descuento.x, y, { width: cols.descuento.w - 3, align: 'right' });
                            doc.fillColor(this.COLORES.texto);
                        } else {
                            doc.fillColor(this.COLORES.textoClaro)
                                .text('S/ 0.00', cols.descuento.x, y, { width: cols.descuento.w - 3, align: 'right' });
                            doc.fillColor(this.COLORES.texto);
                        }

                        // Importe
                        doc.font('Helvetica-Bold')
                            .text(this.formatoSoles(importe), cols.subtotal.x, y, { width: cols.subtotal.w - 3, align: 'right' });

                        y += 16;
                    }
                } else {
                    doc.fontSize(8).fillColor(this.COLORES.textoClaro);
                    doc.text('No hay productos registrados', LEFT, y + 5, { width: WIDTH, align: 'center' });
                    y += 20;
                }

                // Línea de cierre de tabla
                addLine(0.8, this.COLORES.borde, 4);

                // ============================================
                // TOTALES
                // ============================================
                checkSpace(120);

                const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
                const saldoPendiente = totalVentaCalc - totalPagado;

                // Recuadro de totales (lado derecho)
                const totalBoxX = RIGHT - 220;
                const totalBoxW = 220;

                let totalLines = 1; // Subtotal
                if (totalDescuento > 0) totalLines++; // Descuento
                totalLines++; // TOTAL
                if (venta.modalidad_pago === 'CREDITO') {
                    totalLines++; // Pagado
                    if (saldoPendiente > 0.01) totalLines++; // Pendiente
                }

                const totalBoxH = 18 + (totalLines * 16) + 10;

                doc.roundedRect(totalBoxX, y, totalBoxW, totalBoxH, 4)
                    .fillColor('#F8FAFC').fill()
                    .strokeColor(this.COLORES.borde).stroke();

                let ty = y + 10;
                const labelX = totalBoxX + 10;
                const valueX = totalBoxX + 120;

                // Subtotal
                doc.fontSize(8).font('Helvetica').fillColor(this.COLORES.texto);
                doc.text('Subtotal:', labelX, ty);
                doc.font('Helvetica');
                doc.text(this.formatoSoles(subtotalSinDesc), valueX, ty, { width: 95, align: 'right' });
                ty += 16;

                // Descuento
                if (totalDescuento > 0) {
                    doc.font('Helvetica').fillColor(this.COLORES.peligro);
                    doc.text('Descuento:', labelX, ty);
                    doc.text(`-${this.formatoSoles(totalDescuento)}`, valueX, ty, { width: 95, align: 'right' });
                    ty += 16;
                }

                // Línea separadora
                doc.strokeColor(this.COLORES.borde).lineWidth(0.5)
                    .moveTo(labelX, ty - 2).lineTo(totalBoxX + totalBoxW - 10, ty - 2).stroke();
                ty += 6;

                // TOTAL
                doc.fontSize(11).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                doc.text('TOTAL:', labelX, ty);
                doc.fontSize(12).fillColor(this.COLORES.primario);
                doc.text(this.formatoSoles(totalVentaCalc), labelX + 60, ty, { width: 145, align: 'right' });
                ty += 20;

                // Crédito
                if (venta.modalidad_pago === 'CREDITO') {
                    doc.fontSize(8).font('Helvetica').fillColor(this.COLORES.texto);
                    doc.text('Pagado:', labelX, ty);
                    doc.font('Helvetica').fillColor(this.COLORES.exito);
                    doc.text(this.formatoSoles(totalPagado), valueX, ty, { width: 95, align: 'right' });
                    ty += 16;

                    if (saldoPendiente > 0.01) {
                        doc.font('Helvetica-Bold').fillColor(this.COLORES.texto);
                        doc.text('Saldo Pendiente:', labelX, ty);
                        doc.fillColor(this.COLORES.peligro);
                        doc.text(this.formatoSoles(saldoPendiente), valueX, ty, { width: 95, align: 'right' });
                        ty += 16;
                    }
                }

                y += totalBoxH + 12;

                // ============================================
                // SON (letras)
                // ============================================
                doc.fontSize(8).font('Helvetica').fillColor(this.COLORES.textoClaro);
                doc.text(`SON: ${this.numeroALetras(totalVentaCalc)}`, LEFT, y);
                y += 16;

                // ============================================
                // PLAN DE CUOTAS (si es crédito)
                // ============================================
                if (cuotas && cuotas.length > 0 && venta.modalidad_pago === 'CREDITO') {
                    checkSpace(60 + cuotas.length * 18);

                    addLine(0.5, this.COLORES.borde, 8);

                    doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                    doc.text('PLAN DE CUOTAS', LEFT, y);
                    y += 14;

                    // Cabecera cuotas
                    const cCols = {
                        num: { x: LEFT, w: 50 },
                        fecha: { x: LEFT + 55, w: 130 },
                        monto: { x: LEFT + 190, w: 90 },
                        estado: { x: LEFT + 285, w: 80 }
                    };

                    doc.fillColor(this.COLORES.header)
                        .rect(LEFT, y, WIDTH, 18).fill();

                    doc.fillColor(this.COLORES.headerTexto).fontSize(7.5).font('Helvetica-Bold');
                    doc.text('CUOTA', cCols.num.x + 5, y + 4, { width: cCols.num.w, align: 'center' });
                    doc.text('VENCIMIENTO', cCols.fecha.x + 5, y + 4, { width: cCols.fecha.w, align: 'center' });
                    doc.text('MONTO', cCols.monto.x, y + 4, { width: cCols.monto.w - 3, align: 'right' });
                    doc.text('ESTADO', cCols.estado.x, y + 4, { width: cCols.estado.w - 3, align: 'right' });

                    y += 20;

                    cuotas.forEach((cuota, i) => {
                        if (i % 2 === 0) {
                            doc.fillColor(this.COLORES.filaPar)
                                .rect(LEFT, y - 2, WIDTH, 16).fill();
                        }

                        const estadoColor = cuota.estado === 1 ? this.COLORES.exito : this.COLORES.advertencia;
                        const estadoText = cuota.estado === 1 ? 'PAGADO' : 'PENDIENTE';

                        doc.fontSize(7.5).font('Helvetica').fillColor(this.COLORES.texto);
                        doc.text(cuota.numero_cuota?.toString() || '-', cCols.num.x, y, { width: cCols.num.w, align: 'center' });
                        doc.text(this.formatearFechaLarga(cuota.fecha_vencimiento), cCols.fecha.x, y, { width: cCols.fecha.w, align: 'center' });
                        doc.text(this.formatoSoles(cuota.monto), cCols.monto.x, y, { width: cCols.monto.w - 3, align: 'right' });

                        doc.font('Helvetica-Bold').fillColor(estadoColor);
                        doc.text(estadoText, cCols.estado.x, y, { width: cCols.estado.w - 3, align: 'right' });

                        y += 15;
                    });

                    y += 8;
                }

                // ============================================
                // OBSERVACIONES
                // ============================================
                if (venta.observacion) {
                    checkSpace(40);
                    addLine(0.5, this.COLORES.borde, 8);

                    doc.fontSize(8).font('Helvetica-Bold').fillColor(this.COLORES.texto);
                    doc.text('OBSERVACIONES:', LEFT, y);
                    y += 12;

                    doc.fontSize(7.5).font('Helvetica').fillColor(this.COLORES.textoClaro);
                    doc.text(venta.observacion, LEFT + 5, y, { width: WIDTH - 10 });
                    y += 25;
                }

                // ============================================
                // QR Y FIRMA
                // ============================================
                checkSpace(130);

                const qrData = JSON.stringify({
                    ruc: this.EMPRESA.ruc,
                    tipo: 'NOTA DE VENTA',
                    numero: venta.numero_nota_venta,
                    fecha: this.formatearFecha(venta.fecha_venta),
                    total: totalVentaCalc,
                    cliente: clienteNombre
                });

                const qrBuffer = await this.generarQR(qrData);

                if (qrBuffer) {
                    const qrSize = 90;
                    const qrX = CENTER - (qrSize / 2);

                    // Asegurar que el QR esté al final de la página
                    const espacioNecesario = qrSize + 80;
                    if (y + espacioNecesario > doc.page.height - 30) {
                        doc.addPage();
                        y = 30;
                    }

                    // Espacio mínimo desde abajo
                    const minY = doc.page.height - espacioNecesario - 20;
                    if (y < minY) y = minY;

                    doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
                    y += qrSize + 8;

                    doc.fontSize(7).font('Helvetica').fillColor(this.COLORES.textoClaro);
                    doc.text('Escanee el código QR para verificar este documento', LEFT, y, { width: WIDTH, align: 'center' });
                    y += 12;

                    doc.fontSize(6.5);
                    doc.text(`Documento generado el ${this.formatearFechaCompleta(venta.fecha_venta)} a las ${new Date().toLocaleTimeString('es-PE')}`, LEFT, y, { width: WIDTH, align: 'center' });
                }

                y += 20;

                // Mensaje final
                doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORES.primario);
                doc.text('¡Gracias por su compra!', LEFT, y, { width: WIDTH, align: 'center' });
                y += 12;

                doc.fontSize(7).font('Helvetica').fillColor(this.COLORES.textoClaro);
                doc.text(this.EMPRESA.nombreComercial, LEFT, y, { width: WIDTH, align: 'center' });

                // Finalizar
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    // ============================================
    // CONVERTIR NÚMERO A LETRAS
    // ============================================
    numeroALetras(num) {
        const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        const n = Math.round(parseFloat(num) || 0);
        if (n === 0) return 'CERO SOLES';

        const enteros = Math.floor(n);
        const decimales = Math.round((n - enteros) * 100);

        let resultado = '';

        if (enteros >= 1000) {
            const miles = Math.floor(enteros / 1000);
            if (miles === 1) resultado += 'MIL ';
            else resultado += unidades[miles] + ' MIL ';
        }

        const resto = enteros % 1000;
        const c = Math.floor(resto / 100);
        const d = Math.floor((resto % 100) / 10);
        const u = resto % 10;

        if (c === 1 && d === 0 && u === 0) resultado += 'CIEN ';
        else if (c > 0) resultado += centenas[c] + ' ';

        if (d === 1 && u > 0) resultado += especiales[u] + ' ';
        else if (d > 0) {
            resultado += decenas[d];
            if (u > 0) resultado += ' Y ' + unidades[u] + ' ';
            else resultado += ' ';
        } else if (u > 0) {
            resultado += unidades[u] + ' ';
        }

        resultado += enteros === 1 ? 'SOL' : 'SOLES';
        resultado += decimales > 0 ? ` CON ${decimales}/100 CÉNTIMOS` : ' CON 00/100 CÉNTIMOS';

        return resultado;
    }
}

module.exports = new ReportesService();