import { mostrarToast, mostrarModalConfirmacionProfesional, limpiarBackdrops } from './helpers.js';

let pedidosGlobal = [];
let productosGlobal = [];
let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};
let productosSeleccionados = [];
let totalPedido = 0;

// ============================================
// VERIFICAR PÁGINA ACTUAL
// ============================================
function isCurrentPage() {
    return document.getElementById('tablaPedidos') !== null;
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

function formatearFechaHora(fechaISO) {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${año} ${hora}:${minutos}`;
}

// ============================================
// LIMPIAR FORMULARIO
// ============================================
function limpiarFormulario() {
    const form = getElement('formPedido');
    if (form) form.reset();
    
    getElement('pedidoId').value = '';
    getElement('tituloModalPedido').textContent = 'Nuevo Pedido';
    
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    getElement('fecha_pedido').value = `${año}-${mes}-${dia}`;
    
    const selectCliente = document.getElementById('id_cliente');
    if (selectCliente) selectCliente.value = '';
    const nombreCliente = document.getElementById('nombre_cliente');
    if (nombreCliente) nombreCliente.value = '';
    const contactoCliente = document.getElementById('contacto_cliente');
    if (contactoCliente) contactoCliente.value = '';
    
    productosSeleccionados = [];
    totalPedido = 0;
    actualizarTablaProductos();
    
    const numeroPedido = getElement('numero_pedido');
    if (numeroPedido) numeroPedido.value = generarNumeroPedido();
}

function generarNumeroPedido() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const consecutivo = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PED-${año}${mes}${dia}-${consecutivo}`;
}

// ============================================
// ACTUALIZAR TABLA DE PRODUCTOS
// ============================================
function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosPedido');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    totalPedido = 0;
    
    productosSeleccionados.forEach((item, idx) => {
        const precio = typeof item.precio_unitario === 'number' ? item.precio_unitario : parseFloat(item.precio_unitario) || 0;
        const cantidad = typeof item.cantidad === 'number' ? item.cantidad : parseFloat(item.cantidad) || 0;
        const subtotal = precio * cantidad;
        totalPedido += subtotal;
        
        tbody.innerHTML += `
            <tr style="font-size: 0.75rem;">
                <td class="text-start">${item.producto_nombre || '-'}</td>
                <td class="text-end">S/ ${precio.toFixed(2)}</td>
                <td class="text-center">${cantidad}</td>
                <td class="text-end">S/ ${subtotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger btn-eliminar-producto" data-idx="${idx}" style="padding: 0.1rem 0.3rem;">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    const totalPedidoElement = document.getElementById('totalPedido');
    if (totalPedidoElement) {
        totalPedidoElement.innerHTML = `S/ ${totalPedido.toFixed(2)}`;
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
async function cargarPedidos() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/pedidos');
        if (!response.ok) throw new Error('Error al cargar pedidos');
        pedidosGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar pedidos', 'danger');
    }
}

async function cargarClientes() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error('Error al cargar clientes');
        clientesGlobal = await response.json();
        
        const selectCliente = document.getElementById('id_cliente');
        if (selectCliente) {
            selectCliente.innerHTML = '<option value="">Seleccione un cliente</option>';
            clientesGlobal.forEach(cliente => {
                if (cliente.estado === 1) {
                    selectCliente.innerHTML += `<option value="${cliente.id}" data-nombre="${cliente.nombre} ${cliente.apellido || ''}" data-contacto="${cliente.telefono || ''} ${cliente.correo || ''}">${cliente.nombre} ${cliente.apellido || ''} (${cliente.numero_documento})</option>`;
                }
            });
        }
        
        if (selectCliente) {
            selectCliente.addEventListener('change', () => {
                const selectedOption = selectCliente.options[selectCliente.selectedIndex];
                const nombre = selectedOption.dataset.nombre || '';
                const contacto = selectedOption.dataset.contacto || '';
                document.getElementById('nombre_cliente').value = nombre;
                document.getElementById('contacto_cliente').value = contacto;
            });
        }
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
// FILTROS Y RENDERIZADO
// ============================================
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarPedido');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');
    
    const textoBusqueda = buscarInput?.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad?.value || 5);
    const estadoFiltro = filtroEstado?.value || '';
    
    let pedidosFiltrados = pedidosGlobal
        .filter(pedido => {
            if (estadoFiltro !== '') {
                return pedido.estado == estadoFiltro;
            }
            return true;
        })
        .filter(pedido => {
            return pedido.numero_pedido?.toLowerCase().includes(textoBusqueda) ||
                   pedido.cliente?.toLowerCase().includes(textoBusqueda);
        })
        .sort((a, b) => b.id - a.id) 
        .slice(0, cantidadMostrar);
    
    renderizar(pedidosFiltrados);
}


//Renderizar
function renderizar(pedidos) {
    const tabla = getElement('tablaPedidos');
    if (!tabla) return;
    tabla.innerHTML = '';
    
    if (pedidos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay pedidos registrados</td></tr>`;
        return;
    }
    
    pedidos.forEach(pedido => {
        let estadoBadge = '';
        let botonesAccion = '';
        
        // Estados: 0=Registrado, 1=En Preparación, 2=Parcialmente Entregado, 3=Entregado, 4=Cancelado
        if (pedido.estado === 0) {
            estadoBadge = '<span class="badge bg-warning text-dark">Registrado</span>';
            // Vendedor solo puede cancelar (no preparar)
            botonesAccion = `
                <button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${pedido.id}" title="Cancelar">
                    <i class="bi bi-x-circle"></i>
                </button>
            `;
        } else if (pedido.estado === 1) {
            estadoBadge = '<span class="badge bg-info">En Preparación</span>';
            
            // Si es RECOJO, mostrar botón "Entregar"
            if (pedido.tipo_entrega === 'RECOJO') {
                botonesAccion = `
                    <button class="btn btn-sm btn-success btnEntregarRecojo" data-id="${pedido.id}" title="Marcar como entregado">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${pedido.id}" title="Cancelar">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `;
            } else {
                // Si es ENVIO, solo cancelar (la entrega la maneja inventario)
                botonesAccion = `
                    <button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${pedido.id}" title="Cancelar">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `;
            }
        } else if (pedido.estado === 2) {
            estadoBadge = '<span class="badge bg-warning">Parcialmente Entregado</span>';
            botonesAccion = '';  // Vendedor solo ve, no modifica
        } else if (pedido.estado === 3) {
            estadoBadge = '<span class="badge bg-success">Entregado</span>';
            botonesAccion = '';
        } else if (pedido.estado === 4) {
            estadoBadge = '<span class="badge bg-secondary">Cancelado</span>';
            botonesAccion = `
                <button class="btn btn-sm btn-warning btnReactivarPedido" data-id="${pedido.id}" title="Reactivar">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
            `;
        }
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${pedido.id}</td>
                <td class="text-start"><strong>${pedido.numero_pedido}</strong></td>
                <td class="text-start">${pedido.cliente || '-'}</td>
                <td class="text-center">${formatearFecha(pedido.fecha_pedido)}</td>
                <td class="text-end fw-bold text-primary">S/ ${parseFloat(pedido.total_pedido).toFixed(2)}</td>
                <td class="text-center">${estadoBadge}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-sm btn-info btnVerPedido" data-id="${pedido.id}" title="Ver Detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${botonesAccion}
                    </div>
                </td>
            </table>
        `;
    });
}


// ============================================
// CAMBIAR ESTADO
// ============================================
async function cambiarEstado(id, estado, mensajeExito, tipoToast) {
    try {
        const response = await fetch(`/api/pedidos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        await cargarPedidos();
        mostrarToast(mensajeExito, tipoToast);
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}

// ============================================
// MOSTRAR DETALLE DE PEDIDO (ACTUALIZADO)
// ============================================
async function mostrarDetallePedido(id) {
    try {
        const response = await fetch(`/api/pedidos/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const pedido = await response.json();
        
        limpiarBackdrops();
        
        const tbodyProductos = document.getElementById('detalleProductos');
        const tbodyEntregas = document.getElementById('detalleEntregas');
        
        if (tbodyProductos) tbodyProductos.innerHTML = '';
        if (tbodyEntregas) tbodyEntregas.innerHTML = '';
        
        const setText = (idEl, value) => {
            const el = document.getElementById(idEl);
            if (el) el.textContent = value || '-';
        };
        
        const setHtml = (idEl, value) => {
            const el = document.getElementById(idEl);
            if (el) el.innerHTML = value;
        };
        
        setText('detalleNumeroPedido', pedido.numero_pedido);
        setText('detalleCliente', pedido.cliente);
        setText('detalleFecha', formatearFecha(pedido.fecha_pedido));
        setText('detalleUsuario', pedido.usuario);
        setText('detalleObservacion', pedido.observacion);
        setHtml('detalleTotal', `S/ ${parseFloat(pedido.total_pedido).toFixed(2)}`);
        setHtml('detalleSaldo', `S/ ${parseFloat(pedido.saldo_pendiente || 0).toFixed(2)}`);
        
        // Estado del pedido
        const estadoBadge = document.getElementById('detalleEstado');
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
            } else {
                estadoBadge.textContent = 'Cancelado';
                estadoBadge.className = 'badge bg-secondary';
            }
        }
        
        // Productos
        let totalProductos = 0;
        if (pedido.detalles && pedido.detalles.length > 0) {
            pedido.detalles.forEach(det => {
                const subtotal = det.precio_unitario * det.cantidad;
                totalProductos += subtotal;
                const entregado = det.cantidad_entregada || 0;
                
                tbodyProductos.innerHTML += `
                    <tr class="small">
                        <td class="text-start">${det.producto || '-'}</td>
                        <td class="text-end">S/ ${parseFloat(det.precio_unitario).toFixed(2)}</td>
                        <td class="text-center">${det.cantidad}</td>
                        <td class="text-center">
                            ${entregado > 0 
                                ? `<span class="text-success fw-bold">${entregado}</span>`
                                : '<span class="text-muted">0</span>'}
                        </td>
                        <td class="text-end">S/ ${subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        setHtml('detalleProductosTotal', `S/ ${totalProductos.toFixed(2)}`);
        
        // ============================================
        // HISTORIAL DE ENTREGAS - CORREGIDO
        // Solo mostrar entregas de tipo ENVIO
        // ============================================
        const entregasSection = document.getElementById('detalleEntregasSection');
        if (pedido.entregas && pedido.entregas.length > 0) {
            // Verificar si hay al menos una entrega de tipo ENVIO
            const entregasEnvio = pedido.entregas.filter(e => e.tipo_entrega === 'ENVIO');
            
            if (entregasEnvio.length > 0) {
                entregasSection.style.display = 'block';
                entregasEnvio.forEach(entrega => {
                    let estadoEntregaBadge = '';
                    if (entrega.estado === 0) estadoEntregaBadge = '<span class="badge bg-warning text-dark">Pendiente</span>';
                    else if (entrega.estado === 1) estadoEntregaBadge = '<span class="badge bg-info">En Camino</span>';
                    else if (entrega.estado === 2) estadoEntregaBadge = '<span class="badge bg-success">Entregado</span>';
                    else estadoEntregaBadge = '<span class="badge bg-danger">Fallido</span>';
                    
                    tbodyEntregas.innerHTML += `
                        <tr class="small">
                            <td class="text-center">${formatearFechaHora(entrega.fecha_creacion)}</td>
                            <td class="text-center">Envío a domicilio</td>
                            <td class="text-start">${entrega.direccion_entrega || '-'}</td>
                            <td class="text-end">${parseFloat(entrega.costo_entrega || 0).toFixed(2)}</td>
                            <td class="text-center">${estadoEntregaBadge}</td>
                        </tr>
                    `;
                });
            } else {
                entregasSection.style.display = 'none';
            }
        } else {
            entregasSection.style.display = 'none';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalDetallePedido'));
        modal.show();
        
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar detalles', 'danger');
    }
}


// ============================================
// GUARDAR PEDIDO
// ============================================
function setupGuardarPedido() {
    const btnGuardar = getElement('btnGuardarPedido');
    if (!btnGuardar) return;
    
    btnGuardar.onclick = async () => {
        const id = getElement('pedidoId')?.value;
        const numero_pedido = getElement('numero_pedido')?.value.trim();
        const id_cliente = document.getElementById('id_cliente')?.value;
        const observacion = getElement('observacion')?.value;

        const tipo_entrega = document.querySelector('input[name="tipo_entrega"]:checked')?.value;
        const direccion_entrega = document.getElementById('direccion_entrega')?.value;
        const costo_entrega = parseFloat(document.getElementById('costo_entrega')?.value) || 0;
        const fecha_programada = document.getElementById('fecha_programada')?.value;
        
        if (!numero_pedido) {
            mostrarToast('Número de pedido obligatorio', 'warning');
            return;
        }
        if (!id_cliente) {
            mostrarToast('Seleccione un cliente', 'warning');
            return;
        }
        if (productosSeleccionados.length === 0) {
            mostrarToast('Agregue al menos un producto', 'warning');
            return;
        }
        
        try {
            const response = await fetch(id ? `/api/pedidos/${id}` : '/api/pedidos', {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    numero_pedido,
                    id_cliente: parseInt(id_cliente),
                    total_pedido: totalPedido,
                    observacion,
                    productos: productosSeleccionados,
                    tipo_entrega,
                    direccion_entrega,
                    costo_entrega,
                    fecha_programada
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            await cargarPedidos();
            mostrarToast(id ? 'Pedido actualizado' : 'Pedido registrado', 'success');
            
            const modal = bootstrap.Modal.getInstance(getElement('modalPedido'));
            if (modal) modal.hide();
            limpiarFormulario();
        } catch (error) {
            mostrarToast(error.message, 'danger');
        }
    };
}

// ============================================
// NUEVO PEDIDO
// ============================================
function setupNuevoPedido() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalPedido"]');
    if (nuevoBtn) {
        const nuevoBtnClone = nuevoBtn.cloneNode(true);
        nuevoBtn.parentNode.replaceChild(nuevoBtnClone, nuevoBtn);
        
        nuevoBtnClone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            limpiarFormulario();
            const modalPedido = new bootstrap.Modal(document.getElementById('modalPedido'));
            modalPedido.show();
        });
    }
}

// ============================================
// EVENTOS GLOBALES
// ============================================
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const btnVer = e.target.closest('.btnVerPedido');
        if (btnVer) {
            mostrarDetallePedido(parseInt(btnVer.dataset.id));
            return;
        }

        const btnEntregarRecojo = e.target.closest('.btnEntregarRecojo');
        if (btnEntregarRecojo) {
            const id = parseInt(btnEntregarRecojo.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Entregar Pedido', 
                '¿Desea marcar este pedido como entregado? El cliente ha recogido el pedido.', 
                () => cambiarEstado(id, 3, 'Pedido marcado como entregado', 'success', 'Entregar'), 
                'success'
            );
            return;
        }
        
        const btnPreparar = e.target.closest('.btnPreparar');
        if (btnPreparar) {
            const id = parseInt(btnPreparar.dataset.id);
            mostrarModalConfirmacionProfesional('Marcar en Preparación', '¿Desea marcar este pedido como "En Preparación"?', () => cambiarEstado(id, 1, 'Pedido marcado como "En Preparación"', 'success'), 'success', 'Preparar');
            return;
        }
        
        const btnCancelar = e.target.closest('.btnCancelarPedido');
        if (btnCancelar) {
            const id = parseInt(btnCancelar.dataset.id);
            mostrarModalConfirmacionProfesional('Rechazar Pedido', '¿Desea rechazar este pedido? Se liberará el stock reservado.', () => cambiarEstado(id, 4, 'Pedido rechazado', 'warning'), 'warning', 'Rechazar');
            return;
        }
        
        const btnReactivar = e.target.closest('.btnReactivarPedido');
        if (btnReactivar) {
            const id = parseInt(btnReactivar.dataset.id);
            mostrarModalConfirmacionProfesional('Reactivar Pedido', '¿Desea reactivar este pedido? Se reservará el stock nuevamente.', () => cambiarEstado(id, 0, 'Pedido reactivado', 'success'), 'success', 'Reactivar');
            return;
        }
        
        const btnLimpiarCliente = document.getElementById('btnLimpiarCliente');
        if (btnLimpiarCliente && e.target === btnLimpiarCliente) {
            const selectCliente = document.getElementById('id_cliente');
            const nombreCliente = document.getElementById('nombre_cliente');
            const contactoCliente = document.getElementById('contacto_cliente');
            if (selectCliente) selectCliente.value = '';
            if (nombreCliente) nombreCliente.value = '';
            if (contactoCliente) contactoCliente.value = '';
            return;
        }
    });
}


// Tipo de entrega
function setupTipoEntrega() {
    const tipoRecojo = document.getElementById('tipoRecojo');
    const tipoEnvio = document.getElementById('tipoEnvio');
    const envioFields = document.getElementById('envioFields');
    
    if (tipoRecojo && tipoEnvio && envioFields) {
        tipoRecojo.addEventListener('change', () => {
            envioFields.style.display = 'none';
        });
        
        tipoEnvio.addEventListener('change', () => {
            envioFields.style.display = 'block';
        });
    }
}


// ============================================
// INICIALIZACIÓN
// ============================================
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarPedidos();
        await cargarClientes();
        await cargarProductos();
        return;
    }
    
    eventosInicializados = true;
    
    setupEventListeners();
    setupGuardarPedido();
    setupNuevoPedido();
    setupAgregarProducto();
    setupTipoEntrega();
    
    const buscarInput = getElement('buscarPedido');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');
    if (buscarInput) buscarInput.addEventListener('input', () => aplicarFiltros());
    if (filtroCantidad) filtroCantidad.addEventListener('change', () => aplicarFiltros());
    if (filtroEstado) filtroEstado.addEventListener('change', () => aplicarFiltros());
    
    await cargarClientes();
    await cargarProductos();
    await cargarPedidos();
}

export function destroy() {
    eventosInicializados = false;
    elementos = {};
    pedidosGlobal = [];
    productosGlobal = [];
    clientesGlobal = [];
    productosSeleccionados = [];
    totalPedido = 0;
}

export { mostrarDetallePedido };


