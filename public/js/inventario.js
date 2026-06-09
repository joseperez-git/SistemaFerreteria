import { mostrarToast, limpiarBackdrops } from './helpers.js';

let pedidosGlobal = [];
let movimientosGlobal = [];
let productosGlobal = [];
let pedidoActual = null;

// ============================================
// VERIFICAR PÁGINA ACTUAL
// ============================================
function isCurrentPage() {
    return document.getElementById('tablaPedidosPendientes') !== null;
}

// ============================================
// CARGAR DATOS
// ============================================
async function cargarPedidosPendientes() {
    try {
        const response = await fetch('/api/pedidos');
        if (!response.ok) throw new Error('Error al cargar pedidos');
        const pedidos = await response.json();
        
        pedidosGlobal = pedidos.filter(p => p.estado === 0 || p.estado === 1 || p.estado === 2);
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar pedidos', 'danger');
    }
}

async function cargarMovimientos() {
    try {
        const response = await fetch('/api/movimientos-inventario');
        if (!response.ok) throw new Error('Error al cargar movimientos');
        movimientosGlobal = await response.json();
        renderizarMovimientos();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar movimientos', 'danger');
    }
}

async function cargarStockActual() {
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        productosGlobal = await response.json();
        renderizarStockActual();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar stock', 'danger');
    }
}

// ============================================
// RENDERIZAR PEDIDOS PENDIENTES
// ============================================
function renderizarPedidos(pedidos) {
    const tabla = document.getElementById('tablaPedidosPendientes');
    if (!tabla) return;
    tabla.innerHTML = '';
    
    if (pedidos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay pedidos pendientes</td></tr>`;
        return;
    }
    
    pedidos.forEach(pedido => {
        let estadoBadge = '';
        let botones = '';
        
        if (pedido.estado === 0) {
            estadoBadge = '<span class="badge bg-warning text-dark">Registrado</span>';
            botones = `
                <button class="btn btn-sm btn-primary btnPreparar" data-id="${pedido.id}" title="Preparar pedido">
                    <i class="bi bi-box-seam"></i>
                </button>
            `;
        } else if (pedido.estado === 1) {
            estadoBadge = '<span class="badge bg-info">En Preparación</span>';
            botones = `
                <button class="btn btn-sm btn-warning btnEntregarParcial" data-id="${pedido.id}" title="Entrega parcial">
                    <i class="bi bi-box-seam"></i>
                </button>
                <button class="btn btn-sm btn-success btnEntregarTotal" data-id="${pedido.id}" title="Entregar todo">
                    <i class="bi bi-check-circle"></i>
                </button>
            `;
            
            // Si es ENVIO, agregar botones para gestión de envío
            if (pedido.tipo_entrega === 'ENVIO') {
                let estadoEnvioBadge = '';
                let estadoEnvio = pedido.estado_entrega || 0;
                
                if (estadoEnvio === 0) estadoEnvioBadge = '<span class="badge bg-warning text-dark ms-1">Envío Pendiente</span>';
                else if (estadoEnvio === 1) estadoEnvioBadge = '<span class="badge bg-info ms-1">En Camino</span>';
                else if (estadoEnvio === 2) estadoEnvioBadge = '<span class="badge bg-success ms-1">Envío Entregado</span>';
                else if (estadoEnvio === 3) estadoEnvioBadge = '<span class="badge bg-danger ms-1">Envío Fallido</span>';
                
                estadoBadge += estadoEnvioBadge;
                
                botones += `
                    <div class="btn-group-vertical btn-group-sm mt-1">
                        <button class="btn btn-sm btn-outline-info btnEnvioCamino" data-id="${pedido.id}" data-entrega-id="${pedido.id_entrega}" title="Marcar en camino">
                            <i class="bi bi-geo-alt"></i> En Camino
                        </button>
                        <button class="btn btn-sm btn-outline-success btnEnvioEntregado" data-id="${pedido.id}" data-entrega-id="${pedido.id_entrega}" title="Marcar entregado">
                            <i class="bi bi-check-lg"></i> Entregado
                        </button>
                        <button class="btn btn-sm btn-outline-danger btnEnvioFallido" data-id="${pedido.id}" data-entrega-id="${pedido.id_entrega}" title="Marcar fallido">
                            <i class="bi bi-exclamation-triangle"></i> Fallido
                        </button>
                    </div>
                `;
            }
        } else if (pedido.estado === 2) {
            estadoBadge = '<span class="badge bg-warning">Parcialmente Entregado</span>';
            botones = `
                <button class="btn btn-sm btn-success btnEntregarParcial" data-id="${pedido.id}" title="Completar entrega">
                    <i class="bi bi-check-circle"></i>
                </button>
            `;
        }
        
        // Botón Cancelar siempre visible para estados 0,1,2
        const btnCancelar = (pedido.estado === 0 || pedido.estado === 1 || pedido.estado === 2) 
            ? `<button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${pedido.id}" title="Cancelar pedido">
                   <i class="bi bi-x-circle"></i>
               </button>` 
            : '';
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${pedido.id}</td>
                <td class="text-start"><strong>${pedido.numero_pedido}</strong></td>
                <td class="text-start">${pedido.cliente || '-'}</td>
                <td class="text-center">${formatearFecha(pedido.fecha_pedido)}</td>
                <td class="fw-bold text-primary">S/ ${parseFloat(pedido.total_pedido).toFixed(2)}</td>
                <td class="text-center">${estadoBadge}</td>
                <td class="text-center text-nowrap">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-sm btn-info btnVerPedido" data-id="${pedido.id}" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${botones}
                        ${btnCancelar}
                    </div>
                </td>
            </tr>
        `;
    });
}


