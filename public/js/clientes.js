import { mostrarToast, limpiarBackdrops, mostrarModalConfirmacionProfesional } from './helpers.js';

let clientesGlobal = [];
let eventosInicializados = false;
let elementos = {};
let confirmacionCallback = null;


// FUNCIONES DE VALIDACIÓN
function soloNumeros(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > 9) {
        input.value = input.value.slice(0, 9);
    }
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
        case 'CE':
            if (!/^[A-Z0-9]{6,12}$/i.test(num)) {
                return { valido: false, mensaje: 'El Carné de Extranjería debe tener entre 6 y 12 caracteres alfanuméricos' };
            }
            break;
        case 'PASAPORTE':
            if (!/^[A-Z0-9]{6,12}$/i.test(num)) {
                return { valido: false, mensaje: 'El Pasaporte debe tener entre 6 y 12 caracteres alfanuméricos' };
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


// VERIFICAR PÁGINA ACTUAL
function isCurrentPage() {
    return document.getElementById('tablaClientes') !== null;
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
    const form = getElement('formCliente');
    if (form) form.reset();
    
    const clienteId = getElement('clienteId');
    if (clienteId) clienteId.value = '';
    
    const tituloModal = getElement('tituloModalCliente');
    if (tituloModal) tituloModal.textContent = 'Nuevo Cliente';
    
    const btnGuardar = getElement('btnGuardarCliente');
    btnGuardar.textContent = 'Guardar Cliente';
    btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
    btnGuardar.style.border = 'none';
}


// APLICAR FILTROS
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
        .reverse()
        .slice(0, cantidadMostrar);
    
    renderizar(clientesFiltrados);
}


// RENDERIZAR TABLA
function renderizar(clientes) {
    const tabla = getElement('tablaClientes');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (clientes.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No hay clientes registrados</td></tr>`;
        return;
    }
    
    clientes.forEach(cliente => {
        tabla.innerHTML += `
            <tr>
                <td>${cliente.id}</td>
                <td>${cliente.tipo_documento}</td>
                <td>${cliente.numero_documento}</td>
                <td>${cliente.nombre} ${cliente.apellido || ''}</td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.correo || '-'}</td>
                <td>
                    ${cliente.estado === 1 
                        ? '<span class="badge bg-success">Activo</span>'
                        : '<span class="badge bg-secondary">Inactivo</span>'
                    }
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning btnEditarCliente" data-id="${cliente.id}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    ${cliente.estado === 1 
                        ? `<button class="btn btn-sm btn-secondary btnDesactivarCliente" data-id="${cliente.id}">
                            <i class="bi bi-slash-circle"></i>
                        </button>`
                        : `<button class="btn btn-sm btn-success btnActivarCliente" data-id="${cliente.id}">
                            <i class="bi bi-check-circle"></i>
                        </button>`
                    }
                    <button class="btn btn-sm btn-danger btnEliminarCliente" data-id="${cliente.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}


// CARGAR CLIENTES
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


// CAMBIAR ESTADO
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


// CONFIGURAR MODAL DE CONFIRMACIÓN
function setupConfirmacionModal() {
    const modalConfirmacion = getElement('modalConfirmacionCliente');
    if (!modalConfirmacion) return;
    
    const btnConfirmar = document.getElementById('btnConfirmarAccionCliente');
    
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


// VALIDACIONES EN TIEMPO REAL
function setupValidacionesTiempoReal() {
    const tipoDocumento = getElement('tipo_documento');
    const numeroDocumento = getElement('numero_documento');
    const telefono = getElement('telefono');
    const nombre = getElement('nombre');
    const apellido = getElement('apellido');
    const helpDocumento = document.getElementById('helpDocumento');
    
    if (tipoDocumento) {
        tipoDocumento.addEventListener('change', () => {
            if (numeroDocumento) {
                numeroDocumento.value = '';
                numeroDocumento.maxLength = tipoDocumento.value === 'DNI' ? 8 : 
                                            tipoDocumento.value === 'RUC' ? 11 : 12;
                if (tipoDocumento.value === 'DNI' || tipoDocumento.value === 'RUC') {
                    numeroDocumento.oninput = () => soloNumeros(numeroDocumento);
                } else {
                    numeroDocumento.oninput = () => soloAlfanumerico(numeroDocumento);
                }
            }
            if (helpDocumento) {
                const mensajes = {
                    'DNI': 'Ingrese 8 dígitos (ej: 12345678)',
                    'RUC': 'Ingrese 11 dígitos (ej: 20123456789)'
                };
                helpDocumento.textContent = mensajes[tipoDocumento.value] || 'Ingrese el número de documento';
            }
        });
    }
    
    if (telefono) telefono.oninput = () => soloNumeros(telefono);
    if (nombre) nombre.oninput = () => soloLetrasYEspacios(nombre);
    if (apellido) apellido.oninput = () => soloLetrasYEspacios(apellido);
}


// MANEJADOR ÚNICO DE EVENTOS
function setupGlobalEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const btnEditar = e.target.closest('.btnEditarCliente');
        if (btnEditar) {
            const id = parseInt(btnEditar.dataset.id);
            const cliente = clientesGlobal.find(c => c.id === id);
            if (cliente) {
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

                const modal = new bootstrap.Modal(getElement('modalCliente'));
                modal.show();
            }
            return;
        }
        
        //Desactivar
        const btnDesactivar = e.target.closest('.btnDesactivarCliente');
        if (btnDesactivar) {
            const id = parseInt(btnDesactivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Desactivar Cliente',
                '¿Desea desactivar este cliente?',
                () => cambiarEstado(id, 0, 'Cliente desactivado', 'warning'),
                'warning'
            );
            return;
        }
        
        //Acticvar
        const btnActivar = e.target.closest('.btnActivarCliente');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Cliente',
                '¿Desea activar este cliente?',
                () => cambiarEstado(id, 1, 'Cliente activado', 'success'),
                'success'
            );
            return;
        }
        
        //Eliminar
        const btnEliminar = e.target.closest('.btnEliminarCliente');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Eliminar Cliente',
                '¿Desea eliminar este cliente?',
                () => cambiarEstado(id, 2, 'Cliente eliminado', 'danger'),
                'danger'
            );
            return;
        }
    });
}


