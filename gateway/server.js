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

// Rutas (módulos)
app.use('/api/usuarios', require(path.join(__dirname, '../services/usuario/usuario.routes')));
app.use('/api/perfiles', require(path.join(__dirname, '../services/perfil/perfil.routes')));
app.use('/api/clientes', require(path.join(__dirname, '../services/cliente/cliente.routes')));
app.use('/api/productos', require(path.join(__dirname, '../services/producto/producto.routes')));
app.use('/api/categorias', require(path.join(__dirname, '../services/categoria/categoria.routes')));
app.use('/api/permisos', require(path.join(__dirname, '../services/permiso/permiso.routes')));
app.use('/api/autenticacion', require(path.join(__dirname, '../services/autenticacion/autenticacion.routes')));
app.use('/api/opciones', require(path.join(__dirname, '../services/opcion/opcion.routes')));
app.use('/api/unidades-medida', require(path.join(__dirname, '../services/unidadmedida/unidadmedida.routes')));
app.use('/api/ventas', require(path.join(__dirname, '../services/venta/venta.routes')));
app.use('/api/pedidos', require(path.join(__dirname, '../services/pedido/pedido.routes')));

// Servir archivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});



