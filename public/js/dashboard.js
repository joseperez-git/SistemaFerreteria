// ============================================
// VERIFICACIÓN DE SESIÓN
// ============================================
const sesionStorage = localStorage.getItem('sesion');

if (!sesionStorage) {
    window.location.href = '/login.html';
}

const sesion = JSON.parse(sesionStorage);

// Mostrar usuario logueado
const usuarioLogueado = document.getElementById('usuarioLogueado');
if (usuarioLogueado) {
    usuarioLogueado.textContent = `${sesion.usuario.nombre} ${sesion.usuario.apellido}`;
}


// ============================================
// VARIABLES GLOBALES
// ============================================
let moduloActual = null;
let vistaActual = '';
let cargandoVista = false;
let menuItemsInicializados = false;
let menuPermisos = [];
let chartVentas = null;
let chartCategorias = null;
let intervaloActualizacion = null;
let filtroActual = '7';


// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function limpiarModalesAbiertos() {
    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const modalesAbiertos = document.querySelectorAll('.modal.show');

        if (modalesAbiertos.length > 0) {
            if (backdrops.length > 1) {
                for (let i = 0; i < backdrops.length - 1; i++) {
                    backdrops[i].remove();
                }
            }
            document.body.classList.add('modal-open');
        } else {
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('padding-right');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-left');
        }
    }, 100);
}

function limpiarModuloAnterior() {
    if (moduloActual && typeof moduloActual.destroy === 'function') {
        try {
            moduloActual.destroy();
        } catch (error) {
            console.warn('Error al destruir módulo:', error);
        }
    }
    moduloActual = null;
}

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastMensaje');
    const toastBody = document.getElementById('toastBody');
    const progressBar = document.getElementById('toastProgress');

    if (!toastEl || !toastBody) {
        console.warn('Toast no disponible:', mensaje);
        alert(mensaje);
        return;
    }

    const colores = {
        success: 'bg-success',
        danger: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
    };

    toastEl.className = `toast align-items-center text-white border-0 ${colores[tipo] || 'bg-success'}`;
    toastBody.textContent = mensaje;

    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.transition = 'width 3s linear';
        setTimeout(() => { progressBar.style.width = '0%'; }, 50);
        setTimeout(() => { progressBar.style.transition = ''; }, 3050);
    }
}

