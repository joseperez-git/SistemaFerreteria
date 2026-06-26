import { mostrarToast, limpiarBackdrops, mostrarModalConfirmacionProfesional } from './helpers.js';

// ============================================
// ESTADO CENTRALIZADO
// ============================================
const estado = {
    ventas: [],
    productos: [],
    ventaActual: null,
    productosSeleccionados: [],
    totalVenta: 0,
    cotizacionCargada: null,
    modalSeleccionCotizacion: null,
    pagoMixtoActivo: false,
    pagoMixtoInicialActivo: false,
    inicializado: false
};

function isCurrentPage() { return document.getElementById('tablaVentas') !== null; }
function $(id) { return document.getElementById(id); }
function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const f = new Date(fechaISO);
    return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
}
function soloNumeros(input) { input.value = input.value.replace(/[^0-9]/g, ''); }

async function apiCall(url, options = {}) {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en la solicitud');
    return data;
}

// ============================================
// CARGA DE DATOS
// ============================================
async function cargarVentas() {
    if (!isCurrentPage()) return;
    try { estado.ventas = await apiCall('/api/ventas'); aplicarFiltros(); } catch (e) { console.error(e); }
}
async function cargarProductos() {
    if (!isCurrentPage()) return;
    try { estado.productos = await apiCall('/api/productos'); } catch (e) { console.error(e); }
}
async function generarNumeroNota() {
    try { return (await apiCall('/api/ventas/generar-numero')).numero_nota_venta; }
    catch (e) { const f = new Date(); return `NV-${f.getFullYear()}${String(f.getMonth() + 1).padStart(2, '0')}${String(f.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`; }
}

// ============================================
// FILTROS Y RENDERIZADO
// ============================================
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    const buscar = ($('buscarVenta')?.value || '').toLowerCase();
    const estadoFiltro = $('filtroEstadoVentas')?.value || '';
    const cantidad = parseInt($('filtroCantidadVentas')?.value || 10);
    let filtradas = estado.ventas.filter(v => v.estado != 3);
    if (estadoFiltro !== '') filtradas = filtradas.filter(v => v.estado == estadoFiltro);
    if (buscar) filtradas = filtradas.filter(v => v.numero_nota_venta?.toLowerCase().includes(buscar) || v.cliente?.toLowerCase().includes(buscar));
    filtradas.sort((a, b) => b.id - a.id);
    renderizarTabla(filtradas.slice(0, cantidad));
}

function renderizarTabla(ventas) {
    const tbody = $('tablaVentas');
    if (!tbody) return;
    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay ventas registradas</td></tr>';
        return;
    }
    const badges = { 0: '<span class="badge bg-warning text-dark">Pago Parcial</span>', 1: '<span class="badge bg-success">Pagada</span>', 2: '<span class="badge bg-secondary">Anulada</span>' };
    tbody.innerHTML = ventas.map(v => {
        let botones = `<div class="btn-group btn-group-sm">`;
        botones += `<button class="btn btn-sm btn-info btnVerVenta" data-id="${v.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>`;
        if (v.estado !== 2) botones += `<button class="btn btn-sm btn-warning btnEditarVenta" data-id="${v.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>`;
        if (v.estado === 0) botones += `<button class="btn btn-sm btn-danger btnAnularVenta" data-id="${v.id}" title="Anular"><i class="bi bi-slash-circle"></i></button>`;
        else if (v.estado === 2) {
            botones += `<button class="btn btn-sm btn-success btnReactivarVenta" data-id="${v.id}" title="Reactivar"><i class="bi bi-arrow-repeat"></i></button>`;
            botones += `<button class="btn btn-sm btn-dark btnEliminarVenta" data-id="${v.id}" title="Eliminar"><i class="bi bi-trash"></i></button>`;
        }
        botones += `<button class="btn btn-sm btn-outline-dark btnHistorialPagos" data-id="${v.id}" title="Historial de Pagos"><i class="bi bi-clock-history"></i></button>`;
        if (v.modalidad_pago === 'CREDITO' && v.estado === 0) {
            botones += `<button class="btn btn-sm btn-outline-warning btnCronogramaPagos" data-id="${v.id}" title="Cronograma"><i class="bi bi-calendar-check"></i></button>`;
        }
        botones += `</div>`;
        return `<tr><td class="text-center">${v.id}</td><td><strong>${v.numero_nota_venta}</strong></td><td>${v.cliente || '-'}</td><td class="text-center">${formatearFecha(v.fecha_venta)}</td><td class="text-end fw-bold text-primary">S/ ${parseFloat(v.total_venta).toFixed(2)}</td><td class="text-center"><span class="badge bg-info">${v.modalidad_pago}</span></td><td class="text-center">${badges[v.estado] || '-'}</td><td class="text-center">${botones}</td></tr>`;
    }).join('');
}

// ============================================
// PAGOS MIXTOS (CHECKBOX)
// ============================================
function resetearPagosMixtos() {
    const container = $('pagosContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="row g-2 pago-item mb-2 align-items-end">
            <div class="col-md-5"><label class="form-label small">Medio de Pago <span class="text-danger">*</span></label><select class="form-select form-select-sm medio-pago-select" required><option value="">Seleccione...</option><option value="EFECTIVO">Efectivo</option><option value="YAPE">Yape</option><option value="PLIN">Plin</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option></select></div>
            <div class="col-md-4"><label class="form-label small">Monto S/ <span class="text-danger">*</span></label><input type="number" class="form-control form-control-sm monto-pago" value="0" min="0" step="0.01" required></div>
            <div class="col-md-3"><label class="form-label small">N° Operación <span class="operacion-required text-danger">*</span></label><input type="text" class="form-control form-control-sm numero-operacion" placeholder="Obligatorio" maxlength="50"></div>
        </div>
        <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="checkSegundoMetodoPago">
            <label class="form-check-label small" for="checkSegundoMetodoPago">Agregar segundo método de pago</label>
        </div>
        <div id="segundoPagoContainer" style="display:none;"></div>`;
    configurarEventosPago();
    actualizarResumenPagos();
}

function configurarEventosPago() {
    document.querySelectorAll('.medio-pago-select').forEach(sel => {
        sel.addEventListener('change', function () {
            const row = this.closest('.pago-item');
            const opReq = row.querySelector('.operacion-required');
            const numOp = row.querySelector('.numero-operacion');
            if (this.value === 'EFECTIVO') { opReq.style.display = 'none'; numOp.required = false; numOp.placeholder = 'No requerido'; }
            else { opReq.style.display = 'inline'; numOp.required = true; numOp.placeholder = 'Obligatorio'; }
        });
    });
    document.querySelectorAll('.monto-pago').forEach(inp => inp.addEventListener('input', actualizarResumenPagos));

    const checkSegundo = $('checkSegundoMetodoPago');
    if (checkSegundo) {
        checkSegundo.addEventListener('change', function () {
            const container = $('segundoPagoContainer');
            if (this.checked) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="row g-2 pago-item mb-2 align-items-end mt-2">
                        <div class="col-md-5"><label class="form-label small">Segundo Medio <span class="text-danger">*</span></label><select class="form-select form-select-sm medio-pago-select" required><option value="">Seleccione...</option><option value="EFECTIVO">Efectivo</option><option value="YAPE">Yape</option><option value="PLIN">Plin</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option></select></div>
                        <div class="col-md-4"><label class="form-label small">Monto S/ <span class="text-danger">*</span></label><input type="number" class="form-control form-control-sm monto-pago" value="0" min="0" step="0.01" required></div>
                        <div class="col-md-3"><label class="form-label small">N° Operación <span class="operacion-required text-danger">*</span></label><input type="text" class="form-control form-control-sm numero-operacion" placeholder="Obligatorio" maxlength="50"></div>
                    </div>`;
                configurarEventosPago();
            } else {
                container.style.display = 'none';
                container.innerHTML = '';
            }
            actualizarResumenPagos();
        });
    }
}

function actualizarResumenPagos() {
    const modalidad = $('modalidad_pago')?.value;

    if (modalidad === 'CREDITO') {
        actualizarVistaPago();
        return;
    }

    // CONTADO
    let total = 0;
    document.querySelectorAll('.monto-pago').forEach(inp => total += parseFloat(inp.value) || 0);

    const totalPagado = $('totalPagadoSpan');
    const pendiente = $('pendienteSpan');
    if (totalPagado) totalPagado.textContent = `S/ ${total.toFixed(2)}`;
    if (pendiente) {
        const pend = estado.totalVenta - total;
        pendiente.textContent = `S/ ${Math.max(0, pend).toFixed(2)}`;
        pendiente.style.color = pend > 0.01 ? '#dc2626' : '#059669';
    }
    const efectivoSpan = $('totalEfectivoSpan');
    if (efectivoSpan && !estado.pagoMixtoActivo) {
        efectivoSpan.textContent = `S/ ${estado.totalVenta.toFixed(2)}`;
    }
}
function obtenerPagosMixtos() {
    const pagos = [];
    document.querySelectorAll('.pago-item').forEach(row => {
        const metodo = row.querySelector('.medio-pago-select')?.value;
        const monto = parseFloat(row.querySelector('.monto-pago')?.value) || 0;
        const numOp = row.querySelector('.numero-operacion')?.value || '';
        if (metodo && monto > 0) pagos.push({ metodo_pago: metodo, monto, numero_operacion: numOp });
    });
    return pagos;
}

