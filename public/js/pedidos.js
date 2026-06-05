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
    
    // Resetear cliente
    const selectCliente = document.getElementById('id_cliente');
    if (selectCliente) selectCliente.value = '';
    const nombreCliente = document.getElementById('nombre_cliente');
    if (nombreCliente) nombreCliente.value = '';
    const contactoCliente = document.getElementById('contacto_cliente');
    if (contactoCliente) contactoCliente.value = '';
    
    // Resetear tipo de entrega (por defecto recogida)
    const radioRecojo = document.getElementById('entregaRecojo');
    const radioEnvio = document.getElementById('entregaEnvio');
    const seccionRecojo = document.getElementById('seccionRecojo');
    const seccionEnvio = document.getElementById('seccionEnvio');
    
    if (radioRecojo) radioRecojo.checked = true;
    if (radioEnvio) radioEnvio.checked = false;
    if (seccionRecojo) seccionRecojo.style.display = 'block';
    if (seccionEnvio) seccionEnvio.style.display = 'none';
    
    // Limpiar campos de fechas
    document.getElementById('fecha_recojo').value = '';
    document.getElementById('fecha_envio').value = '';
    document.getElementById('costo_envio').value = '0';
    document.getElementById('direccion_envio').value = '';
    
    // Resetear productos
    productosSeleccionados = [];
    totalPedido = 0;
    actualizarTablaProductos();
    
    // Generar número de pedido
    const numeroPedido = getElement('numero_pedido');
    if (numeroPedido) numeroPedido.value = generarNumeroPedido();
}


