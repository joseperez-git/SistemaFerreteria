const form = document.getElementById('formLogin');
const btnLogin = document.getElementById('btnLogin');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const errorDiv = document.getElementById('errorLogin');
let timeoutMensaje = null;

function mostrarMensaje(mensaje, tipo = 'danger', duracion = 4000) {
    if (timeoutMensaje) clearTimeout(timeoutMensaje);
    
    errorDiv.style.display = 'block';
    errorDiv.className = 'mt-3';
    errorDiv.innerHTML = `<div class="alert-message alert alert-${tipo}"><i class="bi ${tipo === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i> ${mensaje}</div>`;
    
    if (tipo !== 'danger') {
        timeoutMensaje = setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.innerHTML = '';
        }, duracion);
    }
}

function limpiarMensaje() {
    if (timeoutMensaje) clearTimeout(timeoutMensaje);
    errorDiv.style.display = 'none';
    errorDiv.innerHTML = '';
}

function setLoading(loading) {
    if (loading) {
        btnText.textContent = 'Ingresando';
        btnSpinner.style.display = 'inline-block';
        btnLogin.disabled = true;
    } else {
        btnText.textContent = 'Ingresar';
        btnSpinner.style.display = 'none';
        btnLogin.disabled = false;
    }
}

// Toggle mostrar/ocultar contraseña
const togglePassword = document.getElementById('togglePassword');
const claveInput = document.getElementById('clave');
const toggleIcon = document.getElementById('toggleIcon');

togglePassword.addEventListener('click', () => {
    const type = claveInput.getAttribute('type') === 'password' ? 'text' : 'password';
    claveInput.setAttribute('type', type);
    toggleIcon.classList.toggle('bi-eye');
    toggleIcon.classList.toggle('bi-eye-slash');
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limpiarMensaje();
    
    const username = document.getElementById('username').value.trim();
    const clave = document.getElementById('clave').value;

    if (!username || !clave) {
        mostrarMensaje('Complete todos los campos', 'warning', 3000);
        return;
    }

    setLoading(true);

    try {
        const response = await fetch('/api/autenticacion/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, clave })
        });

        const data = await response.json();

        if (!response.ok) {
            const mensajeError = data.error;
            
            if (mensajeError.includes('bloqueado')) {
                mostrarMensaje('Demasiados intentos fallidos. Acceso bloqueado temporalmente.', 'danger', 4000);
                setLoading(false);
                return;
            }
            
            if (mensajeError.includes('Usuario desactivado') || mensajeError.includes('Usuario eliminado')) {
                mostrarMensaje(mensajeError, 'danger', 4000);
                setLoading(false);
                return;
            }
            
            if (mensajeError.includes('perfil está desactivado')) {
                mostrarMensaje(mensajeError, 'danger', 4000);
                setLoading(false);
                return;
            }
            
            if (mensajeError.includes('Le quedan')) {
                mostrarMensaje(mensajeError, 'warning', 4000);
                setLoading(false);
                return;
            }
            
            mostrarMensaje('Usuario o contraseña incorrectos', 'warning', 3000);
            setLoading(false);
            return;
        }

        mostrarMensaje('Redirigiendo...', 'success', 1500);
        
        localStorage.setItem('sesion', JSON.stringify(data));
        
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1500);

    } catch (error) {
        mostrarMensaje('Error de conexión. Intente nuevamente.', 'danger', 4000);
        setLoading(false);
    }
});