// GUARDAR CLIENTE
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
        
        if (!tipo_documento) {
            mostrarToast('Seleccione el tipo de documento', 'warning');
            return;
        }
        if (!numero_documento) {
            mostrarToast('El número de documento es obligatorio', 'warning');
            return;
        }
        
        const validDoc = validarDocumento(tipo_documento, numero_documento);
        if (!validDoc.valido) {
            mostrarToast(validDoc.mensaje, 'warning');
            return;
        }
        
        if (!nombre) {
            mostrarToast('El nombre es obligatorio', 'warning');
            return;
        }
        if (nombre.length < 2) {
            mostrarToast('El nombre debe tener al menos 2 caracteres', 'warning');
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


// NUEVO CLIENTE
function setupNuevoCliente() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalCliente"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => {
            limpiarFormulario();
        });
    }
}


// BUSCADOR
function setupBuscador() {
    const inputBuscar = getElement('buscarCliente');
    if (!inputBuscar) return;
    
    const newInput = inputBuscar.cloneNode(true);
    inputBuscar.parentNode.replaceChild(newInput, inputBuscar);
    newInput.addEventListener('input', () => aplicarFiltros());
    elementos['buscarCliente'] = newInput;
}


// FILTRO CANTIDAD
function setupFiltroCantidad() {
    const filtro = getElement('filtroCantidadClientes');
    if (!filtro) return;
    
    const newFiltro = filtro.cloneNode(true);
    filtro.parentNode.replaceChild(newFiltro, filtro);
    newFiltro.addEventListener('change', () => aplicarFiltros());
    elementos['filtroCantidadClientes'] = newFiltro;
}


// BÚSQUEDA DE DOCUMENTO EN SUNAT (MiAPI.Cloud)
function setupBusquedaDocumento() {
    const btnBuscar = document.getElementById('btnBuscarCliente');
    const inputDoc = document.getElementById('numero_documento');
    
    if (!btnBuscar) return;

    btnBuscar.addEventListener('click', async () => {
        const tipo = getElement('tipo_documento').value;
        const numero = getElement('numero_documento').value.trim();
        
        // Validaciones
        if (!tipo) {
            mostrarToast('Seleccione el tipo de documento primero', 'warning');
            return;
        }
        
        if (!numero) {
            mostrarToast('Ingrese un número de documento', 'warning');
            inputDoc.classList.add('is-invalid');
            return;
        }
        
        // Validación de formato
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
        
        // Limpiar errores
        inputDoc.classList.remove('is-invalid');
        
        // Guardar contenido original del botón
        const originalIcon = btnBuscar.innerHTML;
        
        // Estado de carga (cambia ícono por spinner)
        btnBuscar.disabled = true;
        btnBuscar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        
        try {
            const response = await fetch(`/api/clientes/consultar-documento?numero=${numero}&tipo=${tipo}`);
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Documento no encontrado');
            
            // Verificar datos
            if (!data.nombre && !data.apellido) {
                throw new Error('No se encontraron datos para este documento');
            }
            
            // Autocompletar
            getElement('nombre').value = data.nombre || '';
            getElement('apellido').value = data.apellido || '';
            
            if (data.telefono && !getElement('telefono').value) {
                getElement('telefono').value = data.telefono;
            }
            if (data.correo && !getElement('correo').value) {
                getElement('correo').value = data.correo;
            }
            
            mostrarToast('Datos cargados desde SUNAT', 'success');
            
            // Animación éxito
            inputDoc.classList.add('input-success-animation');
            setTimeout(() => {
                inputDoc.classList.remove('input-success-animation');
            }, 1500);
            
        } catch (error) {
            mostrarToast(error.message || 'Documento no encontrado', 'danger');
            inputDoc.classList.add('is-invalid');
        } finally {
            // Restaurar botón
            btnBuscar.disabled = false;
            btnBuscar.innerHTML = originalIcon;
        }
    });
    
    // Limpiar errores al escribir
    if (inputDoc) {
        inputDoc.addEventListener('input', () => {
            inputDoc.classList.remove('is-invalid');
            inputDoc.classList.remove('input-success-animation');
        });
    }
}


// INICIALIZACIÓN PRINCIPAL
export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarClientes();
        return;
    }
    
    eventosInicializados = true;
    
    setupGlobalEventListeners();
    setupGuardarCliente();
    setupNuevoCliente();
    setupBuscador();
    setupFiltroCantidad();
    setupConfirmacionModal();
    setupValidacionesTiempoReal();
    setupBusquedaDocumento();
    
    await cargarClientes();
    
    console.log('Módulo Clientes inicializado');
}


// DESTRUIR MÓDULO
export function destroy() {
    eventosInicializados = false;
    elementos = {};
    clientesGlobal = [];
    confirmacionCallback = null;
}




