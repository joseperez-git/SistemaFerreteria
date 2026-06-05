const db = require('../../config/db');


// LISTAR CLIENTES
exports.getClientes = async () => {
    const [rows] = await db.query('CALL sp_listar_clientes()');
    return rows[0];
};


//OBTENER CLIENTE POR ID
exports.getClienteById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_cliente(?)', [id]);
    return rows[0][0];
};


// CREAR CLIENTE
exports.createCliente = async (body) => {
    const { tipo_documento, numero_documento, nombre, apellido, telefono, correo } = body;

    // Validar campos obligatorios
    if (!tipo_documento || tipo_documento.trim() === '') {
        throw new Error('El tipo de documento es obligatorio');
    }

    if (!numero_documento || numero_documento.trim() === '') {
        throw new Error('El número de documento es obligatorio');
    }

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre es obligatorio');
    }

    // Ejecutar procedimiento
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

    return {
        message: 'Cliente registrado correctamente'
    };
};


// ACTUALIZAR CLIENTE
exports.updateCliente = async (id, body) => {
    const { tipo_documento, numero_documento, nombre, apellido, telefono, correo, estado } = body;

    // Validar estado si viene
    if (estado !== undefined && ![0, 1, 2].includes(Number(estado))) {
        throw new Error('Estado inválido');
    }

    // Si solo viene estado, cambiar estado
    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_cliente(?, ?)', [id, estado]);
        return { message: 'Estado del cliente actualizado correctamente' };
    }

    // Validar campos obligatorios para actualización completa
    if (!tipo_documento || tipo_documento.trim() === '') {
        throw new Error('El tipo de documento es obligatorio');
    }

    if (!numero_documento || numero_documento.trim() === '') {
        throw new Error('El número de documento es obligatorio');
    }

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre es obligatorio');
    }

    // Ejecutar actualización
    await db.query(
        'CALL sp_actualizar_cliente(?, ?, ?, ?, ?, ?, ?)',
        [
            id,
            tipo_documento.trim(),
            numero_documento.trim(),
            nombre.trim(),
            apellido ? apellido.trim() : null,
            telefono ? telefono.trim() : null,
            correo ? correo.trim() : null
        ]
    );

    return {
        message: 'Cliente actualizado correctamente'
    };
};


// ELIMINAR CLIENTE (LÓGICO)
exports.deleteCliente = async (id) => {
    // Verificar si existe
    const [rows] = await db.query('CALL sp_obtener_cliente(?)', [id]);
    const cliente = rows[0][0];

    if (!cliente) {
        throw new Error('Cliente no encontrado');
    }

    // Eliminación lógica (estado = 2)
    await db.query('CALL sp_cambiar_estado_cliente(?, ?)', [id, 2]);

    return {
        message: 'Cliente eliminado correctamente'
    };
};



