const db = require('../../config/db');
const { consultarAplicloud } = require('../consultas-externas/consulta.service');

const PERFIL_ADMIN_ID = 1;

function validarPermisoAdmin(usuarioSesion, accion) {
    if (!usuarioSesion || usuarioSesion.id_perfil !== PERFIL_ADMIN_ID) {
        throw new Error(`No tiene permisos para ${accion} clientes. Solo administradores.`);
    }
    return true;
}

exports.getClientes = async () => {
    const [rows] = await db.query('CALL sp_listar_clientes()');
    return rows[0];
};

exports.getClienteById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_cliente(?)', [id]);
    return rows[0][0];
};

exports.buscarClientePorDocumento = async (numero_documento) => {
    const [rows] = await db.query('CALL sp_buscar_cliente_por_documento(?)', [numero_documento]);
    return rows[0][0] || null;
};

exports.createCliente = async (body, usuarioSesion) => {
    const { tipo_documento, numero_documento, nombre, apellido, telefono, correo } = body;

    validarPermisoAdmin(usuarioSesion, 'crear');

    if (!tipo_documento || tipo_documento.trim() === '') {
        throw new Error('El tipo de documento es obligatorio');
    }

    if (!numero_documento || numero_documento.trim() === '') {
        throw new Error('El número de documento es obligatorio');
    }

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre es obligatorio');
    }

    await db.query(
        'CALL sp_registrar_cliente(?, ?, ?, ?, ?, ?)',
        [
            tipo_documento.trim(),
            numero_documento.trim(),
            nombre.trim(),
            apellido ? apellido.trim() : null,
            telefono ? telefono.trim() : null,
            correo ? correo.trim() : null
        ]
    );

    return { message: 'Cliente registrado correctamente' };
};

exports.updateCliente = async (id, body, usuarioSesion) => {
    const { telefono, correo, estado } = body;

    validarPermisoAdmin(usuarioSesion, 'editar');

    if (estado !== undefined && Object.keys(body).length === 1) {
        if (![0, 1, 2].includes(Number(estado))) {
            throw new Error('Estado inválido');
        }
        await db.query('CALL sp_cambiar_estado_cliente(?, ?)', [id, estado]);
        
        const mensajes = {
            0: 'Cliente desactivado correctamente',
            1: 'Cliente activado correctamente',
            2: 'Cliente eliminado correctamente'
        };
        return { message: mensajes[estado] };
    }

    if (body.tipo_documento || body.numero_documento || body.nombre || body.apellido) {
        throw new Error('No se puede modificar tipo de documento, número, nombre o apellido. Solo teléfono y correo.');
    }

    await db.query(
        'CALL sp_actualizar_cliente(?, ?, ?)',
        [
            id,
            telefono ? telefono.trim() : null,
            correo ? correo.trim() : null
        ]
    );

    return { message: 'Cliente actualizado correctamente' };
};

exports.cambiarEstadoCliente = async (id, estado, usuarioSesion) => {
    validarPermisoAdmin(usuarioSesion, 'cambiar estado');

    if (![0, 1, 2].includes(Number(estado))) {
        throw new Error('Estado inválido');
    }

    await db.query('CALL sp_cambiar_estado_cliente(?, ?)', [id, estado]);

    const mensajes = {
        0: 'Cliente desactivado correctamente',
        1: 'Cliente activado correctamente',
        2: 'Cliente eliminado correctamente'
    };

    return { message: mensajes[estado] };
};


