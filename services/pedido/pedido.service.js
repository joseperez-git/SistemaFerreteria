const db = require('../../config/db');

// ============================================
// LISTAR PEDIDOS
// ============================================
exports.getPedidos = async () => {
    const [rows] = await db.query('CALL sp_listar_pedidos()');
    return rows[0];
};

// ============================================
// OBTENER PEDIDO POR ID
// ============================================
exports.getPedidoById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_pedido(?)', [id]);
    const pedido = rows[0][0];
    
    if (pedido) {
        const detalles = await exports.getDetallesPedido(id);
        // SOLO obtener entregas que sean de tipo ENVIO (no mostrar RECOJO)
        const entregas = await exports.getEntregasPedido(id);
        // Filtrar solo entregas de envío a domicilio
        const entregasFiltradas = entregas.filter(entrega => entrega.tipo_entrega === 'ENVIO');
        const saldo = await exports.calcularSaldoPedido(id);
        
        return {
            ...pedido,
            detalles,
            entregas: entregasFiltradas,
            saldo_pendiente: saldo
        };
    }
    return pedido;
};

// ============================================
// OBTENER DETALLES DEL PEDIDO
// ============================================
exports.getDetallesPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_listar_detalles_por_pedido(?)', [idPedido]);
    return rows[0];
};

// ============================================
// OBTENER ENTREGAS DEL PEDIDO
// ============================================
exports.getEntregasPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_listar_entregas_por_pedido(?)', [idPedido]);
    return rows[0];
};

// ============================================
// CREAR PEDIDO 
// ============================================
exports.createPedido = async (body, idUsuarioSesion) => {
    const {
        numero_pedido,
        id_cliente,
        total_pedido,
        observacion,
        productos,
        tipo_entrega,
        direccion_entrega,
        costo_entrega,
        fecha_programada
    } = body;

    if (!numero_pedido || numero_pedido.trim() === '') throw new Error('El número de pedido es obligatorio');
    if (!id_cliente) throw new Error('El cliente es obligatorio');
    if (!idUsuarioSesion) throw new Error('Usuario no autenticado');
    if (!total_pedido || total_pedido <= 0) throw new Error('El total del pedido es inválido');
    if (!productos || productos.length === 0) throw new Error('Debe agregar al menos un producto');

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        await connection.query('CALL sp_registrar_pedido(?, ?, ?, ?, ?)', [numero_pedido.trim(), id_cliente, idUsuarioSesion, total_pedido, observacion || null]);

        const [pedidoResult] = await connection.query('CALL sp_obtener_id_pedido_por_numero(?, @p_id)', [numero_pedido.trim()]);
        const [idResult] = await connection.query('SELECT @p_id AS id');
        const pedidoId = idResult[0].id;

        for (const item of productos) {
            await connection.query('CALL sp_registrar_detalle_pedido(?, ?, ?, ?)', [pedidoId, item.id_producto, item.precio_unitario, item.cantidad]);
        }

        await connection.query('CALL sp_reservar_stock_pedido(?)', [pedidoId]);

        // SOLO si es ENVIO, crear registro de entrega
        if (tipo_entrega === 'ENVIO') {
            await connection.query('CALL sp_registrar_entrega_pedido(?, ?, ?, ?, ?, ?)', [pedidoId, tipo_entrega, direccion_entrega || null, costo_entrega || 0, fecha_programada || null, idUsuarioSesion]);
        }

        await connection.commit();
        connection.release();

        return { id: pedidoId, message: 'Pedido registrado correctamente' };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};


// ============================================
// ACTUALIZAR PEDIDO
// ============================================
exports.updatePedido = async (id, body, idUsuarioSesion) => {
    const {
        numero_pedido,
        id_cliente,
        total_pedido,
        observacion,
        estado
    } = body;

    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_pedido(?, ?)', [id, estado]);
        let mensaje = '';
        if (estado === 0) mensaje = 'Pedido reactivado correctamente';
        if (estado === 1) mensaje = 'Pedido en preparación';
        if (estado === 2) mensaje = 'Pedido parcialmente entregado';
        if (estado === 3) mensaje = 'Pedido entregado correctamente';
        if (estado === 4) mensaje = 'Pedido cancelado correctamente';
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
        'CALL sp_actualizar_pedido(?, ?, ?, ?, ?, ?)',
        [
            id,
            numero_pedido.trim(),
            id_cliente,
            idUsuarioSesion,
            total_pedido,
            observacion || null
        ]
    );

    return { message: 'Pedido actualizado correctamente' };
};

// ============================================
// CAMBIAR ESTADO DEL PEDIDO
// ============================================
exports.cambiarEstado = async (id, estado) => {
    await db.query('CALL sp_cambiar_estado_pedido(?, ?)', [id, estado]);
    return { message: 'Estado del pedido actualizado' };
};

// ============================================
// OBTENER VENTA POR PEDIDO
// ============================================
exports.getVentaByPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_obtener_venta_por_pedido(?)', [idPedido]);
    return rows[0][0] || null;
};

// ============================================
// CALCULAR SALDO PENDIENTE DEL PEDIDO
// ============================================
exports.calcularSaldoPedido = async (idPedido) => {
    const [result] = await db.query('CALL sp_calcular_saldo_pedido(?, @p_saldo)', [idPedido]);
    const [saldoResult] = await db.query('SELECT @p_saldo AS saldo');
    return saldoResult[0].saldo;
};

// ============================================
// REGISTRAR ENTREGA DE PEDIDO (SOLO PARA ENVIO)
// ============================================
exports.registrarEntrega = async (body, idUsuarioSesion) => {
    const {
        id_pedido,
        tipo_entrega,
        direccion_entrega,
        costo_entrega,
        fecha_programada
    } = body;

    if (!id_pedido) {
        throw new Error('El ID del pedido es obligatorio');
    }
    if (tipo_entrega !== 'ENVIO') {
        throw new Error('Solo se pueden registrar entregas de tipo ENVIO');
    }
    if (!direccion_entrega) {
        throw new Error('La dirección de entrega es obligatoria para envíos');
    }

    await db.query(
        'CALL sp_registrar_entrega_pedido(?, ?, ?, ?, ?, ?)',
        [id_pedido, tipo_entrega, direccion_entrega, costo_entrega || 0, fecha_programada || null, idUsuarioSesion]
    );

    return { message: 'Entrega registrada correctamente' };
};

// ============================================
// CONFIRMAR ENTREGA DE PEDIDO
// ============================================
exports.confirmarEntrega = async (body, idUsuarioSesion) => {
    const {
        id_pedido,
        id_entrega,
        productos
    } = body;

    if (!id_pedido || !id_entrega) {
        throw new Error('Faltan datos para confirmar la entrega');
    }
    if (!productos || productos.length === 0) {
        throw new Error('Debe especificar los productos entregados');
    }

    await db.query(
        'CALL sp_confirmar_entrega_pedido(?, ?, ?, ?)',
        [id_pedido, id_entrega, JSON.stringify(productos), idUsuarioSesion]
    );

    return { message: 'Entrega confirmada correctamente' };
};