// ============================================
// PAGOS INICIALES (CRÉDITO)
// ============================================
function resetearPagosIniciales() {
    const container = $('pagosInicialContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="row g-2 pago-inicial-item mb-2 align-items-end">
            <div class="col-md-5"><label class="form-label small">Medio <span class="text-danger">*</span></label><select class="form-select form-select-sm medio-pago-inicial-select" required><option value="">Seleccione...</option><option value="EFECTIVO">Efectivo</option><option value="YAPE">Yape</option><option value="PLIN">Plin</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option></select></div>
            <div class="col-md-4"><label class="form-label small">Monto S/ <span class="text-danger">*</span></label><input type="number" class="form-control form-control-sm monto-pago-inicial" value="0" min="0" step="0.01" required></div>
            <div class="col-md-3"><label class="form-label small">N° Operación</label><input type="text" class="form-control form-control-sm numero-operacion-inicial" placeholder="Obligatorio" maxlength="50"></div>
        </div>
        <div class="form-check mt-2">
            <input class="form-check-input" type="checkbox" id="checkSegundoPagoInicial">
            <label class="form-check-label small" for="checkSegundoPagoInicial">Agregar segundo método</label>
        </div>
        <div id="segundoPagoInicialContainer" style="display:none;"></div>`;
    configurarEventosPagoInicial();
}

function configurarEventosPagoInicial() {
    document.querySelectorAll('.medio-pago-inicial-select').forEach(sel => {
        sel.addEventListener('change', function () {
            const row = this.closest('.pago-inicial-item');
            const numOp = row.querySelector('.numero-operacion-inicial');
            if (this.value === 'EFECTIVO') { numOp.required = false; numOp.placeholder = 'No requerido'; }
            else { numOp.required = true; numOp.placeholder = 'Obligatorio'; }
        });
    });
    document.querySelectorAll('.monto-pago-inicial').forEach(inp => inp.addEventListener('input', actualizarResumenPagosIniciales));

    const checkSegundo = $('checkSegundoPagoInicial');
    if (checkSegundo) {
        checkSegundo.addEventListener('change', function () {
            const container = $('segundoPagoInicialContainer');
            if (this.checked) {
                container.style.display = 'block';
                container.innerHTML = `
                    <div class="row g-2 pago-inicial-item mb-2 align-items-end mt-2">
                        <div class="col-md-5"><label class="form-label small">Segundo Medio <span class="text-danger">*</span></label><select class="form-select form-select-sm medio-pago-inicial-select" required><option value="">Seleccione...</option><option value="EFECTIVO">Efectivo</option><option value="YAPE">Yape</option><option value="PLIN">Plin</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option></select></div>
                        <div class="col-md-4"><label class="form-label small">Monto S/ <span class="text-danger">*</span></label><input type="number" class="form-control form-control-sm monto-pago-inicial" value="0" min="0" step="0.01" required></div>
                        <div class="col-md-3"><label class="form-label small">N° Operación</label><input type="text" class="form-control form-control-sm numero-operacion-inicial" placeholder="Obligatorio" maxlength="50"></div>
                    </div>`;
                configurarEventosPagoInicial();
            } else {
                container.style.display = 'none';
                container.innerHTML = '';
            }
            actualizarResumenPagosIniciales();
        });
    }
}

function actualizarResumenPagosIniciales() {
    let total = 0;
    document.querySelectorAll('.monto-pago-inicial').forEach(inp => total += parseFloat(inp.value) || 0);
    $('pagoInicialEfectivo').textContent = `S/ ${total.toFixed(2)}`;
    $('pago_inicial').value = total;

    // Actualizar también la sección de PAGO
    actualizarVistaPago();
}

function obtenerPagosIniciales() {
    const pagos = [];
    document.querySelectorAll('.pago-inicial-item').forEach(row => {
        const metodo = row.querySelector('.medio-pago-inicial-select')?.value;
        const monto = parseFloat(row.querySelector('.monto-pago-inicial')?.value) || 0;
        const numOp = row.querySelector('.numero-operacion-inicial')?.value || '';
        if (metodo && monto > 0) pagos.push({ metodo_pago: metodo, monto, numero_operacion: numOp });
    });
    return pagos;
}

// ============================================
// PRODUCTOS
// ============================================
function cargarSelectProductos(filtro = '') {
    const select = $('selectProducto');
    if (!select) return;
    let filtrados = estado.productos.filter(p => p.estado === 1);
    if (filtro.trim()) {
        const term = filtro.toLowerCase();
        filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(term) || (p.codigo_barras && p.codigo_barras.includes(term)));
    }
    select.innerHTML = '<option value="">-- Seleccione un producto --</option>';
    filtrados.forEach(p => select.innerHTML += `<option value="${p.id}" data-precio="${p.precio}" data-stock="${p.stock_disponible || p.stock}" data-nombre="${p.nombre}">${p.nombre} - Stock: ${p.stock_disponible || p.stock}</option>`);
}

function actualizarTablaProductos() {
    const tbody = $('tablaProductosVenta');
    if (!tbody) return;
    tbody.innerHTML = '';
    estado.totalVenta = 0;
    estado.productosSeleccionados.forEach((item, idx) => {
        const precio = parseFloat(item.precio_unitario) || 0;
        const cantidad = parseFloat(item.cantidad) || 0;
        const subtotal = precio * cantidad;
        estado.totalVenta += subtotal;
        tbody.innerHTML += `<tr><td>${item.producto_nombre || '-'}</td><td class="text-end">S/ ${precio.toFixed(2)}</td><td class="text-center">${cantidad}</td><td class="text-end">S/ ${subtotal.toFixed(2)}</td><td class="text-center"><button class="btn btn-sm btn-outline-danger btn-eliminar-producto" data-idx="${idx}"><i class="bi bi-trash"></i></button></td></tr>`;
    });
    $('totalVentaSpan').innerHTML = `S/ ${estado.totalVenta.toFixed(2)}`;
    const efectivoSpan = $('totalEfectivoSpan');
    if (efectivoSpan && !estado.pagoMixtoActivo) efectivoSpan.textContent = `S/ ${estado.totalVenta.toFixed(2)}`;
    actualizarResumenPagos();
    if ($('modalidad_pago')?.value === 'CREDITO') calcularCuotas();
    document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
        btn.onclick = function () { estado.productosSeleccionados.splice(parseInt(this.dataset.idx), 1); actualizarTablaProductos(); };
    });
    actualizarVistaPago();
}

function actualizarVistaPago() {
    const modalidad = $('modalidad_pago')?.value;
    const pagoInicial = parseFloat($('pago_inicial')?.value) || 0;

    if (modalidad === 'CREDITO') {
        // En crédito, el pago inicial es lo que se paga ahora
        // Siempre mostrar el pago inicial como efectivo
        $('totalEfectivoSpan').textContent = `S/ ${pagoInicial.toFixed(2)}`;

        // Actualizar resumen de pagos con el pago inicial
        let totalPagado = pagoInicial;

        // Si hay pago mixto inicial activo, sumar los montos
        if (estado.pagoMixtoInicialActivo) {
            totalPagado = 0;
            document.querySelectorAll('.monto-pago-inicial').forEach(inp => {
                totalPagado += parseFloat(inp.value) || 0;
            });
        }

        const totalPagadoSpan = $('totalPagadoSpan');
        const pendienteSpan = $('pendienteSpan');
        if (totalPagadoSpan) totalPagadoSpan.textContent = `S/ ${totalPagado.toFixed(2)}`;
        if (pendienteSpan) {
            const pend = estado.totalVenta - totalPagado;
            pendienteSpan.textContent = `S/ ${Math.max(0, pend).toFixed(2)}`;
            pendienteSpan.style.color = pend > 0.01 ? '#dc2626' : '#059669';
        }

        // Asegurar que se muestre el pago en efectivo
        $('pagoEfectivoInfo').style.display = 'block';
        $('pagosContainer').style.display = 'none';

    } else {
        // CONTADO normal
        actualizarResumenPagos();
    }
}

// ============================================
// CLIENTE (DNI=Nombre+Apellido, RUC=Razón Social)
// ============================================
async function buscarCliente() {
    const tipoDoc = $('tipo_documento_cliente')?.value;
    const numDoc = $('numero_documento_cliente')?.value.trim();

    if (!numDoc) {
        $('id_cliente').value = '1';
        $('nombre_cliente').value = 'CLIENTE VARIOS';
        const apellidoEl = $('apellido_cliente');
        if (apellidoEl) { apellidoEl.value = ''; apellidoEl.parentElement.style.display = 'none'; }
        $('direccion_cliente').value = '';
        $('clienteNoExistenteAlert').style.display = 'none';
        $('rowDireccionCliente').style.display = 'none';
        $('rowApellidoCliente').style.display = 'none';
        mostrarToast('Cliente genérico asignado', 'info');
        return;
    }
    if (!tipoDoc) return mostrarToast('Seleccione tipo de documento', 'warning');
    if (tipoDoc === 'DNI' && numDoc.length !== 8) return mostrarToast('DNI debe tener 8 dígitos', 'warning');
    if (tipoDoc === 'RUC' && numDoc.length !== 11) return mostrarToast('RUC debe tener 11 dígitos', 'warning');

    const btn = $('btnBuscarClienteVenta');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const data = await apiCall(`/api/clientes/consultar-documento?numero=${numDoc}&tipo=${tipoDoc}`);

        // DNI → Nombre + Apellido
        // RUC → Solo Razón Social + Dirección
        if (tipoDoc === 'DNI') {
            $('nombre_cliente').value = data.cliente?.nombre || '';
            const apellidoEl = $('apellido_cliente');
            if (apellidoEl) {
                apellidoEl.value = data.cliente?.apellido || '';
                apellidoEl.parentElement.style.display = 'block';
            }
            $('rowApellidoCliente').style.display = 'block';
            $('rowDireccionCliente').style.display = 'none';
            $('direccion_cliente').value = '';
        } else {
            // RUC → nombre completo en nombre_cliente
            $('nombre_cliente').value = data.cliente?.nombre || '';
            const apellidoEl = $('apellido_cliente');
            if (apellidoEl) {
                apellidoEl.value = '';
                apellidoEl.parentElement.style.display = 'none';
            }
            $('rowApellidoCliente').style.display = 'none';
            $('rowDireccionCliente').style.display = 'block';
            $('direccion_cliente').value = data.cliente?.direccion || '';
        }

        if (data.encontrado && data.cliente?.id) {
            $('id_cliente').value = data.cliente.id;
            $('telefono_cliente').value = data.cliente.telefono || '';
            $('correo_cliente').value = data.cliente.correo || '';
            $('clienteNoExistenteAlert').style.display = 'none';
            mostrarToast('Cliente encontrado en el sistema', 'success');
        } else {
            $('id_cliente').value = '';
            $('clienteNoExistenteAlert').style.display = 'block';
            mostrarToast(data.origen === 'sunat' ? 'Cliente encontrado en SUNAT. Se registrará al guardar.' : 'Cliente no registrado. Se registrará al guardar.', 'info');
        }
    } catch (e) {
        mostrarToast(e.message || 'Error al consultar', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

function limpiarCliente() {
    ['tipo_documento_cliente', 'numero_documento_cliente', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente', 'correo_cliente', 'id_cliente'].forEach(id => { const el = $(id); if (el) el.value = ''; });
    const apellidoEl = $('apellido_cliente');
    if (apellidoEl) { apellidoEl.value = ''; apellidoEl.parentElement.style.display = 'block'; }
    $('clienteNoExistenteAlert').style.display = 'none';
    $('rowDireccionCliente').style.display = 'none';
}

// ============================================
// CRÉDITO
// ============================================
function calcularCuotas() {
    const pagoInicial = parseFloat($('pago_inicial')?.value) || 0;
    const cantCuotas = parseInt($('cantidad_cuotas')?.value) || 0;
    const intervalo = parseInt($('intervalo_dias')?.value) || 0;
    const panel = $('panelCuotas');
    const tbody = $('tablaResumenCuotas');
    if (estado.totalVenta > pagoInicial && cantCuotas > 0) {
        const montoFinanciar = estado.totalVenta - pagoInicial;
        const montoPorCuota = montoFinanciar / cantCuotas;
        const fechaBase = new Date($('fecha_venta')?.value || new Date());
        $('montoFinanciar').textContent = `S/ ${montoFinanciar.toFixed(2)}`;
        tbody.innerHTML = '';
        for (let i = 1; i <= cantCuotas; i++) {
            const fechaVenc = new Date(fechaBase);
            fechaVenc.setDate(fechaVenc.getDate() + (intervalo * i));
            const ajuste = (i === cantCuotas) ? parseFloat((montoFinanciar - (montoPorCuota * (cantCuotas - 1))).toFixed(2)) : montoPorCuota;
            tbody.innerHTML += `<tr><td class="text-center">${i}</td><td class="text-end">S/ ${ajuste.toFixed(2)}</td><td class="text-center">${fechaVenc.toLocaleDateString('es-PE')}</td></tr>`;
        }
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// ============================================
// LIMPIAR FORMULARIO
// ============================================
async function limpiarFormulario() {
    // Resetear formulario
    $('formVenta')?.reset();

    // Limpiar IDs ocultos
    $('ventaId').value = '';
    $('id_cotizacion_origen').value = '';
    $('id_cliente').value = '';

    // Título del modal
    $('tituloModalVenta').textContent = 'Nueva Venta';

    // Fecha = hoy
    const hoy = new Date();
    $('fecha_venta').value = hoy.toISOString().split('T')[0];

    // Modalidad CONTADO por defecto
    $('modalidad_pago').value = 'CONTADO';
    $('divCredito').style.display = 'none';
    $('tituloSeccionPago').textContent = 'Pago';

    // Cotización
    estado.cotizacionCargada = null;
    $('cotizacionCargadaInfo').style.display = 'none';
    $('btnCargarCotizacion').style.display = 'block';

    // Limpiar cliente
    ['tipo_documento_cliente', 'numero_documento_cliente', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente', 'correo_cliente', 'id_cliente'].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
    });
    const apellidoEl = $('apellido_cliente');
    if (apellidoEl) {
        apellidoEl.value = '';
        apellidoEl.parentElement.style.display = 'block';
    }
    $('clienteNoExistenteAlert').style.display = 'none';
    $('rowDireccionCliente').style.display = 'none';
    $('rowApellidoCliente').style.display = 'none';

    // Pago Mixto principal - HABILITADO (CONTADO por defecto)
    estado.pagoMixtoActivo = false;
    const switchPagoMixto = $('switchPagoMixto');
    if (switchPagoMixto) {
        switchPagoMixto.checked = false;
        switchPagoMixto.disabled = false;
    }
    const switchContainer = $('switchPagoMixtoContainer');
    if (switchContainer) {
        switchContainer.style.opacity = '1';
        switchContainer.style.pointerEvents = 'auto';
    }
    $('pagoEfectivoInfo').style.display = 'block';
    $('pagosContainer').style.display = 'none';
    $('totalEfectivoSpan').textContent = 'S/ 0.00';
    $('totalPagadoSpan').textContent = 'S/ 0.00';
    $('pendienteSpan').textContent = 'S/ 0.00';

    // Pago Mixto Inicial - OCULTO
    estado.pagoMixtoInicialActivo = false;
    $('switchPagoMixtoInicial').checked = false;
    $('pagosInicialContainer').style.display = 'none';
    $('pago_inicial').value = 0;
    $('pagoInicialEfectivo').textContent = 'S/ 0.00';

    // Resetear contenedores de pagos
    resetearPagosMixtos();
    resetearPagosIniciales();

    // Crédito - valores por defecto
    $('cantidad_cuotas').value = 0;
    $('intervalo_dias').value = 0;
    $('panelCuotas').style.display = 'none';
    $('tablaResumenCuotas').innerHTML = '';
    $('montoFinanciar').textContent = 'S/ 0.00';

    // Productos
    estado.productosSeleccionados = [];
    estado.totalVenta = 0;
    actualizarTablaProductos();
    $('buscarProductoInput').value = '';
    $('cantidadProducto').value = '1';
    $('precioUnitario').value = '';
    $('stockDisponible').value = '';

    // Observación
    $('observacion').value = '';

    // Generar nuevo número de nota
    $('numero_nota_venta').value = await generarNumeroNota();

    // Cargar productos en el select
    cargarSelectProductos('');

    // Actualizar vista de pago
    actualizarVistaPago();
}

// ============================================
// GUARDAR VENTA
// ============================================
// ============================================
// GUARDAR VENTA (COMPLETO, CORREGIDO)
// ============================================
async function guardarVenta() {
    const numero_nota_venta = $('numero_nota_venta')?.value.trim();
    let id_cliente = $('id_cliente')?.value;
    const tipo_documento = $('tipo_documento_cliente')?.value;
    const numero_documento = $('numero_documento_cliente')?.value.trim();
    const nombre_cliente = $('nombre_cliente')?.value.trim();
    const apellido_cliente = $('apellido_cliente')?.value.trim() || '';
    const telefono_cliente = $('telefono_cliente')?.value.trim();
    const correo_cliente = $('correo_cliente')?.value.trim();
    const modalidad_pago = $('modalidad_pago')?.value;
    const observacion = $('observacion')?.value;
    const id_cotizacion = $('id_cotizacion_origen')?.value || null;
    const cantidad_cuotas = parseInt($('cantidad_cuotas')?.value) || 0;
    const intervalo_dias = parseInt($('intervalo_dias')?.value) || 0;
    const idVenta = $('ventaId')?.value;

    // ─── VALIDACIONES BÁSICAS ───
    if (!numero_nota_venta) return mostrarToast('Número de nota obligatorio', 'warning');
    if (!modalidad_pago) return mostrarToast('Seleccione modalidad de pago', 'warning');
    if (estado.productosSeleccionados.length === 0) return mostrarToast('Agregue al menos un producto', 'warning');

    // ─── CLIENTE ───
    // Si no hay ID pero SÍ hay documento → registrar nuevo cliente
    if (!id_cliente && numero_documento) {
        if (!nombre_cliente) return mostrarToast('Busque el cliente o asigne CLIENTE VARIOS', 'warning');
        try {
            await apiCall('/api/clientes', {
                method: 'POST',
                body: JSON.stringify({
                    tipo_documento,
                    numero_documento,
                    nombre: nombre_cliente,
                    apellido: tipo_documento === 'DNI' ? apellido_cliente : '',
                    telefono: telefono_cliente || '',
                    correo: correo_cliente || ''
                })
            });
            // Obtener ID del cliente recién creado
            const clientes = await apiCall('/api/clientes');
            const nuevo = clientes.find(c => c.numero_documento === numero_documento);
            if (nuevo) {
                id_cliente = nuevo.id;
                $('id_cliente').value = nuevo.id;
            }
            mostrarToast('Cliente registrado', 'success');
        } catch (e) {
            // Si el error es "ya existe", obtener su ID
            if (e.message.includes('ya existe')) {
                const clientes = await apiCall('/api/clientes');
                const existente = clientes.find(c => c.numero_documento === numero_documento);
                if (existente) {
                    id_cliente = existente.id;
                    $('id_cliente').value = existente.id;
                } else {
                    return mostrarToast('Error al obtener cliente existente', 'danger');
                }
            } else {
                return mostrarToast(e.message, 'danger');
            }
        }
    }

    // Si sigue sin ID y no hay documento → CLIENTE VARIOS (ID=1)
    if (!id_cliente && !numero_documento) {
        id_cliente = 1;
        $('id_cliente').value = 1;
        $('nombre_cliente').value = 'CLIENTE VARIOS';
    }

    if (!id_cliente) return mostrarToast('No se pudo determinar el cliente', 'warning');

    // ─── PAGOS ───
    let pagos = [];
    let totalPagado = 0;
    const pagoInicial = parseFloat($('pago_inicial')?.value) || 0;

    if (modalidad_pago === 'CREDITO') {
        // ─── CRÉDITO: el pago es el pago inicial ───
        if (pagoInicial >= estado.totalVenta) {
            return mostrarToast('Use CONTADO si el pago inicial cubre el total', 'warning');
        }
        if (cantidad_cuotas <= 0) return mostrarToast('Ingrese cantidad de cuotas', 'warning');
        if (intervalo_dias <= 0) return mostrarToast('Ingrese intervalo de días', 'warning');

        // Determinar de dónde vienen los pagos del inicial
        if (estado.pagoMixtoInicialActivo) {
            // Pago inicial mixto activo
            pagos = obtenerPagosIniciales();
        } else if (estado.pagoMixtoActivo) {
            // Pago mixto principal activo
            pagos = obtenerPagosMixtos();
        } else {
            // Pago en efectivo simple
            pagos = [{ metodo_pago: 'EFECTIVO', monto: pagoInicial, numero_operacion: '', observacion: '' }];
        }

        // Validar que los pagos no excedan el total
        totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
        if (totalPagado > estado.totalVenta) {
            return mostrarToast('El pago inicial no puede exceder el total de la venta', 'warning');
        }
        if (totalPagado <= 0) {
            // Permitir pago inicial 0 (todo a crédito)
            pagos = [{ metodo_pago: 'EFECTIVO', monto: 0, numero_operacion: '', observacion: '' }];
            totalPagado = 0;
        }

    } else {
        // ─── CONTADO: el pago debe cubrir el total ───
        if (estado.pagoMixtoActivo) {
            pagos = obtenerPagosMixtos();
            if (pagos.length === 0) return mostrarToast('Especifique al menos un método de pago', 'warning');

            // Validar métodos duplicados
            const metodos = pagos.map(p => p.metodo_pago);
            if (new Set(metodos).size !== metodos.length) {
                return mostrarToast('No puede usar el mismo método dos veces', 'warning');
            }
        } else {
            // Pago en efectivo por el total
            pagos = [{ metodo_pago: 'EFECTIVO', monto: estado.totalVenta, numero_operacion: '', observacion: '' }];
        }

        totalPagado = pagos.reduce((s, p) => s + p.monto, 0);

        // Ajustar excedente
        if (totalPagado > estado.totalVenta) {
            const excedente = totalPagado - estado.totalVenta;
            pagos[pagos.length - 1].monto = parseFloat((pagos[pagos.length - 1].monto - excedente).toFixed(2));
            totalPagado = estado.totalVenta;
        }

        // Validar que cubra el total
        if (totalPagado < estado.totalVenta) {
            return mostrarToast(`Pago insuficiente. Total: S/ ${estado.totalVenta.toFixed(2)}, Pagado: S/ ${totalPagado.toFixed(2)}`, 'warning');
        }
    }

    // ─── ENVIAR AL BACKEND ───
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const id_usuario = sesion?.usuario?.id;
    if (!id_usuario) return mostrarToast('Usuario no autenticado', 'danger');

    try {
        const body = {
            numero_nota_venta,
            id_cliente: parseInt(id_cliente),
            id_usuario,
            modalidad_pago,
            total_venta: estado.totalVenta,
            observacion,
            productos: estado.productosSeleccionados,
            pagos,
            cantidad_cuotas,
            intervalo_dias,
            id_cotizacion: id_cotizacion ? parseInt(id_cotizacion) : null
        };

        const url = idVenta ? `/api/ventas/${idVenta}` : '/api/ventas';
        const method = idVenta ? 'PUT' : 'POST';

        await apiCall(url, { method, body: JSON.stringify(body) });
        await cargarVentas();
        mostrarToast(idVenta ? 'Venta actualizada correctamente' : 'Venta registrada correctamente', 'success');

        bootstrap.Modal.getInstance($('modalVenta'))?.hide();
        await limpiarFormulario();

    } catch (e) {
        console.error('Error al guardar venta:', e);
        mostrarToast(e.message, 'danger');
    }
}

// ============================================
// DETALLE DE VENTA
// ============================================
async function mostrarDetalleVenta(id) {
    estado.ventaActual = id;
    try {
        const venta = await apiCall(`/api/ventas/${id}`);
        limpiarBackdrops();
        $('detalleNumeroNota').textContent = venta.numero_nota_venta;
        $('detalleCliente').textContent = venta.cliente || '-';
        $('detalleClienteDoc').textContent = venta.cliente_documento || '';
        $('detalleFecha').textContent = formatearFecha(venta.fecha_venta);
        $('detalleUsuario').textContent = venta.usuario || '-';
        $('detalleTotal').textContent = `S/ ${parseFloat(venta.total_venta).toFixed(2)}`;
        $('detalleTotalPagado').textContent = `S/ ${parseFloat(venta.total_pagado || 0).toFixed(2)}`;
        $('detalleSaldoPendiente').textContent = `S/ ${Math.max(0, parseFloat(venta.deuda || 0)).toFixed(2)}`;
        $('detalleModalidad').textContent = venta.modalidad_pago;
        $('detalleObservacion').textContent = venta.observacion || '-';
        const estados = { 0: { text: 'Pago Parcial', class: 'bg-warning text-dark' }, 1: { text: 'Pagada', class: 'bg-success' }, 2: { text: 'Anulada', class: 'bg-secondary' } };
        const est = estados[venta.estado] || { text: 'Desconocido', class: 'bg-dark' };
        $('detalleEstado').textContent = est.text;
        $('detalleEstado').className = `badge ${est.class}`;

        const tbodyProd = $('detalleProductos'); tbodyProd.innerHTML = ''; let totalProd = 0;
        if (venta.detalles) venta.detalles.forEach(d => { const sub = d.precio_unitario * d.cantidad; totalProd += sub; tbodyProd.innerHTML += `<tr><td>${d.producto || '-'}</td><td class="text-end">S/ ${parseFloat(d.precio_unitario).toFixed(2)}</td><td class="text-center">${d.cantidad}</td><td class="text-end">S/ ${sub.toFixed(2)}</td></tr>`; });
        $('detalleProductosTotal').textContent = `S/ ${totalProd.toFixed(2)}`;

        const tbodyPagos = $('detallePagos'); const pagosSection = $('detallePagosSection'); tbodyPagos.innerHTML = '';
        if (venta.pagos && venta.pagos.length > 0) { pagosSection.style.display = 'block'; venta.pagos.forEach(p => tbodyPagos.innerHTML += `<tr><td><span class="badge bg-secondary">${p.metodo_pago}</span></td><td class="text-end">S/ ${parseFloat(p.monto).toFixed(2)}</td><td>${p.numero_operacion || '-'}</td><td>${p.fecha_pago || '-'}</td></tr>`); }
        else pagosSection.style.display = 'none';

        const tbodyCuotas = $('detalleCuotas'); const cuotasSection = $('detalleCuotasSection'); tbodyCuotas.innerHTML = '';
        if (venta.modalidad_pago === 'CREDITO' && venta.cuotas && venta.cuotas.length > 0) {
            cuotasSection.style.display = 'block'; const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            venta.cuotas.forEach(c => {
                const fechaVenc = new Date(c.fecha_vencimiento); const diasRest = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
                let estadoBadge;
                if (c.estado === 1) estadoBadge = '<span class="badge bg-success">Pagada</span>';
                else if (diasRest < 0) estadoBadge = '<span class="badge bg-danger">Vencida</span>';
                else if (diasRest <= 3) estadoBadge = '<span class="badge bg-warning text-dark">Por vencer</span>';
                else estadoBadge = '<span class="badge bg-info">Pendiente</span>';
                let btnPagar = c.estado === 0 ? `<button class="btn btn-sm btn-success btnPagarCuotaDetalle" data-id="${c.id}" data-monto="${c.monto}" data-numero="${c.numero_cuota}" data-vencimiento="${c.fecha_vencimiento}"><i class="bi bi-credit-card"></i></button>` : '';
                tbodyCuotas.innerHTML += `<tr><td class="text-center">#${c.numero_cuota}</td><td class="text-end">S/ ${parseFloat(c.monto).toFixed(2)}</td><td class="text-center">${c.fecha_vencimiento}</td><td class="text-center">${estadoBadge}</td><td class="text-center">${btnPagar}</td></tr>`;
            });
        } else cuotasSection.style.display = 'none';

        configurarBotonesDetalle();
        new bootstrap.Modal($('modalDetalleVenta')).show();
    } catch (e) { console.error(e); mostrarToast('Error al cargar detalle', 'danger'); }
}
function configurarBotonesDetalle() {
    const btnCorreo = $('btnReenviarCorreo');
    if (btnCorreo) {
        const n = btnCorreo.cloneNode(true);
        btnCorreo.parentNode.replaceChild(n, btnCorreo);
        n.addEventListener('click', () => reenviarNota('email'));
    }

    const btnWp = $('btnReenviarWhatsApp');
    if (btnWp) {
        const n = btnWp.cloneNode(true);
        btnWp.parentNode.replaceChild(n, btnWp);
        n.addEventListener('click', () => reenviarNota('whatsapp'));
    }

    // Botón imprimir - NUEVO
    const btnImprimir = $('btnImprimirVenta');
    if (btnImprimir) {
        const n = btnImprimir.cloneNode(true);
        btnImprimir.parentNode.replaceChild(n, btnImprimir);
        n.addEventListener('click', () => {
            if (estado.ventaActual) {
                mostrarModalOpcionesImpresion(estado.ventaActual);
            }
        });
    }
}

