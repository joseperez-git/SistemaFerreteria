import { mostrarToast, limpiarBackdrops, mostrarModalConfirmacionProfesional } from './helpers.js';

let cotizacionesGlobal = [];
let productosGlobal = [];
let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};
let productosSeleccionados = [];
let totalCotizacion = 0;
let clientePendiente = null;

// ============================================
// VERIFICAR PÁGINA ACTUAL
// ============================================
function isCurrentPage() {
    return document.getElementById('tablaCotizaciones') !== null;
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
// HELPER SEGURO PARA SETEAR VALORES
// ============================================
function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function safeSetHtml(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
}

function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || '';
}

function safeSetDisplay(id, display) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
}

// ============================================
// GENERAR NÚMERO DE COTIZACIÓN
// ============================================
function generarNumeroCotizacion() {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const consecutivo = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `COT-${año}${mes}${dia}-${consecutivo}`;
}

// ============================================
// LIMPIAR FORMULARIO COMPLETO
// ============================================
function limpiarFormulario() {
    const form = getElement('formCotizacion');
    if (form) form.reset();

    safeSetValue('cotizacionId', '');
    safeSetText('tituloModalCotizacion', 'Nueva Cotización');
    safeSetValue('numero_cotizacion', generarNumeroCotizacion());

    // Limpiar cliente
    safeSetValue('tipo_documento_cliente', '');
    safeSetValue('numero_documento_cliente', '');
    safeSetValue('nombre_cliente', '');
    safeSetValue('apellido_cliente', '');
    safeSetValue('telefono_cliente', '');
    safeSetValue('correo_cliente', '');
    safeSetValue('id_cliente', '');
    safeSetDisplay('clienteNoExistenteAlert', 'none');

    // Limpiar fecha de vencimiento - establecer a hoy + 7 días, mínimo HOY
    const fechaVencimiento = getElement('fecha_vencimiento');
    if (fechaVencimiento) {
        const hoy = new Date();
        const fechaMinima = hoy.toISOString().split('T')[0];
        fechaVencimiento.setAttribute('min', fechaMinima);
        
        const fechaDefault = new Date();
        fechaDefault.setDate(fechaDefault.getDate() + 7);
        fechaVencimiento.value = fechaDefault.toISOString().split('T')[0];
    }

    // Validar fecha de vencimiento no anterior a hoy
    setupValidacionFechaVencimiento();

    // Limpiar buscador de productos
    safeSetValue('buscarProductoCot', '');
    safeSetValue('precioUnitario', '');
    safeSetValue('stockDisponible', '');
    safeSetValue('cantidadProducto', '1');

    // Limpiar select de productos
    const selectProducto = document.getElementById('selectProducto');
    if (selectProducto) selectProducto.value = '';

    // Limpiar tabla de productos
    productosSeleccionados = [];
    totalCotizacion = 0;
    actualizarTablaProductos();

    // Limpiar observación
    safeSetValue('observacion', '');

    clientePendiente = null;

    // Enfocar el campo de documento para empezar rápido
    setTimeout(() => {
        const docInput = document.getElementById('numero_documento_cliente');
        if (docInput) docInput.focus();
    }, 300);
}

// ============================================
// VALIDAR FECHA DE VENCIMIENTO NO ANTERIOR A HOY
// ============================================
function setupValidacionFechaVencimiento() {
    const fechaVencimiento = getElement('fecha_vencimiento');
    if (!fechaVencimiento) return;

    // Establecer mínimo como hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVencimiento.setAttribute('min', hoy.toISOString().split('T')[0]);

    // Validar al cambiar
    fechaVencimiento.addEventListener('change', function() {
        const fechaSeleccionada = new Date(this.value + 'T00:00:00');
        const fechaHoy = new Date();
        fechaHoy.setHours(0, 0, 0, 0);

        if (fechaSeleccionada < fechaHoy) {
            mostrarToast('La fecha de vencimiento no puede ser anterior a hoy', 'warning');
            this.value = hoy.toISOString().split('T')[0];
        }
    });
}

