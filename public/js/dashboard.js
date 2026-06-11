// VERIFICACIÓN DE SESIÓN
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


// VARIABLES GLOBALES
let moduloActual = null;
let vistaActual = '';
let cargandoVista = false;
let menuItemsInicializados = false;
let menuPermisos = [];


// FUNCIONES DE UTILIDAD
function limpiarModalesAbiertos() {
    // NO cerrar modales - solo limpiar backdrops sobrantes
    setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const modalesAbiertos = document.querySelectorAll('.modal.show');

        if (modalesAbiertos.length > 0) {
            // Mantener solo 1 backdrop (el último)
            if (backdrops.length > 1) {
                for (let i = 0; i < backdrops.length - 1; i++) {
                    backdrops[i].remove();
                }
            }
            document.body.classList.add('modal-open');
        } else {
            // Solo si NO hay modales abiertos, limpiar todo
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

// Mostrar modal de advertencia
function mostrarModalAdvertencia(mensaje) {
    let modalElement = document.getElementById('modalAdvertenciaGlobal');

    if (!modalElement) {
        // Crear modal si no existe
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


// RESALTAR MÓDULO ACTIVO EN EL MENÚ
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


// DASHBOARD PRINCIPAL
async function cargarDashboardPrincipal() {
    const contenido = document.getElementById('contenido');
    if (!contenido) return;

    contenido.innerHTML = `
        <div class="fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="mb-2">Panel de Control</h2>
                    <p class="text-muted">Bienvenido al sistema de gestión de ferretería</p>
                </div>
                <div class="text-end">
                    <span class="badge bg-dark p-2">
                        <i class="bi bi-calendar3 me-1"></i>
                        ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-3">
                    <div class="card stat-card shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-1">Total Ventas Hoy</h6>
                                    <h3 class="mb-0" id="totalVentasHoy">S/ 0.00</h3>
                                    <small class="text-success" id="ventasVsAyer">
                                        <i class="bi bi-arrow-up"></i> 0%
                                    </small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-cart-check fs-1 text-success"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="card stat-card shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-1">Total Clientes</h6>
                                    <h3 class="mb-0" id="totalClientes">0</h3>
                                    <small class="text-muted">Registrados</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-people fs-1 text-primary"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="card stat-card shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-1">Productos Activos</h6>
                                    <h3 class="mb-0" id="totalProductos">0</h3>
                                    <small class="text-muted">En inventario</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-box-seam fs-1 text-warning"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="card stat-card shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="text-muted mb-1">Stock Bajo</h6>
                                    <h3 class="mb-0 text-danger" id="productosStockBajo">0</h3>
                                    <small class="text-muted">Necesitan reposición</small>
                                </div>
                                <div class="stat-icon">
                                    <i class="bi bi-exclamation-triangle fs-1 text-danger"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card shadow-sm border-0">
                <div class="card-body text-center py-5">
                    <i class="bi bi-emoji-smile fs-1 text-muted"></i>
                    <h4 class="mt-3">¡Bienvenido, ${sesion.usuario.nombre}!</h4>
                    <p class="text-muted">Selecciona una opción del menú lateral para comenzar a gestionar el sistema.</p>
                    <hr class="my-4">
                    <div class="row mt-4">
                        <div class="col-md-4">
                            <div class="p-3 border rounded">
                                <i class="bi bi-people fs-2 text-primary"></i>
                                <h6 class="mt-2">Clientes</h6>
                                <small class="text-muted">Gestión de clientes</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded">
                                <i class="bi bi-box-seam fs-2 text-success"></i>
                                <h6 class="mt-2">Productos</h6>
                                <small class="text-muted">Inventario y precios</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded">
                                <i class="bi bi-cart-check fs-2 text-warning"></i>
                                <h6 class="mt-2">Ventas</h6>
                                <small class="text-muted">Registro de ventas</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        const totalVentasHoy = document.getElementById('totalVentasHoy');
        if (totalVentasHoy) totalVentasHoy.innerHTML = 'S/ 1,250.00';

        const totalClientes = document.getElementById('totalClientes');
        if (totalClientes) totalClientes.innerHTML = '156';

        const totalProductos = document.getElementById('totalProductos');
        if (totalProductos) totalProductos.innerHTML = '342';

        const productosStockBajo = document.getElementById('productosStockBajo');
        if (productosStockBajo) productosStockBajo.innerHTML = '8';
    }, 100);
}


// CARGAR MENÚ DESDE API
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

        // Guardar en sesión solo para referencia (no para seguridad)
        sesion.permisos = menuPermisos;
        localStorage.setItem('sesion', JSON.stringify(sesion));

        return true;

    } catch (error) {
        console.error('Error al cargar menú:', error);
        mostrarToast('Error al cargar el menú', 'danger');
        return false;
    }
}


// CONSTRUIR MENÚ DESDE API
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
        'cotizaciones': 'bi bi-file-text'
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
        'cotizaciones'
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


// CARGA DE VISTAS
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


// INICIALIZACIÓN DE MÓDULOS
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


// CONFIGURACIÓN DE EVENTOS DEL MENÚ
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

            // Validar permiso antes de cargar
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


// CONFIGURACIÓN DEL SIDEBAR
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


// CONFIGURACIÓN DE MODALES GLOBALES
function configurarModalesGlobales() {
    document.addEventListener('hidden.bs.modal', function (e) {
        // Solo limpiar backdrops, NO cerrar otros modales
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


// CONFIGURACIÓN DE BOTONES
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


// INICIALIZACIÓN PRINCIPAL
async function initDashboard() {
    try {
        // Cargar menú desde API
        const menuCargado = await cargarMenuDesdeAPI();

        if (!menuCargado) {
            console.error('No se pudo cargar el menú');
            return;
        }

        // Construir menú con los permisos obtenidos
        construirMenuDesdeAPI();

        // Configurar eventos
        configurarEventosMenu();
        configurarSidebar();
        configurarModalesGlobales();
        configurarBotones();

        // Cargar dashboard
        await cargarDashboardPrincipal();

        vistaActual = 'dashboard';
        resaltarModuloActivo('dashboard');

        console.log('Dashboard inicializado correctamente');

    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        mostrarToast('Error al inicializar el sistema', 'danger');
    }
}


// EXPORTAR FUNCIONES GLOBALES
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

        // Actualizar sesión en localStorage
        const sesionActual = JSON.parse(localStorage.getItem('sesion') || '{}');
        sesionActual.permisos = menuPermisos;
        localStorage.setItem('sesion', JSON.stringify(sesionActual));

        // Reconstruir el menú
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


// Iniciar dashboard
initDashboard();


