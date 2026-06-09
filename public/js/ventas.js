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

// ============================================
// VALIDACIONES
// ============================================
function soloNumeros(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
}

function soloAlfanumerico(input) {
    input.value = input.value.replace(/[^A-Za-z0-9]/g, '');
}

function soloLetrasYEspacios(input) {
    input.value = input.value.replace(/[^A-Za-záéíóúñÁÉÍÓÚÑ\s]/g, '');
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
    if (!elementos[id]) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
}

// ============================================
// LIMPIAR FORMULARIO
// ============================================
function limpiarFormulario() {
    const form = getElement('formVenta');
    if (form) form.reset();

    getElement('ventaId').value = '';
    getElement('tituloModalVenta').textContent = 'Nueva Venta';

    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    getElement('fecha_venta').value = `${año}-${mes}-${dia}`;

    const tipoDocCliente = document.getElementById('tipo_documento_cliente');
    if (tipoDocCliente) tipoDocCliente.value = '';
    const numeroDocCliente = document.getElementById('numero_documento_cliente');
    if (numeroDocCliente) numeroDocCliente.value = '';
    const nombreCliente = document.getElementById('nombre_cliente');
    if (nombreCliente) nombreCliente.value = '';
    const apellidoCliente = document.getElementById('apellido_cliente');
    if (apellidoCliente) apellidoCliente.value = '';
    const telefonoCliente = document.getElementById('telefono_cliente');
    if (telefonoCliente) telefonoCliente.value = '';
    const correoCliente = document.getElementById('correo_cliente');
    if (correoCliente) correoCliente.value = '';
    const idCliente = document.getElementById('id_cliente');
    if (idCliente) idCliente.value = '';
    const alertNoExistente = document.getElementById('clienteNoExistenteAlert');
    if (alertNoExistente) alertNoExistente.style.display = 'none';

    const divCredito = document.getElementById('div_credito_fields');
    if (divCredito) divCredito.style.display = 'none';
    const modalidadPago = getElement('modalidad_pago');
    if (modalidadPago) modalidadPago.value = '';
    const panelCuotas = document.getElementById('panelCuotas');
    if (panelCuotas) panelCuotas.style.display = 'none';

    productosSeleccionados = [];
    totalVenta = 0;
    actualizarTablaProductos();

    const numeroNota = getElement('numero_nota_venta');
    if (numeroNota) numeroNota.value = generarNumeroNota();
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
        const precio = typeof item.precio_unitario === 'number' ? item.precio_unitario : parseFloat(item.precio_unitario) || 0;
        const cantidad = typeof item.cantidad === 'number' ? item.cantidad : parseFloat(item.cantidad) || 0;
        const subtotal = precio * cantidad;
        totalVenta += subtotal;

        tbody.innerHTML += `
            <tr style="font-size: 0.8rem;">
                <td class="text-truncate" style="max-width: 200px;">${item.producto_nombre || '-'}</td>
                <td class="text-end">S/ ${precio.toFixed(2)}</td>
                <td class="text-center">${cantidad}</td>
                <td class="text-end">S/ ${subtotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger btn-eliminar-producto" data-idx="${idx}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    const totalVentaElement = document.getElementById('totalVenta');
    if (totalVentaElement) {
        totalVentaElement.innerHTML = `S/ ${totalVenta.toFixed(2)}`;
    }

    const modalidadPago = document.getElementById('modalidad_pago')?.value;
    if (modalidadPago === 'CREDITO') {
        calcularYMostrarCuotas();
    }

    setTimeout(() => {
        document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
            btn.removeEventListener('click', manejarEliminarProducto);
            btn.addEventListener('click', manejarEliminarProducto);
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
        const response = await fetch('/api/ventas');
        if (!response.ok) throw new Error('Error al cargar ventas');
        ventasGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar ventas', 'danger');
    }
}

async function cargarClientes() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error('Error al cargar clientes');
        clientesGlobal = await response.json();
    } catch (error) {
        console.error(error);
    }
}

async function cargarProductos() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        productosGlobal = await response.json();

        const selectProducto = document.getElementById('selectProducto');
        if (selectProducto) {
            cargarSelectProductos('');
        }
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar productos', 'danger');
    }
}

// ============================================
// FILTROS Y RENDERIZADO
// ============================================
function aplicarFiltros() {
    if (!isCurrentPage()) return;

    const buscarInput = getElement('buscarVenta');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');

    const textoBusqueda = buscarInput?.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad?.value || 5);
    const estadoFiltro = filtroEstado?.value || '';

    let ventasFiltradas = ventasGlobal
        .filter(venta => {
            if (estadoFiltro !== '' && venta.estado != estadoFiltro) return false;
            return venta.numero_nota_venta?.toLowerCase().includes(textoBusqueda) ||
                venta.cliente?.toLowerCase().includes(textoBusqueda);
        })
        .sort((a, b) => b.id - a.id)
        .slice(0, cantidadMostrar);

    renderizar(ventasFiltradas);
}

function renderizar(ventas) {
    const tabla = getElement('tablaVentas');
    if (!tabla) return;
    tabla.innerHTML = '';

    if (ventas.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay ventas registradas</td></tr>`;
        return;
    }

    ventas.forEach(venta => {
        let estadoBadge = '';
        if (venta.estado === 0) {
            estadoBadge = '<span class="badge bg-warning text-dark">Pago Parcial</span>';
        } else if (venta.estado === 1) {
            estadoBadge = '<span class="badge bg-success">Pagada</span>';
        } else if (venta.estado === 2) {
            estadoBadge = '<span class="badge bg-secondary">Anulada</span>';
        } else if (venta.estado === 3) {
            estadoBadge = '<span class="badge bg-dark">Eliminada</span>';
        }

        let botonesAccion = '';

        if (venta.estado === 0) {
            botonesAccion = `
                <button class="btn btn-sm btn-danger btnAnularVenta" data-id="${venta.id}" title="Anular">
                    <i class="bi bi-slash-circle"></i>
                </button>
                <button class="btn btn-sm btn-primary btnImprimirVentaDirecto" data-id="${venta.id}" title="Imprimir">
                    <i class="bi bi-printer"></i>
                </button>
            `;
        } else if (venta.estado === 1) {
            botonesAccion = `
                <button class="btn btn-sm btn-primary btnImprimirVentaDirecto" data-id="${venta.id}" title="Imprimir">
                    <i class="bi bi-printer"></i>
                </button>
            `;
        } else if (venta.estado === 2) {
            botonesAccion = `
                <button class="btn btn-sm btn-success btnActivarVenta" data-id="${venta.id}" title="Reactivar">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
                <button class="btn btn-sm btn-danger btnEliminarVenta" data-id="${venta.id}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }

        tabla.innerHTML += `
            <tr>
                <td class="text-center">${venta.id}</td>
                <td><strong>${venta.numero_nota_venta}</strong></td>
                <td>${venta.cliente || '-'}</td>
                <td>${formatearFecha(venta.fecha_venta)}</td>
                <td class="fw-bold text-primary">S/ ${parseFloat(venta.total_venta).toFixed(2)}</td>
                <td><span class="badge bg-info">${venta.modalidad_pago}</span></td>
                <td>${estadoBadge}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-warning btnVerVenta" data-id="${venta.id}" title="Ver Detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${botonesAccion}
                </td>
            </tr>
        `;
    });
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
    const btnBuscar = document.getElementById('btnBuscarClienteVenta');
    if (!btnBuscar) return;

    btnBuscar.addEventListener('click', async () => {
        const tipoDoc = document.getElementById('tipo_documento_cliente')?.value;
        const numeroDoc = document.getElementById('numero_documento_cliente')?.value.trim();

        if (!numeroDoc) {
            mostrarToast('Ingrese un número de documento', 'warning');
            return;
        }
        if (!tipoDoc) {
            mostrarToast('Seleccione el tipo de documento', 'warning');
            return;
        }
        if (tipoDoc === 'DNI' && !/^\d{8}$/.test(numeroDoc)) {
            mostrarToast('El DNI debe tener 8 dígitos', 'warning');
            return;
        }
        if (tipoDoc === 'RUC' && !/^\d{11}$/.test(numeroDoc)) {
            mostrarToast('El RUC debe tener 11 dígitos', 'warning');
            return;
        }

        const originalIcon = btnBuscar.innerHTML;
        btnBuscar.disabled = true;
        btnBuscar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const response = await fetch(`/api/clientes/consultar-documento?numero=${numeroDoc}&tipo=${tipoDoc}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            document.getElementById('nombre_cliente').value = data.nombre || '';
            document.getElementById('apellido_cliente').value = data.apellido || '';

            const clientesResponse = await fetch('/api/clientes');
            const clientes = await clientesResponse.json();
            const clienteExistente = clientes.find(c => c.numero_documento === numeroDoc);

            if (clienteExistente) {
                document.getElementById('id_cliente').value = clienteExistente.id;
                document.getElementById('telefono_cliente').value = clienteExistente.telefono || '';
                document.getElementById('correo_cliente').value = clienteExistente.correo || '';
                document.getElementById('clienteNoExistenteAlert').style.display = 'none';
                mostrarToast('Cliente encontrado en el sistema', 'success');
            } else {
                document.getElementById('id_cliente').value = '';
                document.getElementById('clienteNoExistenteAlert').style.display = 'block';
                mostrarToast('Cliente no registrado. Se registrará automáticamente al guardar', 'info');
            }

            if (data.telefono && !document.getElementById('telefono_cliente').value) {
                document.getElementById('telefono_cliente').value = data.telefono;
            }
            if (data.correo && !document.getElementById('correo_cliente').value) {
                document.getElementById('correo_cliente').value = data.correo;
            }
        } catch (error) {
            mostrarToast(error.message || 'Error al consultar', 'danger');
            document.getElementById('nombre_cliente').value = '';
            document.getElementById('apellido_cliente').value = '';
            document.getElementById('id_cliente').value = '';
        } finally {
            btnBuscar.disabled = false;
            btnBuscar.innerHTML = originalIcon;
        }
    });

    const btnLimpiar = document.getElementById('btnLimpiarCliente');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            document.getElementById('tipo_documento_cliente').value = '';
            document.getElementById('numero_documento_cliente').value = '';
            document.getElementById('nombre_cliente').value = '';
            document.getElementById('apellido_cliente').value = '';
            document.getElementById('telefono_cliente').value = '';
            document.getElementById('correo_cliente').value = '';
            document.getElementById('id_cliente').value = '';
            document.getElementById('clienteNoExistenteAlert').style.display = 'none';
        });
    }
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