// ============================================
// ACTUALIZAR TABLA DE PRODUCTOS
// ============================================
function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductosCotizacion');
    if (!tbody) return;

    tbody.innerHTML = '';
    totalCotizacion = 0;

    if (productosSeleccionados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No hay productos agregados</td></tr>`;
        safeSetHtml('totalCotizacion', 'S/ 0.00');
        return;
    }

    productosSeleccionados.forEach((item, idx) => {
        const precioOriginal = parseFloat(item.precio_original) || 0;
        const precioFinal = parseFloat(item.precio_final) || precioOriginal;
        const cantidad = parseInt(item.cantidad) || 0;
        const descuento = parseFloat(item.descuento) || 0;
        const subtotal = (precioOriginal * cantidad) - descuento;
        totalCotizacion += subtotal;

        const tieneOferta = precioFinal < precioOriginal;
        const tieneDescuento = descuento > 0;

        tbody.innerHTML += `
            <tr data-idx="${idx}" data-precio="${precioOriginal}" data-descuento="${descuento}">
                <td class="text-start">
                    <strong>${item.producto_nombre || '-'}</strong>
                    ${tieneOferta ? '<span class="badge bg-danger ms-1">Oferta</span>' : ''}
                    ${tieneDescuento ? '<span class="badge bg-info ms-1">Desc.</span>' : ''}
                    ${tieneOferta ? `<br><small class="text-decoration-line-through text-muted">S/ ${precioOriginal.toFixed(2)}</small> <span class="text-success fw-bold">S/ ${precioFinal.toFixed(2)}</span>` : ''}
                </td>
                <td class="text-center">
                    <input type="number" class="form-control form-control-sm cantidad-cot" 
                           value="${cantidad}" min="1" max="9999" style="width: 80px; margin: 0 auto;"
                           data-idx="${idx}">
                </td>
                <td class="text-end fw-bold">S/ ${precioOriginal.toFixed(2)}</td>
                <td class="text-end text-danger">${tieneDescuento ? '-S/ ' + descuento.toFixed(2) : '-'}</td>
                <td class="text-end fw-bold subtotal-cot">S/ ${subtotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-danger btn-eliminar-producto" data-idx="${idx}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    safeSetHtml('totalCotizacion', `S/ ${totalCotizacion.toFixed(2)}`);

    setTimeout(() => {
        document.querySelectorAll('.cantidad-cot').forEach(input => {
            input.removeEventListener('input', manejarCambioCantidad);
            input.addEventListener('input', manejarCambioCantidad);
        });

        document.querySelectorAll('.btn-eliminar-producto').forEach(btn => {
            btn.removeEventListener('click', manejarEliminarProducto);
            btn.addEventListener('click', manejarEliminarProducto);
        });
    }, 100);
}

function manejarCambioCantidad(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    let cantidad = parseInt(e.currentTarget.value) || 1;
    if (cantidad < 1) cantidad = 1;
    if (cantidad > 9999) cantidad = 9999;
    e.currentTarget.value = cantidad;
    productosSeleccionados[idx].cantidad = cantidad;
    actualizarTablaProductos();
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
async function cargarCotizaciones() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/cotizaciones');
        if (!response.ok) throw new Error('Error al cargar cotizaciones');
        cotizacionesGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar cotizaciones', 'danger');
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

// ============================================
// FILTROS Y RENDERIZADO
// ============================================
function aplicarFiltros() {
    if (!isCurrentPage()) return;

    const buscarInput = getElement('buscarCotizacion');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');

    const textoBusqueda = buscarInput?.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad?.value || 5);
    const estadoFiltro = filtroEstado?.value || '';

    let cotizacionesFiltradas = cotizacionesGlobal
        .filter(cot => cot.estado !== 2)
        .filter(cot => {
            if (estadoFiltro !== '' && cot.estado != estadoFiltro) return false;
            return cot.numero_cotizacion?.toLowerCase().includes(textoBusqueda) ||
                   cot.cliente?.toLowerCase().includes(textoBusqueda);
        })
        .sort((a, b) => b.id - a.id)
        .slice(0, cantidadMostrar);

    renderizar(cotizacionesFiltradas);
}

function renderizar(cotizaciones) {
    const tabla = getElement('tablaCotizaciones');
    if (!tabla) return;

    tabla.innerHTML = '';

    if (cotizaciones.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay cotizaciones registradas</td></tr>`;
        return;
    }

    cotizaciones.forEach(cot => {
        let estadoBadge = '';
        if (cot.estado === 1) estadoBadge = '<span class="badge bg-success">Activo</span>';
        else if (cot.estado === 0) estadoBadge = '<span class="badge bg-warning text-dark">Inactivo</span>';
        else if (cot.estado === 2) estadoBadge = '<span class="badge bg-danger">Eliminado</span>';
        else if (cot.estado === 3) estadoBadge = '<span class="badge bg-info">Procesado</span>';

        const fechaVenc = new Date(cot.fecha_vencimiento + 'T00:00:00');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vencida = fechaVenc < hoy;

        let botones = '';
        if (cot.estado === 1) {
            botones = `
                <button class="btn btn-sm btn-info btnVerCotizacion" data-id="${cot.id}" title="Ver detalle">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning btnEditarCotizacion" data-id="${cot.id}" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-danger btnEliminarCotizacion" data-id="${cot.id}" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        } else if (cot.estado === 3) {
            botones = `
                <button class="btn btn-sm btn-info btnVerCotizacion" data-id="${cot.id}" title="Ver detalle">
                    <i class="bi bi-eye"></i>
                </button>
            `;
        }

        tabla.innerHTML += `
            <tr>
                <td class="text-center">${cot.id}</td>
                <td><strong>${cot.numero_cotizacion}</strong></td>
                <td>${cot.cliente || '-'}</td>
                <td>${cot.vendedor || '-'}</td>
                <td class="text-center">
                    ${vencida && cot.estado === 1 
                        ? `<span class="text-danger fw-bold">${formatearFecha(cot.fecha_vencimiento)} <i class="bi bi-exclamation-triangle-fill"></i></span>`
                        : formatearFecha(cot.fecha_vencimiento)
                    }
                </td>
                <td class="text-end fw-bold text-primary">S/ ${parseFloat(cot.total).toFixed(2)}</td>
                <td class="text-center">${estadoBadge}</td>
                <td class="text-center text-nowrap">
                    <div class="btn-group btn-group-sm" role="group">
                        ${botones}
                    </div>
                </td>
            </tr>
        `;
    });
}

