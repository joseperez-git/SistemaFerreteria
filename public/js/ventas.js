import { mostrarToast, mostrarModalConfirmacionProfesional, limpiarBackdrops } from './helpers.js';

let ventasGlobal = [];
let productosGlobal = [];
let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};
let productosSeleccionados = [];
let totalVenta = 0;
let productosGlobalParaBusqueda = [];
let cuotaSeleccionada = null;


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
    
    switch(tipo) {
        case 'DNI':
            if (!/^\d{8}$/.test(num)) {
                return { valido: false, mensaje: 'El DNI debe tener 8 dígitos' };
            }
            break;
        case 'RUC':
            if (!/^\d{11}$/.test(num)) {
                return { valido: false, mensaje: 'El RUC debe tener 11 dígitos' };
            }
            break;
        default:
            return { valido: false, mensaje: 'Tipo de documento no válido' };
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
            <tr>
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
        productosGlobalParaBusqueda = productosGlobal;
        
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
        tabla.innerHTML = `<td><td colspan="8" class="text-center text-muted py-4">No hay ventas registradas</td></tr>`;
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
        mostrarToast(mensajeExito, tipoToast);
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// ============================================
// PAGO DE CUOTAS (INTEGRADO EN EL MODAL)
// ============================================
function mostrarFormularioPagoCuota(idCuota, montoCuota, numeroCuota, idVenta) {
    // Guardar en variable global
    cuotaSeleccionada = {
        id: parseInt(idCuota),
        monto: parseFloat(montoCuota),
        numero: parseInt(numeroCuota),
        ventaId: parseInt(idVenta)
    };
    
    console.log('Cuota seleccionada:', cuotaSeleccionada);
    
    const montoCuotaInput = document.getElementById('pagoMontoCuota');
    const montoPagarInput = document.getElementById('pagoMontoPagar');
    const metodoPagoSelect = document.getElementById('pagoMetodoPago');
    const metodoPago2Select = document.getElementById('pagoMetodoPago2');
    const montoPagar2Input = document.getElementById('pagoMontoPagar2');
    const esMixtoCheck = document.getElementById('pagoEsMixto');
    const mixtoForm = document.getElementById('pagoMixtoForm');
    const container = document.getElementById('formPagoCuotaContainer');
    
    if (montoCuotaInput) montoCuotaInput.value = cuotaSeleccionada.monto.toFixed(2);
    if (montoPagarInput) {
        montoPagarInput.value = cuotaSeleccionada.monto;
        montoPagarInput.max = cuotaSeleccionada.monto;
    }
    if (metodoPagoSelect) metodoPagoSelect.value = '';
    if (metodoPago2Select) metodoPago2Select.value = '';
    if (montoPagar2Input) montoPagar2Input.value = 0;
    if (esMixtoCheck) esMixtoCheck.checked = false;
    if (mixtoForm) mixtoForm.style.display = 'none';
    if (container) container.style.display = 'block';
    
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function ocultarFormularioPagoCuota() {
    const container = document.getElementById('formPagoCuotaContainer');
    if (container) container.style.display = 'none';
    cuotaSeleccionada = null;
}


async function confirmarPagoCuotaIntegrado() {
    // Verificar que cuotaSeleccionada existe
    if (!cuotaSeleccionada) {
        mostrarToast('No hay una cuota seleccionada. Intente nuevamente.', 'warning');
        return;
    }
    
    // Verificar que tiene ventaId
    if (!cuotaSeleccionada.ventaId) {
        mostrarToast('Error: No se pudo identificar la venta asociada.', 'danger');
        return;
    }
    
    const metodoPago = document.getElementById('pagoMetodoPago')?.value;
    let montoPago = parseFloat(document.getElementById('pagoMontoPagar')?.value) || 0;
    const esMixto = document.getElementById('pagoEsMixto')?.checked;
    const montoTotalCuota = parseFloat(cuotaSeleccionada.monto);
    const idCuota = cuotaSeleccionada.id;
    const idVenta = cuotaSeleccionada.ventaId;
    
    // Redondear a 2 decimales
    montoPago = Math.round(montoPago * 100) / 100;
    
    console.log('Datos del pago:', { idCuota, idVenta, metodoPago, montoPago, montoTotalCuota, esMixto });
    
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
        if (esMixto) {
            const metodoPago2 = document.getElementById('pagoMetodoPago2')?.value;
            let montoPago2 = parseFloat(document.getElementById('pagoMontoPagar2')?.value) || 0;
            montoPago2 = Math.round(montoPago2 * 100) / 100;
            
            if (!metodoPago2) {
                mostrarToast('Seleccione el segundo método de pago', 'warning');
                return;
            }
            if (montoPago2 <= 0) {
                mostrarToast('Ingrese un monto válido para el segundo pago', 'warning');
                return;
            }
            if (montoPago + montoPago2 > montoTotalCuota) {
                mostrarToast('La suma de los pagos excede el total de la cuota', 'warning');
                return;
            }
            
            const response1 = await fetch('/api/pago-cuota/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_cuota_venta: parseInt(idCuota),
                    metodo_pago: metodoPago,
                    monto: montoPago
                })
            });
            
            if (!response1.ok) {
                const errorData = await response1.json();
                throw new Error(errorData.error || 'Error al registrar el primer pago');
            }
            
            if (montoPago2 > 0) {
                const response2 = await fetch('/api/pago-cuota/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_cuota_venta: parseInt(idCuota),
                        metodo_pago: metodoPago2,
                        monto: montoPago2
                    })
                });
                if (!response2.ok) {
                    const errorData = await response2.json();
                    throw new Error(errorData.error || 'Error al registrar el segundo pago');
                }
            }
            
            mostrarToast('Pago mixto registrado correctamente', 'success');
        } else {
            const response = await fetch('/api/pago-cuota/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_cuota_venta: parseInt(idCuota),
                    metodo_pago: metodoPago,
                    monto: montoPago
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar el pago');
            }
            
            mostrarToast('Pago registrado correctamente', 'success');
        }
        
        // Ocultar formulario
        ocultarFormularioPagoCuota();
        
        // Recargar el detalle
        await mostrarDetalleVenta(parseInt(idVenta));
        
    } catch (error) {
        console.error('Error en pago:', error);
        mostrarToast(error.message, 'danger');
    }
}


