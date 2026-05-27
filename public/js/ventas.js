import { mostrarToast, mostrarModalConfirmacionProfesional, limpiarBackdrops } from './helpers.js';

let ventasGlobal = [];
let productosGlobal = [];
let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};
let productosSeleccionados = [];
let totalVenta = 0;


// VERIFICAR PÁGINA ACTUAL
function isCurrentPage() {
    return document.getElementById('tablaVentas') !== null;
}


// OBTENER ELEMENTO CON CACHE
function getElement(id) {
    if (!elementos[id]) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}


// FORMATEAR FECHA
function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
}


// LIMPIAR FORMULARIO
function limpiarFormulario() {
    const form = getElement('formVenta');
    if (form) form.reset();
    
    getElement('ventaId').value = '';
    getElement('tituloModalVenta').textContent = 'Nueva Venta';
    
    // Resetear fecha
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    getElement('fecha_venta').value = `${año}-${mes}-${dia}`;
    
    // Resetear cliente
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
    
    // Resetear crédito
    const divCredito = document.getElementById('div_credito_fields');
    if (divCredito) divCredito.style.display = 'none';
    const modalidadPago = getElement('modalidad_pago');
    if (modalidadPago) modalidadPago.value = '';
    const panelCuotas = document.getElementById('panelCuotas');
    if (panelCuotas) panelCuotas.style.display = 'none';
    
    // Resetear productos
    productosSeleccionados = [];
    totalVenta = 0;
    actualizarTablaProductos();
    
    // Generar número de nota
    const numeroNota = getElement('numero_nota_venta');
    if (numeroNota) numeroNota.value = generarNumeroNota();
}


// ACTUALIZAR TABLA DE PRODUCTOS
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
                    <button class="btn btn-sm btn-danger btn-eliminar-producto" data-idx="${idx}" style="padding: 0.2rem 0.5rem;">
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


// CARGAR DATOS
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
        
        // Cargar productos en el select
        const selectProducto = document.getElementById('selectProducto');
        if (selectProducto) {
            cargarSelectProductos('');
        }
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar productos', 'danger');
    }
}


// APLICAR FILTROS Y RENDERIZAR
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarVenta');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');
    
    const textoBusqueda = buscarInput?.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad?.value || 5);
    const estadoFiltro = filtroEstado?.value || '';
    
    let ventasFiltradas = ventasGlobal
        .filter(venta => venta.estado !== 2)
        .filter(venta => {
            if (estadoFiltro && venta.estado != estadoFiltro) return false;
            return venta.numero_nota_venta?.toLowerCase().includes(textoBusqueda) ||
                   venta.cliente?.toLowerCase().includes(textoBusqueda);
        })
        .reverse()
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
        const estadoBadge = venta.estado === 1 
            ? '<span class="badge bg-success">Activa</span>' 
            : '<span class="badge bg-secondary">Anulada</span>';
        
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
                    ${venta.estado === 1 
                        ? `<button class="btn btn-sm btn-secondary btnAnularVenta" data-id="${venta.id}" title="Anular">
                            <i class="bi bi-slash-circle"></i>
                        </button>`
                        : `<button class="btn btn-sm btn-success btnActivarVenta" data-id="${venta.id}" title="Reactivar">
                            <i class="bi bi-check-circle"></i>
                        </button>`
                    }
                    <button class="btn btn-sm btn-danger btnEliminarVenta" data-id="${venta.id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}


