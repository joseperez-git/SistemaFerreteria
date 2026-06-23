import { mostrarToast, limpiarBackdrops, mostrarModalConfirmacionProfesional } from './helpers.js';

// ============================================
// VARIABLES GLOBALES
// ============================================
let pedidosGlobal = [];
let movimientosGlobal = [];
let productosGlobal = [];
let inventarioGlobal = [];
let pedidoActual = null;
let eventosInicializados = false;
let graficoDonaInstance = null;

// ============================================
// HELPERS
// ============================================
function isCurrentPage() {
    return document.getElementById('tablaPedidosPendientes') !== null ||
        document.getElementById('tablaInventario') !== null;
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const f = new Date(fechaISO);
    return `${f.getDate().toString().padStart(2, '0')}/${(f.getMonth() + 1).toString().padStart(2, '0')}/${f.getFullYear()}`;
}


// ============================================
// PESTAÑA 1: PEDIDOS PENDIENTES
// ============================================
async function cargarPedidosPendientes() {
    try {
        const response = await fetch('/api/pedidos');
        if (!response.ok) throw new Error('Error al cargar pedidos');
        const pedidos = await response.json();
        pedidosGlobal = (Array.isArray(pedidos) ? pedidos : []).filter(p => [0, 1, 2].includes(p.estado));
        aplicarFiltrosPedidos();
    } catch (e) { console.error(e); }
}

function aplicarFiltrosPedidos() {
    const buscar = document.getElementById('buscarPedido')?.value?.toLowerCase() || '';
    const estado = document.getElementById('filtroEstado')?.value || '';
    const cantidad = parseInt(document.getElementById('filtroCantidad')?.value || 5);

    let filtrados = pedidosGlobal.filter(p => p.estado !== 3 && p.estado !== 4);
    if (buscar) {
        filtrados = filtrados.filter(p =>
            p.numero_pedido?.toLowerCase().includes(buscar) ||
            p.cliente?.toLowerCase().includes(buscar)
        );
    }
    if (estado !== '') filtrados = filtrados.filter(p => p.estado == estado);

    renderizarPedidos(filtrados.slice(0, cantidad));
}

