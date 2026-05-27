import { mostrarToast, limpiarBackdrops, prepararModal, cerrarModal, mostrarModalConfirmacionProfesional } from './helpers.js';


// VARIABLES GLOBALES
let perfilesGlobal = [];
let eventosInicializados = false;
let elementos = {};


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
    btnGuardar.textContent = 'Guardar Perfil';
    btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
    btnGuardar.style.border = 'none';
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
        .reverse()
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
    
    perfiles.forEach(perfil => {
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${perfil.id}</td>
                <td><strong>${perfil.nombre}</strong></td>
                <td>${perfil.descripcion || '-'}</td>
                <td class="text-center">${perfil.estado === 1 ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                <td class="text-center">${perfil.fecha_creacion || '-'}</td>
                <td class="text-nowrap text-center">
                    <div class="d-flex gap-1 justify-content-center">
                        <button class="btn btn-sm btn-warning btnEditarPerfil" data-id="${perfil.id}" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button class="btn btn-sm btn-permisos btnPermisos" data-id="${perfil.id}" title="Permisos">
                            <i class="bi bi-shield-lock"></i>
                        </button>
                        ${perfil.estado === 1 
                            ? `<button class="btn btn-sm btn-secondary btnDesactivarPerfil" data-id="${perfil.id}" title="Desactivar">
                                <i class="bi bi-slash-circle"></i>
                            </button>`
                            : `<button class="btn btn-sm btn-success btnActivarPerfil" data-id="${perfil.id}" title="Activar">
                                <i class="bi bi-check-circle"></i>
                            </button>`
                        }
                        <button class="btn btn-sm btn-danger btnEliminarPerfil" data-id="${perfil.id}" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
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
        const permisos = await responsePermisos.json();
        
        // Obtener nombre del perfil
        const perfil = perfilesGlobal.find(p => p.id === idPerfil);
        const nombrePerfil = perfil ? perfil.nombre : 'Seleccionado';
        
        const tituloModal = document.getElementById('tituloModalPermisos');
        const nombrePerfilSpan = document.getElementById('nombrePerfilPermisos');
        if (tituloModal && nombrePerfilSpan) {
            nombrePerfilSpan.textContent = nombrePerfil;
        }
        
        const lista = getElement('listaPermisos');
        if (!lista) return;
        
        lista.innerHTML = '';
        
        // Ordenar opciones alfabéticamente
        const opcionesOrdenadas = [...opciones].sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        if (!opcionesOrdenadas || opcionesOrdenadas.length === 0) {
            lista.innerHTML = '<div class="text-center text-muted py-4">No hay módulos disponibles</div>';
        } else {
            const permisosIds = permisos.map(p => p.id_opcion || p.id);
            
            // Iconos mejorados y más visibles
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
            
            // Colores para los iconos
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
                const checked = permisosIds.includes(opcion.id) ? 'checked' : '';
                let icono = iconosPorModulo[opcion.nombre] || 'bi bi-grid';
                const colorIcono = coloresIconos[opcion.nombre] || 'text-primary';
                
                lista.innerHTML += `
                    <div class="permiso-item mb-2 p-2 rounded" style="background: white; border: 1px solid #e9ecef; border-radius: 12px;">
                        <div class="form-check d-flex align-items-center">
                            <input class="form-check-input permisoCheck" type="checkbox" 
                                   value="${opcion.id}" id="opcion_${opcion.id}" ${checked}
                                   style="transform: scale(1.1); margin-right: 12px;">
                            <label class="form-check-label d-flex align-items-center cursor-pointer" for="opcion_${opcion.id}" style="cursor: pointer; width: 100%;">
                                <i class="${icono} ${colorIcono} me-3" style="font-size: 1.2rem; width: 28px;"></i>
                                <span class="fw-medium">${opcion.nombre}</span>
                            </label>
                        </div>
                    </div>
                `;
            });
        }
        
        // Configurar "Seleccionar todos"
        const selectAllCheckbox = document.getElementById('seleccionarTodosPermisos');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            
            const newSelectAll = selectAllCheckbox.cloneNode(true);
            selectAllCheckbox.parentNode.replaceChild(newSelectAll, selectAllCheckbox);
            
            newSelectAll.onclick = (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.permisoCheck').forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            };
            
            const actualizarSelectAll = () => {
                const allCheckboxes = document.querySelectorAll('.permisoCheck');
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
        
    } catch (error) {
        console.error('Error al cargar permisos:', error);
        mostrarToast('Error al cargar los permisos: ' + error.message, 'danger');
    }
}


// INICIALIZACIÓN DE COMPONENTES
function initFormPerfil() {
    const btnGuardar = getElement('btnGuardarPerfil');
    if (!btnGuardar) return;
    
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
                mostrarToast(error.message, 'danger');
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


// EVENTOS GLOBALES (DELEGACIÓN)
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        // Editar
        const btnEditar = e.target.closest('.btnEditarPerfil');
        if (btnEditar) {
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
            const idPerfil = parseInt(btnPermisos.dataset.id);
            await abrirModalPermisos(idPerfil);
            return;
        }
        
        // DESACTIVAR
        const btnDesactivar = e.target.closest('.btnDesactivarPerfil');
        if (btnDesactivar) {
            const id = parseInt(btnDesactivar.dataset.id);
            
            const responseCount = await fetch(`/api/perfiles/${id}/usuarios-activos`);
            const { totalUsuarios } = await responseCount.json();
            
            let mensajeConfirmacion = '¿Está seguro que desea desactivar este perfil?';
            if (totalUsuarios > 0) {
                mensajeConfirmacion = `⚠️ ADVERTENCIA: Este perfil tiene ${totalUsuarios} usuario(s) activo(s).\n\nSi desactiva este perfil, estos usuarios NO podrán iniciar sesión hasta que el perfil sea reactivado.`;
            }
            
            mostrarModalConfirmacionProfesional(
                'Desactivar Perfil',
                mensajeConfirmacion,
                async () => {
                    const response = await fetch(`/api/perfiles/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: 0 })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    await cargarPerfiles();
                    mostrarToast(data.message, 'warning');
                },
                'warning'
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
                'success'
            );
            return;
        }
        
        // Eliminar
        const btnEliminar = e.target.closest('.btnEliminarPerfil');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            const perfil = perfilesGlobal.find(p => p.id === id);
            let mensajeAdicional = '';
            if (perfil && perfil.total_usuarios > 0) {
                mensajeAdicional = `\n\n⚠️ ADVERTENCIA: Este perfil tiene ${perfil.total_usuarios} usuario(s) asociado(s). Al eliminarlo, los usuarios quedarán sin perfil.`;
            }
            mostrarModalConfirmacionProfesional(
                'Eliminar Perfil',
                `¿Desea eliminar este perfil?${mensajeAdicional}`,
                async () => {
                    const response = await fetch(`/api/perfiles/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ estado: 2 })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error);
                    await cargarPerfiles();
                    mostrarToast(data.message, 'danger');
                },
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