// CAMBIAR ESTADO
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
        mostrarToast(mensajeExito, tipoToast);
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// MOSTRAR DETALLE DE VENTA
async function mostrarDetalleVenta(id) {
    try {
        const response = await fetch(`/api/ventas/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const venta = await response.json();
        
        limpiarBackdrops();
        
        document.getElementById('detalleNumeroNota').textContent = venta.numero_nota_venta || '-';
        document.getElementById('detalleCliente').textContent = venta.cliente || '-';
        document.getElementById('detalleFecha').textContent = formatearFecha(venta.fecha_venta);
        document.getElementById('detalleUsuario').textContent = venta.usuario || '-';
        
        const modalidadBadge = document.getElementById('detalleModalidad');
        modalidadBadge.textContent = venta.modalidad_pago;
        modalidadBadge.className = venta.modalidad_pago === 'CONTADO' ? 'badge bg-success' : 'badge bg-warning';
        
        document.getElementById('detalleTotal').innerHTML = `S/ ${parseFloat(venta.total_venta).toFixed(2)}`;
        
        const deudaRow = document.getElementById('detalleDeudaRow');
        if (venta.modalidad_pago === 'CREDITO' && venta.deuda > 0) {
            deudaRow.style.display = 'flex';
            document.getElementById('detalleDeuda').innerHTML = `S/ ${parseFloat(venta.deuda).toFixed(2)}`;
        } else {
            deudaRow.style.display = 'none';
        }
        
        const estadoBadge = document.getElementById('detalleEstado');
        if (venta.estado === 1) {
            estadoBadge.textContent = 'Activa';
            estadoBadge.className = 'badge bg-success';
        } else {
            estadoBadge.textContent = 'Anulada';
            estadoBadge.className = 'badge bg-secondary';
        }
        
        const observacionRow = document.getElementById('detalleObservacionRow');
        if (venta.observacion && venta.observacion.trim() !== '') {
            observacionRow.style.display = 'block';
            document.getElementById('detalleObservacion').textContent = venta.observacion;
        } else {
            observacionRow.style.display = 'none';
        }
        
        const tbodyProductos = document.getElementById('detalleProductos');
        tbodyProductos.innerHTML = '';
        let totalProductos = 0;
        if (venta.detalles) {
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
        document.getElementById('detalleProductosTotal').innerHTML = `S/ ${totalProductos.toFixed(2)}`;
        
        const pagosSection = document.getElementById('detallePagosSection');
        if (venta.pagos && venta.pagos.length > 0) {
            pagosSection.style.display = 'block';
            const tbodyPagos = document.getElementById('detallePagos');
            tbodyPagos.innerHTML = '';
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
            pagosSection.style.display = 'none';
        }
        
        const cuotasSection = document.getElementById('detalleCuotasSection');
        if (venta.cuotas && venta.cuotas.length > 0) {
            cuotasSection.style.display = 'block';
            const tbodyCuotas = document.getElementById('detalleCuotas');
            tbodyCuotas.innerHTML = '';
            venta.cuotas.forEach(cuota => {
                const estadoCuota = cuota.estado === 1 
                    ? '<span class="badge bg-success">Pagada</span>' 
                    : '<span class="badge bg-warning">Pendiente</span>';
                tbodyCuotas.innerHTML += `
                    <tr class="small">
                        <td>Cuota ${cuota.numero_cuota}</td>
                        <td class="text-end">S/ ${parseFloat(cuota.monto).toFixed(2)}</td>
                        <td class="text-end">${cuota.fecha_vencimiento || '-'}</td>
                        <td class="text-end">${estadoCuota}</td>
                    </tr>
                `;
            });
        } else {
            cuotasSection.style.display = 'none';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleVenta'));
        modal.show();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar detalles', 'danger');
    }
}


// BUSCAR CLIENTE POR DNI/RUC
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


// MODALIDAD DE PAGO
function setupModalidadPago() {
    const modalidadPago = getElement('modalidad_pago');
    if (!modalidadPago) return;
    
    modalidadPago.addEventListener('change', () => {
        const isCredito = modalidadPago.value === 'CREDITO';
        const divCredito = document.getElementById('div_credito_fields');
        if (divCredito) divCredito.style.display = isCredito ? 'block' : 'none';
        if (isCredito) {
            setTimeout(() => calcularYMostrarCuotas(), 100);
        } else {
            const panelCuotas = document.getElementById('panelCuotas');
            if (panelCuotas) panelCuotas.style.display = 'none';
        }
    });
}


// AGREGAR PRODUCTO (CORREGIDO)
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
    
    selectProducto.innerHTML = '<option value="">Seleccione producto</option>';
    
    productosFiltrados.forEach(producto => {
        selectProducto.innerHTML += `<option value="${producto.id}" data-precio="${producto.precio}" data-stock="${producto.stock}" data-unidad="${producto.unidad_abreviatura}">${producto.nombre} - Stock: ${producto.stock} ${producto.unidad_abreviatura || ''}</option>`;
    });
}


//Agregar producto
function setupAgregarProducto() {
    const btnAgregar = document.getElementById('btnAgregarProducto');
    const btnConfirmar = document.getElementById('btnConfirmarAgregar');
    const btnCancelar = document.getElementById('btnCancelarAgregarProducto');
    const buscarInput = document.getElementById('buscarProductoInput');
    const selectProducto = document.getElementById('selectProducto');
    
    // Abrir modal de producto
    if (btnAgregar) {
        btnAgregar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Resetear campos del modal de producto
            if (buscarInput) buscarInput.value = '';
            if (selectProducto) selectProducto.value = '';
            document.getElementById('precioUnitario').value = '';
            document.getElementById('stockDisponible').value = '';
            document.getElementById('cantidadProducto').value = '1';
            
            // Cargar productos
            cargarSelectProductos('');
            
            // Abrir solo el modal de producto
            const modalProducto = new bootstrap.Modal(document.getElementById('modalAgregarProducto'));
            modalProducto.show();
        });
    }
    
    // Búsqueda en tiempo real
    if (buscarInput) {
        buscarInput.addEventListener('input', (e) => {
            cargarSelectProductos(e.target.value);
        });
    }
    
    // Seleccionar producto del select
    if (selectProducto) {
        selectProducto.addEventListener('change', () => {
            const selectedOption = selectProducto.options[selectProducto.selectedIndex];
            const precio = selectedOption.dataset.precio;
            const stock = selectedOption.dataset.stock;
            const unidad = selectedOption.dataset.unidad;
            
            document.getElementById('precioUnitario').value = precio ? parseFloat(precio).toFixed(2) : '';
            document.getElementById('stockDisponible').value = stock ? `${stock} ${unidad || ''}` : '';
        });
    }
    
    // Cancelar (solo cierra el modal de producto)
    if (btnCancelar) {
        btnCancelar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const modalProducto = bootstrap.Modal.getInstance(document.getElementById('modalAgregarProducto'));
            if (modalProducto) {
                modalProducto.hide();
            }
            limpiarBackdrops();
        });
    }
    
    // Confirmar agregar producto
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
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
            
            // Agregar producto a la lista
            productosSeleccionados.push({
                id_producto: parseInt(productoId),
                producto_nombre: productoNombre,
                precio_unitario: precio,
                cantidad: cantidad
            });
            
            // Actualizar tabla de productos en el modal principal
            actualizarTablaProductos();
            
            // Limpiar campos del modal de producto
            if (selectProducto) selectProducto.value = '';
            if (buscarInput) buscarInput.value = '';
            document.getElementById('cantidadProducto').value = '1';
            document.getElementById('precioUnitario').value = '';
            document.getElementById('stockDisponible').value = '';
            
            // Cerrar SOLO el modal de producto
            const modalProducto = bootstrap.Modal.getInstance(document.getElementById('modalAgregarProducto'));
            if (modalProducto) {
                modalProducto.hide();
            }
            
            // Limpiar backdrops residuales
            setTimeout(() => {
                limpiarBackdrops();
            }, 150);
            
            mostrarToast('Producto agregado correctamente', 'success');
        });
    }
}


// GENERAR NÚMERO DE NOTA
function generarNumeroNota() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const consecutivo = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NV${año}${mes}${dia}-${consecutivo}`;
}


// GUARDAR VENTA
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
        let deuda = 0;
        if (modalidad_pago === 'CREDITO') {
            deuda = total_venta - pago_inicial;
            if (deuda <= 0) {
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
                    deuda,
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


// NUEVA VENTA
function setupNuevaVenta() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalVenta"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => {
            limpiarFormulario();
        });
    }
}