// ============================================
// RENDERIZAR MOVIMIENTOS
// ============================================
function renderizarMovimientos() {
    const tabla = document.getElementById('tablaMovimientos');
    if (!tabla) return;
    
    const buscarInput = document.getElementById('buscarMovimiento')?.value.toLowerCase() || '';
    const filtroTipo = document.getElementById('filtroTipoMov')?.value || '';
    const cantidadMostrar = parseInt(document.getElementById('filtroCantidadMov')?.value || 20);
    
    let filtrados = movimientosGlobal;
    
    if (buscarInput) {
        filtrados = filtrados.filter(m => 
            m.producto?.toLowerCase().includes(buscarInput) || 
            m.motivo?.toLowerCase().includes(buscarInput)
        );
    }
    
    if (filtroTipo) {
        filtrados = filtrados.filter(m => m.tipo_movimiento === filtroTipo);
    }
    
    filtrados = filtrados.slice(0, cantidadMostrar);
    
    tabla.innerHTML = '';
    
    if (filtrados.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay movimientos registrados</td></tr>`;
        return;
    }
    
    filtrados.forEach(mov => {
        let tipoBadge = '';
        if (mov.tipo_movimiento === 'ENTRADA') tipoBadge = '<span class="badge bg-success">Entrada</span>';
        else if (mov.tipo_movimiento === 'SALIDA') tipoBadge = '<span class="badge bg-danger">Salida</span>';
        else if (mov.tipo_movimiento === 'RESERVA') tipoBadge = '<span class="badge bg-warning text-dark">Reserva</span>';
        else if (mov.tipo_movimiento === 'LIBERACION') tipoBadge = '<span class="badge bg-secondary">Liberación</span>';
        else if (mov.tipo_movimiento === 'ENTREGA_PARCIAL') tipoBadge = '<span class="badge bg-info">Entrega Parcial</span>';
        else tipoBadge = '<span class="badge bg-secondary">Ajuste</span>';
        
        tabla.innerHTML += `
            <tr style="font-size: 0.75rem;">
                <td class="text-center">${formatearFecha(mov.fecha)}</td>
                <td class="text-start">${mov.producto || '-'}</td>
                <td class="text-center">${tipoBadge}</td>
                <td class="text-end">${mov.cantidad}</td>
                <td class="text-end">${mov.stock_anterior}</td>
                <td class="text-end">${mov.stock_nuevo}</td>
                <td class="text-start">${mov.motivo || '-'}</td>
                <td class="text-start">${mov.usuario || '-'}</td>
            </tr>
        `;
    });
}

// ============================================
// RENDERIZAR STOCK ACTUAL
// ============================================
function renderizarStockActual() {
    const tabla = document.getElementById('tablaStockActual');
    if (!tabla) return;
    
    const buscarInput = document.getElementById('buscarProductoStock')?.value.toLowerCase() || '';
    const stockMinimo = document.getElementById('filtroStockMinimo')?.value === '1';
    
    let filtrados = productosGlobal.filter(p => p.estado === 1);
    
    if (buscarInput) {
        filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(buscarInput));
    }
    
    if (stockMinimo) {
        filtrados = filtrados.filter(p => (p.stock - p.stock_reservado) <= p.stock_minimo);
    }
    
    tabla.innerHTML = '';
    
    if (filtrados.length === 0) {
        tabla.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay productos registrados</td></tr>`;
        return;
    }
    
    filtrados.forEach(producto => {
        const disponible = producto.stock - producto.stock_reservado;
        const disponibleClass = disponible <= producto.stock_minimo ? 'text-danger fw-bold' : 'text-success';
        
        tabla.innerHTML += `
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
    });
}

// ============================================
// FORMATEAR FECHA
// ============================================
function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
}

// ============================================
// APLICAR FILTROS
// ============================================
function aplicarFiltros() {
    const buscarInput = document.getElementById('buscarPedido')?.value.toLowerCase() || '';
    const filtroEstado = document.getElementById('filtroEstado')?.value || '';
    const cantidadMostrar = parseInt(document.getElementById('filtroCantidad')?.value || 5);
    
    let filtrados = pedidosGlobal.filter(p => p.estado !== 3 && p.estado !== 4);
    
    if (buscarInput) {
        filtrados = filtrados.filter(p => 
            p.numero_pedido?.toLowerCase().includes(buscarInput) || 
            p.cliente?.toLowerCase().includes(buscarInput)
        );
    }
    
    if (filtroEstado !== '') {
        filtrados = filtrados.filter(p => p.estado == filtroEstado);
    }
    
    filtrados = filtrados.slice(0, cantidadMostrar);
    renderizarPedidos(filtrados);
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
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// Abrir modal para entrega
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
        
        const modal = new bootstrap.Modal(document.getElementById('modalEntregarProductos'));
        modal.show();
        
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar los productos del pedido', 'danger');
    }
}


// Confirmar entrega
async function confirmarEntrega() {
    if (!pedidoActual) return;
    
    const productos = [];
    const inputs = document.querySelectorAll('#tablaProductosEntrega .cantidad-entregar');
    
    inputs.forEach(input => {
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
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEntregarProductos'));
        if (modal) modal.hide();
        
        await cargarPedidosPendientes();
        
    } catch (error) {
        mostrarToast(error.message, 'danger');
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
        
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// Cancelar pedido
async function cancelarPedido(idPedido) {
    if (!confirm('¿Está seguro de cancelar este pedido? Se liberará el stock reservado.')) return;
    
    try {
        const response = await fetch(`/api/pedidos/${idPedido}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 4 })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        mostrarToast('Pedido cancelado correctamente', 'warning');
        await cargarPedidosPendientes();
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// ============================================
// GESTIÓN DE ENVÍOS
// ============================================
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
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// Ver detalle de pedido
async function verDetallePedido(idPedido) {
    try {
        // Importar y usar la función mostrarDetallePedido desde pedidos.js
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
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const btnPreparar = e.target.closest('.btnPreparar');
        if (btnPreparar) {
            const id = parseInt(btnPreparar.dataset.id);
            await marcarPreparacion(id);
            return;
        }
        
        const btnEntregarParcial = e.target.closest('.btnEntregarParcial');
        if (btnEntregarParcial) {
            const id = parseInt(btnEntregarParcial.dataset.id);
            await abrirModalEntrega(id);
            return;
        }
        
        const btnEntregarTotal = e.target.closest('.btnEntregarTotal');
        if (btnEntregarTotal) {
            const id = parseInt(btnEntregarTotal.dataset.id);
            await entregarTotal(id);
            return;
        }

        const btnEnvioCamino = e.target.closest('.btnEnvioCamino');
        if (btnEnvioCamino) {
            const idPedido = parseInt(btnEnvioCamino.dataset.id);
            const idEntrega = parseInt(btnEnvioCamino.dataset.entregaId);
            if (confirm('¿Marcar este envío como "En Camino"?')) {
                await actualizarEstadoEnvio(idPedido, idEntrega, 1, 'Envío marcado como "En Camino"');
            }
            return;
        }

        const btnEnvioEntregado = e.target.closest('.btnEnvioEntregado');
        if (btnEnvioEntregado) {
            const idPedido = parseInt(btnEnvioEntregado.dataset.id);
            const idEntrega = parseInt(btnEnvioEntregado.dataset.entregaId);
            if (confirm('¿Marcar este envío como "Entregado"?')) {
                await actualizarEstadoEnvio(idPedido, idEntrega, 2, 'Envío marcado como "Entregado"');
            }
            return;
        }

        const btnEnvioFallido = e.target.closest('.btnEnvioFallido');
        if (btnEnvioFallido) {
            const idPedido = parseInt(btnEnvioFallido.dataset.id);
            const idEntrega = parseInt(btnEnvioFallido.dataset.entregaId);
            if (confirm('¿Marcar este envío como "Fallido"?')) {
                await actualizarEstadoEnvio(idPedido, idEntrega, 3, 'Envío marcado como "Fallido"');
            }
            return;
        }

        
        const btnCancelar = e.target.closest('.btnCancelarPedido');
        if (btnCancelar) {
            const id = parseInt(btnCancelar.dataset.id);
            await cancelarPedido(id);
            return;
        }
        
        const btnVer = e.target.closest('.btnVerPedido');
        if (btnVer) {
            const id = parseInt(btnVer.dataset.id);
            await verDetallePedido(id);
            return;
        }
    });
    
    const buscarInput = document.getElementById('buscarPedido');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroCantidad = document.getElementById('filtroCantidad');
    
    if (buscarInput) buscarInput.addEventListener('input', () => aplicarFiltros());
    if (filtroEstado) filtroEstado.addEventListener('change', () => aplicarFiltros());
    if (filtroCantidad) filtroCantidad.addEventListener('change', () => aplicarFiltros());
    
    const buscarMovimiento = document.getElementById('buscarMovimiento');
    const filtroTipoMov = document.getElementById('filtroTipoMov');
    const filtroCantidadMov = document.getElementById('filtroCantidadMov');
    
    if (buscarMovimiento) buscarMovimiento.addEventListener('input', () => renderizarMovimientos());
    if (filtroTipoMov) filtroTipoMov.addEventListener('change', () => renderizarMovimientos());
    if (filtroCantidadMov) filtroCantidadMov.addEventListener('change', () => renderizarMovimientos());
    
    const buscarProductoStock = document.getElementById('buscarProductoStock');
    const filtroStockMinimo = document.getElementById('filtroStockMinimo');
    const btnActualizarStock = document.getElementById('btnActualizarStock');
    
    if (buscarProductoStock) buscarProductoStock.addEventListener('input', () => renderizarStockActual());
    if (filtroStockMinimo) filtroStockMinimo.addEventListener('change', () => renderizarStockActual());
    if (btnActualizarStock) btnActualizarStock.addEventListener('click', () => cargarStockActual());
    
    const btnConfirmarEntrega = document.getElementById('btnConfirmarEntrega');
    if (btnConfirmarEntrega) {
        btnConfirmarEntrega.addEventListener('click', confirmarEntrega);
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
let eventosInicializados = false;

export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarPedidosPendientes();
        await cargarMovimientos();
        await cargarStockActual();
        return;
    }
    
    eventosInicializados = true;
    
    setupEventListeners();
    
    await cargarPedidosPendientes();
    await cargarMovimientos();
    await cargarStockActual();
}

export function destroy() {
    eventosInicializados = false;
}


