async function loadView(view) {

    const response = await fetch(`/views/${view}.html`);

    const html = await response.text();

    document.getElementById('app').innerHTML = html;

    // login
    if (view === 'login') {
        import('./login.js');
    }

    // dashboard
    if (view === 'dashboard') {
        import('./dashboard.js');
    }
}

// función global
window.loadDashboard = () => {
    loadView('dashboard');
};

// verificar sesión
const sesion = localStorage.getItem('sesion');

if (sesion) {
    loadView('dashboard');
} else {
    loadView('login');
}