function renderizarPedidos(pedidos) {
    const tabla = document.getElementById('tablaPedidosPendientes');
    if (!tabla) return;

    tabla.innerHTML = pedidos.length ? pedidos.map(pedido => {
        let estadoBadge = '';
        let botones = '';

        // Estado del pedido
        if (pedido.estado === 0) {
            estadoBadge = '<span class="badge bg-warning text-dark">Registrado</span>';
            botones = `<button class="btn btn-sm btn-primary btnPreparar" data-id="${pedido.id}" title="Marcar en preparación"><i class="bi bi-box-seam"></i></button>`;
        } else if (pedido.estado === 1) {
            estadoBadge = '<span class="badge bg-info">En Preparación</span>';
            botones = `
                <button class="btn btn-sm btn-warning btnEntregarParcial" data-id="${pedido.id}" title="Entrega parcial"><i class="bi bi-box-seam"></i></button>
                <button class="btn btn-sm btn-success btnEntregarTotal" data-id="${pedido.id}" title="Entregar todo"><i class="bi bi-check-circle"></i></button>
            `;

            // Si es ENVÍO, mostrar estado de envío
            if (pedido.tipo_entrega === 'ENVIO') {
                const estadosEnvio = {
                    0: '<span class="badge bg-warning text-dark ms-1">Envío Pendiente</span>',
                    1: '<span class="badge bg-info ms-1">En Camino</span>',
                    2: '<span class="badge bg-success ms-1">Entregado</span>',
                    3: '<span class="badge bg-danger ms-1">Fallido</span>'
                };
                estadoBadge += estadosEnvio[pedido.estado_entrega] || '';

                botones += `
                    <div class="btn-group-vertical btn-group-sm mt-1">
                        <button class="btn btn-sm btn-outline-info btnEnvioCamino" data-id="${pedido.id}" data-entrega-id="${pedido.id_entrega}" title="En camino"><i class="bi bi-geo-alt"></i> En Camino</button>
                        <button class="btn btn-sm btn-outline-success btnEnvioEntregado" data-id="${pedido.id}" data-entrega-id="${pedido.id_entrega}" title="Entregado"><i class="bi bi-check-lg"></i> Entregado</button>
                        <button class="btn btn-sm btn-outline-danger btnEnvioFallido" data-id="${pedido.id}" data-entrega-id="${pedido.id_entrega}" title="Fallido"><i class="bi bi-exclamation-triangle"></i> Fallido</button>
                    </div>
                `;
            }
        } else if (pedido.estado === 2) {
            estadoBadge = '<span class="badge bg-warning">Parcialmente Entregado</span>';
            botones = `<button class="btn btn-sm btn-success btnEntregarParcial" data-id="${pedido.id}" title="Completar entrega"><i class="bi bi-check-circle"></i></button>`;
        }

        // Botón cancelar (visible para estados 0, 1, 2)
        const btnCancelar = [0, 1, 2].includes(pedido.estado)
            ? `<button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${pedido.id}" title="Cancelar pedido"><i class="bi bi-x-circle"></i></button>`
            : '';

        return `
            <tr>
                <td class="text-center">${pedido.id}</td>
                <td class="text-start"><strong>${pedido.numero_pedido}</strong></td>
                <td class="text-start">${pedido.cliente || '-'}</td>
                <td class="text-center">${formatearFecha(pedido.fecha_pedido)}</td>
                <td class="fw-bold text-primary">S/ ${parseFloat(pedido.total_pedido).toFixed(2)}</td>
                <td class="text-center">${estadoBadge}</td>
                <td class="text-center text-nowrap">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-sm btn-info btnVerPedido" data-id="${pedido.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>
                        ${botones}
                        ${btnCancelar}
                    </div>
                </td>
            </tr>
        `;
    }).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No hay pedidos pendientes</td></tr>`;
}

// ============================================
// PESTAÑA 2: MOVIMIENTOS DE INVENTARIO
// ============================================
async function cargarMovimientos() {
    try {
        const response = await fetch('/api/movimientos-inventario');
        if (!response.ok) throw new Error('Error al cargar movimientos');
        movimientosGlobal = await response.json();
        renderizarMovimientos();
    } catch (error) { console.error(error); }
}

// ============================================
// PESTAÑA 3: STOCK ACTUAL
// ============================================
async function cargarStockActual() {
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        productosGlobal = await response.json();
        renderizarStockActual();
    } catch (error) { console.error(error); }
}


// ============================================
// ACCIONES DE PEDIDOS
// ============================================
async function marcarPreparacion(idPedido) {
    try {
        const response = await fetch(`/api/pedidos/${idPedido}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 1 })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        mostrarToast('Pedido marcado como "En Preparación"', 'success');
        await cargarPedidosPendientes();
    } catch (error) { mostrarToast(error.message, 'danger'); }
}

async function confirmarEntrega() {
    if (!pedidoActual) return;

    const productos = [];
    document.querySelectorAll('#tablaProductosEntrega .cantidad-entregar').forEach(input => {
        const cantidad = parseFloat(input.value);
        if (cantidad > 0) {
            productos.push({
                id_producto: parseInt(input.dataset.idProducto),
                cantidad: cantidad
            });
        }
    });

    if (productos.length === 0) {
        mostrarToast('Debe especificar al menos un producto a entregar', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/entregas/${pedidoActual.id}/confirmar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productos })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        mostrarToast('Entrega registrada correctamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalEntregarProductos'))?.hide();
        await cargarPedidosPendientes();
    } catch (error) { mostrarToast(error.message, 'danger'); }
}


async function abrirModalEntrega(idPedido) {
    try {
        const response = await fetch(`/api/pedidos/${idPedido}`);
        if (!response.ok) throw new Error('Error al obtener detalles del pedido');
        const pedido = await response.json();
        pedidoActual = pedido;

        const tbody = document.getElementById('tablaProductosEntrega');
        tbody.innerHTML = '';
        let hayPendientes = false;

        for (const detalle of pedido.detalles) {
            const pendiente = detalle.cantidad - (detalle.cantidad_entregada || 0);
            if (pendiente <= 0) continue;
            hayPendientes = true;

            tbody.innerHTML += `
                <tr>
                    <td class="text-start">${detalle.producto}</td>
                    <td class="text-center">${pendiente}</td>
                    <td class="text-center">
                        <input type="number" step="0.01" class="form-control form-control-sm cantidad-entregar" 
                               data-id-producto="${detalle.id_producto}" 
                               data-max="${pendiente}"
                               value="${pendiente}" 
                               style="width: 100px; margin: 0 auto;">
                    </td>
                </tr>
            `;
        }

        if (!hayPendientes) {
            mostrarToast('No hay productos pendientes por entregar', 'warning');
            return;
        }

        new bootstrap.Modal(document.getElementById('modalEntregarProductos')).show();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar los productos del pedido', 'danger');
    }
}