// ============================================
// PRODUCTOS
// ============================================
function cargarSelectProductos(filtro = '') {
    const selectProducto = document.getElementById('selectProducto');
    if (!selectProducto) return;

    let productosFiltrados = productosGlobal.filter(p => p.estado === 1);

    if (filtro.trim() !== '') {
        const termino = filtro.toLowerCase();
        productosFiltrados = productosFiltrados.filter(p =>
            p.nombre.toLowerCase().includes(termino) ||
            (p.codigo_barras && p.codigo_barras.includes(termino))
        );
    }

    selectProducto.innerHTML = '<option value="">-- Seleccione un producto --</option>';

    productosFiltrados.forEach(producto => {
        selectProducto.innerHTML += `<option value="${producto.id}" data-precio="${producto.precio}" data-stock="${producto.stock}" data-unidad="${producto.unidad_abreviatura}">
            ${producto.nombre} - Stock: ${producto.stock} ${producto.unidad_abreviatura || ''}
        </option>`;
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

// ============================================
// GENERAR NÚMERO DE NOTA
// ============================================
function generarNumeroNota() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const consecutivo = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NV${año}${mes}${dia}-${consecutivo}`;
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

        let id_cliente = document.getElementById('id_cliente')?.value;
        const tipo_documento = document.getElementById('tipo_documento_cliente')?.value;
        const numero_documento = document.getElementById('numero_documento_cliente')?.value.trim();
        const nombre_cliente = document.getElementById('nombre_cliente')?.value.trim();
        const apellido_cliente = document.getElementById('apellido_cliente')?.value.trim();
        const telefono_cliente = document.getElementById('telefono_cliente')?.value.trim();
        const correo_cliente = document.getElementById('correo_cliente')?.value.trim();

        if (!numero_documento) {
            mostrarToast('Ingrese el número de documento del cliente', 'warning');
            return;
        }
        if (!tipo_documento) {
            mostrarToast('Seleccione el tipo de documento', 'warning');
            return;
        }
        if (tipo_documento === 'DNI' && !/^\d{8}$/.test(numero_documento)) {
            mostrarToast('El DNI debe tener 8 dígitos', 'warning');
            return;
        }
        if (tipo_documento === 'RUC' && !/^\d{11}$/.test(numero_documento)) {
            mostrarToast('El RUC debe tener 11 dígitos', 'warning');
            return;
        }

        if (!id_cliente) {
            try {
                if (!nombre_cliente) {
                    mostrarToast('Debe buscar los datos del cliente primero', 'warning');
                    return;
                }
                const nuevoCliente = {
                    tipo_documento,
                    numero_documento,
                    nombre: nombre_cliente || 'Cliente',
                    apellido: apellido_cliente || '',
                    telefono: telefono_cliente || '',
                    correo: correo_cliente || ''
                };
                const registerResponse = await fetch('/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nuevoCliente)
                });
                if (!registerResponse.ok) throw new Error((await registerResponse.json()).error);
                const clientesResponse = await fetch('/api/clientes');
                const clientes = await clientesResponse.json();
                const clienteNuevo = clientes.find(c => c.numero_documento === numero_documento);
                id_cliente = clienteNuevo?.id;
                if (!id_cliente) throw new Error('No se pudo obtener el ID');
                mostrarToast('Cliente registrado automáticamente', 'success');
            } catch (error) {
                mostrarToast('Error al registrar cliente: ' + error.message, 'danger');
                return;
            }
        }

        const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
        const id_usuario = sesion?.usuario?.id;
        if (!id_usuario) {
            mostrarToast('No se encontró el usuario de sesión', 'danger');
            return;
        }

        const modalidad_pago = getElement('modalidad_pago')?.value;
        const pago_inicial = parseFloat(getElement('pago_inicial')?.value) || 0;
        const cantidad_cuotas = parseInt(getElement('cantidad_cuotas')?.value) || 0;
        const intervalo_dias = parseInt(getElement('intervalo_dias')?.value) || 0;
        const observacion = getElement('observacion')?.value;

        if (!numero_nota_venta) {
            mostrarToast('Número de nota obligatorio', 'warning');
            return;
        }
        if (!modalidad_pago) {
            mostrarToast('Seleccione modalidad de pago', 'warning');
            return;
        }
        if (productosSeleccionados.length === 0) {
            mostrarToast('Agregue al menos un producto', 'warning');
            return;
        }

        const total_venta = totalVenta;

        if (modalidad_pago === 'CREDITO') {
            const deudaCalculada = total_venta - pago_inicial;
            if (deudaCalculada <= 0) {
                mostrarToast('El pago inicial no puede ser mayor o igual al total', 'warning');
                return;
            }
            if (cantidad_cuotas <= 0) {
                mostrarToast('Ingrese cantidad de cuotas', 'warning');
                return;
            }
        }

        try {
            const response = await fetch(id ? `/api/ventas/${id}` : '/api/ventas', {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero_nota_venta,
                    id_pedido: null,
                    id_cliente: parseInt(id_cliente),
                    id_usuario,
                    modalidad_pago,
                    pago_inicial,
                    cantidad_cuotas,
                    intervalo_dias,
                    total_venta,
                    observacion,
                    productos: productosSeleccionados
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            await cargarVentas();
            mostrarToast(id ? 'Venta actualizada' : 'Venta registrada', 'success');
            const modal = bootstrap.Modal.getInstance(getElement('modalVenta'));
            if (modal) modal.hide();
            limpiarFormulario();
        } catch (error) {
            mostrarToast(error.message, 'danger');
        }
    };
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
            mostrarModalConfirmacionProfesional('Anular Venta', '¿Desea anular esta venta? Se liberará el stock y se anularán las cuotas pendientes.', () => cambiarEstado(id, 2, 'Venta anulada correctamente', 'warning'), 'warning');
            return;
        }

        const btnActivar = e.target.closest('.btnActivarVenta');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional('Reactivar Venta', '¿Desea reactivar esta venta? Volverá a estado Pago Parcial.', () => cambiarEstado(id, 0, 'Venta reactivada como Pago Parcial', 'success'), 'success');
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

    if (eventosInicializados) {
        await cargarVentas();
        await cargarClientes();
        await cargarProductos();
        return;
    }

    eventosInicializados = true;

    setupEventListeners();
    setupGuardarVenta();
    setupNuevaVenta();
    setupModalidadPago();
    setupAgregarProducto();
    setupBusquedaClienteVenta();
    setupCreditEventos();
    setupValidacionesTiempoRealCliente();

    const btnCerrarFormaPago = document.getElementById('btnCerrarFormaPago');
    if (btnCerrarFormaPago) {
        const newBtn = btnCerrarFormaPago.cloneNode(true);
        btnCerrarFormaPago.parentNode.replaceChild(newBtn, btnCerrarFormaPago);
        newBtn.addEventListener('click', ocultarFormularioPagoCuota);
    }

    const btnConfirmarPagoIntegrado = document.getElementById('btnConfirmarPagoCuotaIntegrado');
    if (btnConfirmarPagoIntegrado) {
        const newBtn = btnConfirmarPagoIntegrado.cloneNode(true);
        btnConfirmarPagoIntegrado.parentNode.replaceChild(newBtn, btnConfirmarPagoIntegrado);
        newBtn.addEventListener('click', confirmarPagoCuotaIntegrado);
    }

    const buscarInput = getElement('buscarVenta');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');
    if (buscarInput) buscarInput.addEventListener('input', () => aplicarFiltros());
    if (filtroCantidad) filtroCantidad.addEventListener('change', () => aplicarFiltros());
    if (filtroEstado) filtroEstado.addEventListener('change', () => aplicarFiltros());

    await cargarClientes();
    await cargarProductos();
    await cargarVentas();
}

export function destroy() {
    eventosInicializados = false;
    elementos = {};
    ventasGlobal = [];
    productosGlobal = [];
    clientesGlobal = [];
    productosSeleccionados = [];
    totalVenta = 0;
}