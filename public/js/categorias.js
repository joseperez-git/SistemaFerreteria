import { mostrarToast, limpiarBackdrops, prepararModal, cerrarModal, mostrarModalConfirmacionProfesional } from './helpers.js';

// ==================== CONSTANTES ====================
const PERFIL_ADMIN_ID = 1;

let categoriasGlobal = [];
let eventosInicializados = false;
let elementos = {};
let confirmacionCallback = null;



// ==================== RENDERIZAR BOTONES DE ACCIÓN (DINÁMICOS) ====================
function renderizarBotonesAccion() {
    const contenedor = document.getElementById('botonesAccionCategorias');
    if (!contenedor) return;
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    
    if (!esAdminSesion) {
        // Usuario no admin - OCULTAR botón
        contenedor.innerHTML = '';
    } else {
        // Usuario admin - mostrar botón
        contenedor.innerHTML = `
            <button class="btn btn-primary" id="btnNuevaCategoriaPrincipal">
                <i class="bi bi-plus-circle"></i> Nueva Categoría
            </button>
        `;
        
        const nuevoBtn = document.getElementById('btnNuevaCategoriaPrincipal');
        if (nuevoBtn) {
            nuevoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                limpiarFormulario();
                
                const modalElement = getElement('modalCategoria');
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
    return document.getElementById('tablaCategorias') !== null;
}

function getElement(id) {
    if (!elementos[id]) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}

function limpiarFormulario() {
    const form = getElement('formCategoria');
    if (form) form.reset();
    
    const categoriaId = getElement('categoriaId');
    if (categoriaId) categoriaId.value = '';
    
    const tituloModal = getElement('tituloModalCategoria');
    if (tituloModal) tituloModal.textContent = 'Nueva Categoría';
    
    const btnGuardar = getElement('btnGuardarCategoria');
    if (btnGuardar) {
        btnGuardar.textContent = 'Guardar Categoría';
        btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
        btnGuardar.style.border = 'none';
    }
}

// ==================== FILTROS Y RENDERIZADO ====================
function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarCategoria');
    const filtroCantidad = getElement('filtroCantidadCategorias');
    
    if (!buscarInput || !filtroCantidad) return;
    
    const textoBusqueda = buscarInput.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad.value || 5);
    
    const categoriasFiltradas = categoriasGlobal
        .filter(categoria => categoria.estado !== 2)
        .filter(categoria =>
            categoria.nombre.toLowerCase().includes(textoBusqueda) ||
            (categoria.descripcion && categoria.descripcion.toLowerCase().includes(textoBusqueda))
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, cantidadMostrar);
    
    renderizar(categoriasFiltradas);
}


// Renderizar
function renderizar(categorias) {
    const tabla = getElement('tablaCategorias');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (categorias.length === 0) {
        tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay categorías registradas</td></tr>`;
        return;
    }
    
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
    
    // ==========================================
    // DETERMINAR SI HAY ALGÚN BOTÓN VISIBLE
    // ==========================================
    let hayBotonesVisibles = false;
    
    categorias.forEach(categoria => {
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
    categorias.forEach(categoria => {
        // Lógica para OCULTAR botones
        const editarVisible = esAdminSesion;
        const desactivarVisible = esAdminSesion;
        const activarVisible = esAdminSesion;
        const eliminarVisible = esAdminSesion;
        
        // Construir columna de acciones
        let accionesHtml = '';
        
        if (editarVisible) {
            accionesHtml += `
                <button class="btn btn-sm btn-warning btnEditarCategoria" data-id="${categoria.id}">
                    <i class="bi bi-pencil-square"></i>
                </button>
            `;
        }
        
        if (categoria.estado === 1) {
            if (desactivarVisible) {
                accionesHtml += `
                    <button class="btn btn-sm btn-secondary btnDesactivarCategoria" data-id="${categoria.id}">
                        <i class="bi bi-slash-circle"></i>
                    </button>
                `;
            }
        } else {
            if (activarVisible) {
                accionesHtml += `
                    <button class="btn btn-sm btn-success btnActivarCategoria" data-id="${categoria.id}">
                        <i class="bi bi-check-circle"></i>
                    </button>
                `;
            }
        }
        
        if (eliminarVisible) {
            accionesHtml += `
                <button class="btn btn-sm btn-danger btnEliminarCategoria" data-id="${categoria.id}">
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
                <td class="text-center">${categoria.id}</td>
                <td class="text-start"><strong>${categoria.nombre}</strong></td>
                <td class="text-start">${categoria.descripcion || '-'}</td>
                <td class="text-center">
                    ${categoria.estado === 1 
                        ? '<span class="badge bg-success">Activo</span>'
                        : '<span class="badge bg-secondary">Inactivo</span>'
                    }
                </td>
                <td class="text-center">${categoria.fecha_creacion || '-'}</td>
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
            // Ocultar la columna de acciones (índice 5)
            if (thead) {
                const ths = thead.querySelectorAll('th');
                if (ths.length > 5) {
                    ths[5].style.display = 'none';
                }
            }
            allRows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length > 5) {
                    tds[5].style.display = 'none';
                }
            });
        } else {
            // Mostrar la columna de acciones
            if (thead) {
                const ths = thead.querySelectorAll('th');
                if (ths.length > 5) {
                    ths[5].style.display = '';
                }
            }
            allRows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length > 5) {
                    tds[5].style.display = '';
                }
            });
        }
    }
}


