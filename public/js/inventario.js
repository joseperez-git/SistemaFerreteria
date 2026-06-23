import { mostrarToast, mostrarModalConfirmacionProfesional } from './helpers.js';

let pedidosGlobal = [], movimientosGlobal = [], productosGlobal = [], inventarioGlobal = [];
let pedidoActual = null, eventosInicializados = false, graficoDonaInstance = null;

function isCurrentPage() {
    return document.getElementById('tablaPedidosPendientes') !== null || 
           document.getElementById('tablaInventario') !== null;
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const f = new Date(fechaISO);
    return `${f.getDate().toString().padStart(2,'0')}/${(f.getMonth()+1).toString().padStart(2,'0')}/${f.getFullYear()}`;
}

// ==================== PESTAÑA 1: PEDIDOS ====================
async function cargarPedidosPendientes() {
    try {
        const r = await (await fetch('/api/pedidos')).json();
        pedidosGlobal = (Array.isArray(r) ? r : []).filter(p => [0,1,2].includes(p.estado));
        aplicarFiltrosPedidos();
    } catch(e) { console.error(e); }
}

function aplicarFiltrosPedidos() {
    const b = document.getElementById('buscarPedido')?.value?.toLowerCase()||'', 
          e = document.getElementById('filtroEstado')?.value||'', 
          c = parseInt(document.getElementById('filtroCantidad')?.value||5);
    let f = pedidosGlobal.filter(p => p.estado !== 3 && p.estado !== 4);
    if(b) f = f.filter(p => p.numero_pedido?.toLowerCase().includes(b) || p.cliente?.toLowerCase().includes(b));
    if(e!=='') f = f.filter(p => p.estado == e);
    renderizarPedidos(f.slice(0,c));
}