// ============================================
// BUSCAR CLIENTE (con auto-detección DNI/RUC)
// ============================================
function setupBusquedaCliente() {
    const btnBuscar = document.getElementById('btnBuscarClienteCot');
    const tipoDocSelect = document.getElementById('tipo_documento_cliente');
    const numeroDocInput = document.getElementById('numero_documento_cliente');

    // Auto-detectar tipo de documento por longitud
    if (numeroDocInput && tipoDocSelect) {
        numeroDocInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            const longitud = this.value.length;

            if (longitud === 8) {
                tipoDocSelect.value = 'DNI';
            } else if (longitud === 11) {
                tipoDocSelect.value = 'RUC';
            } else if (longitud > 11) {
                this.value = this.value.slice(0, 11);
                tipoDocSelect.value = 'RUC';
            } else if (longitud === 0) {
                tipoDocSelect.value = '';
            }
        });

        // Enter para buscar automáticamente
        numeroDocInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const longitud = this.value.length;
                if ((longitud === 8 || longitud === 11) && btnBuscar) {
                    if (longitud === 8) tipoDocSelect.value = 'DNI';
                    if (longitud === 11) tipoDocSelect.value = 'RUC';
                    btnBuscar.click();
                }
            }
        });
    }

    // Botón buscar cliente
    if (btnBuscar) {
        btnBuscar.addEventListener('click', async () => {
            const tipoDoc = tipoDocSelect?.value;
            const numeroDoc = numeroDocInput?.value.trim();

            if (!numeroDoc) {
                mostrarToast('Ingrese un número de documento', 'warning');
                return;
            }
            if (!tipoDoc) {
                mostrarToast('Seleccione el tipo de documento', 'warning');
                return;
            }
            if (tipoDoc === 'DNI' && numeroDoc.length !== 8) {
                mostrarToast('El DNI debe tener 8 dígitos', 'warning');
                return;
            }
            if (tipoDoc === 'RUC' && numeroDoc.length !== 11) {
                mostrarToast('El RUC debe tener 11 dígitos', 'warning');
                return;
            }

            const originalIcon = btnBuscar.innerHTML;
            btnBuscar.disabled = true;
            btnBuscar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                const response = await fetch(`/api/clientes/consultar-documento?numero=${numeroDoc}&tipo=${tipoDoc}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Documento no encontrado');

                safeSetValue('nombre_cliente', data.cliente.nombre || '');
                safeSetValue('apellido_cliente', data.cliente.apellido || '');

                if (data.encontrado && data.cliente.id) {
                    safeSetValue('id_cliente', data.cliente.id);
                    safeSetValue('telefono_cliente', data.cliente.telefono || '');
                    safeSetValue('correo_cliente', data.cliente.correo || '');
                    safeSetDisplay('clienteNoExistenteAlert', 'none');
                    mostrarToast('Cliente encontrado en el sistema', 'success');
                } else {
                    safeSetValue('id_cliente', '');
                    safeSetDisplay('clienteNoExistenteAlert', 'block');
                    mostrarToast('Cliente no registrado. Se registrará automáticamente al guardar', 'info');
                }
            } catch (error) {
                mostrarToast(error.message || 'Error al consultar', 'danger');
            } finally {
                btnBuscar.disabled = false;
                btnBuscar.innerHTML = originalIcon;
            }
        });
    }

    // Botón limpiar cliente
    const btnLimpiar = document.getElementById('btnLimpiarCliente');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            safeSetValue('tipo_documento_cliente', '');
            safeSetValue('numero_documento_cliente', '');
            safeSetValue('nombre_cliente', '');
            safeSetValue('apellido_cliente', '');
            safeSetValue('telefono_cliente', '');
            safeSetValue('correo_cliente', '');
            safeSetValue('id_cliente', '');
            safeSetDisplay('clienteNoExistenteAlert', 'none');
        });
    }
}

// ============================================
// AGREGAR PRODUCTO (con búsqueda por nombre y código de barras)
// ============================================
function cargarSelectProductos(filtro = '') {
    const selectProducto = document.getElementById('selectProducto');
    if (!selectProducto) return;

    let productosFiltrados = productosGlobal.filter(p => p.estado === 1);

    if (filtro.trim() !== '') {
        const termino = filtro.toLowerCase();
        productosFiltrados = productosFiltrados.filter(p =>
            p.nombre.toLowerCase().includes(termino) ||
            (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termino))
        );
    }

    selectProducto.innerHTML = '<option value="">-- Seleccione un producto --</option>';

    productosFiltrados.forEach(producto => {
        selectProducto.innerHTML += `<option value="${producto.id}" 
            data-precio="${producto.precio}" 
            data-stock="${producto.stock}" 
            data-unidad="${producto.unidad_abreviatura}">
            ${producto.nombre} - S/ ${parseFloat(producto.precio).toFixed(2)} - Stock: ${producto.stock} ${producto.unidad_abreviatura || 'und'}
        </option>`;
    });
}

function agregarProductoDirecto(productoId, productoNombre, precio, stock, cantidad = 1) {
    if (!productoId) {
        mostrarToast('Producto no encontrado', 'warning');
        return;
    }
    if (cantidad <= 0) {
        mostrarToast('La cantidad debe ser mayor a 0', 'warning');
        return;
    }

    const existe = productosSeleccionados.find(p => p.id_producto === productoId);
    if (existe) {
        existe.cantidad += cantidad;
        actualizarTablaProductos();
        mostrarToast(`Producto actualizado (${existe.cantidad} unidades)`, 'success');
    } else {
        productosSeleccionados.push({
            id_producto: productoId,
            producto_nombre: productoNombre,
            precio_original: precio,
            precio_final: precio,
            cantidad: cantidad,
            descuento: 0
        });
        actualizarTablaProductos();
        mostrarToast('Producto agregado correctamente', 'success');
    }
}

function setupAgregarProducto() {
    const selectProducto = document.getElementById('selectProducto');
    const buscarInput = document.getElementById('buscarProductoCot');
    const btnAgregarLista = document.getElementById('btnAgregarProductoLista');

    // Búsqueda por nombre O código de barras
    if (buscarInput) {
        buscarInput.addEventListener('input', (e) => {
            const valor = e.target.value.trim();

            if (valor === '') {
                cargarSelectProductos('');
                return;
            }

            // Buscar por código de barras EXACTO
            const productoPorCodigo = productosGlobal.find(p =>
                p.codigo_barras === valor && p.estado === 1
            );

            if (productoPorCodigo) {
                cargarSelectProductos('');
                setTimeout(() => {
                    if (selectProducto) {
                        for (let i = 0; i < selectProducto.options.length; i++) {
                            if (selectProducto.options[i].value == productoPorCodigo.id) {
                                selectProducto.selectedIndex = i;
                                selectProducto.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                const cantidadInput = document.getElementById('cantidadProducto');
                                if (cantidadInput) {
                                    setTimeout(() => cantidadInput.focus(), 100);
                                    setTimeout(() => cantidadInput.select(), 150);
                                }
                                mostrarToast(`Producto encontrado: ${productoPorCodigo.nombre}`, 'info');
                                break;
                            }
                        }
                    }
                }, 100);
                return;
            }

            // Filtrar por nombre (también busca coincidencias parciales en código de barras)
            cargarSelectProductos(valor);
        });

        // Enter = agregar directamente si es código de barras exacto
        buscarInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const valor = buscarInput.value.trim();
                if (valor === '') return;

                const productoPorCodigo = productosGlobal.find(p =>
                    p.codigo_barras === valor && p.estado === 1
                );

                if (productoPorCodigo) {
                    agregarProductoDirecto(
                        productoPorCodigo.id,
                        productoPorCodigo.nombre,
                        parseFloat(productoPorCodigo.precio) || 0,
                        parseFloat(productoPorCodigo.stock) || 0
                    );
                    buscarInput.value = '';
                    buscarInput.focus();
                }
            }
        });
    }

    // Select de producto
    if (selectProducto) {
        selectProducto.addEventListener('change', () => {
            const selectedOption = selectProducto.options[selectProducto.selectedIndex];
            if (!selectedOption || !selectedOption.value) return;

            const precio = parseFloat(selectedOption.dataset.precio) || 0;
            const stock = selectedOption.dataset.stock;
            const unidad = selectedOption.dataset.unidad;

            safeSetValue('precioUnitario', precio.toFixed(2));
            safeSetValue('stockDisponible', stock ? `${stock} ${unidad || ''}` : '');
            
            const cantidadProducto = document.getElementById('cantidadProducto');
            if (cantidadProducto) {
                cantidadProducto.value = '1';
                cantidadProducto.focus();
                cantidadProducto.select();
            }
        });
    }

    // Botón Agregar a la lista
    if (btnAgregarLista) {
        btnAgregarLista.addEventListener('click', () => {
            const productoId = selectProducto?.value;
            if (!productoId) {
                mostrarToast('Seleccione un producto o escanee/busque por código de barras', 'warning');
                return;
            }

            const selectedOption = selectProducto.options[selectProducto.selectedIndex];
            const productoNombre = selectedOption?.text?.split(' -')[0] || '';
            const precio = parseFloat(document.getElementById('precioUnitario')?.value) || 0;
            const cantidad = parseInt(document.getElementById('cantidadProducto')?.value) || 0;

            if (cantidad <= 0) {
                mostrarToast('La cantidad debe ser mayor a 0', 'warning');
                return;
            }

            agregarProductoDirecto(parseInt(productoId), productoNombre, precio, 9999, cantidad);

            // Limpiar selección
            if (selectProducto) selectProducto.value = '';
            if (buscarInput) buscarInput.value = '';
            safeSetValue('cantidadProducto', '1');
            safeSetValue('precioUnitario', '');
            safeSetValue('stockDisponible', '');
            cargarSelectProductos('');
            if (buscarInput) buscarInput.focus();
        });
    }
}

// ============================================
// VALIDACIONES DE INPUTS NUMÉRICOS
// ============================================
function setupValidacionesInputs() {
    const cantidadProducto = document.getElementById('cantidadProducto');
    if (cantidadProducto) {
        cantidadProducto.addEventListener('input', function() {
            let valor = this.value;
            if (valor === '') return;
            valor = valor.replace(/[^0-9]/g, '');
            if (valor === '') { this.value = ''; return; }
            let numero = parseInt(valor);
            if (numero < 1) { this.value = '1'; return; }
            if (numero > 9999) { numero = 9999; mostrarToast('La cantidad máxima es 9999', 'warning'); }
            this.value = numero;
        });
        cantidadProducto.addEventListener('blur', function() {
            if (this.value === '' || parseInt(this.value) < 1) this.value = '1';
        });
    }

    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('cantidad-cot')) {
            let valor = e.target.value;
            if (valor === '') return;
            valor = valor.replace(/[^0-9]/g, '');
            if (valor === '') { e.target.value = ''; return; }
            let numero = parseInt(valor);
            if (numero < 1) { e.target.value = '1'; return; }
            if (numero > 9999) { numero = 9999; mostrarToast('La cantidad máxima es 9999', 'warning'); }
            e.target.value = numero;
            const idx = parseInt(e.target.dataset.idx);
            if (!isNaN(idx) && productosSeleccionados[idx]) {
                productosSeleccionados[idx].cantidad = numero;
            }
        }
    });

    document.addEventListener('blur', function(e) {
        if (e.target.classList.contains('cantidad-cot')) {
            if (e.target.value === '' || parseInt(e.target.value) < 1) {
                e.target.value = '1';
                const idx = parseInt(e.target.dataset.idx);
                if (!isNaN(idx) && productosSeleccionados[idx]) {
                    productosSeleccionados[idx].cantidad = 1;
                }
                actualizarTablaProductos();
            }
        }
    }, true);
}

// ============================================
// GUARDAR COTIZACIÓN
// ============================================
function setupGuardarCotizacion() {
    const btnGuardar = getElement('btnGuardarCotizacion');
    if (!btnGuardar) return;

    btnGuardar.onclick = async () => {
        const id = getElement('cotizacionId')?.value;
        let id_cliente = document.getElementById('id_cliente')?.value;
        const tipo_documento = document.getElementById('tipo_documento_cliente')?.value;
        const numero_documento = document.getElementById('numero_documento_cliente')?.value.trim();
        const nombre_cliente = document.getElementById('nombre_cliente')?.value.trim();
        const apellido_cliente = document.getElementById('apellido_cliente')?.value.trim();
        const telefono_cliente = document.getElementById('telefono_cliente')?.value.trim();
        const correo_cliente = document.getElementById('correo_cliente')?.value.trim();
        const fecha_vencimiento = getElement('fecha_vencimiento')?.value;
        const observacion = getElement('observacion')?.value;

        if (!numero_documento) { mostrarToast('Ingrese el número de documento del cliente', 'warning'); return; }
        if (!tipo_documento) { mostrarToast('Seleccione el tipo de documento', 'warning'); return; }

        if (!id_cliente) {
            try {
                if (!nombre_cliente) { mostrarToast('Debe buscar los datos del cliente primero', 'warning'); return; }
                const nuevoCliente = { tipo_documento, numero_documento, nombre: nombre_cliente || 'Cliente', apellido: apellido_cliente || '', telefono: telefono_cliente || '', correo: correo_cliente || '' };
                const registerResponse = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoCliente) });
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

        if (!fecha_vencimiento) { mostrarToast('La fecha de vencimiento es obligatoria', 'warning'); return; }
        if (productosSeleccionados.length === 0) { mostrarToast('Agregue al menos un producto a la cotización', 'warning'); return; }

        try {
            const response = await fetch(id ? `/api/cotizaciones/${id}` : '/api/cotizaciones', {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_cliente: parseInt(id_cliente), fecha_vencimiento, observacion, productos: productosSeleccionados })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            await cargarCotizaciones();
            mostrarToast(id ? 'Cotización actualizada correctamente' : 'Cotización registrada correctamente', id ? 'warning' : 'success');
            const modal = bootstrap.Modal.getInstance(getElement('modalCotizacion'));
            if (modal) { modal.hide(); limpiarBackdrops(); }
            limpiarFormulario();
        } catch (error) {
            mostrarToast(error.message, 'danger');
        }
    };
}

// ============================================
// VER DETALLE DE COTIZACIÓN
// ============================================
async function verDetalleCotizacion(id) {
    try {
        const response = await fetch(`/api/cotizaciones/${id}`);
        if (!response.ok) throw new Error('Error al obtener detalles');
        const cot = await response.json();
        limpiarBackdrops();

        safeSetText('detalleNumeroCotizacion', cot.numero_cotizacion);
        safeSetText('detalleVendedor', cot.vendedor);
        safeSetText('detalleFecha', formatearFecha(cot.fecha));
        safeSetText('detalleVencimiento', formatearFecha(cot.fecha_vencimiento));
        safeSetText('detalleObservacion', cot.observacion || 'Sin observaciones');

        const estadoBadge = document.getElementById('detalleEstadoBadge');
        if (estadoBadge) {
            const estados = {
                1: { text: 'ACTIVO', class: 'badge bg-success px-3 py-2 rounded-pill' },
                0: { text: 'INACTIVO', class: 'badge bg-warning text-dark px-3 py-2 rounded-pill' },
                3: { text: 'PROCESADO', class: 'badge bg-info px-3 py-2 rounded-pill' }
            };
            const est = estados[cot.estado] || { text: 'ELIMINADO', class: 'badge bg-danger px-3 py-2 rounded-pill' };
            estadoBadge.textContent = est.text;
            estadoBadge.className = est.class;
        }

        if (cot.cliente) {
            safeSetText('detalleClienteNombre', cot.cliente);
            safeSetText('detalleClienteDoc', cot.numero_documento || '-');
        }

        const tbody = document.getElementById('detalleTablaProductosCot');
        if (tbody) {
            tbody.innerHTML = '';
            let subtotalSin = 0, descTotal = 0;
            if (cot.detalles && cot.detalles.length > 0) {
                cot.detalles.forEach((det, idx) => {
                    const precioOriginal = parseFloat(det.precio_original) || 0;
                    const cantidad = parseInt(det.cantidad) || 0;
                    const subtotal = (precioOriginal * cantidad) - parseFloat(det.descuento || 0);
                    subtotalSin += precioOriginal * cantidad;
                    descTotal += parseFloat(det.descuento || 0);
                    tbody.innerHTML += `<tr><td class="text-center">${idx + 1}</td><td><strong>${det.producto_nombre || '-'}</strong></td><td class="text-end">S/ ${precioOriginal.toFixed(2)}</td><td class="text-center">${cantidad}</td><td class="text-end fw-bold">S/ ${subtotal.toFixed(2)}</td><td class="text-end pe-3">${parseFloat(det.descuento || 0) > 0 ? `<span class="text-danger">-S/ ${parseFloat(det.descuento).toFixed(2)}</span>` : '<span class="text-muted">-</span>'}</td></tr>`;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay productos registrados</td></tr>';
            }
            safeSetHtml('detalleSubtotalSinDescuento', `S/ ${subtotalSin.toFixed(2)}`);
            safeSetHtml('detalleDescuentoTotal', descTotal > 0 ? `- S/ ${descTotal.toFixed(2)}` : '- S/ 0.00');
            safeSetHtml('detalleTotal', `S/ ${parseFloat(cot.total).toFixed(2)}`);
        }

        new bootstrap.Modal(document.getElementById('modalDetalleCotizacion')).show();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar detalles', 'danger');
    }
}

// ============================================
// EVENTOS GLOBALES
// ============================================
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;

        const btnVer = e.target.closest('.btnVerCotizacion');
        if (btnVer) { verDetalleCotizacion(parseInt(btnVer.dataset.id)); return; }

        const btnEditar = e.target.closest('.btnEditarCotizacion');
        if (btnEditar) {
            const id = parseInt(btnEditar.dataset.id);
            const cot = cotizacionesGlobal.find(c => c.id === id);
            if (cot) {
                try {
                    const response = await fetch(`/api/cotizaciones/${id}`);
                    const cotFull = await response.json();
                    safeSetValue('cotizacionId', cotFull.id);
                    safeSetText('tituloModalCotizacion', 'Editar Cotización');
                    if (cotFull.id_cliente) {
                        safeSetValue('id_cliente', cotFull.id_cliente);
                        safeSetValue('nombre_cliente', cotFull.cliente || '');
                    }
                    safeSetValue('fecha_vencimiento', cotFull.fecha_vencimiento);
                    safeSetValue('observacion', cotFull.observacion || '');
                    productosSeleccionados = [];
                    if (cotFull.detalles) {
                        cotFull.detalles.forEach(det => {
                            productosSeleccionados.push({
                                id_producto: det.id_producto, producto_nombre: det.producto_nombre,
                                precio_original: parseFloat(det.precio_original),
                                precio_final: parseFloat(det.precio_final || det.precio_original),
                                cantidad: parseInt(det.cantidad), descuento: parseFloat(det.descuento || 0)
                            });
                        });
                    }
                    actualizarTablaProductos();
                    new bootstrap.Modal(getElement('modalCotizacion')).show();
                } catch (error) { mostrarToast('Error al cargar cotización', 'danger'); }
            }
            return;
        }

        const btnEliminar = e.target.closest('.btnEliminarCotizacion');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional('Eliminar Cotización', '¿Desea eliminar esta cotización?', async () => {
                try {
                    const response = await fetch(`/api/cotizaciones/${id}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 2 }) });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    await cargarCotizaciones();
                    mostrarToast('Cotización eliminada', 'danger');
                } catch (error) { mostrarToast(error.message, 'danger'); }
            }, 'danger');
            return;
        }
    });
}

