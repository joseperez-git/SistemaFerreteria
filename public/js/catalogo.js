import { mostrarToast, mostrarModalConfirmacionProfesional } from './helpers.js';

let redModal = null;
let eventosInicializados = false;

function isCurrentPage() {
    return document.getElementById('logos-container') !== null ||
        document.getElementById('sliders-container') !== null ||
        document.getElementById('redes-container') !== null;
}

// ============================================ LOGO ============================================
async function cargarLogos() {
    if (!isCurrentPage()) return;
    try {
        const data = await (await fetch('/api/catalogo/logo/listar')).json();
        const c = document.getElementById('logos-container');
        if (!c) return;
        if (!Array.isArray(data) || data.length === 0) {
            c.innerHTML = '<div class="col-12 text-center py-3 text-muted">No hay logos registrados</div>';
            return;
        }
        c.innerHTML = data.map(l => `
            <div class="col-md-3 col-sm-6">
                <div class="card border ${l.publicado == 1 ? 'border-success' : ''}">
                    <div class="card-img-top text-center p-3 bg-light">
                        <img src="${l.url_completa || l.ruta}" alt="Logo" style="max-height:100px;max-width:100%">
                        ${l.publicado == 1 ? '<span class="badge bg-success mt-2">Publicado</span>' : ''}
                    </div>
                    <div class="card-body text-center p-2">
                        ${l.publicado != 1 ? `<button class="btn btn-sm btn-success btnPublicarLogo" data-id="${l.id}"><i class="bi bi-check-lg"></i> Publicar</button>` : ''}
                        <button class="btn btn-sm btn-danger btnEliminarLogo" data-id="${l.id}"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { console.error('Error cargarLogos:', e); }
}

async function subirLogo(file) {
    const fd = new FormData();
    fd.append('imagen', file);
    try {
        const r = await (await fetch('/api/catalogo/logo/subir', { method: 'POST', body: fd })).json();
        if (r.message) {
            mostrarToast(r.message, 'success');
            await cargarLogos();
        } else if (r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al subir logo', 'danger');
    }
}

async function publicarLogo(id) {
    try {
        const r = await (await fetch(`/api/catalogo/logo/publicar/${id}`, { method: 'POST' })).json();
        if (r.message) {
            mostrarToast(r.message, 'success');
            await cargarLogos();
        } else if (r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al publicar logo', 'danger');
    }
}

async function eliminarLogo(id) {
    mostrarModalConfirmacionProfesional('Eliminar Logo', '¿Desea eliminar este logo?', async () => {
        try {
            const r = await (await fetch(`/api/catalogo/logo/eliminar/${id}`, { method: 'DELETE' })).json();
            if (r.message) {
                mostrarToast(r.message, 'success');
                await cargarLogos();
            } else if (r.error) {
                mostrarToast(r.error, 'danger');
            }
        } catch (e) {
            mostrarToast('Error al eliminar logo', 'danger');
        }
    }, 'danger', 'Eliminar');
}

// ============================================ SLIDER ============================================
async function cargarSliders() {
    if (!isCurrentPage()) return;
    try {
        const data = await (await fetch('/api/catalogo/slider/listar')).json();
        const c = document.getElementById('sliders-container');
        if (!c) return;
        if (!Array.isArray(data) || data.length === 0) {
            c.innerHTML = '<div class="col-12 text-center py-3 text-muted">No hay imágenes en el slider</div>';
            return;
        }
        c.innerHTML = data.map(s => `
            <div class="col-md-3 col-sm-6">
                <div class="card border ${s.estado == 1 ? 'border-success' : ''}">
                    <div class="card-img-top text-center p-3 bg-light">
                        <img src="${s.url_completa || s.ruta}" alt="Slide" style="max-height:100px;max-width:100%">
                        <span class="badge ${s.estado == 1 ? 'bg-success' : s.estado == 0 ? 'bg-warning' : 'bg-danger'} mt-2">
                            ${s.estado == 1 ? 'Activo' : s.estado == 0 ? 'Inactivo' : 'Eliminado'}
                        </span>
                    </div>
                    <div class="card-body text-center p-2">
                        ${s.estado == 1 ? `<button class="btn btn-sm btn-warning btnInactivarSlider" data-id="${s.id}"><i class="bi bi-pause-fill"></i> Inactivar</button>` : ''}
                        ${s.estado == 0 ? `<button class="btn btn-sm btn-success btnPublicarSlider" data-id="${s.id}"><i class="bi bi-check-lg"></i> Publicar</button>` : ''}
                        ${s.estado != 2 ? `<button class="btn btn-sm btn-danger btnEliminarSlider" data-id="${s.id}"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { console.error('Error cargarSliders:', e); }
}

async function subirSlider(file) {
    const fd = new FormData();
    fd.append('imagen', file);
    try {
        const r = await (await fetch('/api/catalogo/slider/subir', { method: 'POST', body: fd })).json();
        if (r.message) {
            mostrarToast(r.message, 'success');
            await cargarSliders();
        } else if (r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al subir slider', 'danger');
    }
}

async function cambiarEstadoSlider(id, accion) {
    const endpoints = {
        publicar: `publicar/${id}`,
        inactivar: `inactivar/${id}`,
        eliminar: `eliminar/${id}`
    };
    const method = accion === 'eliminar' ? 'DELETE' : 'POST';
    try {
        const r = await (await fetch(`/api/catalogo/slider/${endpoints[accion]}`, { method })).json();
        if (r.message) {
            mostrarToast(r.message, 'success');
            await cargarSliders();
        } else if (r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al actualizar slider', 'danger');
    }
}

// ============================================ REDES SOCIALES ============================================
async function cargarRedes() {
    if (!isCurrentPage()) return;
    try {
        const data = await (await fetch('/api/catalogo/redes/listar')).json();
        const c = document.getElementById('redes-container');
        if (!c) return;
        if (!Array.isArray(data) || data.length === 0) {
            c.innerHTML = '<div class="col-12 text-center py-3 text-muted">No hay redes sociales registradas</div>';
            return;
        }
        const col = {
            facebook: '#1877F2', instagram: '#E4405F', tiktok: '#000000',
            twitter: '#1DA1F2', youtube: '#FF0000', linkedin: '#0A66C2',
            whatsapp: '#25D366', web: '#6C757D'
        };
        c.innerHTML = data.map(rr => `
            <div class="col-md-6 col-lg-4">
                <div class="card border-start border-4" style="border-left-color:${col[rr.tipo] || '#6C757D'}!important">
                    <div class="card-body d-flex align-items-center gap-3">
                        <div class="rounded-circle p-2 text-white d-flex align-items-center justify-content-center" 
                             style="background:${col[rr.tipo] || '#6C757D'};width:40px;height:40px;min-width:40px;">
                            <i class="bi bi-${rr.tipo === 'twitter' ? 'twitter-x' : rr.tipo}"></i>
                        </div>
                        <div class="flex-grow-1" style="min-width:0;">
                            <strong style="font-size:0.85rem;">${rr.nombre}</strong><br>
                            <small class="text-muted text-truncate d-block" style="font-size:0.7rem;">${rr.url}</small>
                            <span class="badge ${rr.estado == 1 ? 'bg-success' : rr.estado == 0 ? 'bg-warning' : 'bg-danger'} mt-1" style="font-size:0.65rem;">
                                ${rr.estado == 1 ? 'Activo' : rr.estado == 0 ? 'Inactivo' : 'Eliminado'}
                            </span>
                        </div>
                        <div class="d-flex gap-1 flex-shrink-0">
                            <button class="btn btn-sm btn-outline-warning btnEditarRed" data-id="${rr.id}" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            ${rr.estado != 2 ? `
                                <button class="btn btn-sm ${rr.estado == 1 ? 'btn-outline-warning' : 'btn-outline-success'} btnToggleRed" 
                                        data-id="${rr.id}" data-estado="${rr.estado}" 
                                        title="${rr.estado == 1 ? 'Inactivar' : 'Activar'}">
                                    <i class="bi ${rr.estado == 1 ? 'bi-pause-fill' : 'bi-play-fill'}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger btnEliminarRed" data-id="${rr.id}" title="Eliminar">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>`).join('');
    } catch (e) { console.error('Error cargarRedes:', e); }
}

async function guardarRed() {
    const id = document.getElementById('redId')?.value || null;
    const tipo = document.getElementById('redTipo')?.value;
    const nombre = document.getElementById('redNombre')?.value.trim();
    const url = document.getElementById('redUrl')?.value.trim();

    if (!tipo) { mostrarToast('Seleccione un tipo de red', 'warning'); return; }
    if (!nombre || nombre.length < 2) { mostrarToast('El nombre debe tener al menos 2 caracteres', 'warning'); return; }
    if (!url) { mostrarToast('La URL es obligatoria', 'warning'); return; }
    if (!url.startsWith('http')) { mostrarToast('La URL debe comenzar con http:// o https://', 'warning'); return; }

    try {
        const r = await (await fetch('/api/catalogo/redes/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, tipo, nombre, url })
        })).json();

        if (r.message) {
            mostrarToast(r.message, 'success');
            if (redModal) redModal.hide();
            await cargarRedes();
        } else if (r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al guardar red social', 'danger');
    }
}

async function toggleRed(id, estadoActual) {
    const endpoint = estadoActual == 1 ? 'inactivar' : 'activar';
    try {
        const r = await (await fetch(`/api/catalogo/redes/${endpoint}/${id}`, { method: 'POST' })).json();
        if (r.message) {
            mostrarToast(r.message, 'success');
            await cargarRedes();
        } else if (r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al cambiar estado', 'danger');
    }
}

async function editarRed(id) {
    try {
        const r = await (await fetch(`/api/catalogo/redes/${id}`)).json();
        if (r && r.id) {
            document.getElementById('redId').value = r.id;
            document.getElementById('redTipo').value = r.tipo;
            document.getElementById('redNombre').value = r.nombre;
            document.getElementById('redUrl').value = r.url;
            document.getElementById('redModalLabel').textContent = 'Editar Red Social';
            if (!redModal) redModal = new bootstrap.Modal(document.getElementById('redModal'));
            redModal.show();
        } else if (r && r.error) {
            mostrarToast(r.error, 'danger');
        }
    } catch (e) {
        mostrarToast('Error al cargar red social', 'danger');
    }
}

function limpiarFormRed() {
    document.getElementById('redId').value = '';
    document.getElementById('formRed')?.reset();
    document.getElementById('redModalLabel').textContent = 'Nueva Red Social';
    if (!redModal) redModal = new bootstrap.Modal(document.getElementById('redModal'));
    redModal.show();
}

// ============================================ EVENTOS ============================================
function setupEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;

        const btn = (selector) => e.target.closest(selector);

        // Logo
        const btnPubLogo = btn('.btnPublicarLogo');
        if (btnPubLogo) { await publicarLogo(parseInt(btnPubLogo.dataset.id)); return; }

        const btnEliLogo = btn('.btnEliminarLogo');
        if (btnEliLogo) { await eliminarLogo(parseInt(btnEliLogo.dataset.id)); return; }

        // Slider
        const btnPubSlider = btn('.btnPublicarSlider');
        if (btnPubSlider) { await cambiarEstadoSlider(parseInt(btnPubSlider.dataset.id), 'publicar'); return; }

        const btnInaSlider = btn('.btnInactivarSlider');
        if (btnInaSlider) { await cambiarEstadoSlider(parseInt(btnInaSlider.dataset.id), 'inactivar'); return; }

        const btnEliSlider = btn('.btnEliminarSlider');
        if (btnEliSlider) {
            mostrarModalConfirmacionProfesional('Eliminar Slider', '¿Desea eliminar esta imagen del slider?',
                async () => { await cambiarEstadoSlider(parseInt(btnEliSlider.dataset.id), 'eliminar'); },
                'danger', 'Eliminar');
            return;
        }

        // Redes
        const btnEditarRed = btn('.btnEditarRed');
        if (btnEditarRed) { await editarRed(parseInt(btnEditarRed.dataset.id)); return; }

        const btnToggleRed = btn('.btnToggleRed');
        if (btnToggleRed) { await toggleRed(parseInt(btnToggleRed.dataset.id), parseInt(btnToggleRed.dataset.estado)); return; }

        const btnEliRed = btn('.btnEliminarRed');
        if (btnEliRed) {
            mostrarModalConfirmacionProfesional('Eliminar Red Social', '¿Desea eliminar esta red social?',
                async () => { await toggleRed(parseInt(btnEliRed.dataset.id), 2); },
                'danger', 'Eliminar');
            return;
        }
    });

    // Inputs de archivo
    const inputLogo = document.getElementById('input-logo');
    if (inputLogo) {
        inputLogo.addEventListener('change', (e) => {
            if (e.target.files[0]) subirLogo(e.target.files[0]);
        });
    }

    const inputSlider = document.getElementById('input-slider');
    if (inputSlider) {
        inputSlider.addEventListener('change', (e) => {
            if (e.target.files[0]) subirSlider(e.target.files[0]);
        });
    }

    // Botón nueva red
    const btnNuevaRed = document.getElementById('btn-nueva-red');
    if (btnNuevaRed) btnNuevaRed.addEventListener('click', limpiarFormRed);

    // Formulario de red
    const formRed = document.getElementById('formRed');
    if (formRed) {
        formRed.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarRed();
        });
    }
}

// ============================================ INICIALIZACIÓN ============================================
export async function init() {
    if (!isCurrentPage()) return;

    if (eventosInicializados) {
        await cargarLogos();
        await cargarSliders();
        await cargarRedes();
        return;
    }

    eventosInicializados = true;
    setupEventListeners();

    const modalEl = document.getElementById('redModal');
    if (modalEl) redModal = new bootstrap.Modal(modalEl);

    await cargarLogos();
    await cargarSliders();
    await cargarRedes();

    console.log('✅ Módulo Catálogo inicializado');
}

export function destroy() {
    eventosInicializados = false;
    redModal = null;
}