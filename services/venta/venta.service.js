const db = require('../../config/db');

// ============================================
// LISTAR VENTAS
// ============================================
exports.getVentas = async () => {
    const [rows] = await db.query('CALL sp_listar_ventas()');
    return rows[0];
};

// ============================================
// OBTENER VENTA POR ID
// ============================================
exports.getVentaById = async (id) => {
    const [rows] = await db.query('CALL sp_obtener_venta(?)', [id]);
    return rows[0][0];
};

// ============================================
// OBTENER DETALLES DE VENTA
// ============================================
exports.getDetallesVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_detalle_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// OBTENER CUOTAS DE VENTA
// ============================================
exports.getCuotasVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_cuota_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// OBTENER CUOTA POR ID
// ============================================
exports.getCuotaById = async (idCuota) => {
    const [rows] = await db.query('CALL sp_obtener_cuota_venta_por_id(?)', [idCuota]);
    return rows[0][0];
};

// ============================================
// OBTENER PAGOS DE VENTA
// ============================================
exports.getPagosVenta = async (idVenta) => {
    const [rows] = await db.query('CALL sp_pago_venta_listar_por_venta(?)', [idVenta]);
    return rows[0];
};

// ============================================
// CREAR VENTA (SIN DEUDA)
// ============================================
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
            'CALL sp_registrar_venta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @venta_id)',
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
                observacion || null
            ]
        );

        const [ventaIdResult] = await connection.query('SELECT @venta_id AS id');
        const ventaId = ventaIdResult[0].id;

        if (!ventaId) {
            throw new Error('No se pudo obtener el ID de la venta');
        }

        // Registrar detalles
        for (const item of productos) {
            await connection.query(
                'CALL sp_detalle_venta_registrar(?, ?, ?, ?)',
                [item.id_producto, ventaId, item.precio_unitario, item.cantidad]
            );
        }

        // Registrar cuotas para crédito
        if (modalidad_pago === 'CREDITO' && cantidad_cuotas > 0) {
            const deudaCalculada = total_venta - (pago_inicial || 0);
            if (deudaCalculada > 0) {
                const montoPorCuota = deudaCalculada / cantidad_cuotas;
                const fechaVenta = new Date();
                
                for (let i = 1; i <= cantidad_cuotas; i++) {
                    const fechaVencimiento = new Date(fechaVenta);
                    fechaVencimiento.setDate(fechaVencimiento.getDate() + (intervalo_dias * i));
                    const fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
                    
                    await connection.query(
                        'CALL sp_registrar_cuota_venta(?, ?, ?, ?, ?)',
                        [ventaId, montoPorCuota, i, fechaVencimientoStr, 0]
                    );
                }
            }
        }

        // Registrar pago inicial
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

// ============================================
// ACTUALIZAR VENTA (SIN DEUDA) - CORREGIDO
// ============================================
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
        observacion,
        estado
    } = body;

    // Si solo cambia estado
    if (estado !== undefined && Object.keys(body).length === 1) {
        await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);
        let mensaje = '';
        // Estados: 0=Pago Parcial, 1=Pagada, 2=Anulada
        if (estado === 0) mensaje = 'Venta marcada como Pago Parcial';
        if (estado === 1) mensaje = 'Venta marcada como Pagada';
        if (estado === 2) mensaje = 'Venta anulada correctamente';
        return { message: mensaje };
    }

    // Validaciones para actualización completa
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
        'CALL sp_actualizar_venta(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
            observacion || null
        ]
    );

    return { message: 'Venta actualizada correctamente' };
};

// ============================================
// CAMBIAR ESTADO VENTA - CORREGIDO
// ============================================
exports.cambiarEstado = async (id, estado) => {
    // Validar que el estado sea válido: 0=Pago Parcial, 1=Pagada, 2=Anulada
    if (![0, 1, 2].includes(estado)) {
        throw new Error('Estado inválido. Use 0=Pago Parcial, 1=Pagada, 2=Anulada');
    }
    
    await db.query('CALL sp_cambiar_estado_venta(?, ?)', [id, estado]);
    
    let mensaje = '';
    if (estado === 0) mensaje = 'Venta marcada como Pago Parcial';
    if (estado === 1) mensaje = 'Venta marcada como Pagada';
    if (estado === 2) mensaje = 'Venta anulada correctamente';
    
    return { message: mensaje };
};


// ============================================
// ELIMINAR VENTA (ELIMINACIÓN LÓGICA)
// ============================================
exports.deleteVenta = async (id) => {
    // Verificar que la venta existe y está anulada
    const venta = await exports.getVentaById(id);
    if (!venta) {
        throw new Error('Venta no encontrada');
    }
    if (venta.estado !== 2) {
        throw new Error('Solo se pueden eliminar ventas que están anuladas');
    }
    
    await db.query('CALL sp_eliminar_venta_logico(?)', [id]);
    return { message: 'Venta eliminada correctamente' };
};