// ==================== CARGA DE DATOS ====================
async function cargarCategorias() {
    if (!isCurrentPage()) return;
    
    try {
        const response = await fetch('/api/categorias');
        if (!response.ok) throw new Error('Error al cargar categorías');
        
        categoriasGlobal = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar categorías', 'danger');
    }
}

// ==================== CAMBIAR ESTADO ====================
async function cambiarEstado(id, estado, mensajeExito, tipoToast) {
    try {
        const response = await fetch(`/api/categorias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        await cargarCategorias();
        mostrarToast(mensajeExito, tipoToast);
        
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}

// ==================== GUARDAR CATEGORÍA ====================
function setupGuardarCategoria() {
    const btnGuardar = getElement('btnGuardarCategoria');
    if (!btnGuardar) return;
    
    const newBtn = btnGuardar.cloneNode(true);
    btnGuardar.parentNode.replaceChild(newBtn, btnGuardar);
    
    newBtn.onclick = async () => {
        const id = getElement('categoriaId')?.value;
        const nombre = getElement('nombreCategoria')?.value.trim();
        const descripcion = getElement('descripcionCategoria')?.value.trim();
        
        if (!nombre) {
            mostrarToast('El nombre de la categoría es obligatorio', 'warning');
            return;
        }
        
        if (!descripcion) {
            mostrarToast('La descripción de la categoría es obligatoria', 'warning');
            return;
        }
        
        try {
            const response = await fetch(
                id ? `/api/categorias/${id}` : '/api/categorias',
                {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, descripcion })
                }
            );
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            await cargarCategorias();
            
            mostrarToast(
                id ? 'Categoría actualizada correctamente' : 'Categoría registrada correctamente',
                id ? 'warning' : 'success'
            );
            
            const modal = bootstrap.Modal.getInstance(getElement('modalCategoria'));
            if (modal) {
                modal.hide();
                limpiarBackdrops();
            }
            
            limpiarFormulario();
            
        } catch (error) {
            mostrarToast(error.message, 'danger');
        }
    };
    
    elementos['btnGuardarCategoria'] = newBtn;
}

// ==================== EVENTOS GLOBALES ====================
function setupGlobalEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
        const esAdminSesion = sesion?.usuario?.id_perfil === PERFIL_ADMIN_ID;
        
        // EDITAR
        const btnEditar = e.target.closest('.btnEditarCategoria');
        if (btnEditar) {
            if (btnEditar.disabled) return;
            
            const id = parseInt(btnEditar.dataset.id);
            const categoria = categoriasGlobal.find(c => c.id === id);
            
            if (categoria) {
                limpiarFormulario();
                
                getElement('categoriaId').value = categoria.id;
                getElement('nombreCategoria').value = categoria.nombre;
                getElement('descripcionCategoria').value = categoria.descripcion || '';
                getElement('tituloModalCategoria').textContent = 'Editar Categoría';
                const btnGuardar = getElement('btnGuardarCategoria');
                btnGuardar.textContent = 'Actualizar Categoría';
                btnGuardar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                btnGuardar.style.border = 'none';
                
                const modalElement = getElement('modalCategoria');
                if (modalElement) {
                    const existingModal = bootstrap.Modal.getInstance(modalElement);
                    if (existingModal) {
                        existingModal.dispose();
                    }
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();
                }
            }
            return;
        }
        
        // DESACTIVAR
        const btnDesactivar = e.target.closest('.btnDesactivarCategoria');
        if (btnDesactivar) {
            if (btnDesactivar.disabled) return;
            if (!esAdminSesion) return;
            
            const id = parseInt(btnDesactivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Desactivar Categoría',
                '¿Desea desactivar esta categoría?',
                () => cambiarEstado(id, 0, 'Categoría desactivada', 'warning'),
                'warning',
                'Desactivar'
            );
            return;
        }
        
        // ACTIVAR
        const btnActivar = e.target.closest('.btnActivarCategoria');
        if (btnActivar) {
            if (btnActivar.disabled) return;
            if (!esAdminSesion) return;
            
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Categoría',
                '¿Desea activar esta categoría?',
                () => cambiarEstado(id, 1, 'Categoría activada', 'success'),
                'success',
                'Activar'
            );
            return;
        }
        
        // ELIMINAR
        const btnEliminar = e.target.closest('.btnEliminarCategoria');
        if (btnEliminar) {
            if (btnEliminar.disabled) return;
            if (!esAdminSesion) return;
            
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Eliminar Categoría',
                '¿Desea eliminar esta categoría?',
                () => cambiarEstado(id, 2, 'Categoría eliminada', 'danger'),
                'danger',
                'Eliminar'
            );
            return;
        }
    });
}

// ==================== CONFIGURAR MODAL DE CONFIRMACIÓN ====================
function setupConfirmacionModal() {
    const modalConfirmacion = getElement('modalConfirmacionCategoria');
    if (!modalConfirmacion) return;
    
    const btnConfirmar = document.getElementById('btnConfirmarAccionCategoria');
    
    if (btnConfirmar) {
        btnConfirmar.onclick = async () => {
            if (confirmacionCallback) {
                await confirmacionCallback();
                confirmacionCallback = null;
            }
            const modal = bootstrap.Modal.getInstance(modalConfirmacion);
            if (modal) {
                modal.hide();
                limpiarBackdrops();
            }
        };
    }
    
    modalConfirmacion.addEventListener('hidden.bs.modal', () => {
        confirmacionCallback = null;
        limpiarBackdrops();
    });
}

// ==================== INICIALIZACIÓN DE COMPONENTES ====================
function setupBuscador() {
    const inputBuscar = getElement('buscarCategoria');
    if (!inputBuscar) return;
    
    const newInput = inputBuscar.cloneNode(true);
    inputBuscar.parentNode.replaceChild(newInput, inputBuscar);
    
    newInput.addEventListener('input', () => {
        aplicarFiltros();
    });
    
    elementos['buscarCategoria'] = newInput;
}

function setupFiltroCantidad() {
    const filtro = getElement('filtroCantidadCategorias');
    if (!filtro) return;
    
    const newFiltro = filtro.cloneNode(true);
    filtro.parentNode.replaceChild(newFiltro, filtro);
    
    newFiltro.addEventListener('change', () => {
        aplicarFiltros();
    });
    
    elementos['filtroCantidadCategorias'] = newFiltro;
}

function setupNuevoCategoria() {
    // Función vacía porque el evento se maneja en renderizarBotonesAccion
}

// ==================== INICIALIZACIÓN PRINCIPAL ====================
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarCategorias();
        renderizarBotonesAccion();
        return;
    }
    
    eventosInicializados = true;
    
    setupGlobalEventListeners();
    setupGuardarCategoria();
    setupNuevoCategoria();
    setupBuscador();
    setupFiltroCantidad();
    setupConfirmacionModal();
    
    await cargarCategorias();
    renderizarBotonesAccion();
    
    console.log('Módulo Categorías inicializado');
}

export function destroy() {
    eventosInicializados = false;
    elementos = {};
    categoriasGlobal = [];
    confirmacionCallback = null;
}


