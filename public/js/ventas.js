import { mostrarToast, mostrarModalConfirmacionProfesional, limpiarBackdrops } from './helpers.js';

let ventasGlobal = [];
let productosGlobal = [];
let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};
let productosSeleccionados = [];
let totalVenta = 0;
let cuotaSeleccionada = null;
let ventaActualId = null;
let cotizacionCargada = null;
let modalSeleccionCotizacion = null;

// ============================================
// VALIDACIONES
// ============================================


function soloAlfanumerico(input) {
    input.value = input.value.replace(/[^A-Za-z0-9]/g, '');
}


function validarDocumento(tipo, numero) {
    const num = numero.trim();
    if (tipo === 'DNI' && !/^\d{8}$/.test(num)) {
        return { valido: false, mensaje: 'El DNI debe tener 8 dígitos' };
    }
    if (tipo === 'RUC' && !/^\d{11}$/.test(num)) {
        return { valido: false, mensaje: 'El RUC debe tener 11 dígitos' };
    }
    return { valido: true, mensaje: '' };
}

function validarTelefono(telefono) {
    if (!telefono) return { valido: true, mensaje: '' };
    if (!/^\d{9}$/.test(telefono.trim())) {
        return { valido: false, mensaje: 'El teléfono debe tener 9 dígitos' };
    }
    return { valido: true, mensaje: '' };
}

function validarCorreo(correo) {
    if (!correo) return { valido: true, mensaje: '' };
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!regex.test(correo.trim())) {
        return { valido: false, mensaje: 'Ingrese un correo electrónico válido' };
    }
    return { valido: true, mensaje: '' };
}

// ============================================
// VERIFICAR PÁGINA ACTUAL
// ============================================
function isCurrentPage() {
    return document.getElementById('tablaVentas') !== null;
}
function getElement(id) {
    if (!elementos[id]) elementos[id] = document.getElementById(id);
    return elementos[id];
}
function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const f = new Date(fechaISO);
    return `${f.getDate().toString().padStart(2, '0')}/${(f.getMonth() + 1).toString().padStart(2, '0')}/${f.getFullYear()}`;
}
function soloNumeros(input) { input.value = input.value.replace(/[^0-9]/g, ''); }
function soloLetrasYEspacios(input) { input.value = input.value.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, ''); }

// ============================================
// LIMPIAR FORMULARIO
// ============================================
async function limpiarFormulario() {
    const form = getElement('formVenta');
    if (form) form.reset();
    getElement('ventaId').value = '';
    getElement('tituloModalVenta').textContent = 'Nueva Venta';

    const hoy = new Date();
    getElement('fecha_venta').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Resetear cotización
    cotizacionCargada = null;
    const idCot = document.getElementById('id_cotizacion_origen');
    if (idCot) idCot.value = '';
    const infoDiv = document.getElementById('cotizacionCargadaInfo');
    if (infoDiv) infoDiv.style.display = 'none';
    const btnCargar = document.getElementById('btnCargarCotizacion');
    if (btnCargar) btnCargar.style.display = 'block';

    // Limpiar cliente
    ['tipo_documento_cliente', 'numero_documento_cliente', 'nombre_cliente', 'apellido_cliente', 'telefono_cliente', 'correo_cliente', 'id_cliente'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const alertEl = document.getElementById('clienteNoExistenteAlert');
    if (alertEl) alertEl.style.display = 'none';

    // Limpiar crédito
    const divCredito = document.getElementById('div_credito_fields');
    if (divCredito) divCredito.style.display = 'none';
    getElement('modalidad_pago').value = '';
    const panelCuotas = document.getElementById('panelCuotas');
    if (panelCuotas) panelCuotas.style.display = 'none';

    // Limpiar pagos
    resetearPagos();

    productosSeleccionados = [];
    totalVenta = 0;
    actualizarTablaProductos();

    // Generar número correlativo
    const numero = await generarNumeroNota();
    getElement('numero_nota_venta').value = numero;
}
// ============================================
// TABLA DE PRODUCTOS
// ============================================
function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosVenta');
    if (!tbody) return;
    tbody.innerHTML = '';
    totalVenta = 0;
    productosSeleccionados.forEach((item, idx) => {
        const precio = parseFloat(item.precio_unitario) || 0;
        const cantidad = parseFloat(item.cantidad) || 0;
        const subtotal = precio * cantidad;
        totalVenta += subtotal;
        tbody.innerHTML += `<tr style="font-size:0.8rem"><td>${item.producto_nombre || '-'}</td><td class="text-end">S/ ${precio.toFixed(2)}</td><td class="text-center">${cantidad}</td><td class="text-end">S/ ${subtotal.toFixed(2)}</td><td class="text-center"><button class="btn btn-sm btn-danger btn-eliminar-producto" data-idx="${idx}"><i class="bi bi-trash"></i></button></td></tr>`;
    });
    const totalEl = document.getElementById('totalVenta');
    if (totalEl) totalEl.innerHTML = `S/ ${totalVenta.toFixed(2)}`;
    actualizarResumenPagos();
    setTimeout(() => {
        document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
            btn.onclick = function () {
                productosSeleccionados.splice(parseInt(this.dataset.idx), 1);
                actualizarTablaProductos();
                mostrarToast('Producto eliminado', 'info');
            };
        });
    }, 100);
}


function manejarEliminarProducto(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    productosSeleccionados.splice(idx, 1);
    actualizarTablaProductos();
    mostrarToast('Producto eliminado', 'info');
}

// ============================================
// CARGAR DATOS
// ============================================
async function cargarVentas() {
    if (!isCurrentPage()) return;
    try {
        ventasGlobal = await (await fetch('/api/ventas')).json();
        aplicarFiltros();
    } catch (e) { console.error(e); }
}
async function cargarClientes() {
    if (!isCurrentPage()) return;
    try { clientesGlobal = await (await fetch('/api/clientes')).json(); } catch (e) { console.error(e); }
}
async function cargarProductos() {
    if (!isCurrentPage()) return;
    try {
        productosGlobal = await (await fetch('/api/productos')).json();
        cargarSelectProductos('');
    } catch (e) { console.error(e); }
}
// ============================================
// FILTROS Y RENDERIZADO
// ============================================
function aplicarFiltros() {
    const b = getElement('buscarVenta')?.value?.toLowerCase() || '';
    const e = getElement('filtroEstado')?.value || '';
    const c = parseInt(getElement('filtroCantidad')?.value || 5);
    let f = ventasGlobal.filter(v => v.estado != 3);
    if (e !== '') f = f.filter(v => v.estado == e);
    if (b) f = f.filter(v => v.numero_nota_venta?.toLowerCase().includes(b) || v.cliente?.toLowerCase().includes(b));
    f.sort((a, b) => b.id - a.id);
    renderizar(f.slice(0, c));
}

function renderizar(ventas) {
    const t = getElement('tablaVentas'); if (!t) return;
    t.innerHTML = ventas.length ? ventas.map(v => {
        let eb = ''; if (v.estado === 0) eb = '<span class="badge bg-warning text-dark">Pago Parcial</span>'; else if (v.estado === 1) eb = '<span class="badge bg-success">Pagada</span>'; else if (v.estado === 2) eb = '<span class="badge bg-secondary">Anulada</span>';
        let bt = '';
        if (v.estado === 0) bt = `<button class="btn btn-sm btn-danger btnAnularVenta" data-id="${v.id}"><i class="bi bi-slash-circle"></i></button><button class="btn btn-sm btn-primary btnImprimirVentaDirecto" data-id="${v.id}"><i class="bi bi-printer"></i></button>`;
        else if (v.estado === 1) bt = `<button class="btn btn-sm btn-primary btnImprimirVentaDirecto" data-id="${v.id}"><i class="bi bi-printer"></i></button>`;
        else if (v.estado === 2) bt = `<button class="btn btn-sm btn-success btnActivarVenta" data-id="${v.id}"><i class="bi bi-arrow-repeat"></i></button><button class="btn btn-sm btn-danger btnEliminarVenta" data-id="${v.id}"><i class="bi bi-trash"></i></button>`;
        return `<tr><td class="text-center">${v.id}</td><td><strong>${v.numero_nota_venta}</strong></td><td>${v.cliente || '-'}</td><td>${formatearFecha(v.fecha_venta)}</td><td class="fw-bold text-primary">S/ ${parseFloat(v.total_venta).toFixed(2)}</td><td><span class="badge bg-info">${v.modalidad_pago}</span></td><td>${eb}</td><td class="text-nowrap"><button class="btn btn-sm btn-warning btnVerVenta" data-id="${v.id}"><i class="bi bi-eye"></i></button>${bt}</td></tr>`;
    }).join('') : `<tr><td colspan="8" class="text-center text-muted py-4">No hay ventas registradas</td></tr>`;
}