async function reenviarNota(canal) {
    if (!estado.ventaActual) return;
    try { await apiCall(`/api/ventas/${estado.ventaActual}/reenviar-nota`, { method: 'POST', body: JSON.stringify({ canal }) }); mostrarToast(`Enviado por ${canal}`, 'success'); }
    catch (e) { mostrarToast(e.message, 'danger'); }
}

// ============================================
// HISTORIAL DE PAGOS (COMPLETO, PROFESIONAL)
// ============================================
async function abrirHistorialPagos(id) {
    try {
        const venta = await apiCall(`/api/ventas/${id}`);
        limpiarBackdrops();

        // ─── DATOS DE CABECERA ───
        $('histComprobante').textContent = venta.numero_nota_venta ? 'NOTA' : 'VENTA';
        $('histVentaNumero').textContent = venta.numero_nota_venta || `#${id}`;
        $('histClienteNombre').textContent = venta.cliente || 'CLIENTE VARIOS';
        $('histClienteDoc').textContent = venta.cliente_documento
            ? `${venta.cliente_documento}`
            : 'Sin documento';

        // ─── TOTALES ───
        const totalVenta = parseFloat(venta.total_venta) || 0;
        const totalPagado = parseFloat(venta.total_pagado) || 0;
        const saldo = Math.max(0, totalVenta - totalPagado);

        $('histTotalVenta').textContent = `S/ ${totalVenta.toFixed(2)}`;
        $('histTotalPagado').textContent = `S/ ${totalPagado.toFixed(2)}`;
        $('histSaldoPendiente').textContent = `S/ ${saldo.toFixed(2)}`;

        // Color del saldo
        $('histSaldoPendiente').className = saldo <= 0
            ? 'fw-bold text-success fs-5'
            : 'fw-bold text-warning fs-5';

        // ─── RECOLECTAR TODOS LOS PAGOS ───
        const todosPagos = [];

        // 1. Pagos iniciales (pago_venta)
        if (venta.pagos && venta.pagos.length > 0) {
            venta.pagos.forEach(p => {
                todosPagos.push({
                    tipo: 'PAGO INICIAL',
                    icono: 'bi-cash-stack',
                    color: '#0d6efd',
                    bg: '#e8f0fe',
                    metodo: p.metodo_pago,
                    monto: parseFloat(p.monto),
                    numero_operacion: p.numero_operacion || '-',
                    fecha: p.fecha_pago || venta.fecha_venta,
                    origen: 'Venta'
                });
            });
        }

        // 2. Pagos de cuotas (pago_cuota)
        if (venta.cuotas && venta.cuotas.length > 0) {
            venta.cuotas.forEach(c => {
                if (c.estado === 1 && c.total_pagado > 0) {
                    // Buscar los pagos individuales de esta cuota
                    // Como la API devuelve el total, creamos una entrada
                    todosPagos.push({
                        tipo: `CUOTA #${c.numero_cuota}`,
                        icono: 'bi-credit-card',
                        color: '#198754',
                        bg: '#d1fae5',
                        metodo: 'PAGO CUOTA',
                        monto: parseFloat(c.total_pagado || c.monto),
                        numero_operacion: '-',
                        fecha: c.fecha_pago || c.fecha_vencimiento,
                        origen: `Cuota ${c.numero_cuota}/${venta.cantidad_cuotas}`
                    });
                }
            });
        }

        // Ordenar por fecha (más reciente primero)
        todosPagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // ─── CONSTRUIR TIMELINE ───
        const timeline = $('historialPagosTimeline');
        timeline.innerHTML = '';

        if (todosPagos.length === 0) {
            timeline.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-inbox fs-1 text-muted"></i>
                    <p class="text-muted mt-2 mb-0">No hay pagos registrados</p>
                    <small class="text-muted">Los pagos aparecerán aquí cuando se registren</small>
                </div>`;
        } else {
            todosPagos.forEach((pago, index) => {
                const fecha = new Date(pago.fecha);
                const fechaStr = fecha.toLocaleDateString('es-PE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const horaStr = fecha.toLocaleTimeString('es-PE', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                timeline.innerHTML += `
                    <div class="d-flex gap-3 ${index < todosPagos.length - 1 ? 'mb-3' : ''}" 
                         style="animation: fadeInUp 0.3s ease-out ${index * 0.05}s both;">
                        
                        <!-- Icono y línea -->
                        <div class="d-flex flex-column align-items-center" style="min-width: 40px;">
                            <div class="rounded-circle d-flex align-items-center justify-content-center" 
                                 style="width: 36px; height: 36px; background: ${pago.bg}; color: ${pago.color}; flex-shrink: 0;">
                                <i class="bi ${pago.icono}" style="font-size: 1rem;"></i>
                            </div>
                            ${index < todosPagos.length - 1 ? `
                                <div style="width: 2px; flex-grow: 1; background: #e5e7eb; margin: 4px 0;"></div>
                            ` : ''}
                        </div>
                        
                        <!-- Contenido -->
                        <div class="flex-grow-1">
                            <div class="card border-0 shadow-sm" style="border-radius: 12px;">
                                <div class="card-body p-2">
                                    <div class="d-flex justify-content-between align-items-start mb-1">
                                        <div>
                                            <span class="badge" style="background: ${pago.bg}; color: ${pago.color}; font-size: 0.65rem;">
                                                ${pago.tipo}
                                            </span>
                                            <span class="badge bg-secondary ms-1" style="font-size: 0.6rem;">
                                                ${pago.metodo}
                                            </span>
                                        </div>
                                        <span class="fw-bold" style="color: ${pago.color}; font-size: 0.95rem;">
                                            S/ ${pago.monto.toFixed(2)}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <small class="text-muted" style="font-size: 0.65rem;">
                                                <i class="bi bi-calendar3 me-1"></i>${fechaStr} ${horaStr}
                                            </small>
                                            ${pago.numero_operacion !== '-' ? `
                                                <br><small class="text-muted" style="font-size: 0.6rem;">
                                                    <i class="bi bi-hash me-1"></i>Operación: ${pago.numero_operacion}
                                                </small>
                                            ` : ''}
                                        </div>
                                        <small class="text-muted" style="font-size: 0.6rem;">${pago.origen}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
        }

        // ─── CONTADOR DE PAGOS ───
        $('histCantidadPagos').textContent = `${todosPagos.length} transaccione(s)`;

        // ─── ÚLTIMO PAGO ───
        if (todosPagos.length > 0) {
            const ultimo = todosPagos[0];
            const fechaUlt = new Date(ultimo.fecha);
            $('histUltimoPago').textContent = `Último pago: ${fechaUlt.toLocaleDateString('es-PE')} - ${ultimo.tipo}`;
        } else {
            $('histUltimoPago').textContent = 'Sin pagos registrados';
        }

        // ─── RESUMEN POR MÉTODO DE PAGO ───
        const resumenMetodos = {};
        todosPagos.forEach(p => {
            const key = p.metodo;
            if (!resumenMetodos[key]) {
                resumenMetodos[key] = { total: 0, cantidad: 0 };
            }
            resumenMetodos[key].total += p.monto;
            resumenMetodos[key].cantidad += 1;
        });

        const coloresMetodo = {
            'EFECTIVO': { color: '#059669', bg: '#d1fae5', icono: 'bi-cash' },
            'YAPE': { color: '#7c3aed', bg: '#ede9fe', icono: 'bi-phone' },
            'PLIN': { color: '#2563eb', bg: '#dbeafe', icono: 'bi-phone' },
            'TARJETA': { color: '#dc2626', bg: '#fee2e2', icono: 'bi-credit-card' },
            'TRANSFERENCIA': { color: '#d97706', bg: '#fef3c7', icono: 'bi-bank' },
            'PAGO CUOTA': { color: '#0891b2', bg: '#cffafe', icono: 'bi-calendar-check' }
        };

        const tbodyResumen = $('histResumenMetodos');
        tbodyResumen.innerHTML = '';

        if (Object.keys(resumenMetodos).length === 0) {
            tbodyResumen.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-3 small">
                        <i class="bi bi-inbox me-1"></i> No hay métodos de pago registrados
                    </td>
                </tr>`;
        } else {
            Object.entries(resumenMetodos).forEach(([metodo, datos]) => {
                const col = coloresMetodo[metodo] || { color: '#6b7280', bg: '#f3f4f6', icono: 'bi-wallet2' };
                const porcentaje = totalVenta > 0 ? ((datos.total / totalVenta) * 100).toFixed(1) : 0;
                const porcentajeNum = Math.min(parseFloat(porcentaje), 100);

                tbodyResumen.innerHTML += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="rounded p-1" style="background: ${col.bg}; color: ${col.color};">
                                    <i class="bi ${col.icono}" style="font-size: 0.8rem;"></i>
                                </div>
                                <span class="small fw-semibold">${metodo}</span>
                            </div>
                        </td>
                        <td class="text-end fw-bold small">S/ ${datos.total.toFixed(2)}</td>
                        <td class="text-center small text-muted">${datos.cantidad}</td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="progress flex-grow-1" style="height: 6px; border-radius: 3px;">
                                    <div class="progress-bar" style="width: ${porcentajeNum}%; background: ${col.color}; border-radius: 3px;"></div>
                                </div>
                                <small class="text-muted" style="font-size:0.6rem; min-width: 35px;">${porcentaje}%</small>
                            </div>
                        </td>
                    </tr>`;
            });

            const porcentajeTotal = totalVenta > 0 ? ((totalPagado / totalVenta) * 100).toFixed(1) : 0;
            const saldoRestante = Math.max(0, totalVenta - totalPagado);
            const porcentajeSaldo = totalVenta > 0 ? ((saldoRestante / totalVenta) * 100).toFixed(1) : 0;

            tbodyResumen.innerHTML += `
                <tr class="table-light fw-bold">
                    <td><i class="bi bi-check-circle text-success me-1"></i> TOTAL PAGADO</td>
                    <td class="text-end text-success">S/ ${totalPagado.toFixed(2)}</td>
                    <td class="text-center">${todosPagos.length}</td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div class="progress flex-grow-1" style="height: 6px; border-radius: 3px;">
                                <div class="progress-bar bg-success" style="width: ${porcentajeTotal}%; border-radius: 3px;"></div>
                            </div>
                            <small style="font-size:0.6rem; min-width: 35px;">${porcentajeTotal}%</small>
                        </div>
                    </td>
                </tr>`;

            if (saldoRestante > 0) {
                tbodyResumen.innerHTML += `
                    <tr class="table-light  fw-bold">
                        <td><i class="bi bi-exclamation-circle text-warning me-1"></i> SALDO CREDITO</td>
                        <td class="text-end text-warning">S/ ${saldoRestante.toFixed(2)}</td>
                        <td class="text-center">-</td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="progress flex-grow-1" style="height: 6px; border-radius: 3px;">
                                    <div class="progress-bar bg-warning" style="width: ${porcentajeSaldo}%; border-radius: 3px;"></div>
                                </div>
                                <small style="font-size:0.6rem; min-width: 35px;">${porcentajeSaldo}%</small>
                            </div>
                        </td>
                    </tr>`;
            }

            tbodyResumen.innerHTML += `
                <tr class="border-top">
                    <td class="fw-bold">TOTAL VENTA</td>
                    <td class="text-end fw-bold text-primary">S/ ${totalVenta.toFixed(2)}</td>
                    <td class="text-center">-</td>
                    <td><small class="text-muted">100%</small></td>
                </tr>`;
        }

        // ─── MOSTRAR MODAL ───
        new bootstrap.Modal($('modalHistorialPagos')).show();

    } catch (e) {
        console.error('Error al cargar historial:', e);
        mostrarToast('Error al cargar historial de pagos', 'danger');
    }
}

