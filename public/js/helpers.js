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
export function mostrarModalConfirmacionProfesional(titulo, mensaje, onConfirm, tipo = 'warning') {
    // Buscar o crear el modal global
    let modalElement = document.getElementById('modalConfirmacionGlobal');
    
    if (!modalElement) {
        // Crear modal si no existe
        modalElement = document.createElement('div');
        modalElement.className = 'modal fade';
        modalElement.id = 'modalConfirmacionGlobal';
        modalElement.tabIndex = '-1';
        modalElement.setAttribute('data-bs-backdrop', 'static');
        modalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-lg border-0" style="border-radius: 20px; overflow: hidden;">
                    <div class="modal-header border-0 pt-4 pb-0" style="background: white;">
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center p-4">
                        <div class="modal-icon mb-3">
                            <i class="bi bi-exclamation-triangle-fill fs-1 text-warning"></i>
                        </div>
                        <h5 class="modal-title fw-bold mb-3"></h5>
                        <p class="text-muted modal-mensaje"></p>
                    </div>
                    <div class="modal-footer border-0 justify-content-center gap-3 pb-4">
                        <button type="button" class="btn btn-outline-secondary px-4" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Cancelar
                        </button>
                        <button type="button" class="btn btn-warning px-4 btn-confirmar">
                            <i class="bi bi-check-circle me-1"></i> Confirmar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
    }
    
    // Configuración según tipo
    const config = {
        danger: {
            icon: 'bi-exclamation-octagon-fill',
            iconColor: 'text-danger',
            btnClass: 'btn-danger',
            btnIcon: 'bi-trash',
            btnText: 'Eliminar'
        },
        warning: {
            icon: 'bi-exclamation-triangle-fill',
            iconColor: 'text-warning',
            btnClass: 'btn-warning',
            btnIcon: 'bi-shield-exclamation',
            btnText: 'Anular'
        },
        success: {
            icon: 'bi-check-circle-fill',
            iconColor: 'text-success',
            btnClass: 'btn-success',
            btnIcon: 'bi-check-lg',
            btnText: 'Activar'
        },
        info: {
            icon: 'bi-info-circle-fill',
            iconColor: 'text-info',
            btnClass: 'btn-info',
            btnIcon: 'bi-info-lg',
            btnText: 'Confirmar'
        }
    };
    
    const cfg = config[tipo] || config.warning;
    
    // Aplicar configuración
    const iconEl = modalElement.querySelector('.modal-icon i');
    const titleEl = modalElement.querySelector('.modal-title');
    const messageEl = modalElement.querySelector('.modal-mensaje');
    const confirmBtn = modalElement.querySelector('.btn-confirmar');
    
    if (iconEl) {
        iconEl.className = `bi ${cfg.icon} fs-1 ${cfg.iconColor}`;
    }
    if (titleEl) titleEl.textContent = titulo;
    if (messageEl) messageEl.innerHTML = mensaje;
    if (confirmBtn) {
        confirmBtn.className = `btn ${cfg.btnClass} px-4 btn-confirmar`;
        confirmBtn.innerHTML = `<i class="bi ${cfg.btnIcon} me-1"></i> ${cfg.btnText}`;
        
        // Remover eventos anteriores
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        newBtn.onclick = async () => {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            limpiarBackdrops();
            await onConfirm();
        };
    }
    
    // Limpiar backdrops antes de abrir
    limpiarBackdrops();
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}


// MOSTRAR MODAL DE ADVERTENCIA (para errores de permisos)
export function mostrarModalAdvertencia(mensaje) {
    // Verificar si el modal existe en el DOM
    let modalElement = document.getElementById('modalAdvertencia');
    
    // Si no existe, no hacer nada
    if (!modalElement) return;
    
    // Actualizar mensaje
    const mensajeElement = document.getElementById('mensajeAdvertencia');
    if (mensajeElement) mensajeElement.textContent = mensaje;
    
    // Crear instancia del modal
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}




