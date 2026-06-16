import { mostrarToast, limpiarBackdrops, prepararModal, cerrarModal, mostrarModalConfirmacionProfesional } from './helpers.js';


// VARIABLES GLOBALES
let usuariosGlobal = [];
let eventosInicializados = false;
let elementos = {};


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

function renderizar(usuarios) {
    const tabla = getElement('tablaUsuarios');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (usuarios.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay usuarios registrados</td></tr>`;
        return;
    }
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    
    usuarios.forEach(usuario => {
        const esUsuarioLogueado = sesion?.usuario?.id === usuario.id;
        const esAdminObjetivo = usuario.id_perfil === 1;
        const esAdminSesion = sesion?.usuario?.id_perfil === 1;
        const bloquearAdmin = esAdminObjetivo && !esAdminSesion;
        
        tabla.innerHTML += `
            <tr>
                <td>${usuario.id}</td>
                <td>${usuario.nombre} ${usuario.apellido}</td>
                <td>${usuario.username}</td>
                <td><span class="badge badge-perfil">${usuario.perfil_nombre || 'Sin perfil'}</span></td>
                <td>${usuario.correo}</td>
                <td>${usuario.estado === 1 ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                <td class="text-center">${usuario.fecha_creacion || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning btnEditar" data-id="${usuario.id}" ${bloquearAdmin ? 'disabled' : ''}>
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${usuario.estado === 1 
                        ? `<button class="btn btn-sm btn-secondary btnDesactivar" data-id="${usuario.id}" ${esUsuarioLogueado || bloquearAdmin ? 'disabled' : ''}>
                            <i class="bi bi-slash-circle"></i>
                        </button>`
                        : `<button class="btn btn-sm btn-success btnActivar" data-id="${usuario.id}">
                            <i class="bi bi-check-circle"></i>
                        </button>`
                    }
                    <button class="btn btn-sm btn-danger btnEliminar" data-id="${usuario.id}" ${esUsuarioLogueado || bloquearAdmin ? 'disabled' : ''}>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
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


// EVENTOS GLOBALES (DELEGACIÓN)
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        // Editar
        const btnEditar = e.target.closest('.btnEditar');
        if (btnEditar && !btnEditar.disabled) {
            const id = parseInt(btnEditar.dataset.id);
            const usuario = usuariosGlobal.find(u => u.id === id);
            
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
        
        // Desactivar
        const btnDesactivar = e.target.closest('.btnDesactivar');
        if (btnDesactivar && !btnDesactivar.disabled) {
            const id = parseInt(btnDesactivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Desactivar Usuario',
                '¿Desea desactivar este usuario?',
                () => cambiarEstado(id, 0, 'Usuario desactivado', 'warning'),
                'warning'
            );
            return;
        }
        
        // Activar
        const btnActivar = e.target.closest('.btnActivar');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Usuario',
                '¿Desea activar este usuario?',
                () => cambiarEstado(id, 1, 'Usuario activado', 'success'),
                'success'
            );
            return;
        }
        
        // Eliminar
        const btnEliminar = e.target.closest('.btnEliminar');
        if (btnEliminar && !btnEliminar.disabled) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Eliminar Usuario',
                '¿Desea eliminar este usuario?',
                () => cambiarEstado(id, 2, 'Usuario eliminado', 'danger'),
                'danger'
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
}

export { destroy };