function mostrarModalAdvertencia(mensaje) {
    let modalElement = document.getElementById('modalAdvertenciaGlobal');

    if (!modalElement) {
        modalElement = document.createElement('div');
        modalElement.className = 'modal fade';
        modalElement.id = 'modalAdvertenciaGlobal';
        modalElement.setAttribute('data-bs-backdrop', 'static');
        modalElement.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 24px; overflow: hidden;">
                    <div class="modal-header border-0 p-4" style="background: linear-gradient(135deg, #dc3545 0%, #b02a37 100%);">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle bg-white bg-opacity-20 p-2">
                                <i class="bi bi-shield-exclamation fs-4 text-white"></i>
                            </div>
                            <div>
                                <h5 class="modal-title text-white fw-bold mb-0">Acceso denegado</h5>
                                <p class="text-white-50 small mb-0">Permisos insuficientes</p>
                            </div>
                        </div>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4" style="background: #f8fafc;">
                        <div class="text-center mb-3">
                            <i class="bi bi-shield-slash fs-1 text-danger"></i>
                        </div>
                        <p class="text-center fw-semibold fs-6" id="mensajeAdvertenciaGlobal">
                            No tiene permisos para realizar esta acción.
                        </p>
                    </div>
                    <div class="modal-footer border-0 bg-light p-3">
                        <button type="button" class="btn btn-danger px-4" data-bs-dismiss="modal">
                            <i class="bi bi-check-circle me-1"></i> Entendido
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
    }

    const mensajeEl = document.getElementById('mensajeAdvertenciaGlobal');
    if (mensajeEl) mensajeEl.textContent = mensaje;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function resaltarModuloActivo(view) {
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`.sidebar-nav .nav-link[data-view="${view}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    if (view === 'dashboard') {
        const dashboardLink = document.querySelector('.sidebar-nav .nav-link[data-view="dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('active');
        }
    }
}


// ============================================
// DASHBOARD - CONFIGURAR FILTROS
// ============================================

function configurarFiltrosDashboard() {
    const filtroRango = document.getElementById('filtroRango');
    const fechasPersonalizadas = document.getElementById('fechasPersonalizadas');
    const btnAplicarFechas = document.getElementById('btnAplicarFechas');
    const fechaDesde = document.getElementById('fechaDesde');
    const fechaHasta = document.getElementById('fechaHasta');

    if (!filtroRango) {
        console.warn('Selector de rango no encontrado');
        return;
    }

    filtroRango.addEventListener('change', function() {
        const valor = this.value;
        filtroActual = valor;
        
        if (valor === 'personalizado') {
            fechasPersonalizadas.style.display = 'block';
            const hoy = new Date();
            const hace7Dias = new Date();
            hace7Dias.setDate(hoy.getDate() - 7);
            if (fechaDesde) fechaDesde.value = hace7Dias.toISOString().split('T')[0];
            if (fechaHasta) fechaHasta.value = hoy.toISOString().split('T')[0];
        } else {
            fechasPersonalizadas.style.display = 'none';
            cargarDatosDashboard();
        }
    });

    // Forzar evento inicial
    setTimeout(() => {
        if (filtroRango) {
            const event = new Event('change');
            filtroRango.dispatchEvent(event);
        }
    }, 100);

    if (btnAplicarFechas && fechaDesde && fechaHasta) {
        btnAplicarFechas.addEventListener('click', function() {
            if (!fechaDesde.value || !fechaHasta.value) {
                mostrarToast('Seleccione ambas fechas', 'warning');
                return;
            }
            if (fechaDesde.value > fechaHasta.value) {
                mostrarToast('La fecha de inicio no puede ser mayor a la fecha final', 'warning');
                return;
            }
            filtroActual = 'personalizado';
            cargarDatosDashboard();
        });
    }
}


// ============================================
// DASHBOARD - CARGAR DATOS
// ============================================

async function cargarDatosDashboard() {
    try {
        const filtroRango = document.getElementById('filtroRango');
        const filtro = filtroRango ? filtroRango.value : '7';
        
        let url = '/api/dashboard';
        
        if (filtro === 'personalizado') {
            const fechaDesde = document.getElementById('fechaDesde')?.value;
            const fechaHasta = document.getElementById('fechaHasta')?.value;
            if (fechaDesde && fechaHasta) {
                url += `?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
            } else {
                url += '?dias=7';
            }
        } else {
            url += `?dias=${filtro}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error al cargar datos del dashboard');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Error al obtener datos');
        }

        actualizarKPIs(data.resumen);
        actualizarGraficos(data);
        actualizarUltimosPedidos(data.ultimosPedidos);
        actualizarStockCritico(data.stockCritico);

        const totalPeriodo = document.getElementById('totalVentasPeriodo');
        if (totalPeriodo && data.ventasRango) {
            const total = data.ventasRango.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
            totalPeriodo.textContent = `Total: S/ ${total.toFixed(2)}`;
        }

        return data;

    } catch (error) {
        console.error('Error cargando dashboard:', error);
        mostrarToast('Error al cargar datos del dashboard', 'danger');
        return null;
    }
}

function actualizarKPIs(resumen) {
    const ventasHoy = document.getElementById('totalVentasHoy');
    if (ventasHoy) {
        ventasHoy.textContent = `S/ ${parseFloat(resumen.ventas_hoy || 0).toFixed(2)}`;
    }

    const variacion = document.getElementById('ventasVsAyer');
    if (variacion) {
        const valor = parseFloat(resumen.variacion || 0);
        const icono = valor >= 0 ? 'arrow-up' : 'arrow-down';
        const color = valor >= 0 ? 'text-success' : 'text-danger';
        variacion.innerHTML = `<i class="bi bi-${icono}"></i> ${Math.abs(valor).toFixed(1)}%`;
        variacion.className = color;
    }

    const totalClientes = document.getElementById('totalClientes');
    if (totalClientes) {
        totalClientes.textContent = resumen.total_clientes || 0;
    }

    const totalProductos = document.getElementById('totalProductos');
    if (totalProductos) {
        totalProductos.textContent = resumen.total_productos || 0;
    }

    const stockBajo = document.getElementById('productosStockBajo');
    if (stockBajo) {
        stockBajo.textContent = (resumen.stock_critico || 0) + (resumen.sin_stock || 0);
    }
}


// ============================================
// DASHBOARD - GRÁFICOS
// ============================================

function actualizarGraficos(data) {
    // Gráfico de Ventas por Período (Línea)
    if (chartVentas) {
        chartVentas.destroy();
        chartVentas = null;
    }

    const ctxVentas = document.getElementById('chartVentasSemana')?.getContext('2d');
    if (ctxVentas) {
        const ventas = data.ventasRango || [];
        const labels = ventas.map(item => {
            const fecha = new Date(item.fecha);
            return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        });
        const values = ventas.map(item => parseFloat(item.total) || 0);
        const cantidades = ventas.map(item => parseInt(item.cantidad_ventas) || 0);

        chartVentas = new Chart(ctxVentas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ventas (S/.)',
                        data: values,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#0d6efd',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y',
                        order: 1
                    },
                    {
                        label: 'N° Ventas',
                        data: cantidades,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        yAxisID: 'y1',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.parsed.y;
                                if (context.dataset.label.includes('Ventas')) {
                                    return label + ': S/ ' + value.toFixed(2);
                                }
                                return label + ': ' + value + ' ventas';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'S/ ' + value.toFixed(0);
                            }
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    // Gráfico de Categorías (Donut)
    if (chartCategorias) {
        chartCategorias.destroy();
        chartCategorias = null;
    }

    const ctxCategorias = document.getElementById('chartCategorias')?.getContext('2d');
    if (ctxCategorias) {
        const categorias = data.productosCategoria || [];
        const labels = categorias.map(item => item.categoria || 'Sin categoría');
        const values = categorias.map(item => parseInt(item.total) || 0);
        const colores = ['#0d6efd', '#198754', '#f59e0b', '#ef4444', '#6f42c1', '#0dcaf0', '#fd7e14', '#d63384', '#20c997', '#6610f2'];

        chartCategorias = new Chart(ctxCategorias, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colores.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: { size: 10 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return context.label + ': ' + context.parsed + ' productos (' + percentage + '%)';
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }
}


// ============================================
// DASHBOARD - TABLAS (CARDS)
// ============================================

function actualizarUltimosPedidos(pedidos) {
    const container = document.getElementById('ultimosPedidosContainer');
    if (!container) return;

    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-inbox fs-4"></i>
                <p class="mb-0 mt-2">No hay pedidos registrados</p>
            </div>
        `;
        return;
    }

    const estados = {
        0: { texto: 'Registrado', clase: 'bg-warning text-dark', color: '#f59e0b', icono: 'bi bi-clipboard', bg: '#fef3c7' },
        1: { texto: 'En Preparación', clase: 'bg-info text-white', color: '#0dcaf0', icono: 'bi bi-clock-history', bg: '#d1f5ff' },
        2: { texto: 'Parcialmente Entregado', clase: 'bg-warning text-dark', color: '#f59e0b', icono: 'bi bi-truck', bg: '#fef3c7' },
        3: { texto: 'Entregado', clase: 'bg-success text-white', color: '#10b981', icono: 'bi bi-check-circle', bg: '#d1fae5' },
        4: { texto: 'Cancelado', clase: 'bg-secondary text-white', color: '#6c757d', icono: 'bi bi-x-circle', bg: '#f3f4f6' }
    };

    let html = `<div class="row g-3">`;

    pedidos.forEach(pedido => {
        const estado = estados[pedido.estado] || { texto: 'Desconocido', clase: 'bg-secondary', color: '#6c757d', icono: 'bi bi-question-circle', bg: '#f3f4f6' };
        const total = parseFloat(pedido.total || 0).toFixed(2);
        const numeroPedido = pedido.numero_pedido || '#' + pedido.id;
        const cantidadProductos = pedido.cantidad_productos || 0;
        const usuarioRegistro = pedido.usuario_registro || '-';

        html += `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; overflow: hidden; background: white; transition: transform 0.2s;">
                    <!-- Cabecera -->
                    <div style="background: ${estado.bg}; padding: 12px 16px; border-bottom: 3px solid ${estado.color};">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="fw-bold text-dark" style="font-size: 0.95rem;">
                                <i class="${estado.icono}" style="color: ${estado.color}; margin-right: 6px;"></i>
                                ${numeroPedido}
                            </span>
                            <span class="badge ${estado.clase}" style="font-size: 0.7rem; padding: 4px 12px;">${estado.texto}</span>
                        </div>
                    </div>
                    <!-- Cuerpo -->
                    <div class="card-body p-3">
                        <!-- Cliente + Total -->
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-person-circle text-muted" style="font-size: 1rem;"></i>
                                <span class="text-dark fw-medium" style="font-size: 0.9rem;">${pedido.cliente || '-'}</span>
                            </div>
                            <span class="fw-bold" style="color: ${estado.color}; font-size: 1.1rem;">S/ ${total}</span>
                        </div>
                        <!-- Fecha + Cantidad Productos + Usuario Registro -->
                        <div class="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="bi bi-calendar3 me-1"></i> ${pedido.fecha || '-'}
                            </small>
                            <div class="d-flex gap-3">
                                <small class="text-muted" title="Cantidad de productos">
                                    <i class="bi bi-box-seam me-1"></i> ${cantidadProductos}
                                </small>
                                <small class="text-muted" title="Usuario que registró el pedido">
                                    <i class="bi bi-person-badge me-1"></i> ${usuarioRegistro}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}


// stock critico
function actualizarStockCritico(productos) {
    const container = document.getElementById('stockCriticoContainer');
    if (!container) return;

    if (!productos || productos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-success">
                <i class="bi bi-check-circle fs-4 text-success"></i>
                <p class="mb-0 mt-2 fw-medium" style="color: #10b981;">¡Todos los productos tienen stock suficiente!</p>
                <small class="text-muted">No hay productos con stock crítico</small>
            </div>
        `;
        return;
    }

    let html = `<div class="row g-3">`;

    productos.forEach(producto => {
        const stock = parseFloat(producto.stock).toFixed(2);
        const minimo = parseFloat(producto.stock_minimo).toFixed(2);
        const faltante = parseInt(producto.faltante) || 0;
        
        let color = '#ef4444';
        let bg = '#fee2e2';
        let nivel = 'Crítico';
        
        if (faltante <= 2) {
            color = '#ef4444';
            bg = '#fee2e2';
            nivel = 'Urgente';
        } else if (faltante <= 5) {
            color = '#f59e0b';
            bg = '#fef3c7';
            nivel = 'Atención';
        } else {
            color = '#f59e0b';
            bg = '#fef3c7';
            nivel = 'Precaución';
        }
        
        html += `
            <div class="col-12 col-md-6 col-xl-4">
                <div class="card border-0 shadow-sm h-100" style="border-radius: 12px; overflow: hidden; background: white;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div style="min-width: 0; flex: 1;">
                                <span class="fw-bold text-dark" style="font-size: 0.9rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${producto.nombre}</span>
                                <small class="text-muted" style="font-size: 0.7rem;">${producto.categoria || 'Sin categoría'}</small>
                            </div>
                            <span class="badge" style="background: ${color}; color: white; font-size: 0.65rem; padding: 2px 10px; flex-shrink: 0;">${nivel}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div style="flex: 1; text-align: center;">
                                <small class="text-muted" style="font-size: 0.65rem;">Stock</small>
                                <div class="fw-bold" style="font-size: 0.95rem; color: ${color};">${stock} und</div>
                            </div>
                            <div style="flex: 1; text-align: center;">
                                <small class="text-muted" style="font-size: 0.65rem;">Mínimo</small>
                                <div class="fw-bold" style="font-size: 0.95rem;">${minimo} und</div>
                            </div>
                            <div style="flex: 1; text-align: center;">
                                <small class="text-muted" style="font-size: 0.65rem;">Faltante</small>
                                <div class="fw-bold" style="font-size: 0.95rem; color: ${color};">${faltante} und</div>
                            </div>
                        </div>
                        <div class="mt-2">
                            <div class="progress" style="height: 5px; border-radius: 4px; background: #e5e7eb;">
                                <div class="progress-bar" style="width: ${Math.min((stock / minimo) * 100, 100)}%; background: ${color}; border-radius: 4px;"></div>
                            </div>
                            <small class="text-muted" style="font-size: 0.6rem;">
                                ${stock} de ${minimo} unidades mínimas
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}


// ============================================
// DASHBOARD - VISTA PRINCIPAL
// ============================================

async function cargarDashboardPrincipal() {
    const contenido = document.getElementById('contenido');
    if (!contenido) return;

    contenido.innerHTML = `
        <div class="fade-in">
            <!-- ========================================== -->
            <!-- ENCABEZADO -->
            <!-- ========================================== -->
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="mb-1">Panel de Control</h2>
                    <p class="text-muted mb-0">Bienvenido de vuelta, <strong>${sesion.usuario.nombre}</strong></p>
                </div>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="badge bg-dark p-2">
                        <i class="bi bi-calendar3 me-1"></i>
                        ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <button class="btn btn-outline-secondary btn-sm" id="btnRefrescarDashboard" title="Actualizar datos">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- FILTROS DE FECHAS -->
            <!-- ========================================== -->
            <div class="card shadow-sm border-0 mb-4">
                <div class="card-body py-3">
                    <div class="row g-2 align-items-center">
                        <div class="col-auto">
                            <label class="fw-semibold me-2 mb-0"><i class="bi bi-funnel me-1"></i>Período:</label>
                        </div>
                        <div class="col-auto">
                            <select id="filtroRango" class="form-select form-select-sm" style="min-width: 160px;">
                                <option value="7" selected>Últimos 7 días</option>
                                <option value="15">Últimos 15 días</option>
                                <option value="30">Últimos 30 días</option>
                                <option value="60">Últimos 60 días</option>
                                <option value="90">Últimos 90 días</option>
                                <option value="personalizado">Personalizado</option>
                            </select>
                        </div>
                        <div class="col-auto" id="fechasPersonalizadas" style="display: none;">
                            <div class="d-flex gap-2 align-items-center flex-wrap">
                                <input type="date" id="fechaDesde" class="form-control form-control-sm" style="width: 150px;">
                                <span class="text-muted small">a</span>
                                <input type="date" id="fechaHasta" class="form-control form-control-sm" style="width: 150px;">
                                <button class="btn btn-primary btn-sm" id="btnAplicarFechas">Aplicar</button>
                            </div>
                        </div>
                        <div class="col-auto ms-auto">
                            <span class="badge bg-light text-muted" id="totalVentasPeriodo">Total: S/ 0.00</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- KPIS - TARJETAS DE ESTADÍSTICAS -->
            <!-- ========================================== -->
            <div class="row g-3 mb-4" id="kpiContainer">
                <div class="col-6 col-xl-3">
                    <div class="card stat-card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
                        <div class="card-body text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 mb-1">Ventas Hoy</h6>
                                    <h3 class="mb-0" id="totalVentasHoy">S/ 0.00</h3>
                                    <small id="ventasVsAyer" class="text-success"><i class="bi bi-arrow-up"></i> 0%</small>
                                </div>
                                <div><i class="bi bi-cart-check fs-1 text-white-50"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-xl-3">
                    <div class="card stat-card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);">
                        <div class="card-body text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 mb-1">Clientes</h6>
                                    <h3 class="mb-0" id="totalClientes">0</h3>
                                    <small class="text-white-50">Registrados</small>
                                </div>
                                <div><i class="bi bi-people fs-1 text-white-50"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-xl-3">
                    <div class="card stat-card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                        <div class="card-body text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 mb-1">Productos</h6>
                                    <h3 class="mb-0" id="totalProductos">0</h3>
                                    <small class="text-white-50">En inventario</small>
                                </div>
                                <div><i class="bi bi-box-seam fs-1 text-white-50"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-xl-3">
                    <div class="card stat-card border-0 shadow-sm h-100" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        <div class="card-body text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-white-50 mb-1">Stock Crítico</h6>
                                    <h3 class="mb-0" id="productosStockBajo">0</h3>
                                    <small class="text-white-50">Necesitan reposición</small>
                                </div>
                                <div><i class="bi bi-exclamation-triangle fs-1 text-white-50"></i></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- GRÁFICOS -->
            <!-- ========================================== -->
            <div class="row g-3 mb-4">
                <div class="col-lg-8">
                    <div class="card shadow-sm border-0">
                        <div class="card-header bg-transparent border-0 pt-3 d-flex justify-content-between align-items-center">
                            <h6 class="mb-0 fw-bold"><i class="bi bi-graph-up me-2 text-primary"></i>Ventas por Período</h6>
                            <span class="badge bg-light text-muted" id="totalVentasPeriodo">Total: S/ 0.00</span>
                        </div>
                        <div class="card-body" style="height: 250px;">
                            <canvas id="chartVentasSemana"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card shadow-sm border-0">
                        <div class="card-header bg-transparent border-0 pt-3">
                            <h6 class="mb-0 fw-bold"><i class="bi bi-pie-chart me-2 text-success"></i>Productos por Categoría</h6>
                        </div>
                        <div class="card-body" style="height: 250px;">
                            <canvas id="chartCategorias"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========================================== -->
            <!-- TABLAS (ÚLTIMOS PEDIDOS + STOCK CRÍTICO) -->
            <!-- ========================================== -->
            <div class="row g-3">
                <div class="col-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-header bg-transparent border-0 pt-3 d-flex justify-content-between align-items-center">
                            <h6 class="mb-0 fw-bold"><i class="bi bi-truck me-2 text-warning"></i>Últimos Pedidos</h6>
                            <span class="badge bg-light text-muted">5 últimos</span>
                        </div>
                        <div class="card-body p-3" id="ultimosPedidosContainer">
                            <div class="text-center py-4 text-muted">
                                <i class="bi bi-hourglass-split fs-4"></i>
                                <p class="mb-0 mt-2">Cargando pedidos...</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-header bg-transparent border-0 pt-3 d-flex justify-content-between align-items-center">
                            <h6 class="mb-0 fw-bold"><i class="bi bi-exclamation-triangle me-2 text-danger"></i>Stock Crítico</h6>
                            <span class="badge bg-light text-muted">Productos bajo mínimos</span>
                        </div>
                        <div class="card-body p-3" id="stockCriticoContainer">
                            <div class="text-center py-4 text-muted">
                                <i class="bi bi-hourglass-split fs-4"></i>
                                <p class="mb-0 mt-2">Cargando productos...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Configurar filtros
    configurarFiltrosDashboard();

    // Cargar datos
    await cargarDatosDashboard();

    // Botón refrescar
    const btnRefrescar = document.getElementById('btnRefrescarDashboard');
    if (btnRefrescar) {
        btnRefrescar.addEventListener('click', async () => {
            btnRefrescar.disabled = true;
            btnRefrescar.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
            await cargarDatosDashboard();
            btnRefrescar.disabled = false;
            btnRefrescar.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
            mostrarToast('Dashboard actualizado', 'success');
        });
    }

    // Actualización automática cada 30 segundos
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
    }
    intervaloActualizacion = setInterval(() => {
        cargarDatosDashboard();
    }, 30000);
}


// ============================================
// MENÚ Y NAVEGACIÓN
// ============================================

async function cargarMenuDesdeAPI() {
    try {
        const response = await fetch('/api/autenticacion/menu');

        if (response.status === 401) {
            localStorage.removeItem('sesion');
            window.location.href = '/login.html';
            return false;
        }

        if (response.status === 403) {
            mostrarModalAdvertencia('No tiene permisos para acceder al sistema');
            return false;
        }

        if (!response.ok) {
            throw new Error('Error al cargar el menú');
        }

        const opciones = await response.json();
        menuPermisos = opciones || [];

        sesion.permisos = menuPermisos;
        localStorage.setItem('sesion', JSON.stringify(sesion));

        return true;

    } catch (error) {
        console.error('Error al cargar menú:', error);
        mostrarToast('Error al cargar el menú', 'danger');
        return false;
    }
}

function construirMenuDesdeAPI() {
    if (menuItemsInicializados) return;

    const menu = document.getElementById('menu');
    if (!menu) {
        console.error('Elemento "menu" no encontrado');
        return;
    }

    if (!menuPermisos || menuPermisos.length === 0) {
        menu.innerHTML = '<li class="nav-item"><span class="nav-link text-muted">Sin permisos</span></li>';
        return;
    }

    const iconosPorModulo = {
        'dashboard': 'bi bi-speedometer2',
        'usuarios': 'bi bi-people',
        'perfiles': 'bi bi-shield-lock',
        'clientes': 'bi bi-person-badge',
        'productos': 'bi bi-box-seam',
        'categorias': 'bi bi-grid',
        'ventas': 'bi bi-cart-check',
        'pedidos': 'bi bi-truck',
        'inventario': 'bi bi-clipboard-data',
        'cotizaciones': 'bi bi-file-text',
        'catalogo': 'bi bi-images',
    };

    const ordenModulos = [
        'dashboard',
        'usuarios',
        'perfiles',
        'clientes',
        'productos',
        'categorias',
        'ventas',
        'pedidos',
        'inventario',
        'cotizaciones',
        'catalogo'
    ];

    const permisosOrdenados = [...menuPermisos].sort((a, b) => {
        const viewA = a.ruta?.replace('/', '') || '';
        const viewB = b.ruta?.replace('/', '') || '';
        const indexA = ordenModulos.indexOf(viewA);
        const indexB = ordenModulos.indexOf(viewB);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    menu.innerHTML = '';

    permisosOrdenados.forEach(opcion => {
        const viewName = opcion.ruta?.replace('/', '') || '';
        const icono = iconosPorModulo[viewName] || 'bi bi-circle';
        const nombreMostrar = opcion.nombre || viewName;

        menu.innerHTML += `
            <li class="nav-item">
                <a href="#" class="nav-link menu-link" data-view="${viewName}">
                    <i class="${icono}"></i>
                    <span>${nombreMostrar}</span>
                </a>
            </li>
        `;
    });

    menuItemsInicializados = true;
}

async function loadContent(view) {
    if (view === 'dashboard') {
        await cargarDashboardPrincipal();
        vistaActual = 'dashboard';
        resaltarModuloActivo('dashboard');
        return;
    }

    if (cargandoVista) {
        console.warn('Ya se está cargando una vista');
        return;
    }

    if (vistaActual === view) return;

    cargandoVista = true;

    try {
        limpiarModuloAnterior();
        limpiarModalesAbiertos();

        await new Promise(resolve => setTimeout(resolve, 50));

        const response = await fetch(`/views/${view}.html`);

        if (!response.ok) {
            throw new Error(`No se pudo cargar la vista: ${view} (${response.status})`);
        }

        const html = await response.text();
        const contenido = document.getElementById('contenido');

        if (!contenido) {
            throw new Error('Elemento "contenido" no encontrado');
        }

        contenido.innerHTML = html;

        await new Promise(resolve => setTimeout(resolve, 50));

        vistaActual = view;
        resaltarModuloActivo(view);

    } catch (error) {
        console.error('Error al cargar vista:', error);
        const contenido = document.getElementById('contenido');
        if (contenido) {
            contenido.innerHTML = `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <strong>Módulo en construcción:</strong> ${view}
                    <br><small>Este módulo estará disponible próximamente.</small>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
        vistaActual = view;
        resaltarModuloActivo(view);
    } finally {
        cargandoVista = false;
    }
}

async function inicializarModulo(view) {
    try {
        limpiarModuloAnterior();

        let modulo;

        switch (view) {
            case 'usuarios':
                modulo = await import('/js/usuarios.js');
                break;
            case 'perfiles':
                modulo = await import('/js/perfiles.js');
                break;
            case 'clientes':
                modulo = await import('/js/clientes.js');
                break;
            case 'productos':
                modulo = await import('/js/productos.js');
                break;
            case 'categorias':
                modulo = await import('/js/categorias.js');
                break;
            case 'ventas':
                modulo = await import('/js/ventas.js');
                break;
            case 'pedidos':
                modulo = await import('/js/pedidos.js');
                break;
            case 'inventario':
                modulo = await import('/js/inventario.js');
                break;
            case 'cotizaciones':
                modulo = await import('/js/cotizaciones.js');
                break;
            case 'catalogo':
                modulo = await import('/js/catalogo.js');
                break;
            default:
                console.warn(`Módulo no implementado: ${view}`);
                mostrarToast(`Módulo "${view}" en desarrollo`, 'info');
                moduloActual = null;
                return;
        }

        moduloActual = modulo;

        if (moduloActual && typeof moduloActual.init === 'function') {
            await moduloActual.init();
        }

        resaltarModuloActivo(view);

    } catch (error) {
        console.error(`Error al inicializar módulo ${view}:`, error);
        mostrarToast(`Error al cargar el módulo: ${error.message}`, 'danger');
        moduloActual = null;
    }
}

function configurarEventosMenu() {
    const menuLinks = document.querySelectorAll('.sidebar-nav .menu-link');

    menuLinks.forEach(link => {
        const newLink = link.cloneNode(true);
        if (link.parentNode) {
            link.parentNode.replaceChild(newLink, link);
        }

        newLink.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth < 768) {
                sidebar.classList.remove('active');
            }

            const view = newLink.dataset.view;
            if (!view) return;

            const tienePermiso = menuPermisos.some(p => {
                const viewName = p.ruta?.replace('/', '') || '';
                return viewName === view;
            });

            if (!tienePermiso && view !== 'dashboard') {
                mostrarModalAdvertencia('No tiene permisos para acceder a este módulo.');
                return;
            }

            if (view === 'dashboard') {
                await cargarDashboardPrincipal();
                vistaActual = 'dashboard';
                resaltarModuloActivo('dashboard');
                limpiarModuloAnterior();
                return;
            }

            await loadContent(view);
            await inicializarModulo(view);
        });
    });
}

function configurarSidebar() {
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const sidebar = document.getElementById('sidebar');

    if (!sidebar) return;

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && sidebar && btnToggleSidebar) {
            const clickDentroSidebar = sidebar.contains(e.target);
            const clickBoton = btnToggleSidebar.contains(e.target);

            if (!clickDentroSidebar && !clickBoton && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });

    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function configurarModalesGlobales() {
    document.addEventListener('hidden.bs.modal', function (e) {
        limpiarModalesAbiertos();
    });

    document.addEventListener('show.bs.modal', () => {
        setTimeout(() => {
            if (document.body.classList.contains('modal-open')) {
                document.body.style.overflow = 'hidden';
            }
        }, 10);
    });
}

function configurarBotones() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        const newBtn = btnLogout.cloneNode(true);
        btnLogout.parentNode.replaceChild(newBtn, btnLogout);

        newBtn.addEventListener('click', () => {
            localStorage.removeItem('sesion');
            window.location.href = '/login.html';
        });
    }

    const btnDashboard = document.getElementById('btnDashboard');
    if (btnDashboard) {
        const newBtn = btnDashboard.cloneNode(true);
        btnDashboard.parentNode.replaceChild(newBtn, btnDashboard);

        const tienePermisoDashboard = menuPermisos.some(p => {
            const viewName = p.ruta?.replace('/', '') || '';
            return viewName === 'dashboard';
        });

        if (tienePermisoDashboard) {
            newBtn.addEventListener('click', async () => {
                await cargarDashboardPrincipal();
                vistaActual = 'dashboard';
                resaltarModuloActivo('dashboard');
                limpiarModuloAnterior();
                limpiarModalesAbiertos();
            });
        } else {
            newBtn.style.cursor = 'default';
            newBtn.title = 'No tiene permiso para acceder al Dashboard';
        }
    }
}


// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

async function initDashboard() {
    try {
        const menuCargado = await cargarMenuDesdeAPI();

        if (!menuCargado) {
            console.error('No se pudo cargar el menú');
            return;
        }

        construirMenuDesdeAPI();
        configurarEventosMenu();
        configurarSidebar();
        configurarModalesGlobales();
        configurarBotones();

        await cargarDashboardPrincipal();

        vistaActual = 'dashboard';
        resaltarModuloActivo('dashboard');

        console.log('Dashboard inicializado correctamente');

    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        mostrarToast('Error al inicializar el sistema', 'danger');
    }
}


// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================

window.mostrarToast = mostrarToast;
window.limpiarModalesAbiertos = limpiarModalesAbiertos;
window.mostrarModalAdvertencia = mostrarModalAdvertencia;

window.recargarMenuDashboard = async function () {
    try {
        const response = await fetch('/api/autenticacion/menu');

        if (response.status === 401) {
            localStorage.removeItem('sesion');
            window.location.href = '/login.html';
            return false;
        }

        if (!response.ok) {
            throw new Error('Error al cargar el menú');
        }

        const opciones = await response.json();
        menuPermisos = opciones || [];

        const sesionActual = JSON.parse(localStorage.getItem('sesion') || '{}');
        sesionActual.permisos = menuPermisos;
        localStorage.setItem('sesion', JSON.stringify(sesionActual));

        menuItemsInicializados = false;
        construirMenuDesdeAPI();
        configurarEventosMenu();

        console.log('Menú recargado correctamente');
        return true;

    } catch (error) {
        console.error('Error al recargar menú:', error);
        return false;
    }
};


// ============================================
// INICIAR DASHBOARD
// ============================================

initDashboard();


