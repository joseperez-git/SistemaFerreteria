const db = require('../../config/db');

exports.getPedidos = async () => {
    const [rows] = await db.query('CALL sp_listar_pedidos()');
    return rows[0];
};

exports.getPedidoById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_pedido(?)', [id]);
    return rows[0][0];
};

exports.getDetallesPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_listar_detalles_por_pedido(?)', [idPedido]);
    return rows[0];
};

exports.createPedido = async (body, idUsuarioSesion) => {
    const {
        numero_pedido,
        id_cliente,
        total_pedido,
        observacion,
        fecha_recojo,
        fecha_envio,
        direccion_envio,
        costo_envio,
        productos
    } = body;

    if (!numero_pedido || numero_pedido.trim() === '') {
        throw new Error('El número de pedido es obligatorio');
    }
    if (!id_cliente) {
        throw new Error('El cliente es obligatorio');
    }
    if (!idUsuarioSesion) {
        throw new Error('Usuario no autenticado');
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
        await connection.query(
            'CALL sp_registrar_pedido(?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                numero_pedido.trim(),
                id_cliente,
                idUsuarioSesion,
                total_pedido,
                observacion || null,
                fecha_recojo || null,
                fecha_envio || null,
                direccion_envio || null,
                costo_envio || 0
            ]
        );

        const [pedidoResult] = await connection.query(
            'SELECT id FROM pedido WHERE numero_pedido = ? ORDER BY id DESC LIMIT 1',
            [numero_pedido.trim()]
        );
        const pedidoId = pedidoResult[0].id;

        for (const item of productos) {
            await connection.query(
                'CALL sp_registrar_detalle_pedido(?, ?, ?, ?)',
                [pedidoId, item.id_producto, item.precio_unitario, item.cantidad]
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

exports.updatePedido = async (id, body, idUsuarioSesion) => {
    const {
        numero_pedido,
        id_cliente,
        total_pedido,
        observacion,
        fecha_recojo,
        fecha_envio,
        direccion_envio,
        costo_envio,
        estado
    } = body;

    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_pedido(?, ?)', [id, estado]);
        let mensaje = '';
        if (estado === 0) mensaje = 'Pedido reactivado correctamente';
        if (estado === 1) mensaje = 'Pedido convertido a venta (pagado)';
        if (estado === 2) mensaje = 'Pedido cancelado correctamente';
        return { message: mensaje };
    }

    if (!numero_pedido || numero_pedido.trim() === '') {
        throw new Error('El número de pedido es obligatorio');
    }
    if (!id_cliente) {
        throw new Error('El cliente es obligatorio');
    }
    if (!total_pedido || total_pedido <= 0) {
        throw new Error('El total del pedido es inválido');
    }

    await db.query(
        'CALL sp_actualizar_pedido(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            id,
            numero_pedido.trim(),
            id_cliente,
            idUsuarioSesion,
            total_pedido,
            observacion || null,
            fecha_recojo || null,
            fecha_envio || null,
            direccion_envio || null,
            costo_envio || 0
        ]
    );

    return { message: 'Pedido actualizado correctamente' };
};

exports.cambiarEstado = async (id, estado) => {
    await db.query('CALL sp_cambiar_estado_pedido(?, ?)', [id, estado]);
    return { message: 'Estado del pedido actualizado' };
};

exports.getVentaByPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_obtener_venta_por_pedido(?)', [idPedido]);
    return rows[0][0] || null;
};

exports.convertirAVenta = async (idPedido, montoPago, metodoPago) => {
    const [result] = await db.query(
        'CALL sp_convertir_pedido_a_venta(?, ?, ?)',
        [idPedido, montoPago, metodoPago]
    );
    const venta = result[0]?.[0] || null;
    return {
        message: 'Pedido convertido a venta exitosamente',
        venta: venta
    };
};