async function entregarTotal(idPedido) {
    try {
        const response = await fetch(`/api/pedidos/${idPedido}`);
        if (!response.ok) throw new Error('Error al obtener detalles del pedido');
        const pedido = await response.json();

        const productos = [];
        for (const detalle of pedido.detalles) {
            const pendiente = detalle.cantidad - (detalle.cantidad_entregada || 0);
            if (pendiente > 0) {
                productos.push({
                    id_producto: detalle.id_producto,
                    cantidad: pendiente
                });
            }
        }

        if (productos.length === 0) {
            mostrarToast('No hay productos pendientes por entregar', 'warning');
            return;
        }

        const responseEntrega = await fetch(`/api/entregas/${idPedido}/confirmar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productos })
        });

        const data = await responseEntrega.json();
        if (!responseEntrega.ok) throw new Error(data.error);

        mostrarToast('Pedido entregado completamente', 'success');
        await cargarPedidosPendientes();
    } catch (error) { mostrarToast(error.message, 'danger'); }
}



async function actualizarEstadoEnvio(idPedido, idEntrega, nuevoEstado, mensaje) {
    if (!idEntrega) {
        mostrarToast('No hay un registro de entrega asociado a este pedido', 'warning');
        return;
    }

    try {
        const response = await fetch(`/api/entregas/${idEntrega}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        mostrarToast(mensaje, 'success');
        await cargarPedidosPendientes();
    } catch (error) { mostrarToast(error.message, 'danger'); }
}



async function verDetallePedido(idPedido) {
    try {
        const module = await import('/js/pedidos.js');
        if (typeof module.mostrarDetallePedido === 'function') {
            await module.mostrarDetallePedido(idPedido);
        } else {
            mostrarToast('Error: No se pudo cargar el detalle del pedido', 'danger');
        }
    } catch (error) {
        console.error('Error al cargar detalle:', error);
        mostrarToast('Error al cargar detalles del pedido', 'danger');
    }
}


// ============================================
// EVENTOS
// ============================================
function setupEventListeners() {
    // Eventos delegados para botones
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;

        const target = (selector) => e.target.closest(selector);

        // Pedidos
        const btnPreparar = target('.btnPreparar');
        if (btnPreparar) { await marcarPreparacion(parseInt(btnPreparar.dataset.id)); return; }

        const btnEntregarParcial = target('.btnEntregarParcial');
        if (btnEntregarParcial) { await abrirModalEntrega(parseInt(btnEntregarParcial.dataset.id)); return; }

        const btnEntregarTotal = target('.btnEntregarTotal');
        if (btnEntregarTotal) { await entregarTotal(parseInt(btnEntregarTotal.dataset.id)); return; }

        const btnCancelar = target('.btnCancelarPedido');
        if (btnCancelar) { await cancelarPedido(parseInt(btnCancelar.dataset.id)); return; }

        const btnVer = target('.btnVerPedido');
        if (btnVer) { await verDetallePedido(parseInt(btnVer.dataset.id)); return; }

        // Envíos
        const btnEnvioCamino = target('.btnEnvioCamino');
        if (btnEnvioCamino) {
            await actualizarEstadoEnvio(
                parseInt(btnEnvioCamino.dataset.id),
                parseInt(btnEnvioCamino.dataset.entregaId),
                1, 'Envío marcado como "En Camino"'
            );
            return;
        }

        const btnEnvioEntregado = target('.btnEnvioEntregado');
        if (btnEnvioEntregado) {
            await actualizarEstadoEnvio(
                parseInt(btnEnvioEntregado.dataset.id),
                parseInt(btnEnvioEntregado.dataset.entregaId),
                2, 'Envío marcado como "Entregado"'
            );
            return;
        }

        const btnEnvioFallido = target('.btnEnvioFallido');
        if (btnEnvioFallido) {
            await actualizarEstadoEnvio(
                parseInt(btnEnvioFallido.dataset.id),
                parseInt(btnEnvioFallido.dataset.entregaId),
                3, 'Envío marcado como "Fallido"'
            );
            return;
        }

        // Inventario
        const btnVerDetalle = target('.btnVerDetalle');
        if (btnVerDetalle) { await verDetalle(parseInt(btnVerDetalle.dataset.id)); return; }

        const btnAjustarStock = target('.btnAjustarStock');
        if (btnAjustarStock) { abrirModalStock(parseInt(btnAjustarStock.dataset.id)); return; }
    });

    // Filtros de pedidos
    document.getElementById('buscarPedido')?.addEventListener('input', aplicarFiltrosPedidos);
    document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltrosPedidos);
    document.getElementById('filtroCantidad')?.addEventListener('change', aplicarFiltrosPedidos);

    // Filtros de movimientos
    document.getElementById('buscarMovimiento')?.addEventListener('input', renderizarMovimientos);
    document.getElementById('filtroTipoMov')?.addEventListener('change', renderizarMovimientos);
    document.getElementById('filtroCantidadMov')?.addEventListener('change', renderizarMovimientos);

    // Filtros de stock
    document.getElementById('buscarProductoStock')?.addEventListener('input', renderizarStockActual);
    document.getElementById('filtroStockMinimo')?.addEventListener('change', renderizarStockActual);
    document.getElementById('btnActualizarStock')?.addEventListener('click', cargarStockActual);

    // Botones de modales
    document.getElementById('btnConfirmarEntrega')?.addEventListener('click', confirmarEntrega);
    document.getElementById('btnGuardarAjusteStock')?.addEventListener('click', guardarAjusteStock);
}