// ============================================
// CAMBIAR ESTADO
// ============================================
async function cambiarEstado(id, estado, mensajeExito, tipoToast) {
    try {
        const response = await fetch(`/api/ventas/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        await cargarVentas();

        const modalDetalle = document.getElementById('modalDetalleVenta');
        if (modalDetalle && modalDetalle.classList.contains('show')) {
            await mostrarDetalleVenta(id);
        }

        mostrarToast(mensajeExito, tipoToast);
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}

// ============================================
// ENVÍO DE RECORDATORIOS
// ============================================
async function enviarRecordatorioCuota(idCuota, idVenta, canal) {
    mostrarToast(`Enviando recordatorio por ${canal === 'email' ? 'correo' : 'WhatsApp'}...`, 'info');
    setTimeout(() => {
        mostrarToast(`Recordatorio enviado por ${canal === 'email' ? 'correo' : 'WhatsApp'} correctamente`, 'success');
    }, 1500);
}

async function reenviarNotaVenta(idVenta, canal, correoPersonalizado = null) {
    mostrarToast(`Enviando nota por ${canal === 'email' ? 'correo' : 'WhatsApp'}...`, 'info');
    setTimeout(() => {
        mostrarToast(`Nota de venta enviada por ${canal === 'email' ? 'correo' : 'WhatsApp'} correctamente`, 'success');
    }, 1500);
}

// ============================================
// REGISTRAR PAGO ADICIONAL (VENTA A CRÉDITO)
// ============================================
async function registrarPagoAdicional() {
    const idVenta = ventaActualId;
    const monto = parseFloat(document.getElementById('montoPagoAdicional')?.value) || 0;
    const metodoPago = document.getElementById('metodoPagoAdicional')?.value;

    if (!idVenta) {
        mostrarToast('No hay una venta seleccionada', 'warning');
        return;
    }

    if (!metodoPago) {
        mostrarToast('Seleccione un método de pago', 'warning');
        return;
    }

    if (monto <= 0) {
        mostrarToast('Ingrese un monto válido', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/ventas/${idVenta}/pago-adicional`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto: monto,
                metodo_pago: metodoPago
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        mostrarToast('Pago registrado correctamente', 'success');

        await mostrarDetalleVenta(idVenta);

        document.getElementById('montoPagoAdicional').value = '0';
        document.getElementById('metodoPagoAdicional').value = '';

    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}

// ============================================
// PAGO DE CUOTAS
// ============================================
function mostrarFormularioPagoCuota(idCuota, montoCuota, numeroCuota, idVenta) {
    cuotaSeleccionada = {
        id: parseInt(idCuota),
        monto: parseFloat(montoCuota),
        numero: parseInt(numeroCuota),
        ventaId: parseInt(idVenta)
    };

    const montoCuotaInput = document.getElementById('pagoMontoCuota');
    const montoPagarInput = document.getElementById('pagoMontoPagar');
    const metodoPagoSelect = document.getElementById('pagoMetodoPago');
    const container = document.getElementById('formPagoCuotaContainer');

    if (montoCuotaInput) montoCuotaInput.value = cuotaSeleccionada.monto.toFixed(2);
    if (montoPagarInput) {
        montoPagarInput.value = cuotaSeleccionada.monto;
        montoPagarInput.max = cuotaSeleccionada.monto;
    }
    if (metodoPagoSelect) metodoPagoSelect.value = '';
    if (container) container.style.display = 'block';

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ocultarFormularioPagoCuota() {
    const container = document.getElementById('formPagoCuotaContainer');
    if (container) container.style.display = 'none';
    cuotaSeleccionada = null;
}

async function confirmarPagoCuotaIntegrado() {
    if (!cuotaSeleccionada) {
        mostrarToast('No hay una cuota seleccionada', 'warning');
        return;
    }

    const metodoPago = document.getElementById('pagoMetodoPago')?.value;
    let montoPago = parseFloat(document.getElementById('pagoMontoPagar')?.value) || 0;
    const montoTotalCuota = parseFloat(cuotaSeleccionada.monto);
    const idCuota = cuotaSeleccionada.id;
    const idVenta = cuotaSeleccionada.ventaId;

    montoPago = Math.round(montoPago * 100) / 100;

    if (!metodoPago) {
        mostrarToast('Seleccione un método de pago', 'warning');
        return;
    }

    if (montoPago <= 0) {
        mostrarToast('Ingrese un monto válido', 'warning');
        return;
    }

    if (montoPago > montoTotalCuota) {
        mostrarToast(`El monto no puede exceder el total de la cuota (S/ ${montoTotalCuota.toFixed(2)})`, 'warning');
        return;
    }

    try {
        const response = await fetch('/api/pago-cuota/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_cuota_venta: parseInt(idCuota),
                metodo_pago: metodoPago,
                monto: montoPago
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        mostrarToast('Pago registrado correctamente', 'success');
        ocultarFormularioPagoCuota();

        await mostrarDetalleVenta(parseInt(idVenta));

        await cargarVentas();

    } catch (error) {
        console.error('Error en pago:', error);
        mostrarToast(error.message, 'danger');
    }
}

// ============================================
// MOSTRAR DETALLE DE VENTA
// ============================================
async function mostrarDetalleVenta(id) {
    ventaActualId = id;

    try {
        const response = await fetch(`/api/ventas/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const venta = await response.json();

        const totalPagado = venta.pagos?.reduce((sum, p) => sum + parseFloat(p.monto), 0) || 0;
        const saldoPendiente = venta.total_venta - totalPagado;

        limpiarBackdrops();

        const setText = (idEl, value) => {
            const el = document.getElementById(idEl);
            if (el) el.textContent = value;
        };

        const setHtml = (idEl, value) => {
            const el = document.getElementById(idEl);
            if (el) el.innerHTML = value;
        };

        const tbodyProductos = document.getElementById('detalleProductos');
        const tbodyPagos = document.getElementById('detallePagos');
        const tbodyCuotas = document.getElementById('detalleCuotas');

        const origenRow = document.getElementById('detalleOrigenRow');
        const origenText = document.getElementById('detalleOrigen');
        const verPedidoBtn = document.getElementById('btnVerPedidoOrigen');

        if (venta.id_pedido) {
            if (origenRow) origenRow.style.display = 'flex';
            if (origenText) origenText.innerHTML = `<i class="bi bi-truck me-1"></i> Pedido N°: ${venta.numero_pedido || venta.id_pedido}`;
            if (verPedidoBtn) {
                verPedidoBtn.style.display = 'inline-block';
                verPedidoBtn.dataset.idPedido = venta.id_pedido;
            }
        } else {
            if (origenRow) origenRow.style.display = 'flex';
            if (origenText) origenText.innerHTML = `<i class="bi bi-cart-check me-1"></i> Venta directa`;
            if (verPedidoBtn) verPedidoBtn.style.display = 'none';
        }

        const pagoAdicionalRow = document.getElementById('detallePagoAdicionalRow');
        const tienePedido = venta.id_pedido !== null && venta.id_pedido !== undefined;

        if (tienePedido && venta.modalidad_pago === 'CREDITO' && saldoPendiente > 0 && venta.estado !== 2) {
            if (pagoAdicionalRow) pagoAdicionalRow.style.display = 'block';
        } else {
            if (pagoAdicionalRow) pagoAdicionalRow.style.display = 'none';
        }

        if (tbodyProductos) tbodyProductos.innerHTML = '';
        if (tbodyPagos) tbodyPagos.innerHTML = '';
        if (tbodyCuotas) tbodyCuotas.innerHTML = '';

        setText('detalleNumeroNota', venta.numero_nota_venta || '-');
        setText('detalleCliente', venta.cliente || '-');
        setText('detalleFecha', formatearFecha(venta.fecha_venta));
        setText('detalleUsuario', venta.usuario || '-');

        const modalidadBadge = document.getElementById('detalleModalidad');
        if (modalidadBadge) {
            modalidadBadge.textContent = venta.modalidad_pago;
            modalidadBadge.className = venta.modalidad_pago === 'CONTADO' ? 'badge bg-success' : 'badge bg-warning';
        }

        setHtml('detalleTotal', `S/ ${parseFloat(venta.total_venta).toFixed(2)}`);

        const saldoRow = document.getElementById('detalleSaldoRow');
        if (venta.modalidad_pago === 'CREDITO' && saldoPendiente > 0) {
            if (saldoRow) saldoRow.style.display = 'flex';
            setHtml('detalleSaldo', `S/ ${saldoPendiente.toFixed(2)}`);
        } else {
            if (saldoRow) saldoRow.style.display = 'none';
        }

        const estadoBadge = document.getElementById('detalleEstado');
        if (estadoBadge) {
            if (venta.estado === 0) {
                estadoBadge.textContent = 'Pago Parcial';
                estadoBadge.className = 'badge bg-warning text-dark';
            } else if (venta.estado === 1) {
                estadoBadge.textContent = 'Pagada';
                estadoBadge.className = 'badge bg-success';
            } else if (venta.estado === 2) {
                estadoBadge.textContent = 'Anulada';
                estadoBadge.className = 'badge bg-secondary';
            }
        }

        let totalProductos = 0;
        if (tbodyProductos && venta.detalles && venta.detalles.length > 0) {
            venta.detalles.forEach(det => {
                const subtotal = det.precio_unitario * det.cantidad;
                totalProductos += subtotal;
                tbodyProductos.innerHTML += `
                    <tr class="small">
                        <td>${det.producto || '-'}</td>
                        <td class="text-end">S/ ${parseFloat(det.precio_unitario).toFixed(2)}</td>
                        <td class="text-center">${det.cantidad}</td>
                        <td class="text-end">S/ ${subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        setHtml('detalleProductosTotal', `S/ ${totalProductos.toFixed(2)}`);

        const pagosSection = document.getElementById('detallePagosSection');
        if (tbodyPagos && venta.pagos && venta.pagos.length > 0) {
            if (pagosSection) pagosSection.style.display = 'block';
            venta.pagos.forEach(pago => {
                tbodyPagos.innerHTML += `
                    <tr class="small">
                        <td><span class="badge bg-secondary">${pago.metodo_pago}</span></td>
                        <td class="text-end">S/ ${parseFloat(pago.monto).toFixed(2)}</td>
                        <td class="text-end">${pago.fecha_pago || '-'}</td>
                    </tr>
                `;
            });
        } else {
            if (pagosSection) pagosSection.style.display = 'none';
        }

        const cuotasSection = document.getElementById('detalleCuotasSection');
        if (tbodyCuotas && venta.modalidad_pago === 'CREDITO' && venta.cuotas && venta.cuotas.length > 0) {
            if (cuotasSection) cuotasSection.style.display = 'block';
            venta.cuotas.forEach(cuota => {
                const estadoCuota = cuota.estado === 1
                    ? '<span class="badge bg-success">Pagada</span>'
                    : '<span class="badge bg-warning">Pendiente</span>';

                const botonPagar = (cuota.estado === 0 && venta.estado === 0)
                    ? `<button class="btn btn-sm btn-primary btnPagarCuota ms-1" 
                               data-id-cuota="${cuota.id}" 
                               data-monto="${cuota.monto}" 
                               data-numero="${cuota.numero_cuota}" 
                               data-id-venta="${venta.id}">
                            <i class="bi bi-credit-card"></i> Pagar
                        </button>`
                    : '';

                const botonCorreo = (cuota.estado === 0 && venta.estado === 0)
                    ? `<button class="btn btn-sm btn-outline-info btnEnviarCorreoCuota ms-1" 
                               data-id-cuota="${cuota.id}" 
                               data-id-venta="${venta.id}"
                               title="Enviar recordatorio por correo">
                            <i class="bi bi-envelope"></i>
                        </button>`
                    : '';

                const botonWhatsApp = (cuota.estado === 0 && venta.estado === 0)
                    ? `<button class="btn btn-sm btn-outline-success btnEnviarWhatsAppCuota ms-1" 
                               data-id-cuota="${cuota.id}" 
                               data-id-venta="${venta.id}" 
                               data-telefono="${venta.telefono || ''}"
                               title="Enviar recordatorio por WhatsApp">
                            <i class="bi bi-whatsapp"></i>
                        </button>`
                    : '';

                tbodyCuotas.innerHTML += `
                    <tr class="small">
                        <td class="text-center">${cuota.numero_cuota}</td>
                        <td class="text-end">S/ ${parseFloat(cuota.monto).toFixed(2)}</td>
                        <td class="text-center">${cuota.fecha_vencimiento || '-'}</td>
                        <td class="text-center">${estadoCuota}</td>
                        <td class="text-center">${botonPagar} ${botonCorreo} ${botonWhatsApp}</td>
                    </tr>
                `;
            });

            setTimeout(() => {
                document.querySelectorAll('#detalleCuotas .btnPagarCuota').forEach(btn => {
                    btn.removeEventListener('click', manejarPagoCuota);
                    btn.addEventListener('click', manejarPagoCuota);
                });
                document.querySelectorAll('#detalleCuotas .btnEnviarCorreoCuota').forEach(btn => {
                    btn.removeEventListener('click', manejarEnvioCorreoCuota);
                    btn.addEventListener('click', manejarEnvioCorreoCuota);
                });
                document.querySelectorAll('#detalleCuotas .btnEnviarWhatsAppCuota').forEach(btn => {
                    btn.removeEventListener('click', manejarEnvioWhatsAppCuota);
                    btn.addEventListener('click', manejarEnvioWhatsAppCuota);
                });
            }, 100);
        } else {
            if (cuotasSection) cuotasSection.style.display = 'none';
        }

        ocultarFormularioPagoCuota();

        const modalElement = document.getElementById('modalDetalleVenta');
        const modalFooter = modalElement.querySelector('.modal-footer');

        if (modalFooter) {
            modalFooter.innerHTML = `
                <div class="btn-group me-auto" role="group">
                    <button type="button" class="btn btn-sm btn-outline-info" id="btnReenviarNotaCorreo">
                        <i class="bi bi-envelope me-1"></i> Correo
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-success" id="btnReenviarNotaWhatsApp">
                        <i class="bi bi-whatsapp me-1"></i> WhatsApp
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="btnVerPedidoOrigen" style="display: none;">
                        <i class="bi bi-truck me-1"></i> Ver Pedido
                    </button>
                </div>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-sm btn-primary" id="btnImprimirVentaModal">
                        <i class="bi bi-printer me-1"></i> Imprimir
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x-circle me-1"></i> Cerrar
                    </button>
                </div>
            `;
        }

        const btnImprimirModal = document.getElementById('btnImprimirVentaModal');
        if (btnImprimirModal) {
            const newBtn = btnImprimirModal.cloneNode(true);
            btnImprimirModal.parentNode.replaceChild(newBtn, btnImprimirModal);
            newBtn.addEventListener('click', () => {
                mostrarModalOpcionesImpresion(ventaActualId);
            });
        }

        const btnReenviarCorreo = document.getElementById('btnReenviarNotaCorreo');
        if (btnReenviarCorreo) {
            const newBtn = btnReenviarCorreo.cloneNode(true);
            btnReenviarCorreo.parentNode.replaceChild(newBtn, btnReenviarCorreo);
            newBtn.addEventListener('click', async () => {
                if (!ventaActualId) {
                    mostrarToast('No hay una venta seleccionada', 'warning');
                    return;
                }
                await reenviarNotaVenta(ventaActualId, 'email');
            });
        }

        const btnReenviarWhatsApp = document.getElementById('btnReenviarNotaWhatsApp');
        if (btnReenviarWhatsApp) {
            const newBtn = btnReenviarWhatsApp.cloneNode(true);
            btnReenviarWhatsApp.parentNode.replaceChild(newBtn, btnReenviarWhatsApp);
            newBtn.addEventListener('click', async () => {
                if (!ventaActualId) {
                    mostrarToast('No hay una venta seleccionada', 'warning');
                    return;
                }
                await reenviarNotaVenta(ventaActualId, 'whatsapp');
            });
        }

        const btnVerPedido = document.getElementById('btnVerPedidoOrigen');
        if (btnVerPedido && venta.id_pedido) {
            const newBtn = btnVerPedido.cloneNode(true);
            btnVerPedido.parentNode.replaceChild(newBtn, btnVerPedido);
            newBtn.addEventListener('click', async () => {
                const idPedido = newBtn.dataset.idPedido;
                if (idPedido) {
                    await mostrarDetallePedidoDesdeVenta(parseInt(idPedido));
                }
            });
        }

        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.show();

    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar detalles', 'danger');
    }
}

// ============================================
// MANEJADORES DE EVENTOS
// ============================================
function manejarPagoCuota(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const idCuota = btn.dataset.idCuota;
    const monto = btn.dataset.monto;
    const numero = btn.dataset.numero;
    const idVenta = btn.dataset.idVenta;

    if (!idCuota || !monto || !idVenta) {
        mostrarToast('Error: Datos de la cuota incompletos', 'danger');
        return;
    }

    mostrarFormularioPagoCuota(idCuota, monto, numero, idVenta);
}

function manejarEnvioCorreoCuota(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const idCuota = btn.dataset.idCuota;
    const idVenta = btn.dataset.idVenta;

    if (!idCuota || !idVenta) {
        mostrarToast('Error: Datos incompletos', 'danger');
        return;
    }

    enviarRecordatorioCuota(idCuota, idVenta, 'email');
}

function manejarEnvioWhatsAppCuota(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    const idCuota = btn.dataset.idCuota;
    const idVenta = btn.dataset.idVenta;
    const telefono = btn.dataset.telefono;

    if (!idCuota || !idVenta) {
        mostrarToast('Error: Datos incompletos', 'danger');
        return;
    }

    if (!telefono) {
        mostrarToast('El cliente no tiene número de teléfono registrado', 'warning');
        return;
    }

    enviarRecordatorioCuota(idCuota, idVenta, 'whatsapp');
}

// ============================================
// BUSCAR CLIENTE
// ============================================
function setupBusquedaClienteVenta() {
    const tipoDoc = document.getElementById('tipo_documento_cliente');
    const numDoc = document.getElementById('numero_documento_cliente');
    const btnBuscar = document.getElementById('btnBuscarClienteVenta');

    // Auto-detección DNI/RUC
    if (numDoc && tipoDoc) {
        numDoc.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            const l = this.value.length;
            if (l === 8) tipoDoc.value = 'DNI';
            else if (l === 11) tipoDoc.value = 'RUC';
            else if (l > 11) { this.value = this.value.slice(0, 11); tipoDoc.value = 'RUC'; }
            else if (l === 0) tipoDoc.value = '';
        });
        numDoc.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const l = this.value.length;
                if ((l === 8 || l === 11) && btnBuscar) {
                    tipoDoc.value = l === 8 ? 'DNI' : 'RUC';
                    btnBuscar.click();
                }
            }
        });
    }

    if (!btnBuscar) return;
    btnBuscar.addEventListener('click', async () => {
        const td = tipoDoc?.value;
        const nd = numDoc?.value.trim();

        // Permitir venta sin documento
        if (!nd) {
            document.getElementById('id_cliente').value = '';
            document.getElementById('nombre_cliente').value = 'CLIENTE VARIOS';
            document.getElementById('apellido_cliente').value = '';
            document.getElementById('clienteNoExistenteAlert').style.display = 'none';
            mostrarToast('Venta sin documento - Cliente genérico', 'info');
            return;
        }

        if (!td) { mostrarToast('Seleccione tipo de documento', 'warning'); return; }
        if (td === 'DNI' && nd.length !== 8) { mostrarToast('DNI debe tener 8 dígitos', 'warning'); return; }
        if (td === 'RUC' && nd.length !== 11) { mostrarToast('RUC debe tener 11 dígitos', 'warning'); return; }

        const orig = btnBuscar.innerHTML;
        btnBuscar.disabled = true;
        btnBuscar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const data = await (await fetch(`/api/clientes/consultar-documento?numero=${nd}&tipo=${td}`)).json();
            if (data.error) throw new Error(data.error);

            // NO permitir editar nombre/apellido
            document.getElementById('nombre_cliente').value = data.cliente?.nombre || '';
            document.getElementById('apellido_cliente').value = data.cliente?.apellido || '';
            document.getElementById('nombre_cliente').readOnly = true;
            document.getElementById('apellido_cliente').readOnly = true;

            if (data.encontrado && data.cliente?.id) {
                document.getElementById('id_cliente').value = data.cliente.id;
                document.getElementById('telefono_cliente').value = data.cliente.telefono || '';
                document.getElementById('correo_cliente').value = data.cliente.correo || '';
                document.getElementById('clienteNoExistenteAlert').style.display = 'none';
                mostrarToast('Cliente encontrado', 'success');
            } else {
                document.getElementById('id_cliente').value = '';
                document.getElementById('clienteNoExistenteAlert').style.display = 'block';
                mostrarToast('Cliente no registrado. Se registrará al guardar.', 'info');
            }
        } catch (e) {
            mostrarToast(e.message || 'Error al consultar', 'danger');
            document.getElementById('nombre_cliente').value = '';
            document.getElementById('apellido_cliente').value = '';
            document.getElementById('id_cliente').value = '';
        } finally {
            btnBuscar.disabled = false;
            btnBuscar.innerHTML = orig;
        }
    });

    document.getElementById('btnLimpiarCliente')?.addEventListener('click', () => {
        ['tipo_documento_cliente', 'numero_documento_cliente', 'nombre_cliente', 'apellido_cliente', 'telefono_cliente', 'correo_cliente', 'id_cliente'].forEach(id => {
            const el = document.getElementById(id); if (el) { el.value = ''; el.readOnly = false; }
        });
        document.getElementById('clienteNoExistenteAlert').style.display = 'none';
    });
}


