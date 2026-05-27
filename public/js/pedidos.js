import { mostrarToast } from './helpers.js';

let eventosInicializados = false;

function isCurrentPage() {
    return document.getElementById('tablaPedidos') !== null;
}

export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) return;
    eventosInicializados = true;
    
    const contenido = document.getElementById('contenido');
    if (contenido) {
        contenido.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Pedidos</h2>
                <button class="btn btn-dark" disabled>
                    <i class="bi bi-plus-circle"></i> Nuevo Pedido
                </button>
            </div>
            <div class="card shadow-sm">
                <div class="card-body">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        Módulo de Pedidos - En construcción
                        <br><small>Próximamente disponible</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    mostrarToast('Módulo de Pedidos (en desarrollo)', 'info');
}

export function destroy() {
    eventosInicializados = false;
}






