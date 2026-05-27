import { mostrarToast, limpiarBackdrops, prepararModal, cerrarModal, mostrarModalConfirmacionProfesional } from './helpers.js';

let categoriasGlobal = [];
let eventosInicializados = false;
let elementos = {};
let confirmacionCallback = null;


// VERIFICAR PÁGINA ACTUAL
function isCurrentPage() {
    return document.getElementById('tablaCategorias') !== null;
}


// OBTENER ELEMENTO CON CACHE
function getElement(id) {
    if (!elementos[id]) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}


// LIMPIAR FORMULARIO MODAL
function limpiarFormulario() {
    const form = getElement('formCategoria');
    if (form) form.reset();
    
    const categoriaId = getElement('categoriaId');
    if (categoriaId) categoriaId.value = '';
    
    const tituloModal = getElement('tituloModalCategoria');
    if (tituloModal) tituloModal.textContent = 'Nueva Categoría';
    
    const btnGuardar = getElement('btnGuardarCategoria');
    btnGuardar.textContent = 'Guardar Categoría';
    btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
    btnGuardar.style.border = 'none';
}


// APLICAR FILTROS
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
        .reverse()
        .slice(0, cantidadMostrar);
    
    renderizar(categoriasFiltradas);
}


// RENDERIZAR TABLA
function renderizar(categorias) {
    const tabla = getElement('tablaCategorias');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (categorias.length === 0) {
        tabla.innerHTML = `<td><td colspan="6" class="text-center text-muted py-4">No hay categorías registradas</td></tr>`;
        return;
    }
    
    categorias.forEach(categoria => {
        tabla.innerHTML += `
            <tr>
                <td>${categoria.id}</td>
                <td>${categoria.nombre}</td>
                <td>${categoria.descripcion || '-'}</td>
                <td>
                    ${categoria.estado === 1 
                        ? '<span class="badge bg-success">Activo</span>'
                        : '<span class="badge bg-secondary">Inactivo</span>'
                    }
                </td>
                <td class="text-center">${categoria.fecha_creacion || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning btnEditarCategoria" data-id="${categoria.id}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${categoria.estado === 1 
                        ? `<button class="btn btn-sm btn-secondary btnDesactivarCategoria" data-id="${categoria.id}">
                            <i class="bi bi-slash-circle"></i>
                        </button>`
                        : `<button class="btn btn-sm btn-success btnActivarCategoria" data-id="${categoria.id}">
                            <i class="bi bi-check-circle"></i>
                        </button>`
                    }
                    <button class="btn btn-sm btn-danger btnEliminarCategoria" data-id="${categoria.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}


// CARGAR CATEGORIAS
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


// CAMBIAR ESTADO
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


// CONFIGURAR MODAL DE CONFIRMACIÓN
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


// MANEJADOR ÚNICO DE EVENTOS
function setupGlobalEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        // EDITAR
        const btnEditar = e.target.closest('.btnEditarCategoria');
        if (btnEditar) {
            const id = parseInt(btnEditar.dataset.id);
            const categoria = categoriasGlobal.find(c => c.id === id);
            
            if (categoria) {
                getElement('categoriaId').value = categoria.id;
                getElement('nombreCategoria').value = categoria.nombre;
                getElement('descripcionCategoria').value = categoria.descripcion || '';
                getElement('tituloModalCategoria').textContent = 'Editar Categoría';
                const btnGuardar = getElement('btnGuardarCategoria');
                btnGuardar.textContent = 'Actualizar Categoría';
                btnGuardar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                btnGuardar.style.border = 'none';
                
                const modal = new bootstrap.Modal(getElement('modalCategoria'));
                modal.show();
            }
            return;
        }
        
        // DESACTIVAR
        const btnDesactivar = e.target.closest('.btnDesactivarCategoria');
        if (btnDesactivar) {
            const id = parseInt(btnDesactivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Desactivar Categoría',
                '¿Desea desactivar esta categoría?',
                () => cambiarEstado(id, 0, 'Categoría desactivada', 'warning'),
                'warning'
            );
            return;
        }
        
        // ACTIVAR
        const btnActivar = e.target.closest('.btnActivarCategoria');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Categoría',
                '¿Desea activar esta categoría?',
                () => cambiarEstado(id, 1, 'Categoría activada', 'success'),
                'success'
            );
            return;
        }
        
        // ELIMINAR
        const btnEliminar = e.target.closest('.btnEliminarCategoria');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Eliminar Categoría',
                '¿Desea eliminar esta categoría?',
                () => cambiarEstado(id, 2, 'Categoría eliminada', 'danger'),
                'danger'
            );
            return;
        }
    });
}


// GUARDAR CATEGORIA
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


// NUEVO CATEGORIA
function setupNuevoCategoria() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalCategoria"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => {
            limpiarFormulario();
        });
    }
}


// BUSCADOR
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


// FILTRO CANTIDAD
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


// INICIALIZACIÓN PRINCIPAL
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarCategorias();
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
    
    console.log('Módulo Categorías inicializado');
}


// DESTRUIR MÓDULO
export function destroy() {
    eventosInicializados = false;
    elementos = {};
    categoriasGlobal = [];
    confirmacionCallback = null;
}