// ============================================
// INICIALIZACIÓN
// ============================================
let eventosInicializados = false;

// ============================================
// INICIALIZACIÓN
// ============================================

export function destroy() {
    eventosInicializados = false;
    if (graficoDonaInstance) graficoDonaInstance.destroy();
}

function renderizarMovimientos() {
    const tabla = document.getElementById('tablaMovimientos');
    if (!tabla) return;

    const buscar = document.getElementById('buscarMovimiento')?.value?.toLowerCase() || '';
    const tipo = document.getElementById('filtroTipoMov')?.value || '';
    const cantidad = parseInt(document.getElementById('filtroCantidadMov')?.value || 20);

    let filtrados = movimientosGlobal;
    if (buscar) {
        filtrados = filtrados.filter(m =>
            m.producto?.toLowerCase().includes(buscar) ||
            m.motivo?.toLowerCase().includes(buscar)
        );
    }
    if (tipo) filtrados = filtrados.filter(m => m.tipo_movimiento === tipo);
    filtrados = filtrados.slice(0, cantidad);

    const tipoBadges = {
        'ENTRADA': 'bg-success',
        'SALIDA': 'bg-danger',
        'RESERVA': 'bg-warning text-dark',
        'LIBERACION': 'bg-secondary',
        'ENTREGA_PARCIAL': 'bg-info'
    };

    tabla.innerHTML = filtrados.length ? filtrados.map(mov => `
        <tr style="font-size: 0.75rem;">
            <td class="text-center">${formatearFecha(mov.fecha)}</td>
            <td class="text-start">${mov.producto || '-'}</td>
            <td class="text-center"><span class="badge ${tipoBadges[mov.tipo_movimiento] || 'bg-secondary'}">${mov.tipo_movimiento}</span></td>
            <td class="text-end">${mov.cantidad}</td>
            <td class="text-end">${mov.stock_anterior}</td>
            <td class="text-end">${mov.stock_nuevo}</td>
            <td class="text-start">${mov.motivo || '-'}</td>
            <td class="text-start">${mov.usuario || '-'}</td>
        </tr>
    `).join('') : `<tr><td colspan="8" class="text-center text-muted py-4">No hay movimientos registrados</td></tr>`;
}


