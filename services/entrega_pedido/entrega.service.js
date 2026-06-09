const db = require('../../config/db');

exports.registrarEntrega = async (body, idUsuarioSesion) => {
    const {
        id_pedido,
        tipo_entrega,
        direccion_entrega,
        costo_entrega,
        fecha_programada
    } = body;

    if (!id_pedido) throw new Error('El pedido es obligatorio');
    if (!tipo_entrega) throw new Error('El tipo de entrega es obligatorio');
    if (tipo_entrega === 'ENVIO' && !direccion_entrega) throw new Error('La dirección de envío es obligatoria');

    await db.query(
        'CALL sp_registrar_entrega_pedido(?, ?, ?, ?, ?, ?)',
        [id_pedido, tipo_entrega, direccion_entrega || null, costo_entrega || 0, fecha_programada || null, idUsuarioSesion]
    );

    return { message: 'Entrega registrada correctamente' };
};

exports.confirmarEntrega = async (idPedido, productos, idUsuarioSesion) => {
    if (!idPedido) throw new Error('El pedido es obligatorio');
    if (!productos || productos.length === 0) throw new Error('Debe especificar los productos entregados');

    const productosJson = JSON.stringify(productos);

    await db.query('CALL sp_obtener_entrega_pendiente(?, @id_entrega)', [idPedido]);
    const [[{ id_entrega }]] = await db.query('SELECT @id_entrega AS id_entrega');

    if (!id_entrega) throw new Error('No hay una entrega pendiente para este pedido');

    await db.query('CALL sp_confirmar_entrega_pedido(?, ?, ?, ?)', [idPedido, id_entrega, productosJson, idUsuarioSesion]);

    return { message: 'Entrega confirmada correctamente' };
};

exports.actualizarEstadoEntrega = async (idEntrega, estado) => {
    await db.query('CALL sp_actualizar_estado_envio(?, ?)', [idEntrega, estado]);
    return { message: 'Estado de entrega actualizado' };
};

exports.getEntregasByPedido = async (idPedido) => {
    const [rows] = await db.query('CALL sp_listar_entregas_por_pedido(?)', [idPedido]);
    return rows;
};