// ============================================
// VALIDACIONES EN TIEMPO REAL
// ============================================
function setupValidacionesTiempoRealCliente() {
    const tipoDocumento = document.getElementById('tipo_documento_cliente');
    const numeroDocumento = document.getElementById('numero_documento_cliente');
    const telefono = document.getElementById('telefono_cliente');
    const nombre = document.getElementById('nombre_cliente');
    const apellido = document.getElementById('apellido_cliente');

    if (tipoDocumento) {
        tipoDocumento.addEventListener('change', () => {
            if (numeroDocumento) {
                numeroDocumento.value = '';
                numeroDocumento.oninput = () => soloNumeros(numeroDocumento);
                if (tipoDocumento.value === 'DNI') {
                    numeroDocumento.maxLength = 8;
                    numeroDocumento.placeholder = 'Ej: 12345678';
                } else if (tipoDocumento.value === 'RUC') {
                    numeroDocumento.maxLength = 11;
                    numeroDocumento.placeholder = 'Ej: 20123456789';
                }
            }
        });
    }

    if (telefono) telefono.oninput = () => soloNumeros(telefono);
    if (nombre) nombre.oninput = () => soloLetrasYEspacios(nombre);
    if (apellido) apellido.oninput = () => soloLetrasYEspacios(apellido);
}