// ============================================
// IMPRIMIR NOTA DE VENTA
// ============================================
async function imprimirNotaVenta(idVenta, tipo = 'A4') {
    if (!idVenta) {
        mostrarToast('No hay una venta seleccionada', 'warning');
        return;
    }

    mostrarToast(`Generando PDF (${tipo === 'A4' ? 'Formato A4' : 'Ticket 80mm'})...`, 'info');

    try {
        const response = await fetch(`/api/reportes/venta/${idVenta}/pdf?tipo=${tipo}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al generar el PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const nuevaVentana = window.open(url, '_blank');

        if (!nuevaVentana) {
            const link = document.createElement('a');
            link.href = url;
            link.download = `nota_venta_${idVenta}_${tipo}.pdf`;
            link.click();
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        mostrarToast('PDF generado correctamente', 'success');
    } catch (error) {
        console.error('Error al generar PDF:', error);
        mostrarToast(error.message || 'Error al generar el PDF', 'danger');
    }
}

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
        imprimirNotaVenta(idVenta, 'A4');
    });

    newOptTicket.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
        imprimirNotaVenta(idVenta, 'ticket');
    });

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// ============================================
// CRONOGRAMA DE PAGOS (PAGO MASIVO ORDENADO)
// ============================================
async function abrirCronogramaDesdeTabla(id) {
    try {
        const venta = await apiCall(`/api/ventas/${id}`);
        estado.ventaActual = id;
        abrirCronogramaPagos(venta);
    } catch (e) { mostrarToast('Error al cargar', 'danger'); }
}

function abrirCronogramaPagos(venta) {
    $('cronoComprobante').textContent = 'NOTA';
    $('cronoVentaNumero').textContent = venta.numero_nota_venta || '-';
    $('cronoFechaEmision').textContent = venta.fecha_venta ? new Date(venta.fecha_venta).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
    $('cronoClienteNombre').textContent = venta.cliente || '-';
    $('cronoClienteDocumento').textContent = venta.cliente_documento || '-';
    $('cronoTotalVenta').textContent = `S/ ${parseFloat(venta.total_venta).toFixed(2)}`;
    $('cronoMontoPendiente').textContent = `S/ ${Math.max(0, parseFloat(venta.deuda || 0)).toFixed(2)}`;
    $('cronoPagoInicial').textContent = `S/ ${parseFloat(venta.total_pagado || 0).toFixed(2)}`;
    $('cronoNumCuotas').textContent = venta.cuotas?.length || 0;
    $('cronoIntervalo').textContent = venta.intervalo_dias ? `${venta.intervalo_dias} días` : '-';
    $('cronoSaldoFinanciar').textContent = `S/ ${(venta.cuotas || []).reduce((s, c) => s + parseFloat(c.monto), 0).toFixed(2)}`;

    const container = $('cronogramaCuotasContainer');
    container.innerHTML = '';

    if (venta.cuotas && venta.cuotas.length > 0) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

        // Encontrar la primera cuota pendiente (para pago masivo ordenado)
        const cuotasPendientes = venta.cuotas.filter(c => c.estado === 0);
        const primeraPendiente = cuotasPendientes.length > 0 ? cuotasPendientes[0].numero_cuota : -1;

        venta.cuotas.forEach((cuota) => {
            const fechaVenc = new Date(cuota.fecha_vencimiento);
            const diasRest = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
            let estadoBadge, estadoColor, estadoIcono;

            if (cuota.estado === 1) {
                estadoBadge = 'PAGADO'; estadoColor = 'success'; estadoIcono = 'check-circle';
            } else if (diasRest < 0) {
                estadoBadge = 'VENCIDO'; estadoColor = 'danger'; estadoIcono = 'exclamation-circle';
            } else if (diasRest <= 3) {
                estadoBadge = 'POR VENCER'; estadoColor = 'warning'; estadoIcono = 'clock';
            } else {
                estadoBadge = 'PENDIENTE'; estadoColor = 'info'; estadoIcono = 'hourglass-split';
            }

            // SOLO se puede pagar la primera cuota pendiente (pago ordenado)
            const esPagable = cuota.estado === 0 && cuota.numero_cuota === primeraPendiente;

            container.innerHTML += `
                <div class="col-md-6 col-lg-4 col-xl-3 mb-3">
                    <div class="card h-100 border ${esPagable ? 'border-primary border-2' : 'border-secondary'} shadow-sm" style="border-radius:8px;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div><h6 class="fw-bold mb-0">Cuota ${cuota.numero_cuota}</h6><small class="text-muted">${venta.numero_nota_venta}</small></div>
                                <span class="badge bg-${estadoColor} bg-opacity-10 text-${estadoColor} px-2 py-1" style="font-size:0.7rem;"><i class="bi bi-${estadoIcono} me-1"></i>${estadoBadge}</span>
                            </div>
                            <div class="text-center my-3">
                                <span class="fw-bold text-${cuota.estado === 1 ? 'success' : estadoColor === 'danger' ? 'danger' : 'primary'} fs-4">S/ ${parseFloat(cuota.monto).toFixed(2)}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom">
                                <small class="text-muted"><i class="bi bi-calendar-event me-1"></i>Vence:</small>
                                <small class="fw-semibold ${diasRest < 0 && cuota.estado === 0 ? 'text-danger' : ''}">${fechaVenc.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</small>
                            </div>
                            ${cuota.estado === 0 ? `
                                <div class="d-grid mt-2">
                                    <button class="btn btn-sm ${esPagable ? 'btn-success' : 'btn-secondary'} rounded-pill py-1 fw-semibold btnPagarCuotaCronograma"
                                        data-id="${cuota.id}" data-monto="${cuota.monto}" data-cuota="${cuota.numero_cuota}"
                                        data-vencimiento="${fechaVenc.toLocaleDateString('es-PE')}" ${!esPagable ? 'disabled' : ''}>
                                        <i class="bi bi-credit-card me-1"></i>${!esPagable ? 'Pague la cuota anterior primero' : 'Pagar Ahora'}
                                    </button>
                                </div>` : `<div class="text-center mt-2"><small class="text-success"><i class="bi bi-check-circle me-1"></i>Cancelado</small></div>`}
                        </div>
                    </div>
                </div>`;
        });

        setTimeout(() => {
            document.querySelectorAll('.btnPagarCuotaCronograma:not([disabled])').forEach(btn => {
                btn.addEventListener('click', function () {
                    bootstrap.Modal.getInstance($('modalCronogramaPagos')).hide();
                    setTimeout(() => abrirModalPagoCuota(this.dataset.id, this.dataset.monto, this.dataset.cuota, this.dataset.vencimiento), 300);
                });
            });
        }, 100);
    }

    new bootstrap.Modal($('modalCronogramaPagos')).show();
}

// ============================================
// PAGO DE CUOTA
// ============================================
function abrirModalPagoCuota(idCuota, monto, numero, vencimiento) {
    $('cuotaIdPagar').value = idCuota;
    $('cuotaMontoTotal').value = monto;
    $('cuotaVentaIdPagar').value = estado.ventaActual;
    $('cuotaNumeroPagar').textContent = numero;
    $('cuotaVencimientoPagar').textContent = vencimiento || '-';
    $('montoCuotaPagar').textContent = parseFloat(monto).toFixed(2);
    $('metodoPago1').value = '';
    $('montoPago1').value = '0';
    $('numeroOperacion1').value = '';
    $('usarSegundoMetodo').checked = false;
    $('segundoMetodoCard').style.display = 'none';
    $('metodoPago2').value = '';
    $('montoPago2').value = '0';
    $('numeroOperacion2').value = '';
    actualizarResumenPagoCuota();
    new bootstrap.Modal($('modalPagarCuota')).show();
}

function actualizarResumenPagoCuota() {
    const montoTotal = parseFloat($('cuotaMontoTotal')?.value) || 0;
    const monto1 = parseFloat($('montoPago1')?.value) || 0;
    const usarSegundo = $('usarSegundoMetodo')?.checked || false;
    const monto2 = usarSegundo ? (parseFloat($('montoPago2')?.value) || 0) : 0;
    const totalPagado = monto1 + monto2;
    const pendiente = montoTotal - totalPagado;
    $('totalPagadoCuota').textContent = `S/ ${totalPagado.toFixed(2)}`;
    $('saldoPendienteCuota').textContent = `S/ ${Math.max(0, pendiente).toFixed(2)}`;
    $('saldoPendienteCuota').className = pendiente <= 0.01 ? 'fw-bold text-success' : 'fw-bold text-danger';
}

async function confirmarPagoCuota() {
    const idCuota = $('cuotaIdPagar').value;
    const montoTotal = parseFloat($('cuotaMontoTotal').value) || 0;
    const metodo1 = $('metodoPago1').value;
    const monto1 = parseFloat($('montoPago1').value) || 0;
    const numOp1 = $('numeroOperacion1').value.trim();
    const usarSegundo = $('usarSegundoMetodo').checked;
    const metodo2 = $('metodoPago2').value;
    const monto2 = parseFloat($('montoPago2').value) || 0;
    const numOp2 = $('numeroOperacion2').value.trim();

    if (!metodo1) return mostrarToast('Seleccione método de pago', 'warning');
    if (monto1 <= 0) return mostrarToast('Ingrese un monto válido', 'warning');
    if (metodo1 !== 'EFECTIVO' && !numOp1) return mostrarToast('N° de operación obligatorio', 'warning');

    const pagos = [{ metodo_pago: metodo1, monto: monto1, numero_operacion: numOp1 }];

    if (usarSegundo) {
        if (!metodo2) return mostrarToast('Seleccione segundo método', 'warning');
        if (monto2 <= 0) return mostrarToast('Ingrese monto del segundo método', 'warning');
        if (metodo2 !== 'EFECTIVO' && !numOp2) return mostrarToast('N° de operación obligatorio', 'warning');
        if (metodo1 === metodo2) return mostrarToast('No puede usar el mismo método', 'warning');
        pagos.push({ metodo_pago: metodo2, monto: monto2, numero_operacion: numOp2 });
    }

    const totalPagado = monto1 + monto2;
    if (Math.abs(totalPagado - montoTotal) > 0.01) {
        return mostrarToast(`El total debe ser S/ ${montoTotal.toFixed(2)}`, 'warning');
    }

    try {
        await apiCall('/api/ventas/pago-cuota/mixto', {
            method: 'POST',
            body: JSON.stringify({ id_cuota_venta: parseInt(idCuota), pagos })
        });
        bootstrap.Modal.getInstance($('modalPagarCuota'))?.hide();
        mostrarToast('Cuota pagada correctamente', 'success');
        await cargarVentas();
        if (estado.ventaActual) await mostrarDetalleVenta(estado.ventaActual);
    } catch (e) {
        console.error('Error al pagar cuota:', e);
        mostrarToast(e.message, 'danger');
    }
}

// ============================================
// CAMBIAR ESTADO
// ============================================
async function cambiarEstadoVenta(id, estado, mensaje, tipo) {
    try { await apiCall(`/api/ventas/${id}/estado`, { method: 'PUT', body: JSON.stringify({ estado }) }); await cargarVentas(); mostrarToast(mensaje, tipo); }
    catch (e) { mostrarToast(e.message, 'danger'); }
}
async function eliminarVenta(id) {
    try { await apiCall(`/api/ventas/${id}`, { method: 'DELETE' }); await cargarVentas(); mostrarToast('Venta eliminada', 'danger'); }
    catch (e) { mostrarToast(e.message, 'danger'); }
}

// ============================================
// EDITAR VENTA
// ============================================
async function editarVenta(id) {
    try {
        const venta = await apiCall(`/api/ventas/${id}`);
        await limpiarFormulario();
        $('ventaId').value = venta.id;
        $('tituloModalVenta').textContent = 'Editar Venta';
        $('numero_nota_venta').value = venta.numero_nota_venta;
        $('fecha_venta').value = venta.fecha_venta?.split(' ')[0] || '';
        $('modalidad_pago').value = venta.modalidad_pago;
        $('observacion').value = venta.observacion || '';

        if (venta.id_cliente && venta.id_cliente !== 1) {
            $('id_cliente').value = venta.id_cliente;
            $('nombre_cliente').value = venta.cliente || '';
            $('telefono_cliente').value = venta.cliente_telefono || '';
            $('correo_cliente').value = venta.cliente_correo || '';
        }

        estado.productosSeleccionados = [];
        if (venta.detalles) {
            venta.detalles.forEach(d => {
                estado.productosSeleccionados.push({
                    id_producto: d.id_producto,
                    producto_nombre: d.producto,
                    precio_unitario: parseFloat(d.precio_unitario),
                    cantidad: parseFloat(d.cantidad)
                });
            });
        }
        actualizarTablaProductos();

        if (venta.modalidad_pago === 'CREDITO') {
            $('divCredito').style.display = 'block';
            $('cantidad_cuotas').value = venta.cantidad_cuotas || 0;
            $('intervalo_dias').value = venta.intervalo_dias || 0;
            $('pago_inicial').value = venta.pago_inicial || 0;
        }

        new bootstrap.Modal($('modalVenta')).show();
    } catch (e) { mostrarToast('Error al cargar venta', 'danger'); }
}

// ============================================
// COTIZACIONES
// ============================================
async function abrirModalCotizaciones() {
    try {
        const cotizaciones = await apiCall('/api/cotizaciones');
        const activas = cotizaciones.filter(c => c.estado === 1);
        const tbody = $('tablaCotizacionesModal');
        const sinDatos = $('sinCotizacionesModal');
        tbody.innerHTML = '';
        if (activas.length === 0) { sinDatos.style.display = 'block'; }
        else {
            sinDatos.style.display = 'none';
            activas.forEach(c => tbody.innerHTML += `<tr><td><strong>${c.numero_cotizacion}</strong></td><td>${c.cliente || '-'}</td><td>${formatearFecha(c.fecha)}</td><td class="text-end fw-bold">S/ ${parseFloat(c.total).toFixed(2)}</td><td class="text-center"><button class="btn btn-sm btn-success btnSeleccionarCot" data-id="${c.id}"><i class="bi bi-check-circle me-1"></i> Seleccionar</button></td></tr>`);
        }
        $('buscarCotizacionModal').value = '';
        $('buscarCotizacionModal').oninput = (e) => { const v = e.target.value.toLowerCase(); tbody.querySelectorAll('tr').forEach(f => f.style.display = f.textContent.toLowerCase().includes(v) ? '' : 'none'); };
        tbody.querySelectorAll('.btnSeleccionarCot').forEach(btn => { btn.onclick = async () => { if (estado.modalSeleccionCotizacion) estado.modalSeleccionCotizacion.hide(); await cargarCotizacion(parseInt(btn.dataset.id)); }; });
        if (!estado.modalSeleccionCotizacion) estado.modalSeleccionCotizacion = new bootstrap.Modal($('modalSeleccionarCotizacion'));
        estado.modalSeleccionCotizacion.show();
    } catch (e) { console.error(e); mostrarToast('Error al cargar cotizaciones', 'danger'); }
}

async function cargarCotizacion(id) {
    try {
        const cot = await apiCall(`/api/cotizaciones/${id}`);
        estado.cotizacionCargada = cot;
        $('id_cotizacion_origen').value = cot.id;
        if (cot.id_cliente) {
            $('id_cliente').value = cot.id_cliente;
            try {
                const cliente = await apiCall(`/api/clientes/${cot.id_cliente}`);
                $('nombre_cliente').value = cliente.nombre || '';
                $('numero_documento_cliente').value = cliente.numero_documento || '';
                $('tipo_documento_cliente').value = cliente.tipo_documento || '';
                $('telefono_cliente').value = cliente.telefono || '';
                $('correo_cliente').value = cliente.correo || '';
                $('clienteNoExistenteAlert').style.display = 'none';
                if (cliente.tipo_documento === 'RUC') {
                    $('rowDireccionCliente').style.display = 'block';
                }
            } catch (e) { $('nombre_cliente').value = cot.cliente || ''; }
        }
        estado.productosSeleccionados = [];
        if (cot.detalles) cot.detalles.forEach(d => estado.productosSeleccionados.push({ id_producto: d.id_producto || null, producto_nombre: d.producto_nombre, precio_unitario: parseFloat(d.precio_original) || 0, cantidad: parseInt(d.cantidad) || 0 }));
        actualizarTablaProductos();
        $('cotizacionCargadaInfo').style.display = 'block';
        $('cotizacionCargadaNumero').textContent = cot.numero_cotizacion;
        $('btnCargarCotizacion').style.display = 'none';
        mostrarToast(`Cotización ${cot.numero_cotizacion} cargada`, 'success');
    } catch (e) { console.error(e); mostrarToast('Error al cargar cotización', 'danger'); }
}

function quitarCotizacion() {
    estado.cotizacionCargada = null;
    $('id_cotizacion_origen').value = '';
    $('cotizacionCargadaInfo').style.display = 'none';
    $('btnCargarCotizacion').style.display = 'block';
    mostrarToast('Cotización desvinculada', 'info');
}

// ============================================
// EVENTOS GLOBALES
// ============================================
function configurarEventos() {
    // ============================================
    // CLICK EN BOTONES DE TABLA
    // ============================================
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;

        const btnVer = e.target.closest('.btnVerVenta');
        if (btnVer) { await mostrarDetalleVenta(parseInt(btnVer.dataset.id)); return; }

        const btnEditar = e.target.closest('.btnEditarVenta');
        if (btnEditar) { await editarVenta(parseInt(btnEditar.dataset.id)); return; }

        const btnAnular = e.target.closest('.btnAnularVenta');
        if (btnAnular) {
            const id = parseInt(btnAnular.dataset.id);
            mostrarModalConfirmacionProfesional('Anular Venta', '¿Desea anular esta venta?', () => cambiarEstadoVenta(id, 2, 'Venta anulada', 'warning'), 'warning', 'Anular');
            return;
        }

        const btnReactivar = e.target.closest('.btnReactivarVenta');
        if (btnReactivar) {
            const id = parseInt(btnReactivar.dataset.id);
            mostrarModalConfirmacionProfesional('Reactivar Venta', '¿Desea reactivar esta venta?', () => cambiarEstadoVenta(id, 0, 'Venta reactivada', 'success'), 'success', 'Reactivar');
            return;
        }

        const btnEliminar = e.target.closest('.btnEliminarVenta');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional('Eliminar Venta', '¿Desea eliminar esta venta?', () => eliminarVenta(id), 'danger', 'Eliminar');
            return;
        }

        const btnHistorial = e.target.closest('.btnHistorialPagos');
        if (btnHistorial) { await abrirHistorialPagos(parseInt(btnHistorial.dataset.id)); return; }

        const btnCronograma = e.target.closest('.btnCronogramaPagos');
        if (btnCronograma) { await abrirCronogramaDesdeTabla(parseInt(btnCronograma.dataset.id)); return; }

        const btnPagarCuota = e.target.closest('.btnPagarCuotaDetalle');
        if (btnPagarCuota) {
            abrirModalPagoCuota(btnPagarCuota.dataset.id, btnPagarCuota.dataset.monto, btnPagarCuota.dataset.numero, btnPagarCuota.dataset.vencimiento);
            return;
        }
    });

    // ============================================
    // FILTROS
    // ============================================
    $('buscarVenta')?.addEventListener('input', aplicarFiltros);
    $('filtroEstadoVentas')?.addEventListener('change', aplicarFiltros);
    $('filtroCantidadVentas')?.addEventListener('change', aplicarFiltros);

    // ============================================
    // NUEVA VENTA
    // ============================================
    $('btnNuevaVenta')?.addEventListener('click', async () => {
        await limpiarFormulario();
        new bootstrap.Modal($('modalVenta')).show();
    });

    // ============================================
    // GUARDAR VENTA
    // ============================================
    $('btnGuardarVenta')?.addEventListener('click', guardarVenta);

    // ============================================
    // MODALIDAD DE PAGO
    // ============================================
    $('modalidad_pago')?.addEventListener('change', function () {
        const isCredito = this.value === 'CREDITO';
        $('divCredito').style.display = isCredito ? 'block' : 'none';

        // Actualizar título de sección de pago
        const tituloPago = $('tituloSeccionPago');
        if (tituloPago) tituloPago.textContent = isCredito ? 'Pago Inicial' : 'Pago';

        // DESHABILITAR switch de pago mixto en CRÉDITO
        const switchPagoMixto = $('switchPagoMixto');
        const switchContainer = $('switchPagoMixtoContainer');
        if (isCredito) {
            if (switchPagoMixto) {
                switchPagoMixto.checked = false;
                switchPagoMixto.disabled = true;
                estado.pagoMixtoActivo = false;
            }
            if (switchContainer) {
                switchContainer.style.opacity = '0.5';
                switchContainer.style.pointerEvents = 'none';
            }
            $('pagoEfectivoInfo').style.display = 'block';
            $('pagosContainer').style.display = 'none';
            $('intervalo_dias').value = 15;
            setTimeout(calcularCuotas, 100);
        } else {
            if (switchPagoMixto) {
                switchPagoMixto.disabled = false;
            }
            if (switchContainer) {
                switchContainer.style.opacity = '1';
                switchContainer.style.pointerEvents = 'auto';
            }
        }

        actualizarVistaPago();
    });
    // ============================================
    // SWITCH PAGO MIXTO (PRINCIPAL)
    // ============================================
    $('switchPagoMixto')?.addEventListener('change', function () {
        estado.pagoMixtoActivo = this.checked;
        $('pagoEfectivoInfo').style.display = this.checked ? 'none' : 'block';
        $('pagosContainer').style.display = this.checked ? 'block' : 'none';
        if (this.checked) resetearPagosMixtos();
        actualizarVistaPago();
    });

    // ============================================
    // SWITCH PAGO MIXTO INICIAL (CRÉDITO)
    // ============================================
    $('switchPagoMixtoInicial')?.addEventListener('change', function () {
        estado.pagoMixtoInicialActivo = this.checked;
        $('pagosInicialContainer').style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            resetearPagosIniciales();
        } else {
            $('pago_inicial').value = 0;
            $('pagoInicialEfectivo').textContent = 'S/ 0.00';
        }
        calcularCuotas();
        actualizarVistaPago();
    });

    // ============================================
    // CRÉDITO: PAGO INICIAL, CUOTAS, INTERVALO
    // ============================================
    $('pago_inicial')?.addEventListener('input', () => {
        if (!estado.pagoMixtoInicialActivo) {
            $('pagoInicialEfectivo').textContent = `S/ ${($('pago_inicial')?.value || 0)}`;
        }
        calcularCuotas();
        actualizarVistaPago();
    });

    $('cantidad_cuotas')?.addEventListener('input', () => {
        calcularCuotas();
        actualizarVistaPago();
    });

    $('intervalo_dias')?.addEventListener('input', () => {
        calcularCuotas();
        actualizarVistaPago();
    });

    // ============================================
    // PRODUCTOS
    // ============================================
    $('buscarProductoInput')?.addEventListener('input', (e) => cargarSelectProductos(e.target.value));

    $('selectProducto')?.addEventListener('change', function () {
        const opt = this.options[this.selectedIndex];
        $('precioUnitario').value = opt.dataset.precio || '';
        $('stockDisponible').value = opt.dataset.stock || '';
        $('cantidadProducto').value = '1';
    });

    $('btnAgregarProducto')?.addEventListener('click', () => {
        const select = $('selectProducto');
        const productoId = select?.value;
        if (!productoId) return mostrarToast('Seleccione un producto', 'warning');

        const opt = select.options[select.selectedIndex];
        const nombre = opt.dataset.nombre || '';
        const precio = parseFloat($('precioUnitario')?.value) || 0;
        const cantidad = parseFloat($('cantidadProducto')?.value) || 0;
        const stock = parseFloat(opt.dataset.stock) || 0;

        if (cantidad <= 0) return mostrarToast('Cantidad inválida', 'warning');
        if (cantidad > stock) return mostrarToast('Stock insuficiente', 'warning');

        const existe = estado.productosSeleccionados.find(p => p.id_producto === parseInt(productoId));
        if (existe) {
            existe.cantidad += cantidad;
        } else {
            estado.productosSeleccionados.push({
                id_producto: parseInt(productoId),
                producto_nombre: nombre,
                precio_unitario: precio,
                cantidad
            });
        }

        actualizarTablaProductos();
        select.value = '';
        $('buscarProductoInput').value = '';
        $('cantidadProducto').value = '1';
        $('precioUnitario').value = '';
        $('stockDisponible').value = '';
        cargarSelectProductos('');
    });

    // ============================================
    // CLIENTE
    // ============================================
    $('btnBuscarClienteVenta')?.addEventListener('click', buscarCliente);
    $('btnLimpiarClienteVenta')?.addEventListener('click', limpiarCliente);

    $('numero_documento_cliente')?.addEventListener('input', function () {
        soloNumeros(this);
        const l = this.value.length;
        if (l === 8) $('tipo_documento_cliente').value = 'DNI';
        else if (l === 11) $('tipo_documento_cliente').value = 'RUC';
        else if (l === 0) $('tipo_documento_cliente').value = '';
    });

    $('numero_documento_cliente')?.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarCliente();
        }
    });

    $('tipo_documento_cliente')?.addEventListener('change', function () {
        $('rowDireccionCliente').style.display = this.value === 'RUC' ? 'block' : 'none';
        const apellidoEl = $('apellido_cliente');
        if (apellidoEl) {
            apellidoEl.parentElement.style.display = this.value === 'DNI' ? 'block' : 'none';
            if (this.value === 'RUC') apellidoEl.value = '';
        }
    });

    // ============================================
    // COTIZACIÓN
    // ============================================
    $('btnCargarCotizacion')?.addEventListener('click', abrirModalCotizaciones);
    $('btnQuitarCotizacion')?.addEventListener('click', quitarCotizacion);

    // ============================================
    // PAGO DE CUOTA - SEGUNDO MÉTODO (CHECKBOX)
    // ============================================
    $('usarSegundoMetodo')?.addEventListener('change', function () {
        $('segundoMetodoCard').style.display = this.checked ? 'block' : 'none';
        if (!this.checked) {
            $('metodoPago2').value = '';
            $('montoPago2').value = '0';
            $('numeroOperacion2').value = '';
        }
        actualizarResumenPagoCuota();
    });

    // ============================================
    // PAGO DE CUOTA - MÉTODO 1 Y 2
    // ============================================
    ['metodoPago1', 'metodoPago2'].forEach(id => {
        $(id)?.addEventListener('change', function () {
            const numOp = $(id === 'metodoPago1' ? 'numeroOperacion1' : 'numeroOperacion2');
            if (numOp) {
                numOp.placeholder = this.value === 'EFECTIVO' ? 'No requerido' : 'Obligatorio';
                numOp.required = this.value !== 'EFECTIVO';
            }
        });
    });

    // ============================================
    // PAGO DE CUOTA - MONTOS
    // ============================================
    ['montoPago1', 'montoPago2'].forEach(id => {
        $(id)?.addEventListener('input', function () {
            const montoTotal = parseFloat($('cuotaMontoTotal')?.value) || 0;
            const otroId = id === 'montoPago1' ? 'montoPago2' : 'montoPago1';
            const otroValor = parseFloat($(otroId)?.value) || 0;
            let valor = parseFloat(this.value) || 0;
            if (valor < 0) { this.value = '0'; valor = 0; }
            if (valor + otroValor > montoTotal) {
                this.value = (montoTotal - otroValor).toFixed(2);
            }
            actualizarResumenPagoCuota();
        });
    });

    // ============================================
    // CONFIRMAR PAGO DE CUOTA
    // ============================================
    $('btnConfirmarPagoCuota')?.addEventListener('click', confirmarPagoCuota);
}
// ============================================
// INICIALIZACIÓN
// ============================================
export async function init() {
    if (!isCurrentPage()) return;
    if (estado.inicializado) { await cargarVentas(); await cargarProductos(); return; }
    estado.inicializado = true;
    configurarEventos();
    await cargarProductos();
    await cargarVentas();
}

export function destroy() {
    estado.inicializado = false;
    estado.ventas = []; estado.productos = []; estado.ventaActual = null;
    estado.productosSeleccionados = []; estado.totalVenta = 0;
    estado.cotizacionCargada = null; estado.modalSeleccionCotizacion = null;
    estado.pagoMixtoActivo = false; estado.pagoMixtoInicialActivo = false;
}