function renderizarStockActual() {
    const tabla = document.getElementById('tablaStockActual');
    if (!tabla) return;

    const buscar = document.getElementById('buscarProductoStock')?.value?.toLowerCase() || '';
    const stockMinimo = document.getElementById('filtroStockMinimo')?.value === '1';

    let filtrados = productosGlobal.filter(p => p.estado === 1);
    if (buscar) filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(buscar));
    if (stockMinimo) filtrados = filtrados.filter(p => (p.stock - p.stock_reservado) <= p.stock_minimo);

    tabla.innerHTML = filtrados.length ? filtrados.map(producto => {
        const disponible = producto.stock - producto.stock_reservado;
        const disponibleClass = disponible <= producto.stock_minimo ? 'text-danger fw-bold' : 'text-success';
        return `
            <tr>
                <td class="text-center">${producto.id}</td>
                <td class="text-start">${producto.nombre}</td>
                <td class="text-start">${producto.categoria_nombre || '-'}</td>
                <td class="text-end">${producto.stock}</td>
                <td class="text-end">${producto.stock_reservado}</td>
                <td class="text-end ${disponibleClass}">${disponible}</td>
                <td class="text-end">S/ ${parseFloat(producto.precio).toFixed(2)}</td>
            </tr>
        `;
    }).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No hay productos registrados</td></tr>`;
}

// ============================================
// GESTIÓN DE INVENTARIO AVANZADA
// ============================================
async function cargarEstadisticas() {
    try {
        const data = await (await fetch('/api/inventario/estadisticas')).json();
        if (data.error) return;
        document.getElementById('statTotalProductos').textContent = data.total_productos || 0;
        document.getElementById('statStockCritico').textContent = data.stock_critico || 0;
        document.getElementById('statStockOptimo').textContent = data.stock_optimo || 0;
        document.getElementById('statValorTotal').textContent = 'S/ ' + parseFloat(data.valor_total || 0).toFixed(2);
    } catch (e) { console.error(e); }
}


async function cargarTablaInventario() {
    try {
        inventarioGlobal = await (await fetch('/api/inventario/listar')).json();
        const tabla = document.getElementById('tablaInventario');
        if (!tabla || inventarioGlobal.error) return;

        const estadoClasses = {
            'ÓPTIMO': 'bg-success',
            'BAJO': 'bg-warning text-dark',
            'CRÍTICO': 'bg-danger',
            'SIN STOCK': 'bg-dark'
        };

        tabla.innerHTML = inventarioGlobal.map(p => `
            <tr>
                <td class="text-center">${p.id}</td>
                <td>
                    <strong>${p.nombre}</strong>
                    <br><small class="text-muted">${p.codigo_barras || 'Sin código'}</small>
                </td>
                <td class="text-center fw-bold">${p.stock_disponible} ${p.unidad_abreviatura || 'und'}</td>
                <td class="text-center">${p.stock_minimo}</td>
                <td class="text-center"><span class="badge ${estadoClasses[p.estado_stock] || 'bg-secondary'}">${p.estado_stock}</span></td>
                <td class="text-end">S/ ${parseFloat(p.valor_total || 0).toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-dark btnVerDetalle" data-id="${p.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-sm btn-success btnAjustarStock" data-id="${p.id}" title="Ajustar stock"><i class="bi bi-pencil-square"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error(e); }
}

async function verDetalle(id) {
    try {
        const data = await (await fetch(`/api/inventario/detalle/${id}`)).json();
        if (!data || data.error) { mostrarToast(data?.error || 'Error al cargar', 'danger'); return; }

        document.getElementById('detalleNombreProducto').textContent = data.nombre || '-';
        document.getElementById('detalleSku').textContent = data.sku || '-';
        document.getElementById('detalleCategoria').textContent = data.categoria || '-';
        document.getElementById('detalleStockTotal').textContent = data.stock_total || 0;
        document.getElementById('detalleValorTotal').textContent = 'S/ ' + parseFloat(data.valor_total || 0).toFixed(2);

        const fechaAct = data.fecha_actualizacion || data.fecha_creacion;
        document.getElementById('detalleUltimaActualizacion').textContent = fechaAct
            ? new Date(fechaAct).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '-';

        document.getElementById('detalleTotalVentas').textContent = data.total_ventas || 0;
        document.getElementById('detalleGananciaTotal').textContent = 'S/ ' + parseFloat(data.total_ingresos || 0).toFixed(2);
        document.getElementById('detalleUnidadesVendidas').textContent = data.unidades_vendidas || 0;

        const listaVentas = document.getElementById('listaUltimasVentas');
        if (listaVentas) {
            listaVentas.innerHTML = (data.ultimas_ventas && data.ultimas_ventas.length > 0)
                ? data.ultimas_ventas.map(v => `
                    <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                        <div><strong>${v.cliente || 'Cliente'}</strong><br><small>${v.cantidad} x S/ ${parseFloat(v.precio_unitario).toFixed(2)}</small></div>
                        <div class="text-end"><small class="text-muted">${formatearFecha(v.fecha_venta)}</small><br><span class="fw-bold">S/ ${parseFloat(v.total).toFixed(2)}</span></div>
                    </div>
                `).join('')
                : '<p class="text-muted text-center py-3">Sin ventas registradas</p>';
        }

        if (data.distribucion_stock && Object.keys(data.distribucion_stock).length > 0) {
            setTimeout(() => dibujarGraficoDona(data.distribucion_stock), 300);
        }

        new bootstrap.Modal(document.getElementById('modalDetalleProducto')).show();
    } catch (e) { console.error(e); }
}

function dibujarGraficoDona(distribucion) {
    const canvas = document.getElementById('graficoDona');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (graficoDonaInstance) graficoDonaInstance.destroy();

    const labels = Object.keys(distribucion);
    const valores = Object.values(distribucion);
    const colores = ['#4A5568', '#48BB78', '#ED8936', '#4299E1', '#9F7AEA', '#ED64A6', '#38B2AC', '#F6AD55'];

    graficoDonaInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: valores, backgroundColor: colores.slice(0, labels.length), borderWidth: 2, borderColor: '#fff' }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });

    const leyenda = document.getElementById('leyendaDona');
    if (leyenda) {
        leyenda.innerHTML = labels.map((l, i) => `
            <div class="d-flex align-items-center gap-2 mb-1">
                <span style="width:14px;height:14px;background:${colores[i]};border-radius:3px;"></span>
                <small class="fw-semibold">${l} (${valores[i]})</small>
            </div>
        `).join('');
    }
}