function manejarPagoCuota(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.currentTarget;
    const idCuota = btn.dataset.idCuota;
    const monto = btn.dataset.monto;
    const numero = btn.dataset.numero;
    const idVenta = btn.dataset.idVenta;
    
    console.log('Botón pagar:', { idCuota, monto, numero, idVenta });
    
    if (!idCuota || !monto || !idVenta) {
        mostrarToast('Error: Datos de la cuota incompletos', 'danger');
        return;
    }
    
    mostrarFormularioPagoCuota(idCuota, monto, numero, idVenta);
}


// ============================================
// MOSTRAR DETALLE DE VENTA
// ============================================
async function mostrarDetalleVenta(id) {
    try {
        const response = await fetch(`/api/ventas/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const venta = await response.json();
        
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
        
        const deudaRow = document.getElementById('detalleDeudaRow');
        if (venta.modalidad_pago === 'CREDITO' && venta.deuda > 0) {
            if (deudaRow) deudaRow.style.display = 'flex';
            setHtml('detalleDeuda', `S/ ${parseFloat(venta.deuda).toFixed(2)}`);
        } else {
            if (deudaRow) deudaRow.style.display = 'none';
        }
        
        const estadoBadge = document.getElementById('detalleEstado');
        if (estadoBadge) {
            if (venta.estado === 1) {
                estadoBadge.textContent = 'Activa';
                estadoBadge.className = 'badge bg-success';
            } else {
                estadoBadge.textContent = 'Anulada';
                estadoBadge.className = 'badge bg-secondary';
            }
        }
        
        const observacionRow = document.getElementById('detalleObservacionRow');
        if (venta.observacion && venta.observacion.trim() !== '') {
            if (observacionRow) observacionRow.style.display = 'block';
            setText('detalleObservacion', venta.observacion);
        } else {
            if (observacionRow) observacionRow.style.display = 'none';
        }
        
        let totalProductos = 0;
        if (tbodyProductos && venta.detalles && venta.detalles.length > 0) {
            venta.detalles.forEach(det => {
                const subtotal = det.precio_unitario * det.cantidad;
                totalProductos += subtotal;
                tbodyProductos.innerHTML += `
                    <tr>
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
                    <tr>
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
                const botonPagar = cuota.estado === 0 
                    ? `<button class="btn btn-sm btn-primary btnPagarCuota ms-1" 
                               data-id-cuota="${cuota.id}" 
                               data-monto="${cuota.monto}" 
                               data-numero="${cuota.numero_cuota}" 
                               data-id-venta="${venta.id}">
                            <i class="bi bi-credit-card"></i> Pagar
                        </button>` 
                    : '';
                tbodyCuotas.innerHTML += `
                    <tr>
                        <td class="text-center">${cuota.numero_cuota}</td>
                        <td class="text-end">S/ ${parseFloat(cuota.monto).toFixed(2)}</td>
                        <td class="text-center">${cuota.fecha_vencimiento || '-'}</td>
                        <td class="text-center">${estadoCuota}</td>
                        <td class="text-center">${botonPagar}</td>
                    </tr>
                `;
            });
            
            setTimeout(() => {
                document.querySelectorAll('#detalleCuotas .btnPagarCuota').forEach(btn => {
                    btn.removeEventListener('click', manejarPagoCuota);
                    btn.addEventListener('click', manejarPagoCuota);
                });
            }, 100);
        } else {
            if (cuotasSection) cuotasSection.style.display = 'none';
        }
        
        ocultarFormularioPagoCuota();
        
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleVenta'));
        modal.show();
        
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar detalles', 'danger');
    }
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
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al consultar el documento');
            }
            
            document.getElementById('nombre_cliente').value = data.nombre || '';
            document.getElementById('apellido_cliente').value = data.apellido || '';
            
            if (data.telefono && !document.getElementById('telefono_cliente').value) {
                document.getElementById('telefono_cliente').value = data.telefono;
            }
            if (data.correo && !document.getElementById('correo_cliente').value) {
                document.getElementById('correo_cliente').value = data.correo;
            }
            
            const clientesResponse = await fetch('/api/clientes');
            const clientes = await clientesResponse.json();
            const clienteExistente = clientes.find(c => c.numero_documento === numeroDoc);
            
            if (clienteExistente) {
                document.getElementById('id_cliente').value = clienteExistente.id;
                document.getElementById('clienteNoExistenteAlert').style.display = 'none';
                mostrarToast('Cliente encontrado en el sistema', 'success');
            } else {
                document.getElementById('id_cliente').value = '';
                document.getElementById('clienteNoExistenteAlert').style.display = 'block';
                mostrarToast('Cliente no registrado. Se registrará automáticamente al guardar', 'info');
            }
            
        } catch (error) {
            console.error('Error:', error);
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
                } else {
                    numeroDocumento.maxLength = 11;
                    numeroDocumento.placeholder = 'Ej: 12345678';
                }
            }
        });
    }
    
    if (telefono) telefono.oninput = () => soloNumeros(telefono);
    if (nombre) nombre.oninput = () => soloLetrasYEspacios(nombre);
    if (apellido) apellido.oninput = () => soloLetrasYEspacios(apellido);
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
    
    if (productosFiltrados.length === 0) {
        selectProducto.innerHTML += '<option value="" disabled>No se encontraron productos</option>';
    } else {
        productosFiltrados.forEach(producto => {
            const stockClass = producto.stock <= producto.stock_minimo ? 'text-danger' : 'text-success';
            selectProducto.innerHTML += `<option value="${producto.id}" data-precio="${producto.precio}" data-stock="${producto.stock}" data-unidad="${producto.unidad_abreviatura}">
                ${producto.nombre} - <span class="${stockClass}">Stock: ${producto.stock} ${producto.unidad_abreviatura || ''}</span>
            </option>`;
        });
    }
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
        
        if (tipo_documento && numero_documento) {
            const validDoc = validarDocumento(tipo_documento, numero_documento);
            if (!validDoc.valido) {
                mostrarToast(validDoc.mensaje, 'warning');
                return;
            }
        }
        
        if (!nombre_cliente) {
            mostrarToast('El nombre es obligatorio', 'warning');
            return;
        }
        if (nombre_cliente.length < 2) {
            mostrarToast('El nombre debe tener al menos 2 caracteres', 'warning');
            return;
        }
        
        if (telefono_cliente) {
            const validTel = validarTelefono(telefono_cliente);
            if (!validTel.valido) {
                mostrarToast(validTel.mensaje, 'warning');
                return;
            }
        }
        
        if (correo_cliente) {
            const validCorreo = validarCorreo(correo_cliente);
            if (!validCorreo.valido) {
                mostrarToast(validCorreo.mensaje, 'warning');
                return;
            }
        }
        
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
                    <tr>
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
    
    const pagoEsMixto = document.getElementById('pagoEsMixto');
    const pagoMixtoForm = document.getElementById('pagoMixtoForm');
    if (pagoEsMixto && pagoMixtoForm) {
        const newChk = pagoEsMixto.cloneNode(true);
        pagoEsMixto.parentNode.replaceChild(newChk, pagoEsMixto);
        newChk.addEventListener('change', (e) => {
            pagoMixtoForm.style.display = e.target.checked ? 'block' : 'none';
        });
    }
    
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