// CALCULAR CUOTAS
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
        document.getElementById('montoFinanciar').innerHTML = `S/ ${montoFinanciar.toFixed(2)}`;
        
        const tbody = document.getElementById('tablaResumenCuotas');
        tbody.innerHTML = '';
        let fechaActual = new Date();
        const fechaInput = document.getElementById('fecha_venta');
        if (fechaInput && fechaInput.value) fechaActual = new Date(fechaInput.value);
        
        for (let i = 1; i <= cantidadCuotas; i++) {
            const fechaVencimiento = new Date(fechaActual);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + (intervaloDias * i));
            const fechaStr = `${fechaVencimiento.getDate().toString().padStart(2, '0')}/${(fechaVencimiento.getMonth() + 1).toString().padStart(2, '0')}/${fechaVencimiento.getFullYear()}`;
            tbody.innerHTML += `<tr><td class="text-center">${i}</td><td class="text-end">S/ ${montoPorCuota.toFixed(2)}</td><td class="text-end">${fechaStr}</td></tr>`;
        }
        panelCuotas.style.display = 'block';
    } else {
        panelCuotas.style.display = 'none';
    }
}

function setupCreditEventos() {
    const recalcular = () => calcularYMostrarCuotas();
    document.getElementById('pago_inicial')?.addEventListener('input', recalcular);
    document.getElementById('cantidad_cuotas')?.addEventListener('input', recalcular);
    document.getElementById('intervalo_dias')?.addEventListener('input', recalcular);
    document.getElementById('fecha_venta')?.addEventListener('change', recalcular);
}


// EVENTOS GLOBALES
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
            mostrarModalConfirmacionProfesional('Anular Venta', '¿Desea anular esta venta?', () => cambiarEstado(id, 0, 'Venta anulada', 'warning'), 'warning');
            return;
        }
        
        const btnActivar = e.target.closest('.btnActivarVenta');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional('Reactivar Venta', '¿Desea reactivar esta venta?', () => cambiarEstado(id, 1, 'Venta reactivada', 'success'), 'success');
            return;
        }
        
        const btnEliminar = e.target.closest('.btnEliminarVenta');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional('Eliminar Venta', '¿Desea eliminar esta venta?', () => cambiarEstado(id, 2, 'Venta eliminada', 'danger'), 'danger');
            return;
        }
    });
}


// INICIALIZACIÓN
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




