import { mostrarToast, limpiarBackdrops, prepararModal, cerrarModal, mostrarModalConfirmacionProfesional } from './helpers.js';


// ID del perfil Administrador
const PERFIL_ADMIN_ID = 1; 

// VARIABLES GLOBALES
let usuariosGlobal = [];
let eventosInicializados = false;
let elementos = {};


// VALIDACIÓN 
function validarSoloLetrasFrontend(event) {
    const regex = /^[a-zA-ZáéíóúñÁÉÍÓÚÑüÜ\s]*$/;
    const valor = event.target.value;
    if (!regex.test(valor)) {
        event.target.value = valor.slice(0, -1);
        mostrarToast('Solo se permiten letras y espacios', 'warning');
    }
}


// INICIALIZAR TOOLTIPS
function inicializarTooltips() {
    setTimeout(function() {
        const existingTooltips = document.querySelectorAll('.tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());
        
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            if (tooltipTriggerEl._tooltip) {
                tooltipTriggerEl._tooltip.dispose();
            }
            new bootstrap.Tooltip(tooltipTriggerEl, {
                placement: 'top',
                trigger: 'hover',
                delay: { show: 300, hide: 100 }
            });
        });
    }, 100);
}


// ==================== RENDERIZAR BOTONES DE ACCIÓN (DINÁMICOS) ====================
function renderizarBotonesAccion() {
    const contenedor = document.getElementById('botonesAccionUsuarios');
    if (!contenedor) return;
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    
    if (!esAdminSesion) {
        // Usuario no admin - botones deshabilitados con tooltip en span wrapper
        contenedor.innerHTML = `
            <span data-bs-toggle="tooltip" data-bs-title="Solo administradores pueden realizar acciones masivas">
                <button class="btn btn-outline-dark" 
                        data-bs-toggle="modal" 
                        data-bs-target="#modalAccionesMasivas" 
                        disabled
                        style="pointer-events: none;">
                    <i class="bi bi-people-fill me-2"></i> Acciones Masivas
                </button>
            </span>
            <span data-bs-toggle="tooltip" data-bs-title="Solo administradores pueden crear usuarios">
                <button class="btn btn-primary" 
                        data-bs-toggle="modal" 
                        data-bs-target="#modalUsuario" 
                        disabled
                        style="pointer-events: none;">
                    <i class="bi bi-plus-circle"></i> Nuevo Usuario
                </button>
            </span>
        `;
    } else {
        // Usuario admin - botones habilitados sin tooltip
        contenedor.innerHTML = `
            <button class="btn btn-outline-dark" 
                    data-bs-toggle="modal" 
                    data-bs-target="#modalAccionesMasivas">
                <i class="bi bi-people-fill me-2"></i> Acciones Masivas
            </button>
            <button class="btn btn-primary" 
                    data-bs-toggle="modal" 
                    data-bs-target="#modalUsuario">
                <i class="bi bi-plus-circle"></i> Nuevo Usuario
            </button>
        `;
    }
    
    inicializarTooltips();
}


// FUNCIONES DE UTILIDAD 
function isCurrentPage() {
    const tabla = document.getElementById('tablaUsuarios');
    return tabla !== null;
}

function getElement(id) {
    if (!elementos[id] || !document.body.contains(elementos[id])) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}

function limpiarAccionesMasivas() {
    const perfilSelect = getElement('perfilAccionMasiva');
    const accionSelect = getElement('accionMasiva');
    if (perfilSelect) perfilSelect.value = '';
    if (accionSelect) accionSelect.value = '';
}


// RENDERIZADO Y FILTRADO 
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarUsuario');
    const filtroCantidad = getElement('filtroCantidad');
    
    if (!buscarInput || !filtroCantidad) return;
    
    const textoBusqueda = buscarInput.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad.value || 5);
    
    const usuariosFiltrados = usuariosGlobal
        .filter(usuario => usuario.estado !== 2)
        .filter(usuario =>
            usuario.nombre.toLowerCase().includes(textoBusqueda) ||
            usuario.apellido.toLowerCase().includes(textoBusqueda) ||
            usuario.username.toLowerCase().includes(textoBusqueda)
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, cantidadMostrar);
    
    renderizar(usuariosFiltrados);
}


