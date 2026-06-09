require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use(
    session({
        secret: 'ferreteria_secret',
        resave: false,
        saveUninitialized: false
    })
);

app.use(express.static('public'));

// IMPORTAR MIDDLEWARE
const { soloAutenticacion, validarPermiso } = require('../middlewares/auth');

// RUTAS PÚBLICAS
app.use('/api/autenticacion', require(path.join(__dirname, '../services/autenticacion/autenticacion.routes')));

// RUTAS DE PERMISOS 
app.use('/api/permisos', soloAutenticacion, require(path.join(__dirname, '../services/permiso/permiso.routes')));

// RUTAS PROTEGIDAS 
app.use('/api/usuarios', validarPermiso('Usuarios'), require(path.join(__dirname, '../services/usuario/usuario.routes')));
app.use('/api/perfiles', validarPermiso('Perfiles'), require(path.join(__dirname, '../services/perfil/perfil.routes')));
app.use('/api/clientes', validarPermiso('Clientes'), require(path.join(__dirname, '../services/cliente/cliente.routes')));
app.use('/api/productos', validarPermiso('Productos'), require(path.join(__dirname, '../services/producto/producto.routes')));
app.use('/api/categorias', validarPermiso('Categorías'), require(path.join(__dirname, '../services/categoria/categoria.routes')));
app.use('/api/ventas', validarPermiso('Ventas'), require(path.join(__dirname, '../services/venta/venta.routes')));
app.use('/api/opciones', validarPermiso('Perfiles'), require(path.join(__dirname, '../services/opcion/opcion.routes')));
app.use('/api/unidades-medida', validarPermiso('Productos'), require(path.join(__dirname, '../services/unidadmedida/unidadmedida.routes')));
app.use('/api/pago-cuota', soloAutenticacion, require(path.join(__dirname, '../services/pago_cuota/pago_cuota.routes')));
app.use('/api/pedidos', validarPermiso('Pedidos'), require(path.join(__dirname, '../services/pedido/pedido.routes')));
app.use('/api/movimientos-inventario', soloAutenticacion, require(path.join(__dirname, '../services/movimiento/movimiento.routes')));
app.use('/api/entregas', soloAutenticacion, require(path.join(__dirname, '../services/entrega_pedido/entrega.routes')));
<<<<<<< HEAD
app.use('/api/reportes', soloAutenticacion, require(path.join(__dirname, '../services/reportes/reportes.routes')));
=======

>>>>>>> 59ebc7f7848fe36d69c4e00fbdf9189d8bc47a08
// Archivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