function renderizarPedidos(pedidos) {
    const t = document.getElementById('tablaPedidosPendientes'); if(!t) return;
    t.innerHTML = pedidos.length ? pedidos.map(p => {
        let eb='', bt='';
        if(p.estado===0){ eb='<span class="badge bg-warning text-dark">Registrado</span>'; bt=`<button class="btn btn-sm btn-primary btnPreparar" data-id="${p.id}"><i class="bi bi-box-seam"></i></button>`; }
        else if(p.estado===1){ eb='<span class="badge bg-info">En Preparación</span>'; bt=`<button class="btn btn-sm btn-warning btnEntregarParcial" data-id="${p.id}"><i class="bi bi-box-seam"></i></button><button class="btn btn-sm btn-success btnEntregarTotal" data-id="${p.id}"><i class="bi bi-check-circle"></i></button>`; }
        else if(p.estado===2){ eb='<span class="badge bg-warning">Parcial</span>'; bt=`<button class="btn btn-sm btn-success btnEntregarParcial" data-id="${p.id}"><i class="bi bi-check-circle"></i></button>`; }
        const bc = (p.estado===0||p.estado===1||p.estado===2) ? `<button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${p.id}"><i class="bi bi-x-circle"></i></button>` : '';
        return `<tr><td class="text-center">${p.id}</td><td><strong>${p.numero_pedido}</strong></td><td>${p.cliente||'-'}</td><td class="text-center">${formatearFecha(p.fecha_pedido)}</td><td class="fw-bold text-primary">S/ ${parseFloat(p.total_pedido).toFixed(2)}</td><td class="text-center">${eb}</td><td class="text-center"><div class="btn-group btn-group-sm"><button class="btn btn-sm btn-info btnVerPedido" data-id="${p.id}"><i class="bi bi-eye"></i></button>${bt}${bc}</div></td></tr>`;
    }).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No hay pedidos pendientes</td></tr>`;
}

// ==================== ACCIONES DE PEDIDOS ====================
async function marcarPreparacion(idPedido) {
    try {
        const r = await (await fetch(`/api/pedidos/${idPedido}/estado`, {
            method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({estado:1})
        })).json();
        if (r.error) throw new Error(r.error);
        mostrarToast('Pedido marcado como "En Preparación"', 'success');
        await cargarPedidosPendientes();
    } catch(e) { mostrarToast(e.message, 'danger'); }
}

async function abrirModalEntrega(idPedido) {
    try {
        const pedido = await (await fetch(`/api/pedidos/${idPedido}`)).json();
        pedidoActual = pedido;
        const tbody = document.getElementById('tablaProductosEntrega');
        tbody.innerHTML = '';
        let hayPendientes = false;
        for (const det of pedido.detalles) {
            const pendiente = det.cantidad - (det.cantidad_entregada || 0);
            if (pendiente <= 0) continue;
            hayPendientes = true;
            tbody.innerHTML += `<tr><td class="text-start">${det.producto}</td><td class="text-center">${pendiente}</td><td class="text-center"><input type="number" step="0.01" class="form-control form-control-sm cantidad-entregar" data-id-producto="${det.id_producto}" data-max="${pendiente}" value="${pendiente}" style="width:100px;margin:0 auto;"></td></tr>`;
        }
        if (!hayPendientes) { mostrarToast('No hay productos pendientes', 'warning'); return; }
        new bootstrap.Modal(document.getElementById('modalEntregarProductos')).show();
    } catch(e) { console.error(e); mostrarToast('Error al cargar productos', 'danger'); }
}

async function confirmarEntrega() {
    if (!pedidoActual) return;
    const productos = [];
    document.querySelectorAll('#tablaProductosEntrega .cantidad-entregar').forEach(input => {
        const cantidad = parseFloat(input.value);
        if (cantidad > 0) productos.push({ id_producto: parseInt(input.dataset.idProducto), cantidad });
    });
    if (productos.length === 0) { mostrarToast('Especifique al menos un producto', 'warning'); return; }
    try {
        const r = await (await fetch(`/api/entregas/${pedidoActual.id}/confirmar`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({productos})
        })).json();
        if (r.error) throw new Error(r.error);
        mostrarToast('Entrega registrada', 'success');
        bootstrap.Modal.getInstance(document.getElementById('modalEntregarProductos'))?.hide();
        await cargarPedidosPendientes();
    } catch(e) { mostrarToast(e.message, 'danger'); }
}

async function entregarTotal(idPedido) {
    try {
        const pedido = await (await fetch(`/api/pedidos/${idPedido}`)).json();
        const productos = [];
        for (const det of pedido.detalles) {
            const pendiente = det.cantidad - (det.cantidad_entregada || 0);
            if (pendiente > 0) productos.push({ id_producto: det.id_producto, cantidad: pendiente });
        }
        if (productos.length === 0) { mostrarToast('No hay productos pendientes', 'warning'); return; }
        const r = await (await fetch(`/api/entregas/${idPedido}/confirmar`, {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({productos})
        })).json();
        if (r.error) throw new Error(r.error);
        mostrarToast('Pedido entregado completamente', 'success');
        await cargarPedidosPendientes();
    } catch(e) { mostrarToast(e.message, 'danger'); }
}

async function cancelarPedido(idPedido) {
    if (!confirm('¿Está seguro de cancelar este pedido? Se liberará el stock reservado.')) return;
    try {
        const r = await (await fetch(`/api/pedidos/${idPedido}/estado`, {
            method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({estado:4})
        })).json();
        if (r.error) throw new Error(r.error);
        mostrarToast('Pedido cancelado', 'warning');
        await cargarPedidosPendientes();
    } catch(e) { mostrarToast(e.message, 'danger'); }
}

async function verDetallePedido(idPedido) {
    try {
        const module = await import('/js/pedidos.js');
        if (typeof module.mostrarDetallePedido === 'function') {
            await module.mostrarDetallePedido(idPedido);
        } else {
            mostrarToast('Error al cargar detalle del pedido', 'danger');
        }
    } catch(e) { console.error(e); mostrarToast('Error al cargar detalles', 'danger'); }
}

// ==================== PESTAÑA 2: MOVIMIENTOS ====================
async function cargarMovimientos() {
    try { movimientosGlobal = await (await fetch('/api/movimientos-inventario')).json(); renderizarMovimientos(); } catch(e) { console.error(e); }
}

function renderizarMovimientos() {
    const t = document.getElementById('tablaMovimientos'); if(!t) return;
    const b = document.getElementById('buscarMovimiento')?.value?.toLowerCase()||'', 
          tp = document.getElementById('filtroTipoMov')?.value||'', 
          c = parseInt(document.getElementById('filtroCantidadMov')?.value||20);
    let f = movimientosGlobal;
    if(b) f = f.filter(m => m.producto?.toLowerCase().includes(b) || m.motivo?.toLowerCase().includes(b));
    if(tp) f = f.filter(m => m.tipo_movimiento === tp);
    f = f.slice(0,c);
    const tb = {'ENTRADA':'bg-success','SALIDA':'bg-danger','RESERVA':'bg-warning text-dark','LIBERACION':'bg-secondary','ENTREGA_PARCIAL':'bg-info'};
    t.innerHTML = f.length ? f.map(m => `<tr style="font-size:0.75rem"><td class="text-center">${formatearFecha(m.fecha)}</td><td>${m.producto||'-'}</td><td class="text-center"><span class="badge ${tb[m.tipo_movimiento]||'bg-secondary'}">${m.tipo_movimiento}</span></td><td class="text-end">${m.cantidad}</td><td class="text-end">${m.stock_anterior}</td><td class="text-end">${m.stock_nuevo}</td><td>${m.motivo||'-'}</td><td>${m.usuario||'-'}</td></tr>`).join('') : `<tr><td colspan="8" class="text-center text-muted py-4">No hay movimientos</td></tr>`;
}

// ==================== PESTAÑA 3: STOCK ACTUAL ====================
async function cargarStockActual() {
    try { productosGlobal = await (await fetch('/api/productos')).json(); renderizarStockActual(); } catch(e) { console.error(e); }
}

function renderizarStockActual() {
    const t = document.getElementById('tablaStockActual'); if(!t) return;
    const b = document.getElementById('buscarProductoStock')?.value?.toLowerCase()||'', 
          sm = document.getElementById('filtroStockMinimo')?.value==='1';
    let f = productosGlobal.filter(p => p.estado === 1);
    if(b) f = f.filter(p => p.nombre.toLowerCase().includes(b) || (p.codigo_barras&&p.codigo_barras.includes(b)));
    if(sm) f = f.filter(p => (p.stock-p.stock_reservado) <= p.stock_minimo);
    t.innerHTML = f.length ? f.map(p => {
        const d = p.stock - p.stock_reservado, cl = d <= p.stock_minimo ? 'text-danger fw-bold' : 'text-success';
        return `<tr><td class="text-center">${p.id}</td><td>${p.nombre}</td><td>${p.categoria_nombre||'-'}</td><td class="text-end">${p.stock}</td><td class="text-end">${p.stock_reservado}</td><td class="text-end ${cl}">${d}</td><td class="text-end">S/ ${parseFloat(p.precio).toFixed(2)}</td></tr>`;
    }).join('') : `<tr><td colspan="7" class="text-center text-muted py-4">No hay productos</td></tr>`;
}

// ==================== 🆕 GESTIÓN DE INVENTARIO MEJORADA ====================
async function cargarEstadisticas() {
    try {
        const d = await (await fetch('/api/inventario/estadisticas')).json();
        if (d.error) return;
        document.getElementById('statTotalProductos').textContent = d.total_productos||0;
        document.getElementById('statStockCritico').textContent = d.stock_critico||0;
        document.getElementById('statStockOptimo').textContent = d.stock_optimo||0;
        document.getElementById('statValorTotal').textContent = 'S/ ' + parseFloat(d.valor_total||0).toFixed(2);
    } catch(e) { console.error(e); }
}

async function cargarTablaInventario() {
    try {
        inventarioGlobal = await (await fetch('/api/inventario/listar')).json();
        const t = document.getElementById('tablaInventario'); if(!t) return;
        if (inventarioGlobal.error) return;
        t.innerHTML = inventarioGlobal.map(p => {
            const ec = p.estado_stock==='ÓPTIMO'?'bg-success':p.estado_stock==='BAJO'?'bg-warning text-dark':p.estado_stock==='CRÍTICO'?'bg-danger':p.estado_stock==='SIN STOCK'?'bg-dark':'bg-secondary';
            return `<tr><td class="text-center">${p.id}</td><td><strong>${p.nombre}</strong><br><small class="text-muted">${p.codigo_barras||'Sin código'}</small></td><td class="text-center fw-bold">${p.stock_disponible} ${p.unidad_abreviatura||'und'}</td><td class="text-center">${p.stock_minimo}</td><td class="text-center"><span class="badge ${ec}">${p.estado_stock}</span></td><td class="text-end">S/ ${parseFloat(p.valor_total||0).toFixed(2)}</td><td class="text-center"><button class="btn btn-sm btn-dark btnVerDetalle" data-id="${p.id}"><i class="bi bi-eye"></i></button><button class="btn btn-sm btn-success btnAjustarStock" data-id="${p.id}"><i class="bi bi-pencil-square"></i></button></td></tr>`;
        }).join('');
    } catch(e) { console.error(e); }
}

async function verDetalle(id) {
    try {
        const d = await (await fetch(`/api/inventario/detalle/${id}`)).json();
        if (!d || d.error) { mostrarToast(d?.error || 'Error al cargar', 'danger'); return; }
        document.getElementById('detalleNombreProducto').textContent = d.nombre || '-';
        document.getElementById('detalleSku').textContent = d.sku || '-';
        document.getElementById('detalleCategoria').textContent = d.categoria || '-';
        document.getElementById('detalleStockTotal').textContent = d.stock_total || 0;
        document.getElementById('detalleValorTotal').textContent = 'S/ ' + parseFloat(d.valor_total || 0).toFixed(2);
        const fechaAct = d.fecha_actualizacion || d.fecha_creacion;
        document.getElementById('detalleUltimaActualizacion').textContent = fechaAct 
            ? new Date(fechaAct).toLocaleDateString('es-PE', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';
        document.getElementById('detalleTotalVentas').textContent = d.total_ventas || 0;
        document.getElementById('detalleGananciaTotal').textContent = 'S/ ' + parseFloat(d.total_ingresos || 0).toFixed(2);
        document.getElementById('detalleUnidadesVendidas').textContent = d.unidades_vendidas || 0;
        
        const listaVentas = document.getElementById('listaUltimasVentas');
        if (listaVentas) {
            listaVentas.innerHTML = (d.ultimas_ventas && d.ultimas_ventas.length > 0) 
                ? d.ultimas_ventas.map(v => `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><div><strong>${v.cliente||'Cliente'}</strong><br><small>${v.cantidad} x S/ ${parseFloat(v.precio_unitario).toFixed(2)}</small></div><div class="text-end"><small class="text-muted">${formatearFecha(v.fecha_venta)}</small><br><span class="fw-bold">S/ ${parseFloat(v.total).toFixed(2)}</span></div></div>`).join('')
                : '<p class="text-muted text-center py-3">Sin ventas registradas</p>';
        }

        if (d.distribucion_stock && Object.keys(d.distribucion_stock).length > 0) {
            setTimeout(() => dibujarGraficoDona(d.distribucion_stock), 300);
        }
        new bootstrap.Modal(document.getElementById('modalDetalleProducto')).show();
    } catch(e) { console.error(e); }
}

function dibujarGraficoDona(distribucion) {
    const canvas = document.getElementById('graficoDona');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (graficoDonaInstance) graficoDonaInstance.destroy();
    const labels = Object.keys(distribucion), valores = Object.values(distribucion);
    const colores = ['#4A5568','#48BB78','#ED8936','#4299E1','#9F7AEA','#ED64A6','#38B2AC','#F6AD55'];
    graficoDonaInstance = new Chart(ctx, { type:'doughnut', data:{ labels, datasets:[{ data:valores, backgroundColor:colores.slice(0,labels.length), borderWidth:2, borderColor:'#fff' }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } });
    const leyenda = document.getElementById('leyendaDona');
    if (leyenda) leyenda.innerHTML = labels.map((l,i) => `<div class="d-flex align-items-center gap-2 mb-1"><span style="width:14px;height:14px;background:${colores[i]};border-radius:3px;"></span><small class="fw-semibold">${l} (${valores[i]})</small></div>`).join('');
}

function abrirModalStock(id) {
    const p = inventarioGlobal.find(x => x.id == id);
    if(!p) return;
    document.getElementById('stockProductoId').value = p.id;
    document.getElementById('stockProductoNombre').value = p.nombre;
    document.getElementById('stockActualValor').textContent = `${p.stock_disponible} ${p.unidad_abreviatura||'und'} (Stock mínimo: ${p.stock_minimo})`;
    document.getElementById('nuevoStock').value = p.stock_disponible;
    document.getElementById('stockMotivo').value = 'Ajuste manual de inventario';
    new bootstrap.Modal(document.getElementById('modalAjustarStock')).show();
}

async function guardarAjusteStock() {
    const id = document.getElementById('stockProductoId').value;
    const nuevo = parseFloat(document.getElementById('nuevoStock').value);
    const motivo = document.getElementById('stockMotivo').value.trim();
    if(isNaN(nuevo) || nuevo < 0) { mostrarToast('Ingrese un stock válido','warning'); return; }
    if(!motivo) { mostrarToast('Ingrese un motivo','warning'); return; }
    try {
        const r = await (await fetch('/api/inventario/actualizar-stock', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ id_producto: parseInt(id), nuevo_stock: nuevo, motivo })
        })).json();
        if (r.error) throw new Error(r.error);
        mostrarToast(r.message||'Actualizado','success');
        bootstrap.Modal.getInstance(document.getElementById('modalAjustarStock'))?.hide();
        await cargarTablaInventario(); await cargarEstadisticas(); await cargarStockActual();
    } catch(e) { mostrarToast(e.message||'Error al actualizar','danger'); }
}

// ==================== EVENTOS ====================
function setupEventListeners() {
    // Click en botones
    document.body.addEventListener('click', async e => {
        if(!isCurrentPage()) return;
        const c = s => e.target.closest(s);
        // Pedidos
        const b1=c('.btnPreparar'); if(b1){ await marcarPreparacion(+b1.dataset.id); return; }
        const b2=c('.btnEntregarParcial'); if(b2){ await abrirModalEntrega(+b2.dataset.id); return; }
        const b3=c('.btnEntregarTotal'); if(b3){ await entregarTotal(+b3.dataset.id); return; }
        const b4=c('.btnCancelarPedido'); if(b4){ await cancelarPedido(+b4.dataset.id); return; }
        const b5=c('.btnVerPedido'); if(b5){ await verDetallePedido(+b5.dataset.id); return; }
        // Inventario nuevo
        const b6=c('.btnVerDetalle'); if(b6){ await verDetalle(+b6.dataset.id); return; }
        const b7=c('.btnAjustarStock'); if(b7){ abrirModalStock(+b7.dataset.id); return; }
    });

    // Filtros pedidos
    document.getElementById('buscarPedido')?.addEventListener('input', aplicarFiltrosPedidos);
    document.getElementById('filtroEstado')?.addEventListener('change', aplicarFiltrosPedidos);
    document.getElementById('filtroCantidad')?.addEventListener('change', aplicarFiltrosPedidos);
    // Filtros movimientos
    document.getElementById('buscarMovimiento')?.addEventListener('input', renderizarMovimientos);
    document.getElementById('filtroTipoMov')?.addEventListener('change', renderizarMovimientos);
    document.getElementById('filtroCantidadMov')?.addEventListener('change', renderizarMovimientos);
    // Filtros stock
    document.getElementById('buscarProductoStock')?.addEventListener('input', renderizarStockActual);
    document.getElementById('filtroStockMinimo')?.addEventListener('change', renderizarStockActual);
    document.getElementById('btnActualizarStock')?.addEventListener('click', cargarStockActual);
    // Botones de modal
    document.getElementById('btnConfirmarEntrega')?.addEventListener('click', confirmarEntrega);
    document.getElementById('btnGuardarAjusteStock')?.addEventListener('click', guardarAjusteStock);
}

// ==================== INIT ====================
export async function init() {
    if(!isCurrentPage()) return;
    if(eventosInicializados){ 
        await cargarPedidosPendientes(); await cargarMovimientos(); await cargarStockActual();
        await cargarEstadisticas(); await cargarTablaInventario(); 
        return; 
    }
    eventosInicializados=true; 
    setupEventListeners();
    await cargarPedidosPendientes(); await cargarMovimientos(); await cargarStockActual();
    await cargarEstadisticas(); await cargarTablaInventario();  
}

export function destroy() { 
    eventosInicializados=false; 
    if(graficoDonaInstance) graficoDonaInstance.destroy(); 
} 