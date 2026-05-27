const db = require('../../config/db');


// LISTAR PEDIDOS
exports.getPedidos = async () => {
    const [rows] = await db.query('CALL sp_listar_pedidos()');
    return rows[0];
};


// OBTENER PEDIDO POR ID
exports.getPedidoById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_pedido(?)', [id]);
    return rows[0][0];
};


// OBTENER DETALLES DEL PEDIDO
exports.getDetallesPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_listar_detalles_por_pedido(?)', [idPedido]);
    return rows[0];
};


// CREAR PEDIDO (CON DETALLES Y TRANSACCIÓN)
exports.createPedido = async (body) => {
    const {
        numero_pedido,
        id_cliente,
        id_usuario,
        total_pedido,
        observacion,
        productos  // Array
    } = body;

    // Validaciones
    if (!numero_pedido || numero_pedido.trim() === '') {
        throw new Error('El número de pedido es obligatorio');
    }
    if (!id_cliente) {
        throw new Error('El cliente es obligatorio');
    }
    if (!id_usuario) {
        throw new Error('El usuario es obligatorio');
    }
    if (!total_pedido || total_pedido <= 0) {
        throw new Error('El total del pedido es inválido');
    }
    if (!productos || productos.length === 0) {
        throw new Error('Debe agregar al menos un producto');
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        // Registrar pedido
        await connection.query(
            'CALL sp_registrar_pedido(?, ?, ?, ?, ?)',
            [
                numero_pedido.trim(),
                id_cliente,
                id_usuario,
                total_pedido,
                observacion || null
            ]
        );

        // Obtener el ID del pedido recién creado
        const [pedidoResult] = await connection.query(
            'SELECT id FROM pedido WHERE numero_pedido = ? ORDER BY id DESC LIMIT 1',
            [numero_pedido.trim()]
        );
        const pedidoId = pedidoResult[0].id;

        // Registrar detalles del pedido
        for (const item of productos) {
            await connection.query(
                'CALL sp_registrar_detalle_pedido(?, ?, ?, ?)',
                [
                    pedidoId,
                    item.id_producto,
                    item.precio_unitario,
                    item.cantidad
                ]
            );
        }

        await connection.commit();
        connection.release();

        return {
            id: pedidoId,
            message: 'Pedido registrado correctamente'
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};


// ACTUALIZAR PEDIDO
exports.updatePedido = async (id, body) => {
    const {
        numero_pedido,
        id_cliente,
        id_usuario,
        total_pedido,
        observacion,
        estado
    } = body;

    // Si solo viene estado, cambiar estado
    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_pedido(?, ?)', [id, estado]);
        let mensaje = '';
        if (estado === 0) mensaje = 'Pedido cancelado correctamente';
        if (estado === 1) mensaje = 'Pedido reactivado correctamente';
        if (estado === 2) mensaje = 'Pedido eliminado correctamente';
        return { message: mensaje };
    }

    // Validar campos obligatorios
    if (!numero_pedido || numero_pedido.trim() === '') {
        throw new Error('El número de pedido es obligatorio');
    }
    if (!id_cliente) {
        throw new Error('El cliente es obligatorio');
    }
    if (!id_usuario) {
        throw new Error('El usuario es obligatorio');
    }
    if (!total_pedido || total_pedido <= 0) {
        throw new Error('El total del pedido es inválido');
    }

    await db.query(
        'CALL sp_actualizar_pedido(?, ?, ?, ?, ?, ?)',
        [
            id,
            numero_pedido.trim(),
            id_cliente,
            id_usuario,
            total_pedido,
            observacion || null
        ]
    );

    return { message: 'Pedido actualizado correctamente' };
};


// CAMBIAR ESTADO DEL PEDIDO
exports.cambiarEstado = async (id, estado) => {
    await db.query('CALL sp_cambiar_estado_pedido(?, ?)', [id, estado]);
    return { message: 'Estado del pedido actualizado' };
};