// ============================================
// NUEVA COTIZACIÓN
// ============================================
function setupNuevaCotizacion() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalCotizacion"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => limpiarFormulario());
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
export async function init() {
    if (!isCurrentPage()) return;
    if (eventosInicializados) {
        await cargarCotizaciones(); await cargarProductos(); await cargarClientes();
        return;
    }
    eventosInicializados = true;
    setupEventListeners();
    setupGuardarCotizacion();
    setupNuevaCotizacion();
    setupAgregarProducto();
    setupBusquedaCliente();
    setupValidacionesInputs();
    setupValidacionFechaVencimiento();

    const buscarInput = getElement('buscarCotizacion');
    const filtroCantidad = getElement('filtroCantidad');
    const filtroEstado = getElement('filtroEstado');
    if (buscarInput) buscarInput.addEventListener('input', () => aplicarFiltros());
    if (filtroCantidad) filtroCantidad.addEventListener('change', () => aplicarFiltros());
    if (filtroEstado) filtroEstado.addEventListener('change', () => aplicarFiltros());

    await cargarProductos();
    await cargarClientes();
    await cargarCotizaciones();
}

export function destroy() {
    eventosInicializados = false;
    elementos = {};
    cotizacionesGlobal = [];
    productosGlobal = [];
    clientesGlobal = [];
    productosSeleccionados = [];
    totalCotizacion = 0;
    clientePendiente = null;
}