import { mostrarToast, limpiarBackdrops, prepararModal, cerrarModal, mostrarModalConfirmacionProfesional } from './helpers.js';

// VARIABLES GLOBALES
let perfilesGlobal = [];
let eventosInicializados = false;
let elementos = {};


// ID del perfil Administrador
const PERFIL_ADMIN_ID = 1;
const OPCIONES_OBLIGATORIAS = [1, 3]; // Dashboard (1) y Perfiles (3)


// VALIDACIÓN NOMBRE: solo letras, números y espacios 
function validarNombrePerfilFrontend(event) {
    const regex = /^[a-zA-Z0-9\s]*$/;
    const valor = event.target.value;
    if (!regex.test(valor)) {
        event.target.value = valor.slice(0, -1);
        mostrarToast('Solo se permiten letras, números y espacios', 'warning');
    }
}


// INICIALIZAR TOOLTIPS 
function inicializarTooltips() {
    setTimeout(function() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function(tooltipTriggerEl) {
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


// FUNCIONES DE UTILIDAD
function isCurrentPage() {
    const tabla = document.getElementById('tablaPerfiles');
    return tabla !== null;
}


function getElement(id) {
    if (!elementos[id] || !document.body.contains(elementos[id])) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}


function limpiarFormularioPerfil() {
    const form = getElement('formPerfil');
    if (form) form.reset();
    
    const perfilId = getElement('perfilId');
    if (perfilId) perfilId.value = '';
    
    const titulo = getElement('tituloModalPerfil');
    if (titulo) titulo.textContent = 'Nuevo Perfil';
    
    const btnGuardar = getElement('btnGuardarPerfil');
    if (btnGuardar) {
        btnGuardar.textContent = 'Guardar Perfil';
        btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
        btnGuardar.style.border = 'none';
    }
}


// RENDERIZADO Y FILTRADO
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarPerfil');
    const filtroCantidad = getElement('filtroCantidadPerfiles');
    
    if (!buscarInput || !filtroCantidad) return;
    
    const textoBusqueda = buscarInput.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad.value || 5);
    
    const perfilesFiltrados = perfilesGlobal
        .filter(perfil => perfil.estado !== 2)
        .filter(perfil =>
            perfil.nombre.toLowerCase().includes(textoBusqueda) ||
            (perfil.descripcion && perfil.descripcion.toLowerCase().includes(textoBusqueda))
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, cantidadMostrar);
    
    renderizar(perfilesFiltrados);
}


function renderizar(perfiles) {
    const tabla = getElement('tablaPerfiles');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (perfiles.length === 0) {
        tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay perfiles registrados</td></tr>`;
        return;
    }
    
    // Obtener usuario en sesión
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    
    perfiles.forEach(perfil => {
        const esPerfilAdmin = perfil.id === PERFIL_ADMIN_ID;
        
        // Determinar qué botones están deshabilitados
        const editarDeshabilitado = !esAdminSesion || esPerfilAdmin;
        const permisosDeshabilitado = !esAdminSesion;
        const desactivarDeshabilitado = !esAdminSesion || esPerfilAdmin;
        const eliminarDeshabilitado = !esAdminSesion || esPerfilAdmin;
        
        // Textos para tooltips
        const tooltipEditar = !esAdminSesion ? 'Solo administradores pueden editar perfiles' : 'No se puede editar el perfil Administrador';
        const tooltipPermisos = !esAdminSesion ? 'Solo administradores pueden gestionar permisos' : '';
        const tooltipDesactivar = !esAdminSesion ? 'Solo administradores pueden desactivar perfiles' : 'No se puede desactivar el perfil Administrador';
        const tooltipEliminar = !esAdminSesion ? 'Solo administradores pueden eliminar perfiles' : 'No se puede eliminar el perfil Administrador';
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${perfil.id}</td>
                <td><strong>${perfil.nombre}</strong></td>
                <td>${perfil.descripcion || '-'}</td>
                <td class="text-center">${perfil.estado === 1 ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                <td class="text-center">${perfil.fecha_creacion || '-'}</td>
                <td class="text-nowrap text-center">
                    <div class="d-flex gap-1 justify-content-center">
                        <button class="btn btn-sm btn-warning btnEditarPerfil" 
                                data-id="${perfil.id}"
                                ${editarDeshabilitado ? 'disabled' : ''}
                                ${editarDeshabilitado ? `title="${tooltipEditar}" data-bs-toggle="tooltip"` : ''}>
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-permisos btnPermisos" 
                                data-id="${perfil.id}"
                                ${permisosDeshabilitado ? 'disabled' : ''}
                                ${permisosDeshabilitado ? `title="${tooltipPermisos}" data-bs-toggle="tooltip"` : ''}>
                            <i class="bi bi-shield-lock"></i>
                        </button>
                        ${perfil.estado === 1 
                            ? `<button class="btn btn-sm btn-secondary btnDesactivarPerfil" 
                                       data-id="${perfil.id}"
                                       ${desactivarDeshabilitado ? 'disabled' : ''}
                                       ${desactivarDeshabilitado ? `title="${tooltipDesactivar}" data-bs-toggle="tooltip"` : ''}>
                                    <i class="bi bi-slash-circle"></i>
                                </button>`
                            : `<button class="btn btn-sm btn-success btnActivarPerfil" 
                                       data-id="${perfil.id}">
                                    <i class="bi bi-check-circle"></i>
                                </button>`
                        }
                        <button class="btn btn-sm btn-danger btnEliminarPerfil" 
                                data-id="${perfil.id}"
                                ${eliminarDeshabilitado ? 'disabled' : ''}
                                ${eliminarDeshabilitado ? `title="${tooltipEliminar}" data-bs-toggle="tooltip"` : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    inicializarTooltips();
}


// FUNCIONES DE CARGA DE DATOS
async function cargarPerfiles() {
    if (!isCurrentPage()) return;
    
    try {
        const response = await fetch('/api/perfiles');
        if (!response.ok) throw new Error('Error al cargar perfiles');
        
        perfilesGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar perfiles', 'danger');
    }
}


// FUNCIONES DE PERMISOS
async function abrirModalPermisos(idPerfil) {
    if (!isCurrentPage()) return;
    
    try {
        const [responseOpciones, responsePermisos] = await Promise.all([
            fetch('/api/opciones'),
            fetch(`/api/permisos/${idPerfil}`)
        ]);
        
        const opciones = await responseOpciones.json();
        let permisos = await responsePermisos.json();
        
        const perfil = perfilesGlobal.find(p => p.id === idPerfil);
        const nombrePerfil = perfil ? perfil.nombre : 'Seleccionado';
        const esPerfilAdmin = idPerfil === PERFIL_ADMIN_ID;
        
        const nombrePerfilSpan = document.getElementById('nombrePerfilPermisos');
        if (nombrePerfilSpan) {
            nombrePerfilSpan.textContent = nombrePerfil;
        }
        
        const lista = getElement('listaPermisos');
        if (!lista) return;
        
        lista.innerHTML = '';
        
        const opcionesOrdenadas = [...opciones].sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        if (!opcionesOrdenadas || opcionesOrdenadas.length === 0) {
            lista.innerHTML = '<div class="text-center text-muted py-4">No hay módulos disponibles</div>';
        } else {
            const permisosIds = permisos.map(p => p.id_opcion || p.id);
            
            const iconosPorModulo = {
                'Dashboard': 'bi bi-speedometer2',
                'Usuarios': 'bi bi-people',
                'Perfiles': 'bi bi-shield-lock',
                'Clientes': 'bi bi-person-badge',
                'Productos': 'bi bi-box-seam',
                'Categorías': 'bi bi-grid-3x3-gap-fill',
                'Categorias': 'bi bi-grid-3x3-gap-fill',
                'Ventas': 'bi bi-cart-check',
                'Pedidos': 'bi bi-truck',
                'Inventario': 'bi bi-clipboard-data',
                'Reportes': 'bi bi-graph-up',
                'Configuración': 'bi bi-gear',
                'Ayuda': 'bi bi-question-circle'
            };
            
            const coloresIconos = {
                'Dashboard': 'text-primary',
                'Usuarios': 'text-success',
                'Perfiles': 'text-warning',
                'Clientes': 'text-info',
                'Productos': 'text-danger',
                'Categorías': 'text-secondary',
                'Categorias': 'text-secondary',
                'Ventas': 'text-success',
                'Pedidos': 'text-warning',
                'Inventario': 'text-danger'
            };
            
            opcionesOrdenadas.forEach(opcion => {
                let checked = permisosIds.includes(opcion.id);
                let disabled = false;
                let tooltipTitle = '';
                
                // Permisos obligatorios para administrador
                if (esPerfilAdmin && OPCIONES_OBLIGATORIAS.includes(opcion.id)) {
                    checked = true;
                    disabled = true;
                    tooltipTitle = 'Este módulo es obligatorio para el perfil Administrador';
                }
                
                let icono = iconosPorModulo[opcion.nombre] || 'bi bi-grid';
                const colorIcono = coloresIconos[opcion.nombre] || 'text-primary';
                
                lista.innerHTML += `
                    <div class="permiso-item mb-2 p-2 rounded" style="background: white; border: 1px solid #e9ecef; border-radius: 12px;">
                        <div class="form-check d-flex align-items-center">
                            <input class="form-check-input permisoCheck" 
                                   type="checkbox" 
                                   value="${opcion.id}" 
                                   id="opcion_${opcion.id}" 
                                   ${checked ? 'checked' : ''}
                                   ${disabled ? 'disabled' : ''}
                                   style="transform: scale(1.1); margin-right: 12px;">
                            <label class="form-check-label d-flex align-items-center cursor-pointer" 
                                   for="opcion_${opcion.id}" 
                                   style="cursor: ${disabled ? 'not-allowed' : 'pointer'}; width: 100%;"
                                   ${tooltipTitle ? `title="${tooltipTitle}" data-bs-toggle="tooltip"` : ''}>
                                <i class="${icono} ${colorIcono} me-3" style="font-size: 1.2rem; width: 28px;"></i>
                                <span class="fw-medium">${opcion.nombre}</span>
                                ${disabled ? '<span class="ms-2 badge bg-secondary">Obligatorio</span>' : ''}
                            </label>
                        </div>
                    </div>
                `;
            });
        }
        
        // Configurar "Seleccionar todos" (excluyendo los obligatorios deshabilitados)
        const selectAllCheckbox = document.getElementById('seleccionarTodosPermisos');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            
            const newSelectAll = selectAllCheckbox.cloneNode(true);
            selectAllCheckbox.parentNode.replaceChild(newSelectAll, selectAllCheckbox);
            
            newSelectAll.onclick = (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.permisoCheck:not(:disabled)').forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            };
            
            const actualizarSelectAll = () => {
                const allCheckboxes = document.querySelectorAll('.permisoCheck:not(:disabled)');
                const allChecked = allCheckboxes.length > 0 && [...allCheckboxes].every(cb => cb.checked);
                newSelectAll.checked = allChecked;
            };
            
            document.querySelectorAll('.permisoCheck').forEach(checkbox => {
                checkbox.addEventListener('change', actualizarSelectAll);
            });
        }
        
        // Configurar botón guardar
        const btnGuardarPermisos = getElement('btnGuardarPermisos');
        if (btnGuardarPermisos) {
            const newBtn = btnGuardarPermisos.cloneNode(true);
            btnGuardarPermisos.parentNode.replaceChild(newBtn, btnGuardarPermisos);
            
            newBtn.onclick = async () => {
                const seleccionados = [...document.querySelectorAll('.permisoCheck:checked')]
                    .map(check => parseInt(check.value));
                
                // Validación para perfil Administrador
                if (esPerfilAdmin) {
                    const tieneDashboard = seleccionados.includes(1);
                    const tienePerfiles = seleccionados.includes(3);
                    if (!tieneDashboard || !tienePerfiles) {
                        mostrarToast('El perfil Administrador debe tener acceso a Dashboard y Perfiles', 'warning');
                        return;
                    }
                }
                
                try {
                    const response = await fetch(`/api/permisos/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            id_perfil: idPerfil, 
                            opciones: seleccionados 
                        })
                    });
                    
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    
                    mostrarToast('Permisos actualizados correctamente', 'success');
                    
                    const modal = bootstrap.Modal.getInstance(getElement('modalPermisos'));
                    if (modal) {
                        modal.hide();
                        limpiarBackdrops();
                    }
                    
                    if (window.recargarMenuDashboard) {
                        await window.recargarMenuDashboard();
                        mostrarToast('El menú se ha actualizado', 'info');
                    }
                    
                } catch (error) {
                    mostrarToast(error.message, 'danger');
                }
            };
        }
        
        const modalElement = getElement('modalPermisos');
        if (modalElement) {
            prepararModal(modalElement);
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
        
        inicializarTooltips();
        
    } catch (error) {
        console.error('Error al cargar permisos:', error);
        mostrarToast(error.message || 'Error al cargar los permisos');
    }
}


