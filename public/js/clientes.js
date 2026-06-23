import { mostrarToast, limpiarBackdrops, mostrarModalConfirmacionProfesional } from './helpers.js';

// ==================== CONSTANTES ====================
const PERFIL_ADMIN_ID = 1;

let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};

// ==================== VALIDACIONES ====================
function soloNumeros(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > 11) {
        input.value = input.value.slice(0, 11);
    }
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


// ==================== RENDERIZAR BOTONES DE ACCIÓN ====================
function renderizarBotonesAccion() {
    const contenedor = document.getElementById('botonesAccionClientes');
    if (!contenedor) return;
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    
    if (!esAdminSesion) {
        // Usuario no admin - OCULTAR botón
        contenedor.innerHTML = '';
    } else {
        // Usuario admin - mostrar botón
        contenedor.innerHTML = `
            <button class="btn btn-primary" id="btnNuevoClientePrincipal">
                <i class="bi bi-plus-circle"></i> Nuevo Cliente
            </button>
        `;
        
        const nuevoBtn = document.getElementById('btnNuevoClientePrincipal');
        if (nuevoBtn) {
            nuevoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                limpiarFormulario();
                
                const modalElement = getElement('modalCliente');
                if (modalElement) {
                    const existingModal = bootstrap.Modal.getInstance(modalElement);
                    if (existingModal) {
                        existingModal.dispose();
                    }
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                }
            });
        }
    }
}


// ==================== FUNCIONES DE UTILIDAD ====================
function isCurrentPage() {
    return document.getElementById('tablaClientes') !== null;
}

function getElement(id) {
    if (!elementos[id]) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}

// ==================== LIMPIAR FORMULARIO (NUEVO CLIENTE) ====================
function limpiarFormulario() {
    const form = getElement('formCliente');
    if (form) form.reset();
    
    const clienteId = getElement('clienteId');
    if (clienteId) clienteId.value = '';
    
    const tituloModal = getElement('tituloModalCliente');
    if (tituloModal) tituloModal.textContent = 'Nuevo Cliente';
    
    const btnGuardar = getElement('btnGuardarCliente');
    if (btnGuardar) {
        btnGuardar.textContent = 'Guardar Cliente';
        btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
        btnGuardar.style.border = 'none';
    }
    
    // ==========================================
    // ESTADO PARA NUEVO CLIENTE
    // ==========================================
    
    // 1. HABILITAR select tipo_documento (fondo blanco, cursor pointer)
    const selectTipo = getElement('tipo_documento');
    if (selectTipo) {
        selectTipo.disabled = false;
        selectTipo.classList.remove('bg-light');
        selectTipo.style.backgroundColor = 'white';
        selectTipo.style.cursor = 'pointer';
        selectTipo.value = '';
    }
    
    // 2. HABILITAR campo número_documento (fondo blanco)
    const numeroDoc = getElement('numero_documento');
    if (numeroDoc) {
        numeroDoc.disabled = false;
        numeroDoc.readOnly = false;
        numeroDoc.classList.remove('bg-light');
        numeroDoc.style.backgroundColor = 'white';
        numeroDoc.style.cursor = 'text';
        numeroDoc.value = '';
    }
    
    // 3. HABILITAR botón buscar
    const btnBuscar = document.getElementById('btnBuscarCliente');
    if (btnBuscar) {
        btnBuscar.disabled = false;
        btnBuscar.style.opacity = '1';
        btnBuscar.style.cursor = 'pointer';
    }
    
    // 4. DESHABILITAR nombre (fondo gris, cursor not-allowed)
    const nombre = getElement('nombre');
    if (nombre) {
        nombre.disabled = true;
        nombre.readOnly = true;
        nombre.classList.add('bg-light');
        nombre.style.backgroundColor = '#e9ecef';
        nombre.style.cursor = 'not-allowed';
        nombre.value = '';
    }
    
    // 5. DESHABILITAR apellido (fondo gris, cursor not-allowed)
    const apellido = getElement('apellido');
    if (apellido) {
        apellido.disabled = true;
        apellido.readOnly = true;
        apellido.classList.add('bg-light');
        apellido.style.backgroundColor = '#e9ecef';
        apellido.style.cursor = 'not-allowed';
        apellido.value = '';
    }
    
    // 6. HABILITAR teléfono (fondo blanco)
    const telefono = getElement('telefono');
    if (telefono) {
        telefono.disabled = false;
        telefono.readOnly = false;
        telefono.classList.remove('bg-light');
        telefono.style.backgroundColor = 'white';
        telefono.style.cursor = 'text';
        telefono.value = '';
    }
    
    // 7. HABILITAR correo (fondo blanco)
    const correo = getElement('correo');
    if (correo) {
        correo.disabled = false;
        correo.readOnly = false;
        correo.classList.remove('bg-light');
        correo.style.backgroundColor = 'white';
        correo.style.cursor = 'text';
        correo.value = '';
    }
}


