export function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.getElementById('toastMensaje');
    const body = document.getElementById('toastBody');
    const progress = document.getElementById('toastProgress');
    
    if (!toast) {
        console.warn('Toast no encontrado en el DOM');
        return;
    }
    
    if (!body) {
        console.warn('ToastBody no encontrado en el DOM');
        return;
    }
    
    body.textContent = mensaje;
    
    toast.classList.remove(
        'bg-success',
        'bg-warning',
        'bg-danger',
        'bg-info',
        'text-white',
        'text-dark'
    );
    
    switch (tipo) {
        case 'success':
            toast.classList.add('bg-success', 'text-white');
            break;
        case 'warning':
            toast.classList.add('bg-warning', 'text-dark');
            break;
        case 'danger':
            toast.classList.add('bg-danger', 'text-white');
            break;
        case 'info':
            toast.classList.add('bg-info', 'text-dark');
            break;
        default:
            toast.classList.add('bg-success', 'text-white');
    }
    
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    
    if (progress) {
        progress.style.transition = 'none';
        progress.style.width = '100%';
        
        setTimeout(() => {
            progress.style.transition = 'width 3000ms linear';
            progress.style.width = '0%';
        }, 10);
    }
    
    bsToast.show();
}


// FUNCIÓN PARA LIMPIAR BACKDROPS
export function limpiarBackdrops() {
    // Eliminar todos los backdrops existentes
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
    });
    
    // Eliminar cualquier backdrop con otras clases
    document.querySelectorAll('[class*="backdrop"]').forEach(backdrop => {
        if (backdrop.classList.contains('modal-backdrop')) {
            backdrop.remove();
        }
    });
    
    // Restaurar el body correctamente
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-left');
    
    // Forzar reflow del body
    void document.body.offsetHeight;
}


// FUNCIÓN PARA ARREGLAR MODALES ANTES DE ABRIR
export function prepararModal(modalElement) {
    if (!modalElement) return;
    
    // Limpiar backdrops antes de abrir un nuevo modal
    limpiarBackdrops();
    
    // Asegurar que el modal tenga el z-index correcto
    modalElement.style.zIndex = '1050';
    
    // Remover clases residuales del modal
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    modalElement.removeAttribute('aria-modal');
    modalElement.removeAttribute('style');
}


// FUNCIÓN PARA CERRAR MODAL LIMPIAMENTE
export function cerrarModal(modalElement) {
    if (!modalElement) return;
    
    try {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    } catch (e) {
        // Si no hay instancia, simplemente ocultar
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
    }
    
    // Limpiar backdrops después de cerrar
    setTimeout(() => {
        limpiarBackdrops();
    }, 150);
}


// MODAL DE CONFIRMACIÓN
export function mostrarModalConfirmacionProfesional(titulo, mensaje, onConfirm, tipo = 'warning', textoBoton = 'Confirmar') {

    const modalExistente = document.getElementById('modalConfirmacionProfesional');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Configuración según el tipo de acción 
    const config = {
        warning: {
            color: '#f59e0b',
            colorHover: '#d97706',
            icono: 'bi-exclamation-triangle-fill',
            iconoBoton: 'bi-slash-circle',
            bgLight: '#fef3c7'
        },
        success: {
            color: '#10b981',
            colorHover: '#059669',
            icono: 'bi-check-circle-fill',
            iconoBoton: 'bi-check-circle',
            bgLight: '#d1fae5'
        },
        danger: {
            color: '#ef4444',
            colorHover: '#dc2626',
            icono: 'bi-trash-fill',
            iconoBoton: 'bi-trash',
            bgLight: '#fee2e2'
        },
        info: {
            color: '#3b82f6',
            colorHover: '#2563eb',
            icono: 'bi-info-circle-fill',
            iconoBoton: 'bi-info-circle',
            bgLight: '#dbeafe'
        }
    };
    
    const conf = config[tipo] || config.warning;
    
    const modalHTML = `
        <div class="modal fade" id="modalConfirmacionProfesional" tabindex="-1" data-bs-backdrop="false" data-bs-keyboard="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 420px;">
                <div class="modal-content" style="border: none; border-radius: 28px; overflow: hidden; background: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                    
                    <!-- Botón cerrar (esquina superior derecha) -->
                    <button type="button" class="btn-close" data-bs-dismiss="modal" style="position: absolute; top: 20px; right: 20px; z-index: 10; opacity: 0.5; transition: opacity 0.2s;" aria-label="Cerrar"></button>
                    
                    <!-- Contenido principal -->
                    <div style="padding: 40px 32px 32px 32px; text-align: center;">
                        
                        <!-- Icono circular animado -->
                        <div style="background: ${conf.bgLight}; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; animation: fadeInScale 0.3s ease-out;">
                            <i class="bi ${conf.icono}" style="font-size: 42px; color: ${conf.color};"></i>
                        </div>
                        
                        <!-- Título -->
                        <h5 style="color: #111827; font-weight: 700; font-size: 1.35rem; margin-bottom: 12px; letter-spacing: -0.3px;">
                            ${titulo}
                        </h5>
                        
                        <!-- Mensaje -->
                        <p style="color: #6b7280; font-size: 0.9rem; line-height: 1.5; margin-bottom: 28px; max-width: 320px; margin-left: auto; margin-right: auto;">
                            ${mensaje}
                        </p>
                        
                        <!-- Botones -->
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button type="button" class="btn-cancelar-modal" data-bs-dismiss="modal" style="flex: 1; padding: 10px 20px; border-radius: 60px; border: 1px solid #e5e7eb; background: white; color: #6b7280; font-weight: 500; font-size: 0.875rem; transition: all 0.2s; cursor: pointer;">
                                <i class="bi bi-x-circle me-1"></i> Cancelar
                            </button>
                            <button type="button" class="btn-confirmar-modal" id="btnConfirmarAccionProfesional" style="flex: 1; padding: 10px 20px; border-radius: 60px; border: none; background: ${conf.color}; color: white; font-weight: 600; font-size: 0.875rem; transition: all 0.2s; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                                <i class="bi ${conf.iconoBoton}"></i> ${textoBoton}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }
        .btn-cancelar-modal:hover {
            background: #f9fafb !important;
            border-color: #d1d5db !important;
            transform: translateY(-1px);
        }
        .btn-confirmar-modal:hover {
            transform: translateY(-2px);
            filter: brightness(1.05);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        .btn-cancelar-modal:active, .btn-confirmar-modal:active {
            transform: translateY(0px);
        }
        .btn-close:hover {
            opacity: 0.8 !important;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 50%;
        }
    `;
    document.head.appendChild(style);
    
    // Mostrar modal
    const modalElement = document.getElementById('modalConfirmacionProfesional');
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: false,
        keyboard: true
    });
    modal.show();
    
    // Evento del botón confirmar
    const btnConfirmar = document.getElementById('btnConfirmarAccionProfesional');
    btnConfirmar.onclick = () => {
        onConfirm();
        modal.hide();
        setTimeout(() => {
            modalElement.remove();
            limpiarBackdrops();
        }, 300);
    };
    
    // Limpiar al cerrar
    modalElement.addEventListener('hidden.bs.modal', function() {
        modalElement.remove();
        limpiarBackdrops();
    });
}