// INICIALIZACIÓN DE COMPONENTES 
function initFormPerfil() {
    const btnGuardar = getElement('btnGuardarPerfil');
    if (!btnGuardar) return;
    
    // Validación en tiempo real para el campo nombre
    const inputNombre = getElement('nombrePerfil');
    if (inputNombre) {
        const nuevoNombre = inputNombre.cloneNode(true);
        inputNombre.parentNode.replaceChild(nuevoNombre, inputNombre);
        nuevoNombre.addEventListener('input', validarNombrePerfilFrontend);
        elementos['nombrePerfil'] = nuevoNombre;
    }
    
    if (btnGuardar.parentNode) {
        const newBtn = btnGuardar.cloneNode(true);
        btnGuardar.parentNode.replaceChild(newBtn, btnGuardar);
        
        newBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const id = getElement('perfilId')?.value;
            const nombre = getElement('nombrePerfil')?.value.trim();
            const descripcion = getElement('descripcionPerfil')?.value.trim();
            
            if (!nombre) {
                mostrarToast('El nombre del perfil es obligatorio', 'warning');
                return;
            }
            
            if (!descripcion) {
                mostrarToast('La descripción del perfil es obligatoria', 'warning');
                return;
            }
            
            // Validación del nombre
            const nombreRegex = /^[a-zA-Z0-9\s]{3,50}$/;
            if (!nombreRegex.test(nombre)) {
                mostrarToast('El nombre solo puede contener letras, números y espacios (3-50 caracteres)', 'warning');
                return;
            }
            
            try {
                const response = await fetch(id ? `/api/perfiles/${id}` : '/api/perfiles', {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, descripcion })
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                
                await cargarPerfiles();
                
                mostrarToast(id ? 'Perfil actualizado correctamente' : 'Perfil registrado correctamente', id ? 'warning' : 'success');
                
                const modalElement = getElement('modalPerfil');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.hide();
                    } else {
                        modalElement.classList.remove('show');
                        modalElement.style.display = 'none';
                    }
                }
                
                setTimeout(() => {
                    limpiarBackdrops();
                }, 150);
                
                limpiarFormularioPerfil();
                
            } catch (error) {
                mostrarToast(error.message);
            }
        };
    }
}


