const db = require('../../config/db');

// LISTAR VENTAS
exports.getVentas = async () => {
    const [rows] = await db.query('CALL sp_listar_ventas()');
    return rows[0];
};

// OBTENER VENTA POR ID
exports.getVentaById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_venta(?)', [id]);
    return rows[0][0];
};

// OBTENER DETALLES DE VENTA
exports.getDetallesVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_detalle_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// OBTENER CUOTAS DE VENTA
exports.getCuotasVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_cuota_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// OBTENER CUOTA POR ID
exports.getCuotaById = async (idCuota) => {
    const [rows] = await db.query('SELECT id, monto, numero_cuota, fecha_vencimiento, estado FROM cuota_venta WHERE id = ?', [idCuota]);
    return rows[0];
};

// OBTENER PAGOS DE VENTA
exports.getPagosVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_pago_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// CREAR VENTA
exports.createVenta = async (body) => {
    const {
        numero_nota_venta,
        id_pedido,
        id_cliente,
        id_usuario,
        modalidad_pago,
        pago_inicial,
        cantidad_cuotas,
        intervalo_dias,
        total_venta,
        deuda,
        observacion,
        productos
    } = body;

    if (!numero_nota_venta || numero_nota_venta.trim() === '') {
        throw new Error('El número de nota de venta es obligatorio');
    }
    if (!id_cliente) throw new Error('El cliente es obligatorio');
    if (!id_usuario) throw new Error('El usuario es obligatorio');
    if (!modalidad_pago) throw new Error('La modalidad de pago es obligatoria');
    if (!total_venta || total_venta <= 0) throw new Error('El total de la venta es inválido');
    if (!productos || productos.length === 0) throw new Error('Debe agregar al menos un producto');

    if (modalidad_pago === 'CREDITO') {
        if (!cantidad_cuotas || cantidad_cuotas <= 0) {
            throw new Error('Para crédito, la cantidad de cuotas es obligatoria');
        }
        if (!intervalo_dias || intervalo_dias <= 0) {
            throw new Error('Para crédito, el intervalo de días es obligatorio');
        }
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [result] = await connection.query(
            'CALL sp_registrar_venta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @venta_id)',
            [
                numero_nota_venta.trim(),
                id_pedido || null,
                id_cliente,
                id_usuario,
                modalidad_pago,
                pago_inicial || 0,
                cantidad_cuotas || 0,
                intervalo_dias || 0,
                total_venta,
                deuda || 0,
                observacion || null
            ]
        );

        const [ventaIdResult] = await connection.query('SELECT @venta_id AS id');
        const ventaId = ventaIdResult[0].id;

        if (!ventaId) {
            throw new Error('No se pudo obtener el ID de la venta');
        }

        for (const item of productos) {
            await connection.query(
                'CALL sp_detalle_venta_registrar(?, ?, ?, ?)',
                [item.id_producto, ventaId, item.precio_unitario, item.cantidad]
            );
        }

        if (modalidad_pago === 'CREDITO' && cantidad_cuotas > 0 && deuda > 0) {
            const montoCuota = deuda / cantidad_cuotas;
            const fechaVencimiento = new Date();
            
            for (let i = 1; i <= cantidad_cuotas; i++) {
                fechaVencimiento.setDate(fechaVencimiento.getDate() + intervalo_dias);
                const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
                
                await connection.query(
                    'CALL sp_registrar_cuota_venta(?, ?, ?, ?, ?)',
                    [ventaId, montoCuota, i, fechaVencimientoStr, 0]
                );
            }
        }

        if (pago_inicial && pago_inicial > 0) {
            await connection.query(
                'CALL sp_pago_venta_registrar(?, ?, ?)',
                [ventaId, 'EFECTIVO', pago_inicial]
            );
        }

        await connection.commit();
        connection.release();

        return {
            id: ventaId,
            message: 'Venta registrada correctamente'
        };

    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};

// ACTUALIZAR VENTA
exports.updateVenta = async (id, body) => {
    const {
        numero_nota_venta,
        id_pedido,
        id_cliente,
        id_usuario,
        modalidad_pago,
        pago_inicial,
        cantidad_cuotas,
        intervalo_dias,
        total_venta,
        deuda,
        observacion,
        estado
    } = body;

    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);
        let mensaje = '';
        if (estado === 0) mensaje = 'Venta anulada correctamente';
        if (estado === 1) mensaje = 'Venta reactivada correctamente';
        if (estado === 2) mensaje = 'Venta eliminada correctamente';
        return { message: mensaje };
    }

    if (!numero_nota_venta || numero_nota_venta.trim() === '') {
        throw new Error('El número de nota de venta es obligatorio');
    }
    if (!id_cliente) {
        throw new Error('El cliente es obligatorio');
    }
    if (!id_usuario) {
        throw new Error('El usuario es obligatorio');
    }
    if (!modalidad_pago) {
        throw new Error('La modalidad de pago es obligatoria');
    }
    if (!total_venta || total_venta <= 0) {
        throw new Error('El total de la venta es inválido');
    }

    await db.query(
        'CALL sp_actualizar_venta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            id,
            numero_nota_venta.trim(),
            id_pedido || null,
            id_cliente,
            id_usuario,
            modalidad_pago,
            pago_inicial || 0,
            cantidad_cuotas || 0,
            intervalo_dias || 0,
            total_venta,
            deuda || 0,
            observacion || null
        ]
    );

    return { message: 'Venta actualizada correctamente' };
};

// CAMBIAR ESTADO VENTA
exports.cambiarEstado = async (id, estado) => {
    await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);
    return { message: 'Estado de venta actualizado' };
};