// Generar número de pedido único
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
                <td class="text-truncate" style="max-width: 180px;">${item.producto_nombre || '-'}</td>
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
        
        // Evento para mostrar datos del cliente al seleccionar
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
            // Si el filtro de estado está activo, filtrar por ese estado
            if (estadoFiltro !== '') {
                return pedido.estado == estadoFiltro;
            }
            // Si no hay filtro, mostrar todos (incluyendo estado 2)
            return true;
        })
        .filter(pedido => {
            return pedido.numero_pedido?.toLowerCase().includes(textoBusqueda) ||
                   pedido.cliente?.toLowerCase().includes(textoBusqueda);
        })
        .reverse()
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
        
        // Estado: 0 = Pendiente, 1 = Pagado, 2 = Cancelado
        if (pedido.estado === 0) {
            estadoBadge = '<span class="badge bg-warning text-dark">Pendiente</span>';
            botonesAccion = `
                <button class="btn btn-sm btn-success btnConvertirVenta" data-id="${pedido.id}" data-total="${pedido.total_pedido}" title="Convertir a Venta">
                    <i class="bi bi-cart-check"></i>
                </button>
                <button class="btn btn-sm btn-danger btnCancelarPedido" data-id="${pedido.id}" title="Cancelar Pedido">
                    <i class="bi bi-x-circle"></i>
                </button>
            `;
        } else if (pedido.estado === 1) {
            estadoBadge = '<span class="badge bg-success">Pagado</span>';
            botonesAccion = `
                <button class="btn btn-sm btn-info btnVerVenta" data-id="${pedido.id}" title="Ver Venta Asociada">
                    <i class="bi bi-receipt"></i>
                </button>
            `;
        } else {
            estadoBadge = '<span class="badge bg-secondary">Cancelado</span>';
            botonesAccion = `
                <button class="btn btn-sm btn-warning btnReactivarPedido" data-id="${pedido.id}" title="Reactivar Pedido">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
            `;
        }
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${pedido.id}</td>
                <td><strong>${pedido.numero_pedido}</strong></td>
                <td>${pedido.cliente || '-'}</td>
                <td>${formatearFecha(pedido.fecha_pedido)}</td>
                <td class="fw-bold text-primary">S/ ${parseFloat(pedido.total_pedido).toFixed(2)}</td>
                <td>${estadoBadge}</td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-warning btnVerPedido" data-id="${pedido.id}" title="Ver Detalle">
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
// MOSTRAR DETALLE DE PEDIDO
// ============================================
async function mostrarDetallePedido(id) {
    try {
        const response = await fetch(`/api/pedidos/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const pedido = await response.json();
        
        limpiarBackdrops();
        
        const tbodyProductos = document.getElementById('detalleProductos');
        if (tbodyProductos) tbodyProductos.innerHTML = '';
        
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
        
        // Estado
        const estadoBadge = document.getElementById('detalleEstado');
        if (estadoBadge) {
            if (pedido.estado === 0) {
                estadoBadge.textContent = 'Pendiente';
                estadoBadge.className = 'badge bg-warning text-dark';
            } else if (pedido.estado === 1) {
                estadoBadge.textContent = 'Pagado';
                estadoBadge.className = 'badge bg-success';
            } else {
                estadoBadge.textContent = 'Cancelado';
                estadoBadge.className = 'badge bg-secondary';
            }
        }
        
        // Información de entrega
        const tieneRecojo = pedido.fecha_recojo;
        const tieneEnvio = pedido.fecha_envio || pedido.direccion_envio;
        
        const seccionRecojoInfo = document.getElementById('detalleRecojoInfo');
        const seccionEnvioInfo = document.getElementById('detalleEnvioInfo');
        const tituloEntrega = document.getElementById('detalleTipoEntregaTitulo');
        
        if (tieneRecojo) {
            if (tituloEntrega) tituloEntrega.textContent = 'Recogida en Tienda';
            if (seccionRecojoInfo) seccionRecojoInfo.style.display = 'block';
            if (seccionEnvioInfo) seccionEnvioInfo.style.display = 'none';
            setText('detalleFechaRecojo', formatearFecha(pedido.fecha_recojo));
        } else if (tieneEnvio) {
            if (tituloEntrega) tituloEntrega.textContent = 'Envío a Domicilio';
            if (seccionRecojoInfo) seccionRecojoInfo.style.display = 'none';
            if (seccionEnvioInfo) seccionEnvioInfo.style.display = 'block';
            setText('detalleFechaEnvio', formatearFecha(pedido.fecha_envio));
            setText('detalleDireccionEnvio', pedido.direccion_envio);
            setHtml('detalleCostoEnvio', `S/ ${parseFloat(pedido.costo_envio || 0).toFixed(2)}`);
        } else {
            if (tituloEntrega) tituloEntrega.textContent = 'Información de Entrega';
            if (seccionRecojoInfo) seccionRecojoInfo.style.display = 'block';
            if (seccionEnvioInfo) seccionEnvioInfo.style.display = 'none';
            setText('detalleFechaRecojo', 'No especificada');
        }
        
        // Productos
        let totalProductos = 0;
        if (pedido.detalles && pedido.detalles.length > 0) {
            pedido.detalles.forEach(det => {
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
        
        // Obtener datos según tipo de entrega
        const tipoEntrega = document.getElementById('entregaRecojo').checked ? 'recojo' : 'envio';
        let fecha_recojo = null;
        let fecha_envio = null;
        let direccion_envio = null;
        let costo_envio = 0;
        
        if (tipoEntrega === 'recojo') {
            fecha_recojo = document.getElementById('fecha_recojo')?.value || null;
        } else {
            fecha_envio = document.getElementById('fecha_envio')?.value || null;
            direccion_envio = document.getElementById('direccion_envio')?.value.trim() || null;
            costo_envio = parseFloat(document.getElementById('costo_envio')?.value) || 0;
        }
        
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
        
        // Validar dirección de envío si se eligió envío
        if (tipoEntrega === 'envio' && !direccion_envio) {
            mostrarToast('Ingrese la dirección de envío', 'warning');
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
                    fecha_recojo,
                    fecha_envio,
                    direccion_envio,
                    costo_envio,
                    productos: productosSeleccionados
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
        
        // Ver detalle de pedido
        const btnVer = e.target.closest('.btnVerPedido');
        if (btnVer) {
            mostrarDetallePedido(parseInt(btnVer.dataset.id));
            return;
        }
        
        // Cancelar pedido (solo para pendientes)
        const btnCancelar = e.target.closest('.btnCancelarPedido');
        if (btnCancelar) {
            const id = parseInt(btnCancelar.dataset.id);
            mostrarModalConfirmacionProfesional('Cancelar Pedido', '¿Desea cancelar este pedido? Se liberará el stock reservado.', () => cambiarEstado(id, 2, 'Pedido cancelado', 'warning'), 'warning');
            return;
        }
        
        // Reactivar pedido (solo para cancelados)
        const btnReactivar = e.target.closest('.btnReactivarPedido');
        if (btnReactivar) {
            const id = parseInt(btnReactivar.dataset.id);
            mostrarModalConfirmacionProfesional('Reactivar Pedido', '¿Desea reactivar este pedido? Se reservará el stock nuevamente.', () => cambiarEstado(id, 0, 'Pedido reactivado', 'success'), 'success');
            return;
        }
        
        // Ver venta asociada
        const btnVerVenta = e.target.closest('.btnVerVenta');
        if (btnVerVenta) {
            const id = parseInt(btnVerVenta.dataset.id);
            await verVentaAsociada(id);
            return;
        }
        
        // Convertir a venta
        const btnConvertir = e.target.closest('.btnConvertirVenta');
        if (btnConvertir) {
            const id = parseInt(btnConvertir.dataset.id);
            const total = parseFloat(btnConvertir.dataset.total);
            await abrirModalConvertirVenta(id, total);
            return;
        }
    });
}


// VER VENTA ASOCIADA
async function verVentaAsociada(idPedido) {
    try {
        const response = await fetch(`/api/pedidos/${idPedido}/venta`);
        if (!response.ok) throw new Error('Error al obtener venta');
        const venta = await response.json();
        
        if (!venta) {
            mostrarToast('No hay una venta asociada a este pedido', 'warning');
            return;
        }
        
        // Redirigir al módulo de ventas o mostrar modal
        mostrarToast(`Venta N°: ${venta.numero_nota_venta} - Total: S/ ${venta.total_venta}`, 'info');
        
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// CONVERTIR A VENTA
async function abrirModalConvertirVenta(idPedido, totalPedido) {
    // Configurar valores
    document.getElementById('totalPedidoConvertir').value = totalPedido.toFixed(2);
    document.getElementById('montoPagoConvertir').value = totalPedido;
    document.getElementById('montoPagoConvertir').max = totalPedido;
    document.getElementById('metodoPagoConvertir').value = '';
    
    // Guardar ID del pedido
    const modalElement = document.getElementById('modalConvertirVenta');
    modalElement.dataset.idPedido = idPedido;
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}


//Confirmar conversión a venta
async function confirmarConvertirVenta() {
    console.log('Botón confirmar clickeado'); // Para depuración
    
    const modalElement = document.getElementById('modalConvertirVenta');
    const idPedido = modalElement?.dataset.idPedido;
    const montoPago = parseFloat(document.getElementById('montoPagoConvertir')?.value) || 0;
    const metodoPago = document.getElementById('metodoPagoConvertir')?.value;
    
    console.log('Datos:', { idPedido, montoPago, metodoPago });
    
    if (!idPedido) {
        mostrarToast('Error: No se identificó el pedido', 'danger');
        return;
    }
    
    if (!metodoPago) {
        mostrarToast('Seleccione un método de pago', 'warning');
        return;
    }
    
    if (montoPago <= 0) {
        mostrarToast('Ingrese un monto válido', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/pedidos/${idPedido}/convertir-venta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto_pago: montoPago,
                metodo_pago: metodoPago
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        mostrarToast(`Pedido convertido a venta exitosamente`, 'success');
        
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
        
        await cargarPedidos();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast(error.message, 'danger');
    }
}


// ============================================
// CONFIGURAR TIPO DE ENTREGA (RECOJO vs ENVIO)
// ============================================
function setupTipoEntrega() {
    const radioRecojo = document.getElementById('entregaRecojo');
    const radioEnvio = document.getElementById('entregaEnvio');
    const seccionRecojo = document.getElementById('seccionRecojo');
    const seccionEnvio = document.getElementById('seccionEnvio');
    
    if (radioRecojo && radioEnvio) {
        radioRecojo.addEventListener('change', () => {
            if (radioRecojo.checked) {
                seccionRecojo.style.display = 'block';
                seccionEnvio.style.display = 'none';
                // Limpiar campos de envío
                document.getElementById('fecha_envio').value = '';
                document.getElementById('costo_envio').value = '0';
                document.getElementById('direccion_envio').value = '';
            }
        });
        
        radioEnvio.addEventListener('change', () => {
            if (radioEnvio.checked) {
                seccionRecojo.style.display = 'none';
                seccionEnvio.style.display = 'block';
                // Limpiar campo de recogida
                document.getElementById('fecha_recojo').value = '';
            }
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
    const btnConfirmarConvertir = document.getElementById('btnConfirmarConvertir');

    if (buscarInput) buscarInput.addEventListener('input', () => aplicarFiltros());
    if (filtroCantidad) filtroCantidad.addEventListener('change', () => aplicarFiltros());
    if (filtroEstado) filtroEstado.addEventListener('change', () => aplicarFiltros());
    if (btnConfirmarConvertir) {
        // Remover eventos anteriores
        const newBtn = btnConfirmarConvertir.cloneNode(true);
        btnConfirmarConvertir.parentNode.replaceChild(newBtn, btnConfirmarConvertir);
        newBtn.addEventListener('click', confirmarConvertirVenta);
    }
    
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