function initBuscadorFiltros() {
    const buscarInput = getElement('buscarPerfil');
    if (buscarInput && buscarInput.parentNode) {
        const newInput = buscarInput.cloneNode(true);
        buscarInput.parentNode.replaceChild(newInput, buscarInput);
        newInput.addEventListener('input', () => aplicarFiltros());
        elementos['buscarPerfil'] = newInput;
    }
    
    const filtroCantidad = getElement('filtroCantidadPerfiles');
    if (filtroCantidad && filtroCantidad.parentNode) {
        const newFiltro = filtroCantidad.cloneNode(true);
        filtroCantidad.parentNode.replaceChild(newFiltro, filtroCantidad);
        newFiltro.addEventListener('change', () => aplicarFiltros());
        elementos['filtroCantidadPerfiles'] = newFiltro;
    }
}


function initNuevoPerfil() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalPerfil"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => {
            limpiarFormularioPerfil();
        });
    }
}


// EVENTOS GLOBALES
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
        const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
        
        // Editar
        const btnEditar = e.target.closest('.btnEditarPerfil');
        if (btnEditar) {
            if (btnEditar.disabled) return;
            
            const id = parseInt(btnEditar.dataset.id);
            const perfil = perfilesGlobal.find(p => p.id === id);
            
            if (perfil) {
                getElement('perfilId').value = perfil.id;
                getElement('nombrePerfil').value = perfil.nombre;
                getElement('descripcionPerfil').value = perfil.descripcion || '';
                getElement('tituloModalPerfil').textContent = 'Editar Perfil';
                const btnGuardar = getElement('btnGuardarPerfil');
                btnGuardar.textContent = 'Actualizar Perfil';
                btnGuardar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                btnGuardar.style.border = 'none';
                
                const modalElement = getElement('modalPerfil');
                if (modalElement) {
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                }
            }
            return;
        }
        
        // Permisos
        const btnPermisos = e.target.closest('.btnPermisos');
        if (btnPermisos) {
            if (btnPermisos.disabled) return;
            
            const idPerfil = parseInt(btnPermisos.dataset.id);
            await abrirModalPermisos(idPerfil);
            return;
        }
        
        // Desactivar
        const btnDesactivar = e.target.closest('.btnDesactivarPerfil');
        if (btnDesactivar) {
            if (btnDesactivar.disabled) return;
            
            const id = parseInt(btnDesactivar.dataset.id);
            const perfil = perfilesGlobal.find(p => p.id === id);
            
            let totalUsuarios = 0;
            try {
                const response = await fetch(`/api/perfiles/${id}/usuarios-activos`);
                const data = await response.json();
                totalUsuarios = data.totalUsuarios || 0;
            } catch (error) {
                console.error('Error al contar usuarios:', error);
            }
            
            let mensaje = `¿Desea desactivar el perfil "${perfil?.nombre}"?`;
            
            if (totalUsuarios > 0) {
                mensaje = `ADVERTENCIA: Este perfil tiene ${totalUsuarios} usuario(s) activo(s).\n\nSi desactiva este perfil, estos usuarios NO podrán iniciar sesión hasta que el perfil sea reactivado.\n\n¿Desea continuar?`;
            }
            
            mostrarModalConfirmacionProfesional(
                'Desactivar Perfil',
                mensaje,
                async () => {
                    try {
                        const response = await fetch(`/api/perfiles/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ estado: 0 })
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error);
                        await cargarPerfiles();
                        mostrarToast(data.message, 'warning');
                    } catch (error) {
                        mostrarToast(error.message, 'danger');
                    }
                },
                'warning',
                'Desactivar'
            );
            return;
        }
        
        // Activar
        const btnActivar = e.target.closest('.btnActivarPerfil');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Perfil',
                '¿Desea activar este perfil?',
                async () => {
                    const response = await fetch(`/api/perfiles/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: 1 })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    await cargarPerfiles();
                    mostrarToast(data.message, 'success');
                },
                'success',
                'Activar'
            );
            return;
        }
        
        // Eliminar
        const btnEliminar = e.target.closest('.btnEliminarPerfil');
        if (btnEliminar) {
            if (btnEliminar.disabled) return;
            
            const id = parseInt(btnEliminar.dataset.id);
            const perfil = perfilesGlobal.find(p => p.id === id);
            
            mostrarModalConfirmacionProfesional(
                'Eliminar Perfil',
                `¿Desea eliminar el perfil "${perfil?.nombre}"? Esta acción no se puede deshacer.`,
                async () => {
                    try {
                        const response = await fetch(`/api/perfiles/${id}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error);
                        await cargarPerfiles();
                        mostrarToast(data.message, 'danger');
                    } catch (error) {
                        mostrarToast(error.message, 'danger');
                    }
                },
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
    perfilesGlobal = [];
}


// INICIALIZACIÓN PRINCIPAL
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarPerfiles();
        return;
    }
    
    eventosInicializados = true;
    
    setupEventListeners();
    initFormPerfil();
    initBuscadorFiltros();
    initNuevoPerfil();
    
    await cargarPerfiles();
}

export { destroy };