// ==================== RENDERIZADO TABLA ====================
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarCliente');
    const filtroCantidad = getElement('filtroCantidadClientes');
    
    if (!buscarInput || !filtroCantidad) return;
    
    const textoBusqueda = buscarInput.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad.value || 5);
    
    const clientesFiltrados = clientesGlobal
        .filter(cliente => cliente.estado !== 2)
        .filter(cliente =>
            cliente.nombre.toLowerCase().includes(textoBusqueda) ||
            (cliente.apellido && cliente.apellido.toLowerCase().includes(textoBusqueda)) ||
            cliente.numero_documento.includes(textoBusqueda)
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, cantidadMostrar);
    
    renderizar(clientesFiltrados);
}


// Renderizar
function renderizar(clientes) {
    const tabla = getElement('tablaClientes');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (clientes.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay clientes registrados</td></tr>`;
        return;
    }
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    
    // ==========================================
    // DETERMINAR SI HAY ALGÚN BOTÓN VISIBLE
    // ==========================================
    let hayBotonesVisibles = false;
    
    clientes.forEach(cliente => {
        const editarVisible = esAdminSesion;
        const desactivarVisible = esAdminSesion;
        const activarVisible = esAdminSesion;
        const eliminarVisible = esAdminSesion;
        
        if (editarVisible || desactivarVisible || activarVisible || eliminarVisible) {
            hayBotonesVisibles = true;
        }
    });
    
    // ==========================================
    // RENDERIZAR FILAS
    // ==========================================
    clientes.forEach(cliente => {
        // Lógica para OCULTAR botones
        const editarVisible = esAdminSesion;
        const desactivarVisible = esAdminSesion;
        const activarVisible = esAdminSesion;
        const eliminarVisible = esAdminSesion;
        
        // Construir columna de acciones
        let accionesHtml = '';
        
        if (editarVisible) {
            accionesHtml += `
                <button class="btn btn-sm btn-warning btnEditarCliente" data-id="${cliente.id}">
                    <i class="bi bi-pencil-square"></i>
                </button>
            `;
        }
        
        if (cliente.estado === 1) {
            if (desactivarVisible) {
                accionesHtml += `
                    <button class="btn btn-sm btn-secondary btnDesactivarCliente" data-id="${cliente.id}">
                        <i class="bi bi-slash-circle"></i>
                    </button>
                `;
            }
        } else {
            if (activarVisible) {
                accionesHtml += `
                    <button class="btn btn-sm btn-success btnActivarCliente" data-id="${cliente.id}">
                        <i class="bi bi-check-circle"></i>
                    </button>
                `;
            }
        }
        
        if (eliminarVisible) {
            accionesHtml += `
                <button class="btn btn-sm btn-danger btnEliminarCliente" data-id="${cliente.id}">
                    <i class="bi bi-trash"></i>
                </button>
            `;
        }
        
        // Si no hay botones visibles, mostrar mensaje
        if (!accionesHtml) {
            accionesHtml = `<span class="text-muted small">Sin acciones</span>`;
        }
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${cliente.id}</td>
                <td class="text-center">${cliente.tipo_documento}</td>
                <td class="text-center">${cliente.numero_documento}</td>
                <td class="text-start">${cliente.nombre} ${cliente.apellido || ''}</td>
                <td class="text-center">${cliente.telefono || '-'}</td>
                <td class="text-start">${cliente.correo || '-'}</td>
                <td class="text-center">
                    ${cliente.estado === 1 
                        ? '<span class="badge bg-success">Activo</span>'
                        : '<span class="badge bg-secondary">Inactivo</span>'
                    }
                </td>
                <td class="text-center">${accionesHtml}</td>
            </tr>
        `;
    });
    
    // ==========================================
    // OCULTAR COLUMNA DE ACCIONES SI NO HAY BOTONES
    // ==========================================
    const table = tabla.closest('table');
    if (table) {
        const thead = table.querySelector('thead tr');
        const allRows = table.querySelectorAll('tbody tr');
        
        if (!hayBotonesVisibles) {
            // Ocultar la columna de acciones (índice 7)
            if (thead) {
                const ths = thead.querySelectorAll('th');
                if (ths.length > 7) {
                    ths[7].style.display = 'none';
                }
            }
            allRows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length > 7) {
                    tds[7].style.display = 'none';
                }
            });
        } else {
            // Mostrar la columna de acciones
            if (thead) {
                const ths = thead.querySelectorAll('th');
                if (ths.length > 7) {
                    ths[7].style.display = '';
                }
            }
            allRows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length > 7) {
                    tds[7].style.display = '';
                }
            });
        }
    }
}