// ============================================
// IMPRIMIR NOTA DE VENTA EN PDF
// ============================================
async function imprimirNotaVentaPDF(idVenta, tipo = 'A4') {
    if (!idVenta) {
        mostrarToast('No hay una venta seleccionada', 'warning');
        return;
    }

    const tipoTexto = tipo === 'A4' ? 'Formato A4' : 'Ticket 80mm';
    mostrarToast(`Generando PDF (${tipoTexto})...`, 'info');

    try {
        const response = await fetch(`/api/reportes/venta/${idVenta}/pdf?tipo=${tipo}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar el PDF');
        }

        const blob = await response.blob();

        if (blob.type !== 'application/pdf') {
            throw new Error('El archivo generado no es un PDF válido');
        }

        const url = window.URL.createObjectURL(blob);
        const nuevaVentana = window.open(url, '_blank');

        if (!nuevaVentana) {
            mostrarToast('El navegador bloqueó la ventana emergente. Permita popups para esta página.', 'warning');
            const link = document.createElement('a');
            link.href = url;
            link.download = `nota_venta_${idVenta}_${tipo}.pdf`;
            link.click();
        }

        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 2000);

        mostrarToast('PDF generado correctamente', 'success');

    } catch (error) {
        console.error('Error al generar PDF:', error);
        mostrarToast(error.message || 'Error al generar el PDF. Verifique que el servidor esté funcionando.', 'danger');
    }
}

// ============================================
// MODAL DE OPCIONES DE IMPRESIÓN
// ============================================
function mostrarModalOpcionesImpresion(idVenta) {
    let modalElement = document.getElementById('modalOpcionesImpresion');

    if (!modalElement) {
        modalElement = document.createElement('div');
        modalElement.className = 'modal fade';
        modalElement.id = 'modalOpcionesImpresion';
        modalElement.tabIndex = '-1';
        modalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
                <div class="modal-content shadow-lg border-0" style="border-radius: 20px;">
                    <div class="modal-header border-0" style="background: linear-gradient(135deg, #1a2a3a 0%, #0f1724 100%);">
                        <h5 class="modal-title text-white">
                            <i class="bi bi-printer me-2"></i>Opciones de Impresión
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <p class="text-muted mb-3">Seleccione el formato para imprimir la nota de venta:</p>
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary btn-lg" id="optImprimirA4">
                                <i class="bi bi-file-text me-2"></i>
                                <div class="d-inline-block text-start">
                                    <div class="fw-bold">Formato A4</div>
                                    <small class="text-white-50">Documento tamaño carta (recomendado)</small>
                                </div>
                            </button>
                            
                            <button class="btn btn-info btn-lg" id="optImprimirTicket">
                                <i class="bi bi-receipt me-2"></i>
                                <div class="d-inline-block text-start">
                                    <div class="fw-bold">Formato Ticket 80mm</div>
                                    <small class="text-white-50">Para impresoras térmicas</small>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer border-0 justify-content-center">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
    }

    const optA4 = document.getElementById('optImprimirA4');
    const optTicket = document.getElementById('optImprimirTicket');

    const newOptA4 = optA4.cloneNode(true);
    const newOptTicket = optTicket.cloneNode(true);

    optA4.parentNode.replaceChild(newOptA4, optA4);
    optTicket.parentNode.replaceChild(newOptTicket, optTicket);

    newOptA4.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        imprimirNotaVentaPDF(idVenta, 'A4');
    });

    newOptTicket.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        imprimirNotaVentaPDF(idVenta, 'ticket');
    });

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// ============================================
// MODALIDAD DE PAGO
// ============================================
function setupModalidadPago() {
    const modalidadPago = getElement('modalidad_pago');
    if (!modalidadPago) return;

    modalidadPago.addEventListener('change', () => {
        const isCredito = modalidadPago.value === 'CREDITO';
        const divCredito = document.getElementById('div_credito_fields');
        if (divCredito) {
            divCredito.style.display = isCredito ? 'block' : 'none';
        }

        if (isCredito) {
            setTimeout(() => calcularYMostrarCuotas(), 100);
        } else {
            const panelCuotas = document.getElementById('panelCuotas');
            if (panelCuotas) panelCuotas.style.display = 'none';
        }
    });
}

function resetearPagos() {
    const container = document.getElementById('pagosContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="row g-2 pago-item mb-2 align-items-end">
            <div class="col-md-3">
                <label class="form-label small">Medio de Pago <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm medio-pago-select" required>
                    <option value="">Seleccione...</option>
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="YAPE">📱 Yape</option>
                    <option value="PLIN">📱 Plin</option>
                    <option value="TARJETA">💳 Tarjeta</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small">Monto S/ <span class="text-danger">*</span></label>
                <input type="number" class="form-control form-control-sm monto-pago" value="0" min="0" step="0.01" required>
            </div>
            <div class="col-md-3">
                <label class="form-label small">N° Operación <span class="operacion-required text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm numero-operacion" placeholder="Obligatorio" maxlength="50">
            </div>
            <div class="col-md-3">
                <label class="form-label small">Observación</label>
                <input type="text" class="form-control form-control-sm obs-pago" placeholder="Opcional" maxlength="255">
            </div>
            <div class="col-md-1">
                <button type="button" class="btn btn-sm btn-outline-danger btn-eliminar-pago" title="Eliminar" style="display:none;"><i class="bi bi-trash"></i></button>
            </div>
        </div>`;
    actualizarResumenPagos();
    setupPagoEvents();
}


function setupPagoEvents() {
    document.querySelectorAll('.medio-pago-select').forEach(sel => {
        sel.addEventListener('change', function () {
            const row = this.closest('.pago-item');
            const opReq = row.querySelector('.operacion-required');
            const numOp = row.querySelector('.numero-operacion');
            if (this.value === 'EFECTIVO') {
                opReq.style.display = 'none';
                numOp.required = false;
                numOp.placeholder = 'No requerido';
            } else {
                opReq.style.display = 'inline';
                numOp.required = true;
                numOp.placeholder = 'Obligatorio';
            }
        });
    });

    document.querySelectorAll('.monto-pago').forEach(inp => {
        inp.addEventListener('input', actualizarResumenPagos);
    });
}


// ============================================
// PRODUCTOS
// ============================================
function cargarSelectProductos(filtro = '') {
    const selectProducto = document.getElementById('selectProducto');
    if (!selectProducto) return;
    let productosFiltrados = productosGlobal.filter(p => p.estado === 1);
    if (filtro.trim() !== '') {
        const termino = filtro.toLowerCase();
        productosFiltrados = productosFiltrados.filter(p => p.nombre.toLowerCase().includes(termino) || (p.codigo_barras && p.codigo_barras.includes(termino)));
    }
    selectProducto.innerHTML = '<option value="">-- Seleccione un producto --</option>';
    productosFiltrados.forEach(producto => {
        selectProducto.innerHTML += `<option value="${producto.id}" data-precio="${producto.precio}" data-stock="${producto.stock}">${producto.nombre} - Stock: ${producto.stock}</option>`;
    });
}

function setupAgregarProducto() {
    const selectProducto = document.getElementById('selectProducto');
    const buscarInput = document.getElementById('buscarProductoInput');
    const btnAgregarLista = document.getElementById('btnAgregarProductoLista');

    if (buscarInput) {
        buscarInput.addEventListener('input', (e) => {
            cargarSelectProductos(e.target.value);
        });
    }

    if (selectProducto) {
        selectProducto.addEventListener('change', () => {
            const selectedOption = selectProducto.options[selectProducto.selectedIndex];
            const precio = selectedOption.dataset.precio;
            const stock = selectedOption.dataset.stock;
            const unidad = selectedOption.dataset.unidad;

            document.getElementById('precioUnitario').value = precio ? parseFloat(precio).toFixed(2) : '';
            document.getElementById('stockDisponible').value = stock ? `${stock} ${unidad || ''}` : '';
            document.getElementById('cantidadProducto').value = '1';
        });
    }

    if (btnAgregarLista) {
        btnAgregarLista.addEventListener('click', () => {
            const productoId = selectProducto?.value;
            const productoNombre = selectProducto?.options[selectProducto.selectedIndex]?.text?.split(' -')[0];
            const precio = parseFloat(document.getElementById('precioUnitario')?.value);
            const cantidad = parseFloat(document.getElementById('cantidadProducto')?.value);
            const stockText = document.getElementById('stockDisponible')?.value;
            const stock = parseFloat(stockText) || 0;

            if (!productoId) {
                mostrarToast('Seleccione un producto', 'warning');
                return;
            }
            if (!cantidad || cantidad <= 0) {
                mostrarToast('Cantidad inválida', 'warning');
                return;
            }
            if (cantidad > stock) {
                mostrarToast('Stock insuficiente', 'warning');
                return;
            }

            const productoExistente = productosSeleccionados.find(p => p.id_producto === parseInt(productoId));
            if (productoExistente) {
                productoExistente.cantidad += cantidad;
                productoExistente.precio_unitario = precio;
                actualizarTablaProductos();
                mostrarToast('Producto actualizado en la lista', 'success');
            } else {
                productosSeleccionados.push({
                    id_producto: parseInt(productoId),
                    producto_nombre: productoNombre,
                    precio_unitario: precio,
                    cantidad: cantidad
                });
                actualizarTablaProductos();
                mostrarToast('Producto agregado correctamente', 'success');
            }

            if (selectProducto) selectProducto.value = '';
            if (buscarInput) buscarInput.value = '';
            document.getElementById('cantidadProducto').value = '1';
            document.getElementById('precioUnitario').value = '';
            document.getElementById('stockDisponible').value = '';
            cargarSelectProductos('');
        });
    }
}

function agregarPago() {
    const container = document.getElementById('pagosContainer');
    const nuevo = container.querySelector('.pago-item').cloneNode(true);
    nuevo.querySelector('.medio-pago-select').value = '';
    nuevo.querySelector('.monto-pago').value = '0';
    nuevo.querySelector('.numero-operacion').value = '';
    nuevo.querySelector('.obs-pago').value = '';
    nuevo.querySelector('.btn-eliminar-pago').style.display = 'block';
    container.appendChild(nuevo);
    actualizarResumenPagos();
    setupPagoEvents();
}

// ============================================
// GENERAR NÚMERO DE NOTA
// ============================================
async function generarNumeroNota() {
    try {
        const resp = await (await fetch('/api/ventas/generar-numero')).json();
        return resp.numero_nota_venta || '';
    } catch (e) {
        const f = new Date();
        return `NV${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}${String(f.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
}
// ============================================
// GUARDAR VENTA
// ============================================
function setupGuardarVenta() {
    const btnGuardar = getElement('btnGuardarVenta');
    if (!btnGuardar) return;

    btnGuardar.onclick = async () => {
        const id = getElement('ventaId')?.value;
        const numero_nota_venta = getElement('numero_nota_venta')?.value.trim();
        const id_cotizacion = document.getElementById('id_cotizacion_origen')?.value || null;
        let id_cliente = document.getElementById('id_cliente')?.value;
        const tipo_documento = document.getElementById('tipo_documento_cliente')?.value;
        const numero_documento = document.getElementById('numero_documento_cliente')?.value.trim();
        const nombre_cliente = document.getElementById('nombre_cliente')?.value.trim();
        const apellido_cliente = document.getElementById('apellido_cliente')?.value.trim();
        const telefono_cliente = document.getElementById('telefono_cliente')?.value.trim();
        const correo_cliente = document.getElementById('correo_cliente')?.value.trim();

        // Validar cliente
        if (!id_cliente && !nombre_cliente) {
            mostrarToast('Debe buscar un cliente o ingresar "CLIENTE VARIOS"', 'warning');
            return;
        }

        // Registrar cliente si no existe
        if (!id_cliente && numero_documento) {
            try {
                const nuevo = { tipo_documento, numero_documento, nombre: nombre_cliente || 'Cliente', apellido: apellido_cliente || '', telefono: telefono_cliente || '', correo: correo_cliente || '' };
                const reg = await (await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo) })).json();
                if (reg.error) throw new Error(reg.error);
                const clientes = await (await fetch('/api/clientes')).json();
                const c = clientes.find(x => x.numero_documento === numero_documento);
                id_cliente = c?.id;
                if (!id_cliente) throw new Error('No se pudo obtener ID');
                mostrarToast('Cliente registrado', 'success');
            } catch (e) { mostrarToast(e.message, 'danger'); return; }
        }

        // Si no hay documento, crear cliente genérico
        if (!id_cliente && !numero_documento) {
            id_cliente = 1; // Cliente genérico ID 1
        }

        const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
        const id_usuario = sesion?.usuario?.id;
        if (!id_usuario) { mostrarToast('Usuario no encontrado', 'danger'); return; }

        const modalidad_pago = getElement('modalidad_pago')?.value;
        const cantidad_cuotas = parseInt(getElement('cantidad_cuotas')?.value) || 0;
        const intervalo_dias = parseInt(getElement('intervalo_dias')?.value) || 0;
        const observacion = getElement('observacion')?.value;

        if (!numero_nota_venta) { mostrarToast('Número de nota obligatorio', 'warning'); return; }
        if (!modalidad_pago) { mostrarToast('Seleccione modalidad', 'warning'); return; }
        if (productosSeleccionados.length === 0) { mostrarToast('Agregue productos', 'warning'); return; }

        // Obtener pagos
        const pagos = obtenerPagos();
        if (pagos.length === 0) { mostrarToast('Especifique al menos un pago', 'warning'); return; }

        const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);

        // Validar CONTADO
        if (modalidad_pago === 'CONTADO' && totalPagado < totalVenta) {
            mostrarToast(`El pago (S/ ${totalPagado.toFixed(2)}) no cubre el total (S/ ${totalVenta.toFixed(2)})`, 'warning');
            return;
        }

        // Validar CRÉDITO
        if (modalidad_pago === 'CREDITO') {
            if (totalVenta - totalPagado <= 0) { mostrarToast('No hay deuda para crédito', 'warning'); return; }
            if (cantidad_cuotas <= 0) { mostrarToast('Ingrese cantidad de cuotas', 'warning'); return; }
            if (intervalo_dias <= 0) { mostrarToast('Ingrese intervalo de días', 'warning'); return; }
        }

        try {
            const body = {
                numero_nota_venta, id_pedido: null,
                id_cotizacion: id_cotizacion ? parseInt(id_cotizacion) : null,
                id_cliente: parseInt(id_cliente), id_usuario,
                modalidad_pago, total_venta: totalVenta, observacion,
                productos: productosSeleccionados, pagos,
                cantidad_cuotas, intervalo_dias
            };

            const data = await (await fetch(id ? `/api/ventas/${id}` : '/api/ventas', {
                method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            })).json();

            if (data.error) throw new Error(data.error);

            if (id_cotizacion) {
                await fetch(`/api/cotizaciones/${id_cotizacion}/estado`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 3 })
                });
            }

            await cargarVentas();
            mostrarToast('Venta registrada', 'success');
            bootstrap.Modal.getInstance(getElement('modalVenta'))?.hide();
            await limpiarFormulario();
        } catch (e) { mostrarToast(e.message, 'danger'); }
    };
}

function actualizarResumenPagos() {
    let total = 0;
    document.querySelectorAll('.monto-pago').forEach(inp => {
        total += parseFloat(inp.value) || 0;
    });
    const totalPagado = document.getElementById('totalPagadoPagos');
    const pendiente = document.getElementById('pendientePago');
    if (totalPagado) totalPagado.textContent = `S/ ${total.toFixed(2)}`;
    if (pendiente) {
        const pend = totalVenta - total;
        pendiente.textContent = `S/ ${Math.max(0, pend).toFixed(2)}`;
        pendiente.style.color = pend > 0.01 ? '#dc2626' : '#059669';
    }
    const cant = document.querySelectorAll('.pago-item').length;
    const cantEl = document.getElementById('cantidadPagos');
    if (cantEl) cantEl.textContent = `${cant} medio(s) de pago`;
}


function obtenerPagos() {
    const pagos = [];
    document.querySelectorAll('.pago-item').forEach(row => {
        const metodo = row.querySelector('.medio-pago-select')?.value;
        const monto = parseFloat(row.querySelector('.monto-pago')?.value) || 0;
        const numOp = row.querySelector('.numero-operacion')?.value || '';
        const obs = row.querySelector('.obs-pago')?.value || '';
        if (metodo && monto > 0) {
            pagos.push({ metodo_pago: metodo, monto, numero_operacion: numOp, observacion: obs });
        }
    });
    return pagos;
}

// ============================================
// ABRIR MODAL DE SELECCIÓN DE COTIZACIONES
// ============================================
async function abrirModalSeleccionarCotizacion() {
    try {
        const response = await fetch('/api/cotizaciones');
        if (!response.ok) throw new Error('Error al cargar cotizaciones');

        const cotizaciones = await response.json();
        const activas = cotizaciones.filter(c => c.estado === 1);

        const tbody = document.getElementById('tablaCotizacionesModal');
        const sinDatos = document.getElementById('sinCotizacionesModal');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (activas.length === 0) {
            if (sinDatos) sinDatos.style.display = 'block';
        } else {
            if (sinDatos) sinDatos.style.display = 'none';

            activas.forEach(cot => {
                tbody.innerHTML += `
                    <tr style="font-size:0.75rem;">
                        <td><strong>${cot.numero_cotizacion}</strong></td>
                        <td>${cot.cliente || '-'}</td>
                        <td>${formatearFecha(cot.fecha)}</td>
                        <td>${formatearFecha(cot.fecha_vencimiento)}</td>
                        <td class="text-end fw-bold">S/ ${parseFloat(cot.total).toFixed(2)}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-success btnSeleccionarCotizacion" data-id="${cot.id}">
                                <i class="bi bi-check-circle me-1"></i> Seleccionar
                            </button>
                        </td>
                    </tr>`;
            });
        }

        // Configurar búsqueda en el modal
        const buscarInput = document.getElementById('buscarCotizacionModal');
        if (buscarInput) {
            buscarInput.value = '';
            buscarInput.oninput = (e) => {
                const valor = e.target.value.toLowerCase();
                tbody.querySelectorAll('tr').forEach(fila => {
                    fila.style.display = fila.textContent.toLowerCase().includes(valor) ? '' : 'none';
                });
            };
        }

        // Configurar selección de cotización
        tbody.querySelectorAll('.btnSeleccionarCotizacion').forEach(btn => {
            btn.onclick = async (e) => {
                const id = parseInt(e.currentTarget.dataset.id);

                // Cerrar modal de selección
                if (modalSeleccionCotizacion) {
                    modalSeleccionCotizacion.hide();
                }

                // Cargar datos
                await seleccionarCotizacion(id);
            };
        });

        // Mostrar modal de selección
        if (modalSeleccionCotizacion) {
            modalSeleccionCotizacion.show();
        }

    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar cotizaciones', 'danger');
    }
}

// ============================================
// SELECCIONAR COTIZACIÓN Y CARGAR DATOS
// ============================================
async function seleccionarCotizacion(idCotizacion) {
    try {
        const response = await fetch(`/api/cotizaciones/${idCotizacion}`);
        if (!response.ok) throw new Error('Error al obtener cotización');

        const cot = await response.json();
        cotizacionCargada = cot;

        document.getElementById('id_cotizacion_origen').value = cot.id;

        // Cargar datos del cliente
        if (cot.id_cliente) {
            document.getElementById('id_cliente').value = cot.id_cliente;

            // Cargar datos completos del cliente desde la API
            try {
                const res = await fetch('/api/clientes');
                const clientes = await res.json();
                const cliente = clientes.find(c => c.id === cot.id_cliente);

                if (cliente) {
                    document.getElementById('nombre_cliente').value = cliente.nombre || '';
                    document.getElementById('apellido_cliente').value = cliente.apellido || '';
                    document.getElementById('numero_documento_cliente').value = cliente.numero_documento || '';
                    document.getElementById('tipo_documento_cliente').value = cliente.tipo_documento || '';
                    document.getElementById('telefono_cliente').value = cliente.telefono || '';
                    document.getElementById('correo_cliente').value = cliente.correo || '';
                    document.getElementById('clienteNoExistenteAlert').style.display = 'none';
                } else {
                    // Separar nombre completo como fallback
                    const nombreCompleto = cot.cliente || '';
                    const partes = nombreCompleto.split(' ');
                    document.getElementById('nombre_cliente').value = partes[0] || '';
                    document.getElementById('apellido_cliente').value = partes.slice(1).join(' ') || '';
                }
            } catch (e) {
                const nombreCompleto = cot.cliente || '';
                const partes = nombreCompleto.split(' ');
                document.getElementById('nombre_cliente').value = partes[0] || '';
                document.getElementById('apellido_cliente').value = partes.slice(1).join(' ') || '';
            }
        }

        // Cargar productos
        productosSeleccionados = [];
        if (cot.detalles) {
            cot.detalles.forEach(det => {
                productosSeleccionados.push({
                    id_producto: det.id_producto || null,
                    producto_nombre: det.producto_nombre,
                    precio_unitario: parseFloat(det.precio_original) || 0,
                    cantidad: parseInt(det.cantidad) || 0
                });
            });
        }

        actualizarTablaProductos();

        document.getElementById('cotizacionCargadaInfo').style.display = 'block';
        document.getElementById('cotizacionCargadaNumero').textContent = cot.numero_cotizacion;
        document.getElementById('btnCargarCotizacion').style.display = 'none';

        mostrarToast(`Cotización ${cot.numero_cotizacion} cargada correctamente`, 'success');

    } catch (error) {
        console.error('Error al cargar cotización:', error);
        mostrarToast('Error al cargar la cotización', 'danger');
    }
}



// ============================================
// NUEVA VENTA
// ============================================
function setupNuevaVenta() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalVenta"]');
    if (nuevoBtn) {
        const nuevoBtnClone = nuevoBtn.cloneNode(true);
        nuevoBtn.parentNode.replaceChild(nuevoBtnClone, nuevoBtn);

        nuevoBtnClone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            limpiarFormulario();
            const modalVenta = new bootstrap.Modal(document.getElementById('modalVenta'));
            modalVenta.show();
        });
    }
}

// ============================================
// CALCULAR CUOTAS
// ============================================
function calcularYMostrarCuotas() {
    const totalVentaValue = totalVenta;
    const pagoInicial = parseFloat(document.getElementById('pago_inicial')?.value) || 0;
    const cantidadCuotas = parseInt(document.getElementById('cantidad_cuotas')?.value) || 0;
    const intervaloDias = parseInt(document.getElementById('intervalo_dias')?.value) || 0;
    const modalidadPago = document.getElementById('modalidad_pago')?.value;
    const panelCuotas = document.getElementById('panelCuotas');

    if (modalidadPago === 'CREDITO' && cantidadCuotas > 0 && totalVentaValue > pagoInicial) {
        const montoFinanciar = totalVentaValue - pagoInicial;
        const montoPorCuota = montoFinanciar / cantidadCuotas;

        const montoFinanciarSpan = document.getElementById('montoFinanciar');
        if (montoFinanciarSpan) {
            montoFinanciarSpan.innerHTML = `S/ ${montoFinanciar.toFixed(2)}`;
        }

        const tbody = document.getElementById('tablaResumenCuotas');
        if (tbody) {
            tbody.innerHTML = '';
            let fechaActual = new Date();
            const fechaInput = document.getElementById('fecha_venta');
            if (fechaInput && fechaInput.value) {
                fechaActual = new Date(fechaInput.value);
            }

            for (let i = 1; i <= cantidadCuotas; i++) {
                const fechaVencimiento = new Date(fechaActual);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + (intervaloDias * i));
                const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                const fechaFormateada = `${fechaVencimiento.getDate().toString().padStart(2, '0')} ${meses[fechaVencimiento.getMonth()]} ${fechaVencimiento.getFullYear()}`;

                tbody.innerHTML += `
                    <tr style="font-size: 0.75rem;">
                        <td class="text-center fw-bold">${i}</td>
                        <td class="text-end">S/ ${montoPorCuota.toFixed(2)}</td>
                        <td class="text-center">${fechaFormateada}</td>
                    </tr>
                `;
            }
        }
        panelCuotas.style.display = 'block';
    } else {
        panelCuotas.style.display = 'none';
    }
}

// ============================================
// CARGAR COTIZACIÓN EN VENTA
// ============================================
function setupCargarCotizacion() {
    const btnCargar = document.getElementById('btnCargarCotizacion');
    if (!btnCargar) return;

    btnCargar.addEventListener('click', abrirModalSeleccionarCotizacion);

    const btnQuitar = document.getElementById('btnQuitarCotizacion');
    if (btnQuitar) btnQuitar.addEventListener('click', quitarCotizacionCargada);

    // Inicializar la instancia del modal UNA SOLA VEZ
    const modalEl = document.getElementById('modalSeleccionarCotizacion');
    if (modalEl && !modalSeleccionCotizacion) {
        modalSeleccionCotizacion = new bootstrap.Modal(modalEl, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }
}



// ============================================
// QUITAR COTIZACIÓN CARGADA
// ============================================
function quitarCotizacionCargada() {
    cotizacionCargada = null;
    document.getElementById('id_cotizacion_origen').value = '';
    document.getElementById('cotizacionCargadaInfo').style.display = 'none';
    document.getElementById('btnCargarCotizacion').style.display = 'block';
    mostrarToast('Cotización desvinculada. Puede seguir editando la venta.', 'info');
}

function setupCreditEventos() {
    const recalcular = () => calcularYMostrarCuotas();
    const pagoInicial = document.getElementById('pago_inicial');
    const cantidadCuotas = document.getElementById('cantidad_cuotas');
    const intervaloDias = document.getElementById('intervalo_dias');
    const fechaVenta = document.getElementById('fecha_venta');

    if (pagoInicial) pagoInicial.addEventListener('input', recalcular);
    if (cantidadCuotas) cantidadCuotas.addEventListener('input', recalcular);
    if (intervaloDias) intervaloDias.addEventListener('input', recalcular);
    if (fechaVenta) fechaVenta.addEventListener('change', recalcular);
}

// ============================================
// EVENTOS GLOBALES
// ============================================
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;

        const btnVer = e.target.closest('.btnVerVenta');
        if (btnVer) {
            mostrarDetalleVenta(parseInt(btnVer.dataset.id));
            return;
        }

        const btnAnular = e.target.closest('.btnAnularVenta');
        if (btnAnular) {
            const id = parseInt(btnAnular.dataset.id);
            mostrarModalConfirmacionProfesional('Anular Venta', '¿Desea anular esta venta? Se liberará el stock y se anularán las cuotas pendientes.', () => cambiarEstado(id, 2, 'Venta anulada correctamente', 'warning'), 'warning', 'Anular');
            return;
        }

        const btnActivar = e.target.closest('.btnActivarVenta');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional('Reactivar Venta', '¿Desea reactivar esta venta? Volverá a estado Pago Parcial.', () => cambiarEstado(id, 0, 'Venta reactivada como Pago Parcial', 'success'), 'success', 'Reactivar');
            return;
        }

        const btnEliminar = e.target.closest('.btnEliminarVenta');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional('Eliminar Venta', '¿Desea eliminar esta venta? Esta acción no se puede deshacer.', async () => {
                try {
                    const response = await fetch(`/api/ventas/${id}`, { method: 'DELETE' });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    await cargarVentas();
                    mostrarToast('Venta eliminada correctamente', 'danger');
                } catch (error) {
                    mostrarToast(error.message, 'danger');
                }
            }, 'danger');
            return;
        }

        const btnImprimirDirecto = e.target.closest('.btnImprimirVentaDirecto');
        if (btnImprimirDirecto) {
            const id = parseInt(btnImprimirDirecto.dataset.id);
            mostrarModalOpcionesImpresion(id);
            return;
        }
    });

    const btnReenviarCorreo = document.getElementById('btnReenviarNotaCorreo');
    const btnReenviarWhatsApp = document.getElementById('btnReenviarNotaWhatsApp');
    const btnVerPedido = document.getElementById('btnVerPedidoOrigen');
    const btnPagoAdicional = document.getElementById('btnRegistrarPagoAdicional');

    if (btnReenviarCorreo) {
        const newBtn = btnReenviarCorreo.cloneNode(true);
        btnReenviarCorreo.parentNode.replaceChild(newBtn, btnReenviarCorreo);
        newBtn.addEventListener('click', async () => {
            if (!ventaActualId) {
                mostrarToast('No hay una venta seleccionada', 'warning');
                return;
            }
            await reenviarNotaVenta(ventaActualId, 'email');
        });
    }

    if (btnReenviarWhatsApp) {
        const newBtn = btnReenviarWhatsApp.cloneNode(true);
        btnReenviarWhatsApp.parentNode.replaceChild(newBtn, btnReenviarWhatsApp);
        newBtn.addEventListener('click', async () => {
            if (!ventaActualId) {
                mostrarToast('No hay una venta seleccionada', 'warning');
                return;
            }
            await reenviarNotaVenta(ventaActualId, 'whatsapp');
        });
    }

    if (btnVerPedido) {
        btnVerPedido.addEventListener('click', async () => {
            const idPedido = btnVerPedido.dataset.idPedido;
            if (idPedido) {
                await mostrarDetallePedidoDesdeVenta(parseInt(idPedido));
            }
        });
    }

    if (btnPagoAdicional) {
        const newBtn = btnPagoAdicional.cloneNode(true);
        btnPagoAdicional.parentNode.replaceChild(newBtn, btnPagoAdicional);
        newBtn.addEventListener('click', registrarPagoAdicional);
    }
}

// ============================================
// MOSTRAR DETALLE DE PEDIDO DESDE VENTA
// ============================================
async function mostrarDetallePedidoDesdeVenta(idPedido) {
    try {
        const response = await fetch(`/api/pedidos/${idPedido}`);
        if (!response.ok) throw new Error('Error al obtener detalles del pedido');
        const pedido = await response.json();

        const setText = (idEl, value) => {
            const el = document.getElementById(idEl);
            if (el) el.textContent = value || '-';
        };

        const setHtml = (idEl, value) => {
            const el = document.getElementById(idEl);
            if (el) el.innerHTML = value;
        };

        const tbodyProductos = document.getElementById('detallePedidoProductos');
        if (tbodyProductos) tbodyProductos.innerHTML = '';

        setText('detallePedidoNumero', pedido.numero_pedido);
        setText('detallePedidoCliente', pedido.cliente);
        setText('detallePedidoFecha', formatearFecha(pedido.fecha_pedido));
        setText('detallePedidoUsuario', pedido.usuario);
        setText('detallePedidoObservacion', pedido.observacion);
        setHtml('detallePedidoTotal', `S/ ${parseFloat(pedido.total_pedido).toFixed(2)}`);

        const estadoBadge = document.getElementById('detallePedidoEstado');
        if (estadoBadge) {
            if (pedido.estado === 0) {
                estadoBadge.textContent = 'Registrado';
                estadoBadge.className = 'badge bg-warning text-dark';
            } else if (pedido.estado === 1) {
                estadoBadge.textContent = 'En Preparación';
                estadoBadge.className = 'badge bg-info';
            } else if (pedido.estado === 2) {
                estadoBadge.textContent = 'Parcialmente Entregado';
                estadoBadge.className = 'badge bg-warning';
            } else if (pedido.estado === 3) {
                estadoBadge.textContent = 'Entregado';
                estadoBadge.className = 'badge bg-success';
            } else if (pedido.estado === 4) {
                estadoBadge.textContent = 'Cancelado';
                estadoBadge.className = 'badge bg-secondary';
            }
        }

        const tieneRecojo = pedido.fecha_recojo;
        const tieneEnvio = pedido.fecha_envio || pedido.direccion_envio;

        const seccionRecojo = document.getElementById('detallePedidoRecojoInfo');
        const seccionEnvio = document.getElementById('detallePedidoEnvioInfo');
        const tituloEntrega = document.getElementById('detallePedidoTipoEntregaTitulo');

        if (tieneRecojo) {
            if (tituloEntrega) tituloEntrega.textContent = 'Recogida en Tienda';
            if (seccionRecojo) seccionRecojo.style.display = 'block';
            if (seccionEnvio) seccionEnvio.style.display = 'none';
            setText('detallePedidoFechaRecojo', formatearFecha(pedido.fecha_recojo));
        } else if (tieneEnvio) {
            if (tituloEntrega) tituloEntrega.textContent = 'Envío a Domicilio';
            if (seccionRecojo) seccionRecojo.style.display = 'none';
            if (seccionEnvio) seccionEnvio.style.display = 'block';
            setText('detallePedidoFechaEnvio', formatearFecha(pedido.fecha_envio));
            setText('detallePedidoDireccionEnvio', pedido.direccion_envio);
            setHtml('detallePedidoCostoEnvio', `S/ ${parseFloat(pedido.costo_envio || 0).toFixed(2)}`);
        } else {
            if (tituloEntrega) tituloEntrega.textContent = 'Información de Entrega';
            if (seccionRecojo) seccionRecojo.style.display = 'block';
            if (seccionEnvio) seccionEnvio.style.display = 'none';
            setText('detallePedidoFechaRecojo', 'No especificada');
        }

        let totalProductos = 0;
        if (pedido.detalles && pedido.detalles.length > 0) {
            pedido.detalles.forEach(det => {
                const subtotal = det.precio_unitario * det.cantidad;
                totalProductos += subtotal;
                tbodyProductos.innerHTML += `
                    <tr class="small">
                        <td class="text-truncate" style="max-width: 180px;">${det.producto || '-'}</td>
                        <td class="text-end">S/ ${parseFloat(det.precio_unitario).toFixed(2)}</td>
                        <td class="text-center">${det.cantidad}</td>
                        <td class="text-end">S/ ${subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        setHtml('detallePedidoProductosTotal', `S/ ${totalProductos.toFixed(2)}`);

        const modalElement = document.getElementById('modalDetallePedidoVenta');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

    } catch (error) {
        console.error('Error al cargar detalle del pedido:', error);
        mostrarToast('Error al cargar detalles del pedido', 'danger');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
export async function init() {
    if (!isCurrentPage()) return;
    if (eventosInicializados) { await cargarVentas(); await cargarClientes(); await cargarProductos(); return; }
    eventosInicializados = true;
    setupEventListeners();
    setupGuardarVenta();
    setupNuevaVenta();
    setupModalidadPago();
    setupAgregarProducto();
    setupBusquedaClienteVenta();
    setupCreditEventos();
    setupCargarCotizacion();
    setupPagoEvents();
    document.getElementById('btnAgregarPago')?.addEventListener('click', agregarPago);

    getElement('buscarVenta')?.addEventListener('input', aplicarFiltros);
    getElement('filtroCantidad')?.addEventListener('change', aplicarFiltros);
    getElement('filtroEstado')?.addEventListener('change', aplicarFiltros);

    await cargarClientes(); await cargarProductos(); await cargarVentas();
}

export function destroy() {
    eventosInicializados = false; elementos = {};
    ventasGlobal = []; productosGlobal = []; clientesGlobal = [];
    productosSeleccionados = []; totalVenta = 0;
} 