// Renderizar
function renderizar(usuarios) {
    const tabla = getElement('tablaUsuarios');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (usuarios.length === 0) {
        tabla.innerHTML = `<td><td colspan="8" class="text-center text-muted py-4">No hay usuarios registrados</td></tr>`;
        return;
    }
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    const usuarioLogueadoId = sesion?.usuario?.id;
    
    usuarios.forEach(usuario => {
        const esUsuarioLogueado = usuarioLogueadoId === usuario.id;
        const esAdminObjetivo = usuario.id_perfil === PERFIL_ADMIN_ID;
        
        // Lógica para deshabilitar botones
        const editarDeshabilitado = !esAdminSesion || esAdminObjetivo;
        const desactivarDeshabilitado = !esAdminSesion || esUsuarioLogueado || esAdminObjetivo;
        const activarDeshabilitado = !esAdminSesion || esAdminObjetivo;
        const eliminarDeshabilitado = !esAdminSesion || esUsuarioLogueado || esAdminObjetivo;
        
        // Textos para tooltips - EDITAR
        let tooltipEditar = '';
        if (!esAdminSesion) {
            tooltipEditar = 'Solo administradores pueden editar usuarios';
        } else if (esAdminObjetivo) {
            tooltipEditar = 'No se puede editar el usuario Administrador';
        }
        
        // Textos para tooltips - DESACTIVAR
        let tooltipDesactivar = '';
        if (!esAdminSesion) {
            tooltipDesactivar = 'Solo administradores pueden desactivar usuarios';
        } else if (esAdminObjetivo) {
            tooltipDesactivar = 'No se puede desactivar el usuario Administrador';
        }
        
        // Textos para tooltips - ACTIVAR
        let tooltipActivar = '';
        if (!esAdminSesion) {
            tooltipActivar = 'Solo administradores pueden activar usuarios';
        } else if (esAdminObjetivo) {
            tooltipActivar = 'No se puede activar el usuario Administrador';
        }
        
        // Textos para tooltips - ELIMINAR
        let tooltipEliminar = '';
        if (!esAdminSesion) {
            tooltipEliminar = 'Solo administradores pueden eliminar usuarios';
        } else if (esAdminObjetivo) {
            tooltipEliminar = 'No se puede eliminar el usuario Administrador';
        }
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${usuario.id}</td>
                <td class="text-start">${usuario.nombre} ${usuario.apellido}</td>
                <td class="text-start">${usuario.username}</td>
                <td class="text-center"><span class="badge badge-perfil">${usuario.perfil_nombre || 'Sin perfil'}</span></td>
                <td class="text-start">${usuario.correo}</td>
                <td class="text-center">${usuario.estado === 1 ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                <td class="text-center">${usuario.fecha_creacion || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning btnEditar" 
                            data-id="${usuario.id}"
                            ${editarDeshabilitado ? 'disabled' : ''}
                            ${tooltipEditar ? `title="${tooltipEditar}" data-bs-toggle="tooltip"` : ''}>
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${usuario.estado === 1 
                        ? `<button class="btn btn-sm btn-secondary btnDesactivar" 
                                   data-id="${usuario.id}"
                                   ${desactivarDeshabilitado ? 'disabled' : ''}
                                   ${tooltipDesactivar ? `title="${tooltipDesactivar}" data-bs-toggle="tooltip"` : ''}>
                            <i class="bi bi-slash-circle"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-success btnActivar" 
                                   data-id="${usuario.id}"
                                   ${activarDeshabilitado ? 'disabled' : ''}
                                   ${tooltipActivar ? `title="${tooltipActivar}" data-bs-toggle="tooltip"` : ''}>
                            <i class="bi bi-check-circle"></i>
                           </button>`
                    }
                    <button class="btn btn-sm btn-danger btnEliminar" 
                            data-id="${usuario.id}"
                            ${eliminarDeshabilitado ? 'disabled' : ''}
                            ${tooltipEliminar ? `title="${tooltipEliminar}" data-bs-toggle="tooltip"` : ''}>
                        <i class="bi bi-trash"></i>
                    </button>
                 </td>
             </tr>
        `;
    });
    
    inicializarTooltips();
}


// FUNCIONES DE CARGA DE DATOS
async function cargarUsuarios() {
    if (!isCurrentPage()) return;
    
    try {
        const response = await fetch('/api/usuarios');
        if (!response.ok) throw new Error('Error al cargar usuarios');
        
        usuariosGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar usuarios', 'danger');
    }
}


// Cargar perfiles
async function cargarPerfiles() {
    if (!isCurrentPage()) return;
    
    try {
        const response = await fetch('/api/perfiles');
        if (!response.ok) throw new Error('Error al cargar perfiles');
        
        const perfiles = await response.json();
        
        const select = getElement('id_perfil');
        const selectMasivo = getElement('perfilAccionMasiva');
        
        if (select) {
            select.innerHTML = '<option value="">Seleccione</option>';
            perfiles.forEach(perfil => {
                if (perfil.estado === 1) {
                    select.innerHTML += `<option value="${perfil.id}">${perfil.nombre}</option>`;
                }
            });
        }
        
        if (selectMasivo) {
            selectMasivo.innerHTML = '<option value="">Seleccione perfil</option>';
            perfiles.forEach(perfil => {
                if (perfil.estado === 1) {
                    selectMasivo.innerHTML += `<option value="${perfil.id}">${perfil.nombre}</option>`;
                }
            });
        }
        
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar perfiles', 'danger');
    }
}


// FUNCIONES DE ACCIONES CRUD
async function cambiarEstado(id, estado, mensajeExito, tipoToast) {
    if (!isCurrentPage()) return;
    
    try {
        const response = await fetch(`/api/usuarios/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        await cargarUsuarios();
        mostrarToast(mensajeExito, tipoToast);
        
        const modal = bootstrap.Modal.getInstance(getElement('modalConfirmacion'));
        if (modal) {
            modal.hide();
            limpiarBackdrops();
        }
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


// INICIALIZACIÓN DE COMPONENTES 
function initFormUsuario() {
    const btnGuardar = getElement('btnGuardarUsuario');
    if (!btnGuardar) return;

    // Validación en tiempo real para nombre y apellido
    const inputNombre = getElement('nombre');
    const inputApellido = getElement('apellido');
    
    if (inputNombre) {
        const nuevoNombre = inputNombre.cloneNode(true);
        inputNombre.parentNode.replaceChild(nuevoNombre, inputNombre);
        nuevoNombre.addEventListener('input', validarSoloLetrasFrontend);
        elementos['nombre'] = nuevoNombre;
    }
    
    if (inputApellido) {
        const nuevoApellido = inputApellido.cloneNode(true);
        inputApellido.parentNode.replaceChild(nuevoApellido, inputApellido);
        nuevoApellido.addEventListener('input', validarSoloLetrasFrontend);
        elementos['apellido'] = nuevoApellido;
    }
    
    if (btnGuardar.parentNode) {
        const newBtn = btnGuardar.cloneNode(true);
        btnGuardar.parentNode.replaceChild(newBtn, btnGuardar);
        
        newBtn.onclick = async () => {
            const id = getElement('usuarioId')?.value;
            const nombre = getElement('nombre')?.value.trim();
            const apellido = getElement('apellido')?.value.trim();
            const username = getElement('username')?.value.trim();
            const correo = getElement('correo')?.value.trim();
            const id_perfil = parseInt(getElement('id_perfil')?.value);
            const clave = getElement('clave')?.value;
            
            if (!nombre || !apellido || !username || !correo || !id_perfil) {
                mostrarToast('Todos los campos son obligatorios', 'warning');
                return;
            }
            
            if (!id && (!clave || clave.trim() === '')) {
                mostrarToast('La contraseña es obligatoria', 'warning');
                return;
            }
            
            const body = { nombre, apellido, username, correo, id_perfil };
            if (clave && clave.trim() !== '') body.clave = clave;
            
            try {
                const response = await fetch(id ? `/api/usuarios/${id}` : '/api/usuarios', {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                
                await cargarUsuarios();
                mostrarToast(id ? 'Usuario actualizado' : 'Usuario registrado', id ? 'warning' : 'success');
                
                const modal = bootstrap.Modal.getInstance(getElement('modalUsuario'));
                if (modal) {
                    modal.hide();
                    setTimeout(() => {
                        limpiarBackdrops();
                    }, 150);
                }
                
                getElement('formUsuario')?.reset();
                const usuarioId = getElement('usuarioId');
                if (usuarioId) usuarioId.value = '';
                const mensajeClave = getElement('mensajeClave');
                if (mensajeClave) mensajeClave.classList.add('d-none');
                
            } catch (error) {
                if (error.message.includes('ya está en uso')) {
                    mostrarToast('El usuario ya existe y está activo.', 'warning');
                } else {
                    mostrarToast(error.message, 'danger');
                }
            }
        };
    }
}


// Acciones masivas
function initAccionesMasivas() {
    const btnAplicar = getElement('btnAplicarAccionMasiva');
    if (!btnAplicar) return;
    
    if (btnAplicar.parentNode) {
        const newBtn = btnAplicar.cloneNode(true);
        btnAplicar.parentNode.replaceChild(newBtn, btnAplicar);
        
        newBtn.onclick = async () => {
            const id_perfil = parseInt(getElement('perfilAccionMasiva')?.value);
            const estado = parseInt(getElement('accionMasiva')?.value);
            
            if (!id_perfil) {
                mostrarToast('Seleccione un perfil', 'warning');
                return;
            }
            
            if (estado !== 0 && estado !== 1) {
                mostrarToast('Seleccione una acción', 'warning');
                return;
            }
            
            try {
                const response = await fetch('/api/usuarios/estado/perfil', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_perfil, estado })
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                
                await cargarUsuarios();
                mostrarToast(estado === 0 ? 'Usuarios desactivados' : 'Usuarios activados', estado === 0 ? 'warning' : 'success');
                
                const modal = bootstrap.Modal.getInstance(getElement('modalAccionesMasivas'));
                if (modal) {
                    modal.hide();
                    limpiarBackdrops();
                }
                limpiarAccionesMasivas();
                
            } catch (error) {
                mostrarToast(error.message, 'danger');
            }
        };
    }
}


function initBuscadorFiltros() {
    const buscarInput = getElement('buscarUsuario');
    if (buscarInput && buscarInput.parentNode) {
        const newInput = buscarInput.cloneNode(true);
        buscarInput.parentNode.replaceChild(newInput, buscarInput);
        newInput.addEventListener('input', () => aplicarFiltros());
        elementos['buscarUsuario'] = newInput;
    }
    
    const filtroCantidad = getElement('filtroCantidad');
    if (filtroCantidad && filtroCantidad.parentNode) {
        const newFiltro = filtroCantidad.cloneNode(true);
        filtroCantidad.parentNode.replaceChild(newFiltro, filtroCantidad);
        newFiltro.addEventListener('change', () => aplicarFiltros());
        elementos['filtroCantidad'] = newFiltro;
    }
}


function initNuevoUsuario() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalUsuario"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => {
            getElement('formUsuario')?.reset();
            const usuarioId = getElement('usuarioId');
            if (usuarioId) usuarioId.value = '';
            const mensajeClave = getElement('mensajeClave');
            if (mensajeClave) mensajeClave.classList.add('d-none');
            const tituloModal = getElement('tituloModalUsuario');
            if (tituloModal) tituloModal.textContent = 'Nuevo Usuario';
            const btnGuardar = getElement('btnGuardarUsuario');
            if (btnGuardar) {
                btnGuardar.textContent = 'Guardar Usuario';
                btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
                btnGuardar.style.border = 'none';
            }
        });
    }
}


// EVENTOS GLOBALES 
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
        const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
        const usuarioLogueadoId = sesion?.usuario?.id;
        
        // EDITAR
        const btnEditar = e.target.closest('.btnEditar');
        if (btnEditar) {
            if (btnEditar.disabled) return;
            
            const id = parseInt(btnEditar.dataset.id);
            const usuario = usuariosGlobal.find(u => u.id === id);
            
            // Validación de seguridad
            if (!esAdminSesion && usuarioLogueadoId !== id) {
                mostrarToast('No tiene permisos para editar otros usuarios', 'warning');
                return;
            }
            
            if (usuario && usuario.id_perfil === PERFIL_ADMIN_ID && !esAdminSesion) {
                mostrarToast('No tiene permisos para modificar administradores', 'warning');
                return;
            }
            
            if (usuario) {
                const usuarioId = getElement('usuarioId');
                const nombre = getElement('nombre');
                const apellido = getElement('apellido');
                const username = getElement('username');
                const correo = getElement('correo');
                const idPerfil = getElement('id_perfil');
                const clave = getElement('clave');
                const mensajeClave = getElement('mensajeClave');
                const tituloModal = getElement('tituloModalUsuario');
                const btnGuardar = getElement('btnGuardarUsuario');
                
                if (usuarioId) usuarioId.value = usuario.id;
                if (nombre) nombre.value = usuario.nombre;
                if (apellido) apellido.value = usuario.apellido;
                if (username) username.value = usuario.username;
                if (correo) correo.value = usuario.correo;
                if (idPerfil) idPerfil.value = usuario.id_perfil;
                if (clave) clave.value = '';
                if (mensajeClave) mensajeClave.classList.remove('d-none');
                if (tituloModal) tituloModal.textContent = 'Editar Usuario';
                if (btnGuardar) btnGuardar.textContent = 'Actualizar Usuario';
                if (btnGuardar) btnGuardar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                if (btnGuardar) btnGuardar.style.border = 'none';
                
                const modalElement = getElement('modalUsuario');
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                }
            }
            return;
        }
        
        // DESACTIVAR
        const btnDesactivar = e.target.closest('.btnDesactivar');
        if (btnDesactivar) {
            if (btnDesactivar.disabled) return;
            
            const id = parseInt(btnDesactivar.dataset.id);
            
            if (!esAdminSesion) {
                mostrarToast('No tiene permisos para desactivar usuarios', 'warning');
                return;
            }
            
            if (usuarioLogueadoId === id) {
                mostrarToast('No puede desactivar su propio usuario', 'warning');
                return;
            }
            
            mostrarModalConfirmacionProfesional(
                'Desactivar Usuario',
                '¿Desea desactivar este usuario?',
                () => cambiarEstado(id, 0, 'Usuario desactivado', 'warning'),
                'warning',
                'Desactivar'
            );
            return;
        }
        
        // ACTIVAR
        const btnActivar = e.target.closest('.btnActivar');
        if (btnActivar) {
            if (btnActivar.disabled) return;
            
            const id = parseInt(btnActivar.dataset.id);
            
            if (!esAdminSesion) {
                mostrarToast('No tiene permisos para activar usuarios', 'warning');
                return;
            }
            
            mostrarModalConfirmacionProfesional(
                'Activar Usuario',
                '¿Desea activar este usuario?',
                () => cambiarEstado(id, 1, 'Usuario activado', 'success'),
                'success',
                'Activar'
            );
            return;
        }
        
        // ELIMINAR
        const btnEliminar = e.target.closest('.btnEliminar');
        if (btnEliminar) {
            if (btnEliminar.disabled) return;
            
            const id = parseInt(btnEliminar.dataset.id);
            
            if (!esAdminSesion) {
                mostrarToast('No tiene permisos para eliminar usuarios', 'warning');
                return;
            }
            
            if (usuarioLogueadoId === id) {
                mostrarToast('No puede eliminar su propio usuario', 'warning');
                return;
            }
            
            mostrarModalConfirmacionProfesional(
                'Eliminar Usuario',
                '¿Desea eliminar este usuario?',
                () => cambiarEstado(id, 2, 'Usuario eliminado', 'danger'),
                'danger',
                'Eliminar'
            );
            return;
        }
    });
    
    document.addEventListener('hidden.bs.modal', () => {
        if (isCurrentPage()) {
            limpiarBackdrops();
        }
    });
}


// DESTRUCCIÓN DEL MÓDULO 
function destroy() {
    eventosInicializados = false;
    elementos = {};
    usuariosGlobal = [];
}


// INICIALIZACIÓN PRINCIPAL 
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarUsuarios();
        await cargarPerfiles();
        renderizarBotonesAccion();
        inicializarTooltips();
        return;
    }
    
    eventosInicializados = true;
    
    setupEventListeners();
    initFormUsuario();
    initAccionesMasivas();
    initBuscadorFiltros();
    initNuevoUsuario();
    
    await cargarUsuarios();
    await cargarPerfiles();
    renderizarBotonesAccion();
    inicializarTooltips();
}

export { destroy };