// ==================== CARGAR DATOS ====================
async function cargarClientes() {
    if (!isCurrentPage()) return;
    
    try {
        const response = await fetch('/api/clientes');
        if (!response.ok) throw new Error('Error al cargar clientes');
        
        clientesGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar clientes', 'danger');
    }
}

// ==================== CAMBIAR ESTADO ====================
async function cambiarEstado(id, estado, mensajeExito, tipoToast) {
    try {
        const response = await fetch(`/api/clientes/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        await cargarClientes();
        mostrarToast(mensajeExito, tipoToast);
        
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}

// ==================== BÚSQUEDA API (SUNAT) ====================
function setupBusquedaDocumento() {
    const btnBuscar = document.getElementById('btnBuscarCliente');
    const inputDoc = document.getElementById('numero_documento');
    
    if (!btnBuscar) return;

    btnBuscar.addEventListener('click', async () => {
        const tipo = getElement('tipo_documento').value;
        const numero = getElement('numero_documento').value.trim();
        
        if (!tipo) {
            mostrarToast('Seleccione el tipo de documento primero', 'warning');
            return;
        }
        
        if (!numero) {
            mostrarToast('Ingrese un número de documento', 'warning');
            inputDoc.classList.add('is-invalid');
            return;
        }
        
        if (tipo === 'DNI' && !/^\d{8}$/.test(numero)) {
            mostrarToast('El DNI debe tener 8 dígitos', 'warning');
            inputDoc.classList.add('is-invalid');
            return;
        }
        
        if (tipo === 'RUC' && !/^\d{11}$/.test(numero)) {
            mostrarToast('El RUC debe tener 11 dígitos', 'warning');
            inputDoc.classList.add('is-invalid');
            return;
        }
        
        inputDoc.classList.remove('is-invalid');
        
        const originalIcon = btnBuscar.innerHTML;
        btnBuscar.disabled = true;
        btnBuscar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
            const response = await fetch(`/api/clientes/consultar-documento?numero=${numero}&tipo=${tipo}`);
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Documento no encontrado');
            
            // CARGAR Y BLOQUEAR NOMBRE
            const nombreInput = getElement('nombre');
            if (nombreInput) {
                nombreInput.value = data.cliente.nombre || '';
                nombreInput.disabled = true;
                nombreInput.readOnly = true;
                nombreInput.classList.add('bg-light');
                nombreInput.style.backgroundColor = '#e9ecef';
                nombreInput.style.cursor = 'not-allowed';
            }
            
            // CARGAR Y BLOQUEAR APELLIDO
            const apellidoInput = getElement('apellido');
            if (apellidoInput) {
                apellidoInput.value = data.cliente.apellido || '';
                apellidoInput.disabled = true;
                apellidoInput.readOnly = true;
                apellidoInput.classList.add('bg-light');
                apellidoInput.style.backgroundColor = '#e9ecef';
                apellidoInput.style.cursor = 'not-allowed';
            }
            
            // BLOQUEAR select tipo_documento
            const selectTipo = getElement('tipo_documento');
            if (selectTipo) {
                selectTipo.disabled = true;
                selectTipo.classList.add('bg-light');
                selectTipo.style.backgroundColor = '#e9ecef';
                selectTipo.style.cursor = 'not-allowed';
            }
            
            // BLOQUEAR campo número_documento
            const numeroDoc = getElement('numero_documento');
            if (numeroDoc) {
                numeroDoc.disabled = true;
                numeroDoc.readOnly = true;
                numeroDoc.classList.add('bg-light');
                numeroDoc.style.backgroundColor = '#e9ecef';
                numeroDoc.style.cursor = 'not-allowed';
            }
            
            // HABILITAR teléfono y correo
            const telefonoInput = getElement('telefono');
            if (telefonoInput) {
                telefonoInput.disabled = false;
                telefonoInput.readOnly = false;
                telefonoInput.classList.remove('bg-light');
                telefonoInput.style.backgroundColor = 'white';
                if (data.cliente.telefono) telefonoInput.value = data.cliente.telefono;
                else telefonoInput.value = '';
            }
            
            const correoInput = getElement('correo');
            if (correoInput) {
                correoInput.disabled = false;
                correoInput.readOnly = false;
                correoInput.classList.remove('bg-light');
                correoInput.style.backgroundColor = 'white';
                if (data.cliente.correo) correoInput.value = data.cliente.correo;
                else correoInput.value = '';
            }
            
            if (data.encontrado) {
                mostrarToast('Este cliente ya existe en la base de datos.', 'info');
            } else {
                mostrarToast('Datos cargados desde SUNAT', 'success');
            }
            
            getElement('telefono')?.focus();
            
            inputDoc.classList.add('input-success-animation');
            setTimeout(() => {
                inputDoc.classList.remove('input-success-animation');
            }, 1500);
            
        } catch (error) {
            console.error('Error en búsqueda:', error);
            mostrarToast(error.message || 'Documento no encontrado', 'danger');
            inputDoc.classList.add('is-invalid');
        } finally {
            btnBuscar.disabled = false;
            btnBuscar.innerHTML = originalIcon;
        }
    });
    
    if (inputDoc) {
        inputDoc.addEventListener('input', () => {
            inputDoc.classList.remove('is-invalid');
            inputDoc.classList.remove('input-success-animation');
        });
    }
}

// ==================== GUARDAR CLIENTE ====================
function setupGuardarCliente() {
    const btnGuardar = getElement('btnGuardarCliente');
    if (!btnGuardar) return;
    
    const newBtn = btnGuardar.cloneNode(true);
    btnGuardar.parentNode.replaceChild(newBtn, btnGuardar);
    
    newBtn.onclick = async () => {
        const id = getElement('clienteId')?.value;
        const tipo_documento = getElement('tipo_documento')?.value;
        const numero_documento = getElement('numero_documento')?.value.trim();
        const nombre = getElement('nombre')?.value.trim();
        const apellido = getElement('apellido')?.value.trim();
        const telefono = getElement('telefono')?.value.trim();
        const correo = getElement('correo')?.value.trim();
        
        if (!tipo_documento || !numero_documento || !nombre) {
            mostrarToast('Debe buscar un documento válido en SUNAT primero', 'warning');
            return;
        }
        
        const inputNombre = getElement('nombre');
        if (!inputNombre.readOnly && !id) {
            mostrarToast('Los datos del cliente deben venir de SUNAT. Use el botón de búsqueda.', 'warning');
            return;
        }
        
        const validDoc = validarDocumento(tipo_documento, numero_documento);
        if (!validDoc.valido) {
            mostrarToast(validDoc.mensaje, 'warning');
            return;
        }
        
        const validTel = validarTelefono(telefono);
        if (!validTel.valido) {
            mostrarToast(validTel.mensaje, 'warning');
            return;
        }
        
        const validCorreo = validarCorreo(correo);
        if (!validCorreo.valido) {
            mostrarToast(validCorreo.mensaje, 'warning');
            return;
        }
        
        try {
            const response = await fetch(
                id ? `/api/clientes/${id}` : '/api/clientes',
                {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tipo_documento, numero_documento, nombre, apellido, telefono, correo })
                }
            );
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            await cargarClientes();
            mostrarToast(id ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente', id ? 'warning' : 'success');
            
            const modal = bootstrap.Modal.getInstance(getElement('modalCliente'));
            if (modal) {
                modal.hide();
                limpiarBackdrops();
            }
            limpiarFormulario();
            
        } catch (error) {
            mostrarToast(error.message, 'danger');
        }
    };
    
    elementos['btnGuardarCliente'] = newBtn;
}

// ==================== EDITAR CLIENTE ====================
function setupEditarCliente() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const btnEditar = e.target.closest('.btnEditarCliente');
        if (!btnEditar) return;
        if (btnEditar.disabled) return;
        
        const id = parseInt(btnEditar.dataset.id);
        const cliente = clientesGlobal.find(c => c.id === id);
        
        if (cliente) {
            // LIMPIAR FORMULARIO PRIMERO
            limpiarFormulario();
            
            // CARGAR DATOS DEL CLIENTE
            getElement('clienteId').value = cliente.id;
            getElement('tipo_documento').value = cliente.tipo_documento;
            getElement('numero_documento').value = cliente.numero_documento;
            getElement('nombre').value = cliente.nombre;
            getElement('apellido').value = cliente.apellido || '';
            getElement('telefono').value = cliente.telefono || '';
            getElement('correo').value = cliente.correo || '';
            getElement('tituloModalCliente').textContent = 'Editar Cliente';
            
            const btnGuardar = getElement('btnGuardarCliente');
            btnGuardar.textContent = 'Actualizar Cliente';
            btnGuardar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            btnGuardar.style.border = 'none';
            
            // ==========================================
            // DESHABILITAR TODO EN EDICIÓN (excepto teléfono y correo)
            // ==========================================
            
            // Select tipo_documento
            const selectTipo = getElement('tipo_documento');
            if (selectTipo) {
                selectTipo.disabled = true;
                selectTipo.classList.add('bg-light');
                selectTipo.style.backgroundColor = '#e9ecef';
                selectTipo.style.cursor = 'not-allowed';
            }
            
            // Número documento
            const numeroDoc = getElement('numero_documento');
            if (numeroDoc) {
                numeroDoc.disabled = true;
                numeroDoc.readOnly = true;
                numeroDoc.classList.add('bg-light');
                numeroDoc.style.backgroundColor = '#e9ecef';
                numeroDoc.style.cursor = 'not-allowed';
            }
            
            // Botón buscar
            const btnBuscar = document.getElementById('btnBuscarCliente');
            if (btnBuscar) {
                btnBuscar.disabled = true;
                btnBuscar.style.opacity = '0.6';
                btnBuscar.style.cursor = 'not-allowed';
            }
            
            // Nombre
            const nombre = getElement('nombre');
            if (nombre) {
                nombre.disabled = true;
                nombre.readOnly = true;
                nombre.classList.add('bg-light');
                nombre.style.backgroundColor = '#e9ecef';
                nombre.style.cursor = 'not-allowed';
            }
            
            // Apellido
            const apellido = getElement('apellido');
            if (apellido) {
                apellido.disabled = true;
                apellido.readOnly = true;
                apellido.classList.add('bg-light');
                apellido.style.backgroundColor = '#e9ecef';
                apellido.style.cursor = 'not-allowed';
            }
            
            // TELÉFONO - HABILITADO
            const telefono = getElement('telefono');
            if (telefono) {
                telefono.disabled = false;
                telefono.readOnly = false;
                telefono.classList.remove('bg-light');
                telefono.style.backgroundColor = 'white';
                telefono.style.cursor = 'text';
            }
            
            // CORREO - HABILITADO
            const correo = getElement('correo');
            if (correo) {
                correo.disabled = false;
                correo.readOnly = false;
                correo.classList.remove('bg-light');
                correo.style.backgroundColor = 'white';
                correo.style.cursor = 'text';
            }
            
            // ELIMINAR INSTANCIA ANTERIOR DEL MODAL
            const modalElement = getElement('modalCliente');
            if (modalElement) {
                const existingModal = bootstrap.Modal.getInstance(modalElement);
                if (existingModal) {
                    existingModal.dispose();
                }
            }
            
            // ABRIR MODAL NUEVO
            const modalElementFresh = getElement('modalCliente');
            if (modalElementFresh) {
                const modal = new bootstrap.Modal(modalElementFresh);
                modal.show();
                
                // AL CERRAR EL MODAL, FORZAR LIMPIEZA
                modalElementFresh.addEventListener('hidden.bs.modal', function onHidden() {
                    modalElementFresh.removeEventListener('hidden.bs.modal', onHidden);
                    limpiarFormulario();
                }, { once: true });
            }
        }
    });
}


// ==================== EVENTOS DE ACCIONES ====================
function setupEventosAcciones() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
        const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
        
        const btnDesactivar = e.target.closest('.btnDesactivarCliente');
        if (btnDesactivar) {
            if (btnDesactivar.disabled) return;
            if (!esAdminSesion) return;
            
            const id = parseInt(btnDesactivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Desactivar Cliente',
                '¿Desea desactivar este cliente?',
                () => cambiarEstado(id, 0, 'Cliente desactivado', 'warning'),
                'warning',
                'Desactivar'
            );
            return;
        }
        
        const btnActivar = e.target.closest('.btnActivarCliente');
        if (btnActivar) {
            if (btnActivar.disabled) return;
            if (!esAdminSesion) return;
            
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Cliente',
                '¿Desea activar este cliente?',
                () => cambiarEstado(id, 1, 'Cliente activado', 'success'),
                'success',
                'Activar'
            );
            return;
        }
        
        const btnEliminar = e.target.closest('.btnEliminarCliente');
        if (btnEliminar) {
            if (btnEliminar.disabled) return;
            if (!esAdminSesion) return;
            
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Eliminar Cliente',
                '¿Desea eliminar este cliente?',
                () => cambiarEstado(id, 2, 'Cliente eliminado', 'danger'),
                'danger',
                'Eliminar'
            );
            return;
        }
    });
}

// ==================== INICIALIZACIÓN DE COMPONENTES ====================
function setupBuscador() {
    const inputBuscar = getElement('buscarCliente');
    if (!inputBuscar) return;
    
    const newInput = inputBuscar.cloneNode(true);
    inputBuscar.parentNode.replaceChild(newInput, inputBuscar);
    newInput.addEventListener('input', () => aplicarFiltros());
    elementos['buscarCliente'] = newInput;
}

function setupFiltroCantidad() {
    const filtro = getElement('filtroCantidadClientes');
    if (!filtro) return;
    
    const newFiltro = filtro.cloneNode(true);
    filtro.parentNode.replaceChild(newFiltro, filtro);
    newFiltro.addEventListener('change', () => aplicarFiltros());
    elementos['filtroCantidadClientes'] = newFiltro;
}

function setupValidacionesTiempoReal() {
    const tipoDocumento = getElement('tipo_documento');
    const numeroDocumento = getElement('numero_documento');
    const telefono = getElement('telefono');
    const nombre = getElement('nombre');
    const apellido = getElement('apellido');
    
    if (tipoDocumento) {
        tipoDocumento.addEventListener('change', () => {
            if (numeroDocumento) {
                numeroDocumento.value = '';
                numeroDocumento.maxLength = tipoDocumento.value === 'DNI' ? 8 : 11;
                numeroDocumento.oninput = () => soloNumeros(numeroDocumento);
            }
        });
    }
    
    if (telefono) telefono.oninput = () => soloNumeros(telefono);
    if (nombre) nombre.oninput = () => soloLetrasYEspacios(nombre);
    if (apellido) apellido.oninput = () => soloLetrasYEspacios(apellido);
}

// ==================== INICIALIZACIÓN PRINCIPAL ====================
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarClientes();
        renderizarBotonesAccion();
        return;
    }
    
    eventosInicializados = true;
    
    setupEventosAcciones();
    setupEditarCliente();
    setupGuardarCliente();
    setupBuscador();
    setupFiltroCantidad();
    setupValidacionesTiempoReal();
    setupBusquedaDocumento();
    
    await cargarClientes();
    renderizarBotonesAccion();
    
    console.log('Módulo Clientes inicializado');
}

export function destroy() {
    eventosInicializados = false;
    elementos = {};
    clientesGlobal = [];
}