function abrirModalStock(id) {
    const producto = inventarioGlobal.find(x => x.id == id);
    if (!producto) return;

    document.getElementById('stockProductoId').value = producto.id;
    document.getElementById('stockProductoNombre').value = producto.nombre;
    document.getElementById('stockActualValor').textContent = `${producto.stock_disponible} ${producto.unidad_abreviatura || 'und'} (Stock mínimo: ${producto.stock_minimo})`;
    document.getElementById('nuevoStock').value = producto.stock_disponible;
    document.getElementById('stockMotivo').value = 'Ajuste manual de inventario';

    new bootstrap.Modal(document.getElementById('modalAjustarStock')).show();
}


async function guardarAjusteStock() {
    const id = document.getElementById('stockProductoId').value;
    const nuevo = parseFloat(document.getElementById('nuevoStock').value);
    const motivo = document.getElementById('stockMotivo').value.trim();

    if (isNaN(nuevo) || nuevo < 0) { mostrarToast('Ingrese un stock válido', 'warning'); return; }
    if (!motivo) { mostrarToast('Ingrese un motivo', 'warning'); return; }

    try {
        const response = await fetch('/api/inventario/actualizar-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_producto: parseInt(id), nuevo_stock: nuevo, motivo })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        mostrarToast(data.message || 'Stock actualizado correctamente', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalAjustarStock'))?.hide();
        await cargarTablaInventario();
        await cargarEstadisticas();
        await cargarStockActual();
    } catch (error) { mostrarToast(error.message || 'Error al actualizar', 'danger'); }
}

export async function init() {
    if (!isCurrentPage()) return;

    if (eventosInicializados) {
        await cargarPedidosPendientes();
        await cargarMovimientos();
        await cargarStockActual();
        await cargarEstadisticas();
        await cargarTablaInventario();
        return;
    }

    eventosInicializados = true;
    setupEventListeners();

    await cargarPedidosPendientes();
    await cargarMovimientos();
    await cargarStockActual();
    await cargarEstadisticas();
    await cargarTablaInventario();
}
