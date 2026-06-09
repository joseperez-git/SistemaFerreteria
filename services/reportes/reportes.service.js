const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

class ReportesService {
    constructor() {
        this.EMPRESA = {
            nombre: 'Ferretería Liam & Miley',
            ruc: 'xxxyyyzzzx',
            direccion: 'Domingo Elias 282, Chiclayo 14011',
            telefono: '906456034',
            correo: 'valientelorena245@gmail.com'
        };

        this.COLORES = {
            primario: '#1a3a5c',
            secundario: '#2c5a7a',
            header: '#4A5568',
            headerTexto: '#FFFFFF',
            filaPar: '#F9FAFB',
            filaImpar: '#FFFFFF',
            borde: '#E5E7EB',
            texto: '#374151',
            textoClaro: '#6B7280',
            exito: '#10B981',
            peligro: '#EF4444',
            advertencia: '#F59E0B'
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

    formatearFechaCompleta() {
        return new Date().toLocaleString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatoSoles(valor) {
        const num = parseFloat(valor) || 0;
        return `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    async generarQR(data, width = 100, height = 100) {
        try {
            return await QRCode.toBuffer(data, {
                width: width,
                margin: 1,
                errorCorrectionLevel: 'M'
            });
        } catch (error) {
            console.error('Error generando QR:', error);
            return null;
        }
    }

    // ==================== NOTA DE VENTA A4 ====================
    async generarNotaVentaA4(venta, detalles, cuotas = [], pagos = []) {
        return new Promise(async (resolve) => {
            const doc = new PDFDocument({
                margin: 35,
                size: 'A4',
                autoFirstPage: true,
                bufferPages: true
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Constantes de diseño
            const MARGEN_IZQ = 35;
            const MARGEN_DER = doc.page.width - 35;
            const ANCHO_UTIL = MARGEN_DER - MARGEN_IZQ;
            const CENTRO_PAGINA = doc.page.width / 2;

            // Variables de flujo
            let y = 35;
            let paginaActual = 1;

            // Función helper para verificar espacio
            const verificarEspacio = (necesario) => {
                if (y + necesario > doc.page.height - 60) {
                    doc.addPage();
                    paginaActual++;
                    y = 35;
                    return true;
                }
                return false;
            };

            // Función helper para línea horizontal
            const linea = (grosor = 0.5, color = this.COLORES.borde, espacioY = 0) => {
                y += espacioY;
                doc.strokeColor(color)
                    .lineWidth(grosor)
                    .moveTo(MARGEN_IZQ, y)
                    .lineTo(MARGEN_DER, y)
                    .stroke();
            };

            // ==========================================
            // ENCABEZADO
            // ==========================================
            const logoPath = path.join(__dirname, '../../public/logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, MARGEN_IZQ, y, { width: 75 });
            }

            // Datos de la empresa (junto al logo)
            doc.fontSize(14).font('Helvetica-Bold').fillColor(this.COLORES.primario);
            doc.text(this.EMPRESA.nombre, MARGEN_IZQ + 85, y + 3);

            doc.fontSize(8).font('Helvetica').fillColor(this.COLORES.textoClaro);
            doc.text(this.EMPRESA.direccion, MARGEN_IZQ + 85, y + 20);
            doc.text(`Teléfono: ${this.EMPRESA.telefono}`, MARGEN_IZQ + 85, y + 30);
            doc.text(`Email: ${this.EMPRESA.correo}`, MARGEN_IZQ + 85, y + 40);

            // RUC y Título (lado derecho)
            const xDerecha = MARGEN_DER - 160;

            doc.fillColor(this.COLORES.textoClaro).fontSize(7).font('Helvetica');
            doc.text(`R.U.C. N° ${this.EMPRESA.ruc}`, xDerecha, y, {
                width: 160,
                align: 'right'
            });

            doc.fillColor(this.COLORES.primario).fontSize(18).font('Helvetica-Bold');
            doc.text('NOTA DE VENTA', xDerecha, y + 12, {
                width: 160,
                align: 'right'
            });

            doc.fillColor(this.COLORES.texto).fontSize(12).font('Helvetica-Bold');
            doc.text(venta.numero_nota_venta || 'Sin número', xDerecha, y + 34, {
                width: 160,
                align: 'right'
            });

            y += 65;
            linea(2, this.COLORES.primario, 5);

            // ==========================================
            // DATOS DEL CLIENTE Y VENTA
            // ==========================================
            const clienteNombre = venta.cliente || 'Venta Interna';
            const clienteDoc = venta.numero_documento || '-';
            const clienteDireccion = venta.direccion || 'No especificada';
            const formaPago = venta.modalidad_pago === 'CREDITO' ? 'CRÉDITO' : 'CONTADO';
            const cajero = venta.usuario || 'Sistema';
            const fechaVenta = this.formatearFecha(venta.fecha_venta);

            // Rectángulo de información del cliente
            doc.roundedRect(MARGEN_IZQ, y, ANCHO_UTIL, 55, 3)
                .fillColor('#F8FAFC')
                .fill()
                .strokeColor(this.COLORES.borde)
                .stroke();

            const yInfo = y + 8;
            const col1 = MARGEN_IZQ + 10;
            const col2 = MARGEN_IZQ + 300;

            // Columna 1
            doc.fillColor(this.COLORES.texto).fontSize(8).font('Helvetica-Bold');
            doc.text('CLIENTE:', col1, yInfo);
            doc.text('DOCUMENTO:', col1, yInfo + 17);
            doc.text('DIRECCIÓN:', col1, yInfo + 34);

            doc.font('Helvetica').fillColor(this.COLORES.textoClaro);
            doc.text(clienteNombre.length > 25 ? clienteNombre.substring(0, 25) + '...' : clienteNombre,
                col1 + 65, yInfo, { width: 200 });
            doc.text(clienteDoc, col1 + 65, yInfo + 17);
            doc.text(clienteDireccion.length > 25 ? clienteDireccion.substring(0, 25) + '...' : clienteDireccion,
                col1 + 65, yInfo + 34, { width: 200 });

            // Columna 2
            doc.font('Helvetica-Bold').fillColor(this.COLORES.texto);
            doc.text('FECHA:', col2, yInfo);
            doc.text('CAJERO:', col2, yInfo + 17);
            doc.text('TIPO PAGO:', col2, yInfo + 34);

            doc.font('Helvetica').fillColor(this.COLORES.textoClaro);
            doc.text(fechaVenta, col2 + 55, yInfo);
            doc.text(cajero.length > 20 ? cajero.substring(0, 20) : cajero, col2 + 55, yInfo + 17);

            // Tipo de pago con color
            if (venta.modalidad_pago === 'CREDITO') {
                doc.fillColor(this.COLORES.advertencia).font('Helvetica-Bold');
            } else {
                doc.fillColor(this.COLORES.exito).font('Helvetica-Bold');
            }
            doc.text(formaPago, col2 + 55, yInfo + 34);

            y += 65;

            // ==========================================
            // TABLA DE PRODUCTOS
            // ==========================================
            verificarEspacio(100);

            // Definición de columnas
            const tabla = {
                item: { x: MARGEN_IZQ, w: 30 },
                cant: { x: MARGEN_IZQ + 32, w: 45 },
                um: { x: MARGEN_IZQ + 79, w: 35 },
                descripcion: { x: MARGEN_IZQ + 116, w: 175 },
                precio: { x: MARGEN_IZQ + 293, w: 70 },
                descuento: { x: MARGEN_IZQ + 365, w: 65 },
                subtotal: { x: MARGEN_IZQ + 432, w: 75 }
            };

            // Cabecera de tabla
            doc.fillColor(this.COLORES.header)
                .rect(MARGEN_IZQ, y, ANCHO_UTIL, 22)
                .fill();

            doc.fillColor(this.COLORES.headerTexto).fontSize(8).font('Helvetica-Bold');
            doc.text('#', tabla.item.x + 5, y + 7, { width: tabla.item.w - 5, align: 'center' });
            doc.text('CANT.', tabla.cant.x + 5, y + 7, { width: tabla.cant.w - 5, align: 'center' });
            doc.text('U.M.', tabla.um.x + 5, y + 7, { width: tabla.um.w - 5, align: 'center' });
            doc.text('DESCRIPCIÓN', tabla.descripcion.x + 5, y + 7, { width: tabla.descripcion.w - 10 });
            doc.text('P. UNITARIO', tabla.precio.x, y + 7, { width: tabla.precio.w - 5, align: 'right' });
            doc.text('DESCUENTO', tabla.descuento.x, y + 7, { width: tabla.descuento.w - 5, align: 'right' });
            doc.text('SUBTOTAL', tabla.subtotal.x, y + 7, { width: tabla.subtotal.w - 5, align: 'right' });

            y += 24;
            let subtotalSinDescuento = 0;
            let descuentoTotal = 0;
            let totalVenta = 0;

            // Filas de productos
            for (let i = 0; i < detalles.length; i++) {
                verificarEspacio(20);

                const det = detalles[i];
                const cantidad = parseFloat(det.cantidad) || 0;
                const precio = parseFloat(det.precio_unitario) || 0;
                const subtotal = precio * cantidad;
                const descuento = parseFloat(det.descuento) || 0;
                const totalLinea = subtotal - descuento;

                subtotalSinDescuento += subtotal;
                descuentoTotal += descuento;
                totalVenta += totalLinea;

                // Fondo alternado
                const colorFondo = i % 2 === 0 ? this.COLORES.filaPar : this.COLORES.filaImpar;
                doc.fillColor(colorFondo)
                    .rect(MARGEN_IZQ, y - 2, ANCHO_UTIL, 18)
                    .fill();

                // Datos de la fila
                doc.fillColor(this.COLORES.texto).fontSize(7.5).font('Helvetica');

                doc.text((i + 1).toString(), tabla.item.x, y, {
                    width: tabla.item.w,
                    align: 'center'
                });

                doc.text(cantidad.toString(), tabla.cant.x, y, {
                    width: tabla.cant.w,
                    align: 'center'
                });

                doc.text((det.unidad_abreviatura || 'UND').substring(0, 4), tabla.um.x, y, {
                    width: tabla.um.w,
                    align: 'center'
                });

                const nombreProducto = (det.producto || det.producto_nombre || '-');
                doc.text(nombreProducto.length > 28 ? nombreProducto.substring(0, 28) + '...' : nombreProducto,
                    tabla.descripcion.x + 3, y, {
                        width: tabla.descripcion.w - 6
                    });

                doc.text(this.formatoSoles(precio), tabla.precio.x, y, {
                    width: tabla.precio.w - 3,
                    align: 'right'
                });

                // Descuento
                if (descuento > 0) {
                    doc.fillColor(this.COLORES.peligro)
                        .text(`-${this.formatoSoles(descuento)}`, tabla.descuento.x, y, {
                            width: tabla.descuento.w - 3,
                            align: 'right'
                        });
                    doc.fillColor(this.COLORES.texto);
                } else {
                    doc.fillColor(this.COLORES.textoClaro)
                        .text('S/ 0.00', tabla.descuento.x, y, {
                            width: tabla.descuento.w - 3,
                            align: 'right'
                        });
                    doc.fillColor(this.COLORES.texto);
                }

                // Subtotal de línea
                doc.font('Helvetica-Bold')
                    .text(this.formatoSoles(totalLinea), tabla.subtotal.x, y, {
                        width: tabla.subtotal.w - 3,
                        align: 'right'
                    });

                y += 16;
            }

            // Línea final de tabla
            linea(0.8, this.COLORES.borde, 4);

            // ==========================================
            // TOTALES - PRECIO A LA IZQUIERDA
            // ==========================================
            verificarEspacio(130);

            const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            const deuda = totalVenta - totalPagado;

            // 📦 POSICIÓN Y TAMAÑO DEL RECUADRO
            const totalesX = MARGEN_IZQ + ANCHO_UTIL - 230;
            const totalesAncho = 230;

            // 🔧 CALCULAR ALTURA NECESARIA
            let lineasTotales = 1;
            if (descuentoTotal > 0) lineasTotales++;
            lineasTotales++;
            if (venta.modalidad_pago === 'CREDITO') {
                lineasTotales++;
                if (deuda > 0.01) lineasTotales++;
            }

            const altoTotales = 25 + (lineasTotales * 16) + 15;

            // 🎨 FONDO DEL RECUADRO
            doc.roundedRect(totalesX, y, totalesAncho, altoTotales, 4)
                .fillColor('#F8FAFC')
                .fill()
                .strokeColor(this.COLORES.borde)
                .stroke();

            // 📝 POSICIÓN INICIAL
            let yT = y + 10;

            // 1️⃣ SUBTOTAL
            doc.fillColor(this.COLORES.texto).fontSize(9).font('Helvetica');
            doc.text('Subtotal:', totalesX + 15, yT, { continued: true, width: 50 });
            doc.text(this.formatoSoles(subtotalSinDescuento), totalesX + 80, yT);
            yT += 16;

            // 2️⃣ DESCUENTO (si existe)
            if (descuentoTotal > 0) {
                doc.fillColor(this.COLORES.peligro);
                doc.text('Descuento:', totalesX + 15, yT, { continued: true, width: 50 });
                doc.text(`-${this.formatoSoles(descuentoTotal)}`, totalesX + 80, yT);
                doc.fillColor(this.COLORES.texto);
                yT += 16;
            }

            // ➖ LÍNEA SEPARADORA
            doc.strokeColor(this.COLORES.borde).lineWidth(0.5)
                .moveTo(totalesX + 15, yT)
                .lineTo(totalesX + totalesAncho - 15, yT)
                .stroke();
            yT += 10;

            // 💰 TOTAL - PRECIO A LA IZQUIERDA
            doc.fillColor(this.COLORES.texto).fontSize(11).font('Helvetica-Bold');
            doc.text('TOTAL:', totalesX + 15, yT, { continued: true, width: 70 });
            
            doc.fillColor(this.COLORES.primario).fontSize(13).font('Helvetica-Bold');
            doc.text(this.formatoSoles(totalVenta), totalesX + 70, yT);
            yT += 22;

            // 💳 CRÉDITO (si aplica)
            if (venta.modalidad_pago === 'CREDITO') {
                doc.fillColor(this.COLORES.texto).fontSize(9).font('Helvetica');
                doc.text('Pagado:', totalesX + 15, yT, { continued: true, width: 70 });
                doc.fillColor(this.COLORES.exito);
                doc.text(this.formatoSoles(totalPagado), totalesX + 70, yT);
                yT += 16;

                if (deuda > 0.01) {
                    doc.fillColor(this.COLORES.texto).font('Helvetica-Bold');
                    doc.text('Pendiente:', totalesX + 15, yT, { continued: true, width: 70 });
                    doc.fillColor(this.COLORES.peligro);
                    doc.text(this.formatoSoles(deuda), totalesX + 70, yT);
                    yT += 16;
                }
            }

            y = y + altoTotales + 10;

            // ==========================================
            // PLAN DE CUOTAS
            // ==========================================
            if (cuotas && cuotas.length > 0) {
                verificarEspacio(80 + (cuotas.length * 18));

                doc.fillColor(this.COLORES.primario).fontSize(11).font('Helvetica-Bold');
                doc.text('PLAN DE CUOTAS', MARGEN_IZQ, y);
                y += 20;

                const cCols = {
                    num: MARGEN_IZQ,
                    fecha: MARGEN_IZQ + 70,
                    monto: MARGEN_IZQ + 200,
                    estado: MARGEN_IZQ + 320
                };

                const cWidths = {
                    num: 65,
                    fecha: 125,
                    monto: 115,
                    estado: 90
                };

                doc.fillColor(this.COLORES.header)
                    .rect(MARGEN_IZQ, y, ANCHO_UTIL, 18)
                    .fill();

                doc.fillColor(this.COLORES.headerTexto).fontSize(8).font('Helvetica-Bold');
                doc.text('CUOTA', cCols.num + 5, y + 5, { width: cWidths.num - 10 });
                doc.text('FECHA VENCIMIENTO', cCols.fecha + 5, y + 5, { width: cWidths.fecha - 10 });
                doc.text('MONTO', cCols.monto, y + 5, { width: cWidths.monto - 5, align: 'right' });
                doc.text('ESTADO', cCols.estado, y + 5, { width: cWidths.estado - 5, align: 'right' });

                y += 20;

                for (let i = 0; i < cuotas.length; i++) {
                    const cuota = cuotas[i];
                    const estado = cuota.estado === 1 ? 'PAGADO' : 'PENDIENTE';
                    const estadoColor = cuota.estado === 1 ? this.COLORES.exito : this.COLORES.advertencia;

                    if (i % 2 === 0) {
                        doc.fillColor(this.COLORES.filaPar)
                            .rect(MARGEN_IZQ, y - 2, ANCHO_UTIL, 17)
                            .fill();
                    }

                    doc.fillColor(this.COLORES.texto).fontSize(8).font('Helvetica');

                    doc.text(cuota.numero_cuota?.toString() || '-', cCols.num + 5, y, {
                        width: cWidths.num - 10
                    });

                    doc.text(this.formatearFecha(cuota.fecha_vencimiento), cCols.fecha + 5, y, {
                        width: cWidths.fecha - 10
                    });

                    doc.text(this.formatoSoles(cuota.monto), cCols.monto, y, {
                        width: cWidths.monto - 5,
                        align: 'right'
                    });

                    doc.fillColor(estadoColor).font('Helvetica-Bold');
                    doc.text(estado, cCols.estado, y, {
                        width: cWidths.estado - 5,
                        align: 'right'
                    });

                    y += 17;
                }

                y += 15;
            }

            // ==========================================
            // OBSERVACIONES
            // ==========================================
            if (venta.observacion) {
                verificarEspacio(50);

                doc.fillColor(this.COLORES.texto).fontSize(9).font('Helvetica-Bold');
                doc.text('OBSERVACIONES:', MARGEN_IZQ, y);
                y += 14;

                doc.fillColor(this.COLORES.textoClaro).fontSize(8).font('Helvetica');
                doc.text(venta.observacion, MARGEN_IZQ + 5, y, {
                    width: ANCHO_UTIL - 10
                });

                y += 35;
            } else {
                y += 10;
            }

            // ==========================================
            // QR Y PIE DE PÁGINA
            // ==========================================
            verificarEspacio(160);

            const qrData = JSON.stringify({
                RUC: this.EMPRESA.ruc,
                Tipo: 'NOTA DE VENTA',
                Numero: venta.numero_nota_venta,
                Fecha: fechaVenta,
                Total: totalVenta,
                Cliente: clienteNombre
            });

            const qrBuffer = await this.generarQR(qrData, 100, 100);

            const espacioQRTotal = 165;
            let yQR = doc.page.height - espacioQRTotal - 25;

            if (y < yQR - 20) {
                y = yQR;
            }

            if (qrBuffer) {
                const qrX = CENTRO_PAGINA - 50;
                doc.image(qrBuffer, qrX, y, { width: 100, height: 100 });
                y += 110;
            }

            doc.fontSize(8).font('Helvetica').fillColor(this.COLORES.textoClaro);
            doc.text('Escanee este código QR para verificar la autenticidad del documento',
                MARGEN_IZQ, y, {
                    width: ANCHO_UTIL,
                    align: 'center'
                });

            y += 15;

            doc.fontSize(7);
            doc.text(`Documento generado electrónicamente el ${this.formatearFechaCompleta()}`,
                MARGEN_IZQ, y, {
                    width: ANCHO_UTIL,
                    align: 'center'
                });

            y += 12;

            doc.fontSize(9).font('Helvetica-Bold').fillColor(this.COLORES.primario);
            doc.text('¡Gracias por su preferencia!',
                MARGEN_IZQ, y, {
                    width: ANCHO_UTIL,
                    align: 'center'
                });

            doc.end();
        });
    }
}

module.exports = new ReportesService();